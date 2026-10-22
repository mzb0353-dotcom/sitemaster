import { sb } from './supabase';
import { fmtDate } from './format';
import { dataUrlToBlob } from './images';

export async function getSignedUrls(bucket, paths, expiresIn = 3600) {
  const unique = [...new Set((paths || []).filter(Boolean))];
  if (!unique.length) return {};
  const { data, error } = await sb.storage.from(bucket).createSignedUrls(unique, expiresIn);
  if (error) throw error;
  const map = {};
  data.forEach((it) => { if (!it.error && it.signedUrl) map[it.path] = it.signedUrl; });
  return map;
}

async function uploadDefectPhoto(defectId, kind, dataUrl) {
  const path = `${defectId}/${kind}-${Date.now()}.jpg`;
  const { error } = await sb.storage.from('defects').upload(path, dataUrlToBlob(dataUrl), { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

export async function loadWorkspace() {
  const [projects, rooms, defects, contractors] = await Promise.all([
    sb.from('projects').select('*').order('created_at', { ascending: false }),
    sb.from('rooms').select('*, systems(*)').order('created_at'),
    sb.from('defects').select('*, approver:profiles!approved_by(full_name)').order('created_at', { ascending: false }),
    sb.from('profiles').select('id, full_name, company, phone').eq('role', 'contractor').order('full_name')
  ]);
  [projects, rooms, defects, contractors].forEach((r) => { if (r.error) throw r.error; });

  const urls = await getSignedUrls('defects', defects.data.flatMap((d) => [d.before_image_path, d.after_image_path]));

  return {
    projects: projects.data.map((p) => ({
      id: p.id, name: p.name, address: p.address || '', client: p.client_name || '',
      phone: p.client_phone || '', startDate: fmtDate(p.start_date), status: p.status || ''
    })),
    rooms: rooms.data.map((r) => ({
      id: r.id, projectId: r.project_id, name: r.name,
      systems: (r.systems || []).map((s) => ({
        id: s.id, type: s.system_type, name: s.name, installer: s.installer_name || '',
        details: s.details || '', status: s.status || ''
      }))
    })),
    defects: defects.data.map((d) => ({
      id: d.id, projectId: d.project_id, roomId: d.room_id, room: d.room_name, system: d.system_type,
      title: d.title, description: d.description || '', severity: d.severity, status: d.status,
      contractorId: d.contractor_id, contractor: d.contractor_name || '',
      reportedDate: fmtDate(d.reported_date), fixedDate: fmtDate(d.fixed_date) || null,
      beforeImage: (d.before_image_path && urls[d.before_image_path]) || null,
      afterImage: (d.after_image_path && urls[d.after_image_path]) || null,
      fixNote: d.fix_note || '', approvedBy: (d.approver && d.approver.full_name) || null
    })),
    contractors: contractors.data.map((c) => ({ id: c.id, name: c.full_name, company: c.company || '', phone: c.phone || '' }))
  };
}

export async function createProject(f) {
  const { data, error } = await sb.from('projects').insert({
    name: f.name.trim(), address: f.address.trim() || null,
    client_name: f.client.trim() || null, client_phone: f.phone.trim() || null
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function createRoom(projectId, name) {
  const { error } = await sb.from('rooms').insert({ project_id: projectId, name: name.trim() });
  if (error) throw error;
}

export async function deleteRoom(id) {
  const { error } = await sb.from('rooms').delete().eq('id', id);
  if (error) throw error;
}

export async function updateDefect(id, patch) {
  const { data, error } = await sb.from('defects').update(patch).eq('id', id).select('id');
  if (error) throw error;
  if (!data || !data.length) throw new Error('הפעולה לא בוצעה: אין הרשאה, או שהליקוי השתנה בינתיים. רענן ונסה שוב.');
}

export async function createDefect(f) {
  const id = crypto.randomUUID();
  let beforePath = null;
  if (f.imageDataUrl) beforePath = await uploadDefectPhoto(id, 'before', f.imageDataUrl);
  const { error } = await sb.from('defects').insert({
    id, project_id: f.projectId, room_id: f.roomId, room_name: f.roomName, system_type: f.system,
    title: f.title.trim(), description: f.description.trim() || 'אין פירוט נוסף', severity: f.severity,
    contractor_id: f.contractorId, contractor_name: f.contractorName, before_image_path: beforePath
  });
  if (error) {
    if (beforePath) await sb.storage.from('defects').remove([beforePath]).catch(() => {});
    throw error;
  }
}

export async function reportFix(defectId, note, afterDataUrl) {
  const afterPath = await uploadDefectPhoto(defectId, 'after', afterDataUrl);
  try {
    await updateDefect(defectId, { status: 'pending', fix_note: note.trim() || 'בוצע תיקון. מוגש לאישור מנהל.', after_image_path: afterPath });
  } catch (err) {
    await sb.storage.from('defects').remove([afterPath]).catch(() => {});
    throw err;
  }
}

export const approveDefect = (id) => updateDefect(id, { status: 'closed' });
export const rejectDefect = (id, reason, managerName) =>
  updateDefect(id, { status: 'open', fix_note: `נדחה ע"י ${managerName}: ${reason}`, after_image_path: null, fixed_date: null });

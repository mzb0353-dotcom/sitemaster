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
  const [projects, rooms, defects, people, members] = await Promise.all([
    sb.from('projects').select('*').order('created_at', { ascending: false }),
    sb.from('rooms').select('*, systems(*)').order('created_at'),
    sb.from('defects').select('*, approver:profiles!approved_by(full_name)').order('created_at', { ascending: false }),
    sb.from('profiles').select('id, full_name, role, company, phone').in('role', ['contractor', 'architect']).order('full_name'),
    sb.from('project_members').select('project_id, user_id')
  ]);
  [projects, rooms, defects, people].forEach((r) => { if (r.error) throw r.error; });
  // עד שמריצים את מיגרציית project_members הטבלה לא קיימת; אז members=null ואין סינון לפי שיוך.
  const membersMissing = members.error && (members.error.code === '42P01' || members.error.code === 'PGRST205');
  if (members.error && !membersMissing) throw members.error;

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
      beforePath: d.before_image_path, afterPath: d.after_image_path,
      fixNote: d.fix_note || '', approvedBy: (d.approver && d.approver.full_name) || null
    })),
    people: people.data.map((c) => ({ id: c.id, name: c.full_name, role: c.role, company: c.company || '', phone: c.phone || '' })),
    members: membersMissing ? null : members.data.map((m) => ({ projectId: m.project_id, userId: m.user_id }))
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

const SYSTEM_ROW = (f) => ({
  system_type: f.type, name: f.name.trim(), installer_name: f.installer.trim() || null,
  details: f.details.trim() || null, status: f.status
});

export async function createSystem(roomId, f) {
  const { error } = await sb.from('systems').insert({ room_id: roomId, ...SYSTEM_ROW(f) });
  if (error) throw error;
}

export async function updateSystem(id, f) {
  const { data, error } = await sb.from('systems').update(SYSTEM_ROW(f)).eq('id', id).select('id');
  if (error) throw error;
  if (!data || !data.length) throw new Error('העדכון לא בוצע: אין הרשאה לעדכן מערכת זו.');
}

export async function deleteSystem(id) {
  const { error } = await sb.from('systems').delete().eq('id', id);
  if (error) throw error;
}

export async function addMember(projectId, userId) {
  const { error } = await sb.from('project_members').insert({ project_id: projectId, user_id: userId });
  if (error) throw error;
}

export async function removeMember(projectId, userId) {
  const { error } = await sb.from('project_members').delete().eq('project_id', projectId).eq('user_id', userId);
  if (error) throw error;
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
export async function rejectDefect(defect, reason, managerName) {
  await updateDefect(defect.id, { status: 'open', fix_note: `נדחה ע"י ${managerName}: ${reason}`, after_image_path: null, fixed_date: null });
  // תמונת התיקון שנדחה כבר לא מקושרת לשום רשומה; מוחקים אותה (בלי לחסום אם אין הרשאה).
  if (defect.afterPath) await sb.storage.from('defects').remove([defect.afterPath]).catch(() => {});
}

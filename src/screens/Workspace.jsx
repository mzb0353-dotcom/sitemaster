import { useState, useEffect, useMemo, useCallback } from 'react';
import { sb } from '../lib/supabase';
import { loadWorkspace, createProject, createRoom, deleteRoom, createDefect, reportFix, approveDefect, rejectDefect } from '../lib/api';
import { explainError } from '../lib/format';
import { ROLE_LABELS, INPUT, BTN, GHOST } from '../lib/constants';
import Icon from '../components/Icon';
import { Modal, Field, Spinner } from '../components/ui';
import PhotoPicker from '../components/PhotoPicker';
import BlueprintsTab from '../tabs/BlueprintsTab';
import DefectsTab from '../tabs/DefectsTab';
import RoomsTab from '../tabs/RoomsTab';
import ContractorsTab from '../tabs/ContractorsTab';
import ReportTab from '../tabs/ReportTab';

const emptyDefectForm = () => ({ title: '', room: '', system: 'plumbing', contractorId: '', severity: 'medium', description: '', image: null });

export default function Workspace({ profile }) {
  const isManager = profile.role === 'manager';
  const isContractor = profile.role === 'contractor';

  const [data, setData] = useState({ projects: [], rooms: [], defects: [], contractors: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState(null);
  const [tab, setTab] = useState('defects');
  const [fSystem, setFSystem] = useState('all');
  const [fStatus, setFStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null); // 'defect' | 'project' | 'room'
  const [inspect, setInspect] = useState(null);
  const [form, setForm] = useState(emptyDefectForm);
  const [projForm, setProjForm] = useState({ name: '', address: '', client: '', phone: '' });
  const [roomName, setRoomName] = useState('');
  const [roomError, setRoomError] = useState('');
  const [fixId, setFixId] = useState(null);
  const [fixPhoto, setFixPhoto] = useState(null);
  const [fixText, setFixText] = useState('');

  const reload = useCallback(async () => {
    const ws = await loadWorkspace();
    setData(ws);
    setProjectId((prev) => (ws.projects.some((p) => p.id === prev) ? prev : (ws.projects[0] && ws.projects[0].id) || null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    reload().catch((e) => { if (!cancelled) setLoadError(explainError(e)); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reload]);

  const run = async (fn) => {
    setBusy(true); setBanner('');
    try { await fn(); await reload(); return true; }
    catch (e) { setBanner(explainError(e)); return false; }
    finally { setBusy(false); }
  };

  const { projects, rooms, defects, contractors } = data;
  const project = useMemo(() => projects.find((p) => p.id === projectId) || null, [projects, projectId]);
  const projRooms = useMemo(() => (project ? rooms.filter((r) => r.projectId === project.id) : []), [rooms, project]);
  const projDefects = useMemo(() => (project ? defects.filter((d) => d.projectId === project.id) : []), [defects, project]);
  const sysStats = useMemo(() => {
    const all = projRooms.flatMap((r) => r.systems);
    return { total: all.length, approved: all.filter((s) => s.status === 'מאושר ביצוע').length };
  }, [projRooms]);
  const counts = useMemo(() => ({
    total: projDefects.length,
    open: projDefects.filter((d) => d.status === 'open').length,
    pending: projDefects.filter((d) => d.status === 'pending').length
  }), [projDefects]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projDefects.filter((d) => {
      if (fSystem !== 'all' && d.system !== fSystem) return false;
      if (fStatus !== 'all' && d.status !== fStatus) return false;
      return !q || [d.title, d.room, d.contractor, d.description].some((t) => t.toLowerCase().includes(q));
    });
  }, [projDefects, fSystem, fStatus, query]);
  const formRoom = projRooms.some((r) => r.name === form.room) ? form.room : (projRooms[0] && projRooms[0].name) || '';
  const openByContractor = useMemo(() => {
    const m = {};
    defects.forEach((d) => { if (d.status === 'open' && d.contractorId) m[d.contractorId] = (m[d.contractorId] || 0) + 1; });
    return m;
  }, [defects]);

  const changeProject = (id) => { setProjectId(id); setForm(emptyDefectForm()); };

  const submitProject = async (e) => {
    e.preventDefault();
    if (!projForm.name.trim()) return;
    let newId = null;
    const ok = await run(async () => { newId = await createProject(projForm); });
    if (ok) {
      setProjectId(newId); setForm(emptyDefectForm()); setQuery(''); setFSystem('all'); setFStatus('all');
      setModal(null); setProjForm({ name: '', address: '', client: '', phone: '' });
    }
  };

  const closeRoom = () => { setModal(null); setRoomName(''); setRoomError(''); };
  const submitRoom = async (e) => {
    e.preventDefault();
    const name = roomName.trim();
    if (!name || !project) return;
    if (projRooms.some((r) => r.name === name)) { setRoomError('כבר קיים חדר בשם הזה בפרויקט.'); return; }
    if (await run(() => createRoom(project.id, name))) closeRoom();
  };
  const removeRoom = async (room) => {
    const linked = projDefects.filter((d) => d.roomId === room.id).length;
    const msg = linked ? `לחדר "${room.name}" משויכים ${linked} ליקויים. הם יישארו ברשימה, אבל החדר יימחק. להמשיך?` : `למחוק את החדר "${room.name}"?`;
    if (window.confirm(msg)) await run(() => deleteRoom(room.id));
  };

  const submitDefect = async (e) => {
    e.preventDefault();
    const room = projRooms.find((r) => r.name === formRoom);
    const c = contractors.find((x) => x.id === form.contractorId);
    if (!form.title.trim() || !room || !c || !project) return;
    const ok = await run(() => createDefect({
      projectId: project.id, roomId: room.id, roomName: room.name, system: form.system, title: form.title,
      description: form.description, severity: form.severity, contractorId: c.id,
      contractorName: c.company ? `${c.name} - ${c.company}` : c.name, imageDataUrl: form.image
    }));
    if (ok) { setModal(null); setForm(emptyDefectForm()); }
  };

  const closeFix = () => { if (busy) return; setFixId(null); setFixPhoto(null); setFixText(''); };
  const submitFix = async () => {
    if (!fixPhoto || !fixId) return;
    if (await run(() => reportFix(fixId, fixText, fixPhoto))) { setFixId(null); setFixPhoto(null); setFixText(''); }
  };
  const reject = (id) => {
    const reason = window.prompt('נא להזין סיבה לדחיית התיקון ובקשת ביצוע חוזר:');
    if (reason && reason.trim()) run(() => rejectDefect(id, reason.trim(), profile.full_name));
  };

  const tabCls = (t) => `px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-medium text-xs transition-all ${tab === t ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-700/40 text-slate-300 hover:bg-slate-700'}`;

  return (
    <div className="min-h-screen text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-slate-950 p-2 rounded-xl"><Icon name="hat" className="w-6 h-6" /></div>
            <div>
              <span className="font-black text-lg tracking-wider text-white">SITEMASTER</span>
              <span className="text-amber-400 font-bold text-xs mr-1">PRO</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {busy && <Spinner className="w-4 h-4 text-amber-400" />}
            {projects.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs">
                <Icon name="building" className="w-4 h-4 text-amber-400" />
                <select value={projectId || ''} onChange={(e) => changeProject(e.target.value)} className="bg-transparent text-white font-medium focus:outline-none max-w-[9rem]">
                  {projects.map((p) => <option key={p.id} value={p.id} className="bg-slate-800">{p.name}</option>)}
                </select>
              </div>
            )}
            {isManager && (
              <button type="button" onClick={() => setModal('project')} className="p-2 bg-slate-800 text-amber-400 border border-slate-700/80 rounded-xl" title="פרויקט חדש" aria-label="פרויקט חדש"><Icon name="plus" /></button>
            )}
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs">
              <div className="leading-tight"><div className="text-slate-100 font-medium">{profile.full_name}</div><div className="text-[10px] text-amber-400">{ROLE_LABELS[profile.role]}</div></div>
              <button type="button" onClick={() => sb.auth.signOut()} className="text-slate-400 hover:text-white p-1" title="התנתק" aria-label="התנתק"><Icon name="logout" /></button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-5 space-y-5">
        {banner && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl flex items-start justify-between gap-3 no-print">
            <span>{banner}</span><button type="button" onClick={() => setBanner('')} aria-label="סגור הודעה"><Icon name="x" /></button>
          </div>
        )}

        {loading ? <div className="py-20 flex justify-center"><Spinner className="w-8 h-8 text-amber-500" /></div>
          : loadError ? (
            <div className="py-12 text-center bg-slate-800/40 rounded-2xl border border-dashed border-red-500/40">
              <p className="text-sm text-red-300 px-4">{loadError}</p>
              <button type="button" onClick={() => window.location.reload()} className="text-xs text-amber-400 mt-2">נסה שוב</button>
            </div>
          ) : !project ? (
            <div className="py-16 text-center bg-slate-800/40 rounded-2xl border border-dashed border-slate-700">
              <Icon name="building" className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="font-bold text-slate-300">אין פרויקטים להצגה</p>
              <p className="text-xs text-slate-500 mt-1">{isManager ? 'לחץ על + בסרגל העליון כדי ליצור פרויקט.' : 'המנהל צריך לשייך אותך לפרויקט.'}</p>
            </div>
          ) : (
            <>
              <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-4 shadow-xl no-print">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{project.status}</span>
                      <span className="text-xs text-slate-400">התחלה: {project.startDate}</span>
                    </div>
                    <h1 className="text-xl font-bold text-white">{project.name}</h1>
                    <p className="text-xs text-slate-400">{project.address}{project.client && ` • ${project.client}`}{project.phone && ` (${project.phone})`}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[['ליקויים פתוחים', counts.open, 'text-rose-400'], ['לאישור מנהל', counts.pending, 'text-amber-400'],
                      ['מערכות מאושרות', sysStats.total ? `${sysStats.approved}/${sysStats.total}` : '—', 'text-emerald-400']].map(([l, v, c]) => (
                      <div key={l} className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50 text-center min-w-[80px]">
                        <span className="text-[10px] text-slate-400 block">{l}</span><span className={`text-lg font-black ${c}`}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-700/50 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setTab('defects')} className={tabCls('defects')}><Icon name="alert" />ליקויים ({counts.total})</button>
                  <button type="button" onClick={() => setTab('rooms')} className={tabCls('rooms')}><Icon name="layers" />חדרים ותשתיות</button>
                  <button type="button" onClick={() => setTab('blueprints')} className={tabCls('blueprints')}><Icon name="file" />תוכניות</button>
                  {isManager && <button type="button" onClick={() => setTab('contractors')} className={tabCls('contractors')}><Icon name="user" />קבלנים</button>}
                  <button type="button" onClick={() => setTab('report')} className={tabCls('report')}><Icon name="printer" />דוח</button>
                </div>
              </div>

              {tab === 'defects' && (
                <DefectsTab
                  shown={shown} busy={busy} isManager={isManager} isContractor={isContractor}
                  query={query} setQuery={setQuery} fSystem={fSystem} setFSystem={setFSystem} fStatus={fStatus} setFStatus={setFStatus}
                  onNew={() => setModal('defect')} onInspect={setInspect} onFix={setFixId} onReject={reject}
                  onApprove={(id) => run(() => approveDefect(id))}
                />
              )}

              {tab === 'rooms' && (
                <RoomsTab projRooms={projRooms} sysStats={sysStats} busy={busy} isManager={isManager}
                  onAddRoom={() => setModal('room')} onRemoveRoom={removeRoom} />
              )}

              {tab === 'blueprints' && <BlueprintsTab projectId={project.id} userRole={profile.role} />}

              {tab === 'contractors' && isManager && (
                <ContractorsTab contractors={contractors} openByContractor={openByContractor}
                  onShowDefects={(c) => { setFSystem('all'); setFStatus('all'); setQuery(c.name); setTab('defects'); }} />
              )}

              {tab === 'report' && <ReportTab project={project} projDefects={projDefects} />}
            </>
          )}
      </div>

      {modal === 'project' && (
        <Modal title="הקמת פרויקט חדש" onClose={() => setModal(null)}>
          <form onSubmit={submitProject} className="space-y-3">
            <Field label="שם הפרויקט *"><input required autoFocus value={projForm.name} onChange={(e) => setProjForm({ ...projForm, name: e.target.value })} placeholder="למשל: וילה נווה צדק" className={INPUT} /></Field>
            <Field label="כתובת"><input value={projForm.address} onChange={(e) => setProjForm({ ...projForm, address: e.target.value })} className={INPUT} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="שם הלקוח"><input value={projForm.client} onChange={(e) => setProjForm({ ...projForm, client: e.target.value })} className={INPUT} /></Field>
              <Field label="טלפון"><input type="tel" value={projForm.phone} onChange={(e) => setProjForm({ ...projForm, phone: e.target.value })} className={INPUT} /></Field>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800"><button type="button" onClick={() => setModal(null)} className={GHOST}>ביטול</button><button type="submit" disabled={busy} className={BTN}>צור פרויקט</button></div>
          </form>
        </Modal>
      )}

      {modal === 'room' && (
        <Modal title={`הוספת חדר ל${(project && project.name) || ''}`} onClose={closeRoom}>
          <form onSubmit={submitRoom} className="space-y-3">
            <Field label="שם החדר / אזור *">
              <input required autoFocus value={roomName} onChange={(e) => { setRoomName(e.target.value); setRoomError(''); }} placeholder="למשל: מרפסת שמש, חדר כביסה" className={INPUT} />
              {roomError && <p className="text-red-400 text-xs mt-1">{roomError}</p>}
            </Field>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800"><button type="button" onClick={closeRoom} className={GHOST}>ביטול</button><button type="submit" disabled={busy} className={BTN}>הוסף חדר</button></div>
          </form>
        </Modal>
      )}

      {modal === 'defect' && (
        <Modal title="פתיחת ליקוי שטח חדש" onClose={() => setModal(null)}>
          <form onSubmit={submitDefect} className="space-y-3">
            {projRooms.length === 0 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs">לא הוגדרו חדרים לפרויקט זה. הוסף חדר בלשונית ״חדרים ותשתיות״ ונסה שוב.</div>
            ) : (
              <Field label="חדר / מיקום"><select value={formRoom} onChange={(e) => setForm({ ...form, room: e.target.value })} className={INPUT}>{projRooms.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}</select></Field>
            )}
            <Field label="כותרת הליקוי"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="למשל: סדק באיטום, שקע לא מפולס..." className={INPUT} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="מערכת"><select value={form.system} onChange={(e) => setForm({ ...form, system: e.target.value })} className={INPUT}><option value="plumbing">אינסטלציה</option><option value="electrical">חשמל</option><option value="hvac">מיזוג אוויר</option></select></Field>
              <Field label="חומרה"><select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className={INPUT}><option value="low">נמוך</option><option value="medium">בינוני</option><option value="high">קריטי</option></select></Field>
            </div>
            <Field label="קבלן אחראי">
              <select required value={form.contractorId} onChange={(e) => setForm({ ...form, contractorId: e.target.value })} className={INPUT}>
                <option value="">בחר קבלן...</option>{contractors.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
              </select>
              {contractors.length === 0 && <p className="text-amber-400 text-xs mt-1">אין קבלנים רשומים. הזמן קבלן דרך Supabase.</p>}
            </Field>
            <Field label="תיאור מפורט"><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${INPUT} resize-none`} /></Field>
            <PhotoPicker value={form.image} onChange={(img) => setForm((p) => ({ ...p, image: img }))} label="תמונת הליקוי (אופציונלי)" />
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button type="button" onClick={() => setModal(null)} className={GHOST}>ביטול</button>
              <button type="submit" disabled={busy || !projRooms.length || !contractors.length} className={BTN}>{busy && <Spinner className="w-4 h-4" />}צור ליקוי</button>
            </div>
          </form>
        </Modal>
      )}

      {fixId && (
        <Modal title="דיווח תיקון והגשה לאישור" onClose={closeFix}>
          <label className="block text-xs font-medium text-slate-300">תמונת הוכחת תיקון <span className="text-amber-400">* (חובה)</span></label>
          <PhotoPicker value={fixPhoto} onChange={setFixPhoto} />
          <Field label="הערת קבלן / פעולות שבוצעו"><textarea rows={3} value={fixText} onChange={(e) => setFixText(e.target.value)} placeholder="למשל: נאטם בחומר ביטומני ונבדק תחת לחץ מים..." className={`${INPUT} resize-none`} /></Field>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button type="button" onClick={closeFix} disabled={busy} className={GHOST}>ביטול</button>
            <button type="button" disabled={!fixPhoto || busy} onClick={submitFix} className={BTN}>{busy && <Spinner className="w-4 h-4" />}הגש לאישור מנהל</button>
          </div>
        </Modal>
      )}

      {inspect && (
        <div onClick={() => setInspect(null)} className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer">
          <div onClick={(e) => e.stopPropagation()} className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center cursor-default shadow-2xl">
            <button type="button" onClick={() => setInspect(null)} className="absolute top-3 left-3 z-10 bg-slate-900/80 text-slate-300 p-1 rounded-lg" aria-label="סגור תמונה"><Icon name="x" className="w-5 h-5" /></button>
            <img src={inspect.src} alt={inspect.label} className="max-h-[75vh] w-auto mx-auto rounded-xl object-contain" />
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-4 border-t border-slate-800/80 pt-3">
              <span className="font-semibold text-slate-200">{inspect.label}</span><span>•</span><span>דווח: {inspect.def.reportedDate}</span>
              {inspect.def.fixedDate && <><span>•</span><span className="text-emerald-400">תוקן: {inspect.def.fixedDate}</span></>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

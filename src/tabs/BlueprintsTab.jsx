import { useState, useEffect, useCallback } from 'react';
import { sb } from '../lib/supabase';
import { getSignedUrls } from '../lib/api';
import { explainError } from '../lib/format';
import { DISCIPLINES, BLUEPRINT_TYPES, INPUT, BTN, GHOST } from '../lib/constants';
import Icon from '../components/Icon';
import { Modal, Field, Spinner } from '../components/ui';

export default function BlueprintsTab({ projectId, userRole }) {
  const [items, setItems] = useState([]);
  const [urls, setUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [discipline, setDiscipline] = useState(DISCIPLINES[0]);
  const [version, setVersion] = useState('גרסה 1');
  const canUpload = userRole === 'manager' || userRole === 'architect';

  const load = useCallback(async () => {
    const { data, error } = await sb.from('blueprints').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
    if (error) throw error;
    return { rows: data || [], map: await getSignedUrls('blueprints', (data || []).map((b) => b.file_path)) };
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setLoadError(''); setItems([]);
    load().then(({ rows, map }) => { if (!cancelled) { setItems(rows); setUrls(map); } })
      .catch(() => { if (!cancelled) setLoadError('שגיאה בטעינת תוכניות הפרויקט'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [load]);

  const closeModal = () => {
    if (uploading) return;
    setShowUpload(false); setFile(null); setTitle(''); setVersion('גרסה 1'); setUploadError('');
  };

  const upload = async (e) => {
    e.preventDefault();
    if (!file || !title.trim()) return;
    const ext = BLUEPRINT_TYPES[file.type];
    if (!ext) { setUploadError('אפשר להעלות רק PDF, JPG או PNG.'); return; }
    if (file.size > 50 * 1024 * 1024) { setUploadError('הקובץ גדול מ-50MB.'); return; }
    setUploading(true); setUploadError('');
    let path = null;
    try {
      path = `${projectId}/${crypto.randomUUID()}.${ext}`;
      const up = await sb.storage.from('blueprints').upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw up.error;
      const { error } = await sb.from('blueprints').insert({
        project_id: projectId, title: title.trim(), discipline, version: version.trim() || 'גרסה 1', file_path: path, file_name: file.name
      });
      if (error) throw error;
      const { rows, map } = await load();
      setItems(rows); setUrls(map); setUploading(false);
      setShowUpload(false); setFile(null); setTitle(''); setVersion('גרסה 1');
    } catch (err) {
      if (path) await sb.storage.from('blueprints').remove([path]).catch(() => {});
      setUploadError(explainError(err)); setUploading(false);
    }
  };

  const download = async (bp) => {
    const { data, error } = await sb.storage.from('blueprints').createSignedUrl(bp.file_path, 3600, { download: bp.file_name || true });
    if (error) { setLoadError('שגיאה בהפקת קישור הורדה'); return; }
    window.location.href = data.signedUrl;
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">תוכניות ושרטוטי עבודה</h3>
          <p className="text-xs text-slate-400">אדריכלות, קונסטרוקציה ותשתיות לפי תחום</p>
        </div>
        {canUpload && <button type="button" onClick={() => setShowUpload(true)} className={BTN}><Icon name="upload" />העלה תוכנית</button>}
      </div>
      {loadError && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">{loadError}</div>}
      {loading ? <div className="py-12 flex justify-center"><Spinner /></div> : items.length === 0 ? (
        <div className="py-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
          <Icon name="file" className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="font-bold text-sm text-slate-300">טרם הועלו תוכניות לפרויקט זה</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((bp) => (
            <div key={bp.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-400">{bp.discipline}</span>
                  <span className="text-[10px] text-slate-500">{bp.version}</span>
                </div>
                <h4 className="font-bold text-white text-sm">{bp.title}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">{bp.file_name || 'קובץ תוכנית'}</p>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500">{new Date(bp.created_at).toLocaleDateString('he-IL')}</span>
                <div className="flex items-center gap-1.5">
                  {urls[bp.file_path] && (
                    <a href={urls[bp.file_path]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1 bg-amber-500/10 text-amber-400 text-xs rounded-lg">
                      <Icon name="eye" className="w-3.5 h-3.5" />צפייה
                    </a>
                  )}
                  <button type="button" onClick={() => download(bp)} className="flex items-center gap-1 px-3 py-1 bg-slate-800 text-slate-200 text-xs rounded-lg">
                    <Icon name="download" className="w-3.5 h-3.5" />הורדה
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showUpload && (
        <Modal title="העלאת תוכנית עבודה" onClose={closeModal}>
          <form onSubmit={upload} className="space-y-3">
            <Field label="כותרת התוכנית *"><input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="למשל: תוכנית אינסטלציה קומה א׳" className={INPUT} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="תחום"><select value={discipline} onChange={(e) => setDiscipline(e.target.value)} className={INPUT}>{DISCIPLINES.map((d) => <option key={d} value={d}>{d}</option>)}</select></Field>
              <Field label="גרסה"><input value={version} onChange={(e) => setVersion(e.target.value)} className={INPUT} /></Field>
            </div>
            <Field label="קובץ (PDF, JPG, PNG עד 50MB) *">
              <input type="file" required accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFile((e.target.files && e.target.files[0]) || null)} className={`${INPUT} p-2`} />
            </Field>
            {uploadError && <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs">{uploadError}</div>}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button type="button" disabled={uploading} onClick={closeModal} className={GHOST}>ביטול</button>
              <button type="submit" disabled={uploading || !file || !title.trim()} className={BTN}>{uploading && <Spinner className="w-4 h-4" />}{uploading ? 'מעלה...' : 'העלה קובץ'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

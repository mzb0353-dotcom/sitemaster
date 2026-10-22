import { useState } from 'react';
import Icon from './Icon';
import { compressImage } from '../lib/images';

export default function PhotoPicker({ value, onChange, label }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try { onChange(await compressImage(file)); } catch { setError('לא ניתן לקרוא את הקובץ. נסה תמונה אחרת.'); } finally { setBusy(false); }
  };
  const tile = 'flex flex-col items-center gap-1.5 p-3 bg-slate-900/60 rounded-xl border border-dashed border-slate-700 hover:border-amber-500 cursor-pointer text-xs text-slate-300';
  return (
    <div className="space-y-1.5">
      {label && <span className="block text-xs text-slate-400">{label}</span>}
      {value ? (
        <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-700">
          <img src={value} alt="תצוגה מקדימה" className="w-full h-full object-cover" />
          <button type="button" onClick={() => onChange(null)} className="absolute top-2 left-2 bg-black/70 text-white p-1.5 rounded-full" aria-label="הסר תמונה">
            <Icon name="x" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <label className={tile}><Icon name="camera" className="w-5 h-5 text-amber-400" /><span>{busy ? 'מעבד...' : 'צלם עכשיו'}</span>
            <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" /></label>
          <label className={tile}><Icon name="layers" className="w-5 h-5 text-amber-400" /><span>{busy ? 'מעבד...' : 'בחר מהגלריה'}</span>
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" /></label>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

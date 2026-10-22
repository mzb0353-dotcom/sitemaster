import { useState } from 'react';
import Icon from '../components/Icon';
import { BTN, INPUT, ROLE_LABELS } from '../lib/constants';

// memberIds === null: מיגרציית השיוכים טרם הורצה; מציגים את כל הקבלנים כמו קודם, בלי ניהול שיוך.
export default function ContractorsTab({ people, memberIds, openByContractor, busy, onAdd, onRemove, onShowDefects }) {
  const [pick, setPick] = useState('');
  const shown = memberIds ? people.filter((p) => memberIds.has(p.id)) : people.filter((p) => p.role === 'contractor');
  const candidates = memberIds ? people.filter((p) => !memberIds.has(p.id)) : [];

  return (
    <div className="space-y-4">
      {memberIds && (
        <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-2">
          <div>
            <h3 className="text-sm font-bold text-white">צוות הפרויקט</h3>
            <p className="text-xs text-slate-400">רק קבלנים משויכים יופיעו בבחירת קבלן לליקוי חדש.</p>
          </div>
          {candidates.length > 0 ? (
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (pick) { onAdd(pick); setPick(''); } }}>
              <select value={pick} onChange={(e) => setPick(e.target.value)} className={`${INPUT} flex-1`}>
                <option value="">בחר משתמש לשיוך...</option>
                {candidates.map((p) => <option key={p.id} value={p.id}>{p.name} · {ROLE_LABELS[p.role]}{p.company ? ` (${p.company})` : ''}</option>)}
              </select>
              <button type="submit" disabled={busy || !pick} className={BTN}><Icon name="plus" />שייך</button>
            </form>
          ) : (
            <p className="text-xs text-slate-500">כל המשתמשים הרשומים כבר משויכים. משתמשים חדשים מזמינים דרך Supabase (Authentication → Users).</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {shown.length === 0 && (
          <p className="text-xs text-slate-400 col-span-full">
            {memberIds ? 'אין עדיין משתמשים משויכים לפרויקט הזה.' : 'אין קבלנים רשומים. הזמן קבלנים דרך Supabase (Authentication → Users).'}
          </p>
        )}
        {shown.map((c) => (
          <div key={c.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">{c.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white text-sm">{c.name}</h4>
                <p className="text-xs text-slate-400">{[ROLE_LABELS[c.role], c.company].filter(Boolean).join(' · ')}</p>
              </div>
              {memberIds && (
                <button type="button" disabled={busy} onClick={() => onRemove(c)} className="text-slate-500 hover:text-rose-400 p-1 disabled:opacity-50" title="הסר מהפרויקט" aria-label={`הסר את ${c.name} מהפרויקט`}><Icon name="x" /></button>
              )}
            </div>
            <div className="pt-2 border-t border-slate-700/60 text-xs space-y-1 text-slate-300">
              {c.role === 'contractor' && <div className="flex justify-between"><span>ליקויים פתוחים:</span><span className="font-bold text-rose-400">{openByContractor[c.id] || 0}</span></div>}
              {c.phone && <div className="flex justify-between items-center"><span>טלפון:</span><a href={`tel:${c.phone}`} className="font-bold text-amber-400 flex items-center gap-1"><Icon name="phone" className="w-3 h-3" />{c.phone}</a></div>}
            </div>
            {c.role === 'contractor' && <button type="button" onClick={() => onShowDefects(c)} className="text-xs text-amber-400 font-bold">הצג ליקויים משויכים</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

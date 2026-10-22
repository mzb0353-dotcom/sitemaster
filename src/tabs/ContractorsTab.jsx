import Icon from '../components/Icon';

export default function ContractorsTab({ contractors, openByContractor, onShowDefects }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {contractors.length === 0 && <p className="text-xs text-slate-400 col-span-full">אין קבלנים רשומים. הזמן קבלנים דרך Supabase (Authentication → Users) ושייך אותם לפרויקט.</p>}
      {contractors.map((c) => (
        <div key={c.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">{c.name.charAt(0)}</div>
            <div><h4 className="font-bold text-white text-sm">{c.name}</h4><p className="text-xs text-slate-400">{c.company}</p></div>
          </div>
          <div className="pt-2 border-t border-slate-700/60 text-xs space-y-1 text-slate-300">
            <div className="flex justify-between"><span>ליקויים פתוחים:</span><span className="font-bold text-rose-400">{openByContractor[c.id] || 0}</span></div>
            {c.phone && <div className="flex justify-between items-center"><span>טלפון:</span><a href={`tel:${c.phone}`} className="font-bold text-amber-400 flex items-center gap-1"><Icon name="phone" className="w-3 h-3" />{c.phone}</a></div>}
          </div>
          <button type="button" onClick={() => onShowDefects(c)} className="text-xs text-amber-400 font-bold">הצג ליקויים משויכים</button>
        </div>
      ))}
    </div>
  );
}

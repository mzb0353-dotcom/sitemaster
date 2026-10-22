import Icon from '../components/Icon';
import Thumb from '../components/Thumb';
import { BTN, SEVERITY_LABELS } from '../lib/constants';

const sevCls = { high: 'bg-rose-500/20 text-rose-400 border border-rose-500/30', medium: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', low: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' };

export default function DefectsTab({
  shown, busy, isManager, isContractor,
  query, setQuery, fSystem, setFSystem, fStatus, setFStatus,
  onNew, onInspect, onFix, onReject, onApprove
}) {
  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[180px]">
            <span className="absolute right-3 top-2.5 text-slate-400"><Icon name="search" /></span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש לפי כותרת, חדר או קבלן..." className="w-full bg-slate-900 border border-slate-700 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500" />
          </div>
          <select value={fSystem} onChange={(e) => setFSystem(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300">
            <option value="all">כל המערכות</option><option value="plumbing">אינסטלציה</option><option value="electrical">חשמל</option><option value="hvac">מיזוג אוויר</option>
          </select>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300">
            <option value="all">כל הסטטוסים</option><option value="open">פתוח</option><option value="pending">ממתין לאישור</option><option value="closed">סגור</option>
          </select>
        </div>
        {isManager && <button type="button" onClick={() => onNew()} className={BTN}><Icon name="plus" />פתיחת ליקוי חדש</button>}
      </div>

      {shown.length === 0 && (
        <div className="py-14 text-center bg-slate-800/40 rounded-2xl border border-dashed border-slate-700">
          <Icon name="ok" className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="font-bold text-slate-300">לא נמצאו ליקויים</p>
          <p className="text-xs text-slate-500 mt-1">{isContractor ? 'לא שויכו אליך ליקויים בפרויקט זה.' : 'שנה את הסינון או פתח ליקוי חדש.'}</p>
        </div>
      )}

      {shown.map((d) => (
        <div key={d.id} className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-4 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sevCls[d.severity]}`}>{SEVERITY_LABELS[d.severity]}</span>
                <span className="text-xs font-semibold text-slate-300">{d.room}</span><span className="text-slate-600">•</span>
                <span className="text-xs text-slate-400">קבלן: {d.contractor}</span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">{d.title}</h3>
              <p className="text-xs text-slate-300 mt-1">{d.description}</p>
            </div>
            {d.status === 'open' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1 self-start"><Icon name="clock" className="w-3.5 h-3.5" />פתוח לביצוע</span>}
            {d.status === 'pending' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 self-start"><Icon name="alert" className="w-3.5 h-3.5" />ממתין לאישור מנהל</span>}
            {d.status === 'closed' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 self-start"><Icon name="ok" className="w-3.5 h-3.5" />סגור ומאושר</span>}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Thumb src={d.beforeImage} title="לפני תיקון" tone="red" emptyText="לא צורפה תמונה" onOpen={() => onInspect({ src: d.beforeImage, label: 'לפני תיקון', def: d })} />
              <Thumb src={d.afterImage} title="לאחר תיקון בשטח" tone="green" emptyText="טרם הועלתה תמונת ביצוע" onOpen={() => onInspect({ src: d.afterImage, label: 'לאחר תיקון בשטח', def: d })} />
            </div>
            {d.fixNote && (
              <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-700/80 text-xs text-slate-300 max-w-sm flex-1">
                <span className="text-amber-400 font-bold block mb-0.5">הערת תיקון וביצוע:</span>{d.fixNote}
                {d.fixedDate && <span className="text-[10px] text-slate-400 block mt-1">תאריך ביצוע: {d.fixedDate}</span>}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-slate-400 text-[11px]">דווח: {d.reportedDate} {d.approvedBy && `• אושר סופית ע״י: ${d.approvedBy}`}</div>
            <div className="flex items-center gap-2">
              {isContractor && d.status === 'open' && (
                <button type="button" disabled={busy} onClick={() => onFix(d.id)} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5"><Icon name="camera" />סמן כבוצע והעלה תמונה</button>
              )}
              {isManager && d.status === 'pending' && (
                <>
                  <button type="button" disabled={busy} onClick={() => onReject(d)} className="bg-rose-500/20 disabled:opacity-50 text-rose-400 border border-rose-500/30 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1"><Icon name="x" />דחה</button>
                  <button type="button" disabled={busy} onClick={() => onApprove(d.id)} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-4 py-1.5 rounded-xl flex items-center gap-1.5"><Icon name="check" />אשר וסגור</button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

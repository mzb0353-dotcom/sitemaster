import Icon from '../components/Icon';
import { BTN } from '../lib/constants';

const roomStatusClass = (s) =>
  s === 'מאושר ביצוע' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    : s === 'הותקן בשטח' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20';

export default function RoomsTab({ projRooms, sysStats, busy, isManager, onAddRoom, onRemoveRoom }) {
  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 flex items-center justify-between gap-3">
        <div><h3 className="text-sm font-bold text-white">מיפוי מערכות לפי חדר</h3>
          <p className="text-xs text-slate-400">מאושרות: <span className="text-emerald-400 font-bold">{sysStats.approved} מתוך {sysStats.total}</span></p></div>
        {isManager && <button type="button" onClick={() => onAddRoom()} className={BTN}><Icon name="plus" />הוסף חדר</button>}
      </div>
      {projRooms.length === 0 ? (
        <div className="py-12 text-center bg-slate-800/40 rounded-2xl border border-dashed border-slate-700">
          <p className="font-bold text-slate-300">טרם הוגדרו חדרים לפרויקט זה</p>
          {isManager && <p className="text-xs text-slate-500 mt-1">לחץ על ״הוסף חדר״ כדי להתחיל.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projRooms.map((room) => (
            <div key={room.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <h3 className="text-base font-bold text-white">{room.name}</h3>
                {isManager && <button type="button" disabled={busy} onClick={() => onRemoveRoom(room)} className="text-slate-500 hover:text-rose-400 p-1" title="מחק חדר" aria-label={`מחק את ${room.name}`}><Icon name="x" /></button>}
              </div>
              {room.systems.length === 0 && <p className="text-xs text-slate-500">עדיין לא הוגדרו מערכות בחדר זה.</p>}
              {room.systems.map((s) => (
                <div key={s.id} className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 text-xs space-y-1">
                  <div className="flex items-center justify-between"><span className="font-bold text-white">{s.name}</span><span className={`text-[10px] px-2 py-0.5 rounded-full ${roomStatusClass(s.status)}`}>{s.status}</span></div>
                  <p className="text-slate-400">{s.details}</p>
                  {s.installer && <p className="text-[11px] text-amber-400/90 pt-1">מתקין: {s.installer}</p>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

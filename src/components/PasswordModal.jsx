import { useState } from 'react';
import { sb } from '../lib/supabase';
import { Modal, Field, Spinner } from './ui';
import { INPUT, BTN, GHOST } from '../lib/constants';

// הגדרה או שינוי של סיסמה למשתמש המחובר, כדי שיוכל להיכנס גם בלי מייל
export default function PasswordModal({ onClose }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;

  const save = async (e) => {
    e.preventDefault();
    if (password.length < 8 || password !== confirm) return;
    setSaving(true);
    setError('');
    const { error: err } = await sb.auth.updateUser({ password });
    setSaving(false);
    if (!err) { setDone(true); return; }
    if (/different/i.test(err.message)) setError('זו כבר הסיסמה הנוכחית.');
    else if (/reauth/i.test(err.message)) setError('Supabase דורש אימות מחדש לשינוי סיסמה. התנתק, היכנס עם קוד במייל ונסה שוב.');
    else if (/weak|characters|at least/i.test(err.message)) setError('הסיסמה חלשה מדי. נסה סיסמה ארוכה יותר עם אותיות וספרות.');
    else setError('לא ניתן לשמור את הסיסמה. נסה שוב.');
  };

  return (
    <Modal title="סיסמת כניסה" onClose={() => { if (!saving) onClose(); }}>
      {done ? (
        <div className="space-y-3">
          <p className="text-sm text-emerald-400 font-bold">הסיסמה נשמרה.</p>
          <p className="text-xs text-slate-300">מעכשיו אפשר להיכנס גם עם אימייל וסיסמה, במסך הכניסה ← ״כניסה עם סיסמה״.</p>
          <div className="flex justify-end pt-3 border-t border-slate-800"><button type="button" onClick={onClose} className={BTN}>סגור</button></div>
        </div>
      ) : (
        <form onSubmit={save} className="space-y-3">
          <p className="text-xs text-slate-400">הגדר סיסמה כדי להיכנס בלי לחכות למייל. לפחות 8 תווים.</p>
          <Field label="סיסמה חדשה">
            <input type="password" required autoFocus dir="ltr" autoComplete="new-password" value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }} className={`${INPUT} text-left`} />
            {tooShort && <p className="text-amber-400 text-xs mt-1">לפחות 8 תווים.</p>}
          </Field>
          <Field label="אימות סיסמה">
            <input type="password" required dir="ltr" autoComplete="new-password" value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(''); }} className={`${INPUT} text-left`} />
            {mismatch && <p className="text-amber-400 text-xs mt-1">הסיסמאות לא זהות.</p>}
          </Field>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button type="button" onClick={onClose} disabled={saving} className={GHOST}>ביטול</button>
            <button type="submit" disabled={saving || password.length < 8 || password !== confirm} className={BTN}>{saving && <Spinner className="w-4 h-4" />}שמור סיסמה</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

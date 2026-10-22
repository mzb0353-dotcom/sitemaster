import { useState } from 'react';
import { sb } from '../lib/supabase';
import Icon from '../components/Icon';
import { Field, Spinner } from '../components/ui';
import { INPUT, BTN } from '../lib/constants';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError('');
    const { error: err } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + window.location.pathname }
    });
    setSending(false);
    if (err) {
      setError(/rate|seconds/i.test(err.message) ? 'נשלחו יותר מדי בקשות. המתן דקה ונסה שוב.' : 'לא ניתן לשלוח קישור. ודא שהאימייל מוזמן למערכת, או פנה למנהל.');
      return;
    }
    setSentTo(email.trim());
  };

  return (
    <div className="min-h-screen text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-800/80 border border-slate-700 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-slate-950 p-2 rounded-xl"><Icon name="hat" className="w-6 h-6" /></div>
          <div>
            <span className="font-black text-lg tracking-wider text-white">SITEMASTER</span>
            <span className="text-amber-400 font-bold text-xs mr-1">PRO</span>
            <p className="text-[10px] text-slate-400 -mt-1">כניסה למערכת</p>
          </div>
        </div>
        {sentTo ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm"><Icon name="mail" className="w-5 h-5" />הקישור נשלח</div>
            <p className="text-slate-300 text-xs leading-relaxed">
              שלחנו קישור כניסה אל <span dir="ltr" className="font-bold text-white">{sentTo}</span>. פתח אותו בדפדפן הרגיל של הטלפון (Chrome או Safari). אם לא הגיע, בדוק בספאם.
            </p>
            <button type="button" onClick={() => setSentTo('')} className="text-xs text-amber-400 hover:underline">שלח שוב או החלף אימייל</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Field label="אימייל">
              <input type="email" required autoFocus dir="ltr" value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="name@example.com" className={`${INPUT} text-left`} />
            </Field>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button type="submit" disabled={sending} className={`${BTN} w-full py-2.5`}>
              {sending && <Spinner className="w-4 h-4" />}שלח לי קישור כניסה
            </button>
            <p className="text-[11px] text-slate-500">הכניסה למוזמנים בלבד. אין צורך בסיסמה.</p>
          </form>
        )}
      </div>
    </div>
  );
}

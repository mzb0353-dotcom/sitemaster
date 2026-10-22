import { useState } from 'react';
import { sb } from '../lib/supabase';
import Icon from '../components/Icon';
import Brand from '../components/Brand';
import { Field, Spinner } from '../components/ui';
import { INPUT, BTN } from '../lib/constants';

// שתי דרכי כניסה מאותו מייל: הקישור (בדפדפן) או הקוד. באפליקציה שמותקנת על מסך הבית
// באייפון הקישור נפתח ב-Safari ולא באפליקציה, ולכן שם נכנסים עם הקוד.

// קישור שפג תוקפו או כבר נוצל חוזר לאפליקציה עם error_description ב-hash או ב-query
function readLinkError() {
  const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search.slice(1));
  const code = params.get('error_code') || params.get('error');
  if (!code) return '';
  window.history.replaceState(null, '', window.location.pathname);
  return /expired|invalid|denied/i.test(`${code} ${params.get('error_description') || ''}`)
    ? 'קישור הכניסה פג תוקף או כבר נוצל. שלח קישור חדש.'
    : 'הכניסה דרך הקישור נכשלה. שלח קישור חדש.';
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(readLinkError);
  const [mode, setModeState] = useState(() => { try { return localStorage.getItem('mt-login-mode') || 'email'; } catch { return 'email'; } });
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const setMode = (m) => {
    setModeState(m); setError(''); setSentTo('');
    try { localStorage.setItem('mt-login-mode', m); } catch { /* מצב פרטי */ }
  };

  // כניסה עם סיסמה: לא תלויה בשליחת מיילים (במכסה החינמית של Supabase יש מעט מיילים לשעה)
  const signInPassword = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSigningIn(true);
    setError('');
    const { error: err } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    setSigningIn(false);
    if (!err) return;
    if (/invalid login credentials/i.test(err.message)) setError('אימייל או סיסמה שגויים. אם עדיין לא הגדרת סיסמה, היכנס עם קוד במייל והגדר אותה מתוך האפליקציה.');
    else if (/not confirmed/i.test(err.message)) setError('האימייל עדיין לא אומת. היכנס פעם אחת עם קוד במייל.');
    else if (/rate|seconds/i.test(err.message)) setError('יותר מדי ניסיונות. המתן דקה ונסה שוב.');
    else setError('הכניסה נכשלה. נסה שוב.');
  };

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
      setError(/rate|seconds/i.test(err.message) ? 'נשלחו יותר מדי בקשות. המתן דקה ונסה שוב.' : 'לא ניתן לשלוח קוד. ודא שהאימייל מוזמן למערכת, או פנה למנהל.');
      return;
    }
    setSentTo(email.trim());
    setCode('');
  };

  const verify = async (e) => {
    e.preventDefault();
    const token = code.replace(/\D/g, '');
    if (token.length < 6) return;
    setVerifying(true);
    setError('');
    const { error: err } = await sb.auth.verifyOtp({ email: sentTo, token, type: 'email' });
    setVerifying(false);
    // בהצלחה onAuthStateChange ב-App מעביר לסביבת העבודה
    // Supabase מחזיר את אותה שגיאה לקוד שגוי ולקוד שפג תוקפו
    if (err) setError(/rate|seconds/i.test(err.message) ? 'יותר מדי ניסיונות. המתן דקה ונסה שוב.' : 'הקוד שגוי או שפג תוקפו. בדוק את המייל האחרון, או שלח קוד חדש.');
  };

  const restart = () => { setSentTo(''); setCode(''); setError(''); };

  return (
    <div className="min-h-screen text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-800/80 border border-slate-700 rounded-2xl p-6 space-y-5 shadow-xl">
        <Brand />
        {mode === 'password' ? (
          <form onSubmit={signInPassword} className="space-y-3">
            <Field label="אימייל">
              <input type="email" required autoFocus dir="ltr" value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="name@example.com" autoComplete="username" className={`${INPUT} text-left`} />
            </Field>
            <Field label="סיסמה">
              <input type="password" required dir="ltr" value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password" className={`${INPUT} text-left`} />
            </Field>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button type="submit" disabled={signingIn || !email.trim() || !password} className={`${BTN} w-full py-2.5`}>
              {signingIn && <Spinner className="w-4 h-4" />}כניסה
            </button>
            <button type="button" onClick={() => setMode('email')} className="text-xs text-amber-400 hover:underline">כניסה עם קוד במייל</button>
          </form>
        ) : sentTo ? (
          <form onSubmit={verify} className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm"><Icon name="mail" className="w-5 h-5" />שלחנו לך מייל</div>
            <p className="text-slate-300 text-xs leading-relaxed">
              שלחנו מייל אל <span dir="ltr" className="font-bold text-white">{sentTo}</span>. לחץ על הקישור שבמייל,
              או הזן כאן את קוד הספרות שמופיע בו. באפליקציה שמותקנת על מסך הבית — השתמש בקוד. אם המייל לא הגיע, בדוק בספאם.
            </p>
            <input
              value={code} onChange={(e) => { setCode(e.target.value); setError(''); }}
              inputMode="numeric" autoComplete="one-time-code" autoFocus dir="ltr" maxLength={10} placeholder="••••••"
              aria-label="קוד כניסה" className={`${INPUT} text-center text-xl tracking-[0.4em] font-bold`}
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button type="submit" disabled={verifying || code.replace(/\D/g, '').length < 6} className={`${BTN} w-full py-2.5`}>
              {verifying && <Spinner className="w-4 h-4" />}כניסה
            </button>
            <button type="button" onClick={restart} className="text-xs text-amber-400 hover:underline">שלח שוב או החלף אימייל</button>
          </form>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Field label="אימייל">
              <input type="email" required autoFocus dir="ltr" value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="name@example.com" autoComplete="email" className={`${INPUT} text-left`} />
            </Field>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button type="submit" disabled={sending} className={`${BTN} w-full py-2.5`}>
              {sending && <Spinner className="w-4 h-4" />}שלח לי קישור וקוד כניסה
            </button>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-slate-500">הכניסה למוזמנים בלבד.</p>
              <button type="button" onClick={() => setMode('password')} className="text-xs text-amber-400 hover:underline">כניסה עם סיסמה</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

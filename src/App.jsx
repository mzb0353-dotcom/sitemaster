import { useState, useEffect } from 'react';
import { sb } from './lib/supabase';
import { FullScreenLoader } from './components/ui';
import LoginScreen from './screens/LoginScreen';
import Workspace from './screens/Workspace';

// שער התחברות: סשן → פרופיל → סביבת העבודה
export default function App() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileDetail, setProfileDetail] = useState('');

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session)).catch(() => setSession(null));
    const { data } = sb.auth.onAuthStateChange((_event, s) => setSession(s));
    // לחיצה על הקישור מהמייל פותחת לשונית חדשה שנכנסת למערכת; הלשונית שחיכתה במסך הקוד
    // קולטת את הסשן כשחוזרים אליה (הסשן נשמר ב-localStorage המשותף).
    const resync = () => {
      if (document.visibilityState !== 'visible') return;
      sb.auth.getSession().then(({ data: d }) => { if (d.session) setSession(d.session); }).catch(() => {});
    };
    const onStorage = (e) => { if (!e.key || e.key.includes('-auth-token')) resync(); };
    document.addEventListener('visibilitychange', resync);
    window.addEventListener('storage', onStorage);
    return () => {
      data.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', resync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const userId = session && session.user && session.user.id;

  useEffect(() => {
    setProfile(null); setProfileError(''); setProfileDetail('');
    if (!userId) return undefined;
    let cancelled = false;
    const fetchProfile = () => sb.from('profiles').select('id, full_name, role, company, phone').eq('id', userId).maybeSingle();
    (async () => {
      let { data, error } = await fetchProfile();
      let rpcError = null;
      // אין פרופיל (למשל משתמש שנוצר לפני הטריגר): השרת יוצר אותו לפי האימייל המאומת.
      if (!error && !data) {
        ({ error: rpcError } = await sb.rpc('ensure_my_profile'));
        if (!rpcError) ({ data, error } = await fetchProfile());
      }
      if (cancelled) return;
      if (data) { setProfile(data); return; }
      setProfileError('לא ניתן לטעון את הפרופיל שלך. ייתכן שהחשבון עדיין לא הוגדר, פנה למנהל.');
      // פרטים טכניים לאבחון (מה Supabase החזיר)
      const e = error || rpcError;
      setProfileDetail(e ? `${e.code || ''} ${e.message || ''}`.trim() : 'no profile row');
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (session === undefined) return <FullScreenLoader />;
  if (!session) return <LoginScreen />;
  if (profileError) {
    return (
      <div className="min-h-screen text-slate-100 flex flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-sm text-red-400 max-w-sm">{profileError}</p>
        <p dir="ltr" className="text-[11px] text-slate-500 font-mono max-w-sm break-all">
          {session.user.email} · {userId}{profileDetail && <><br />{profileDetail}</>}
        </p>
        <div className="flex gap-4">
          <button type="button" onClick={() => window.location.reload()} className="text-xs text-amber-400">נסה שוב</button>
          <button type="button" onClick={() => sb.auth.signOut()} className="text-xs text-amber-400">התנתק</button>
        </div>
      </div>
    );
  }
  if (!profile) return <FullScreenLoader />;
  return <Workspace profile={profile} />;
}

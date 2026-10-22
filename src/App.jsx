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
    setProfile(null); setProfileError('');
    if (!userId) return undefined;
    let cancelled = false;
    const fetchProfile = () => sb.from('profiles').select('id, full_name, role, company, phone').eq('id', userId).maybeSingle();
    (async () => {
      let { data, error } = await fetchProfile();
      // אין פרופיל (למשל משתמש שנוצר לפני הטריגר): השרת יוצר אותו לפי האימייל המאומת.
      if (!error && !data) {
        const rpc = await sb.rpc('ensure_my_profile');
        if (!rpc.error) ({ data, error } = await fetchProfile());
      }
      if (cancelled) return;
      if (error || !data) setProfileError('לא ניתן לטעון את הפרופיל שלך. ייתכן שהחשבון עדיין לא הוגדר, פנה למנהל.');
      else setProfile(data);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (session === undefined) return <FullScreenLoader />;
  if (!session) return <LoginScreen />;
  if (profileError) {
    return (
      <div className="min-h-screen text-slate-100 flex flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-sm text-red-400 max-w-sm">{profileError}</p>
        <button type="button" onClick={() => sb.auth.signOut()} className="text-xs text-amber-400">התנתק</button>
      </div>
    );
  }
  if (!profile) return <FullScreenLoader />;
  return <Workspace profile={profile} />;
}

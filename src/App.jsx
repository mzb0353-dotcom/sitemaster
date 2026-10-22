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
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session && session.user && session.user.id;

  useEffect(() => {
    setProfile(null); setProfileError('');
    if (!userId) return undefined;
    let cancelled = false;
    sb.from('profiles').select('id, full_name, role, company, phone').eq('id', userId).single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setProfileError('לא ניתן לטעון את הפרופיל שלך. ייתכן שהחשבון עדיין לא הוגדר, פנה למנהל.');
        else setProfile(data);
      });
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

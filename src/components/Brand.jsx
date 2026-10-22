// הלוגו הרשמי (brand/mt-master-logo.jpg); האייקונים ב-public/icons נוצרים ממנו ע"י scripts/make_icons.py
const LOGO_SRC = `${import.meta.env.BASE_URL}icons/logo-256.png`;

export function Logo({ className = 'w-10 h-10' }) {
  return <img src={LOGO_SRC} alt="" aria-hidden="true" className={`${className} shrink-0`} />;
}

export default function Brand() {
  return (
    <div className="flex items-center gap-3">
      <Logo />
      <div className="leading-tight">
        <div dir="ltr" className="text-right">
          <span className="font-black text-lg tracking-wider text-white">M.T MASTER</span>
          <span className="text-amber-400 font-bold text-xs ml-1">PRO</span>
        </div>
        <p className="text-[10px] text-slate-400">ניהול פרויקטים</p>
      </div>
    </div>
  );
}

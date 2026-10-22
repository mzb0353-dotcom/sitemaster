// סמל M.T עם קסדה; אותו ציור כמו public/icons/logo.svg (שממנו נוצרים אייקוני מסך הבית)
export function Logo({ className = 'w-10 h-10' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#f59e0b" />
      <path d="M17 25a15 13 0 0 1 30 0z" fill="#0f172a" />
      <path d="M32 13v8" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 26.5h40" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
      <g fill="none" stroke="#0f172a" strokeWidth="4.5" strokeLinecap="square" strokeLinejoin="round">
        <path d="M14 52V35l9 9 9-9v17" />
        <path d="M32 35h18M41 35v17" />
      </g>
    </svg>
  );
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

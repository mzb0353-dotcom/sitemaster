import Icon from './Icon';

export default function Thumb({ src, title, tone, emptyText, onOpen }) {
  const tones = { red: ['text-rose-400', 'border-rose-500/40'], green: ['text-emerald-400', 'border-emerald-500/40'] };
  const [textCls, borderCls] = tones[tone];
  return (
    <div>
      <span className={`text-[10px] font-bold block mb-1 ${textCls}`}>{title}</span>
      {src ? (
        <button type="button" onClick={onOpen} className={`group w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border relative block ${borderCls}`}>
          <img src={src} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"><Icon name="eye" className="w-5 h-5" /></div>
        </button>
      ) : (
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 flex flex-col items-center justify-center text-slate-500 text-center p-2">
          <Icon name="camera" className="w-6 h-6 mb-1 text-slate-600" /><span className="text-[10px]">{emptyText}</span>
        </div>
      )}
    </div>
  );
}

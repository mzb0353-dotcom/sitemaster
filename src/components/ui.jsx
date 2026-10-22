import Icon from './Icon';

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 text-right space-y-4 shadow-xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="font-bold text-sm text-white">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="סגור">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div>
      <label className="block text-slate-400 mb-1 text-xs">{label}</label>
      {children}
    </div>
  );
}

export function Spinner({ className = 'w-5 h-5 text-amber-500' }) {
  return <Icon name="loader" className={`${className} animate-spin`} />;
}

export function FullScreenLoader() {
  return <div className="min-h-screen flex items-center justify-center"><Spinner className="w-8 h-8 text-amber-500" /></div>;
}

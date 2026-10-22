import Icon from '../components/Icon';
import { BTN, STATUS_LABELS } from '../lib/constants';

export default function ReportTab({ project, projDefects }) {
  return (
    <div className="space-y-3">
      <div className="max-w-4xl mx-auto flex justify-end no-print"><button type="button" onClick={() => window.print()} className={BTN}><Icon name="printer" />הדפס / שמור כ-PDF</button></div>
      <div className="bg-white text-slate-900 rounded-2xl p-6 shadow-2xl max-w-4xl mx-auto space-y-5">
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 gap-3">
          <div><h2 className="text-xl font-black">פרוטוקול מסירה ובקרת ליקויים</h2><p className="text-xs text-slate-600 mt-1">מסמך בדיקה רשמי לקבלנים ומזמיני עבודה</p></div>
          <div className="text-xs"><p><strong>פרויקט:</strong> {project.name}</p><p><strong>כתובת:</strong> {project.address}</p><p><strong>תאריך:</strong> {new Date().toLocaleDateString('en-GB')}</p></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border border-slate-300">
            <thead className="bg-slate-100 border-b border-slate-300"><tr>{['חדר', 'ליקוי', 'קבלן', 'סטטוס', 'אישור מנהל'].map((h) => <th key={h} className="p-2 border-l border-slate-300">{h}</th>)}</tr></thead>
            <tbody>
              {projDefects.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-500">אין ליקויים רשומים בפרויקט זה</td></tr>}
              {projDefects.map((d) => (
                <tr key={d.id} className="border-b border-slate-200">
                  <td className="p-2 border-l border-slate-200 font-bold">{d.room}</td><td className="p-2 border-l border-slate-200">{d.title}</td>
                  <td className="p-2 border-l border-slate-200">{d.contractor}</td><td className="p-2 border-l border-slate-200">{STATUS_LABELS[d.status]}</td>
                  <td className="p-2 font-medium">{d.approvedBy || 'טרם אושר'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-center">
          <div><div className="border-b border-slate-400 pb-8 mb-2"></div><p className="font-bold">חתימת מנהל הפרויקט</p></div>
          <div><div className="border-b border-slate-400 pb-8 mb-2"></div><p className="font-bold">חתימת הקבלן המבצע</p></div>
        </div>
      </div>
    </div>
  );
}

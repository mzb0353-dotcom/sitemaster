export const fmtDate = (iso) => (iso ? iso.split('T')[0].split('-').reverse().join('/') : '');

export const explainError = (err) => {
  if (!err) return 'שגיאה לא ידועה';
  if (err.code === '23505') return 'כבר קיימת רשומה כזו (שם כפול).';
  if (err.code === '42501' || /row-level security/i.test(err.message || '')) return 'אין לך הרשאה לבצע פעולה זו.';
  return err.message || 'שגיאה לא צפויה';
};

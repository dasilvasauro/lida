// Relógio central do Lida. No modo demo é possível avançar o "hoje" em dias, para ver
// a virada do dia, resumos e punições sem esperar.
const KEY = 'lida.clockOffset';
let offset = 0;

export function initClock(testMode) {
  try {
    offset = testMode ? Number(localStorage.getItem(KEY) || 0) : 0;
  } catch {
    offset = 0;
  }
}
export const nowMs = () => Date.now() + offset * 86400000;
export const now = () => new Date(nowMs());
export function today() {
  const d = now();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function shiftDays(n) {
  offset += n;
  try {
    localStorage.setItem(KEY, String(offset));
  } catch {
    /* sem armazenamento */
  }
}
export function resetClock() {
  offset = 0;
  try {
    localStorage.setItem(KEY, '0');
  } catch {
    /* sem armazenamento */
  }
}
export const clockOffset = () => offset;

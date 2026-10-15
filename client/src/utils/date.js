// 'YYYY-MM-DD' de hoje no fuso do aparelho.
// Não use new Date().toISOString() para isso: ele está em UTC e, no Brasil,
// vira o dia seguinte a partir das 21h.
export function todayLocal() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

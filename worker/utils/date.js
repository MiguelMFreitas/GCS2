// Datas no fuso de Brasília.
// O Worker roda em UTC: new Date().toISOString() vira o dia seguinte a partir das 21h
// no Brasil, e getDay()/getDate() também usam UTC. Use estes helpers para "hoje".

const BR_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

// 'YYYY-MM-DD' de hoje no horário de Brasília
export function todayBR() {
  return BR_DATE_FORMAT.format(new Date());
}

// Segunda e domingo (YYYY-MM-DD) da semana de dateStr, ou da semana atual em Brasília
export function getMondayAndSunday(dateStr) {
  const [y, m, d] = (dateStr || todayBR()).split('-').map(Number);
  // Meio-dia UTC evita qualquer virada de dia ao somar/subtrair dias
  const target = new Date(Date.UTC(y, m - 1, d, 12));
  const day = target.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(target);
  monday.setUTCDate(target.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const formatYMD = (dt) => dt.toISOString().split('T')[0];

  return {
    startDate: formatYMD(monday),
    endDate: formatYMD(sunday)
  };
}

export const pad2 = (n: number) => String(n).padStart(2, '0');

export const formatDate = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const parseDate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const daysBetween = (start: string, end: string): number => {
  const a = parseDate(start).getTime();
  const b = parseDate(end).getTime();
  return Math.round((b - a) / 86400000) + 1;
};

export const addDays = (s: string, n: number): string => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return formatDate(d);
};

export const buildSeasonalDate = (year: number, month: number, day: number): Date =>
  new Date(year, month - 1, day);

export const formatDateShort = (s: string): string => {
  const [y, m, d] = s.split('-');
  return `${m}/${d}`;
};

export const formatDateCN = (s: string): string => {
  const [y, m, d] = s.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
};

export const getYearMonth = (s: string): string => {
  const [y, m] = s.split('-');
  return `${y}-${m}`;
};

export const currentPeriod = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};

export const formatMoney = (n: number): string => {
  if (!isFinite(n)) n = 0;
  return '¥' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const formatMoneyPlain = (n: number): string => {
  if (!isFinite(n)) n = 0;
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const formatPercent = (n: number): string => {
  return (n * 100).toFixed(1).replace(/\.0$/, '') + '%';
};

export const uid = (): string =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

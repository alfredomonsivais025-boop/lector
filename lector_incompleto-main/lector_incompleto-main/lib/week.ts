export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getISOYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

export function getWeekLabel(year: number, week: number): string {
  return `Semana ${week} - ${year}`;
}

export function getNextSundayEarlyMorning(): Date {
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + daysUntilSunday);
  sunday.setHours(3, 0, 0, 0);
  if (sunday <= now) {
    sunday.setDate(sunday.getDate() + 7);
  }
  return sunday;
}

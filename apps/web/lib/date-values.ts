export function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function nextLocalDateValue(now = new Date()) {
  const nextDate = new Date(now);
  nextDate.setDate(nextDate.getDate() + 1);
  return localDateValue(nextDate);
}

export function nextDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;

  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  return nextDate.toISOString().slice(0, 10);
}

export function isFutureLocalDateValue(value: string, now = new Date()) {
  return value > localDateValue(now);
}

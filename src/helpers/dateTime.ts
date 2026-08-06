/** Format date/time for MarcomBox metadata fields (MM/DD/YYYY HH:mm). */
export function formatDateTime(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${month}/${day}/${year} ${hours}:${minutes}`;
}

export function updatedDateTime(date: Date = new Date()): string {
  const updated = new Date(date.getTime() + 60 * 60 * 1000);
  return formatDateTime(updated);
}

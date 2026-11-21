const n = (v: number) => v.toLocaleString('en-PH');

export const sacks = (v: number) => `${n(v)} ${v === 1 ? 'sack' : 'sacks'}`;
export const kg = (v: number) => `${n(v)} kg`;
export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
export const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { dateStyle: 'medium' });

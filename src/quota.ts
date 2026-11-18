// Free plan: up to FREE_EXPORTS_PER_DAY exports (print, PDF share, e-invoice XML) per local calendar day.
// Pro: unlimited. The counter lives on the device, so it resets at local midnight.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const FREE_EXPORTS_PER_DAY = 5;
const KEY = 'quoivo.exports.today';

type Counter = { day: string; count: number };

function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function readCounter(): Promise<Counter> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Counter;
      if (parsed.day === todayKey()) return parsed;
    }
  } catch {
    // Unreadable counter is treated as a fresh day.
  }
  return { day: todayKey(), count: 0 };
}

export async function exportsLeftToday(): Promise<number> {
  const c = await readCounter();
  return Math.max(FREE_EXPORTS_PER_DAY - c.count, 0);
}

// Call after a successful export on the Free plan.
export async function recordExport(): Promise<void> {
  const c = await readCounter();
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ day: c.day, count: c.count + 1 }));
  } catch {
    // If storage fails the export still went through; the limit is best-effort on device.
  }
}

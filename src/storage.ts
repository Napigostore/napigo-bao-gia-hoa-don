// Local-only storage with AsyncStorage. Every read/write is guarded so a failure never crashes the app.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DocKind, Status, LineItem } from './calc.ts';

export type Doc = {
  id: string;
  kind: DocKind;
  no: string;
  client: string;
  note: string;
  items: LineItem[];
  discountPct: number;
  taxPct: number;
  status: Status;
  templateId?: string;
  createdAt: string;
};
export type Db = { docs: Doc[]; counters: Record<DocKind, number> };

const KEY = 'napigo-app-a-v1';
const EMPTY: Db = { docs: [], counters: { QUO: 0, INV: 0 } };

export async function loadDb(): Promise<Db> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Db;
    return { docs: parsed.docs ?? [], counters: parsed.counters ?? { QUO: 0, INV: 0 } };
  } catch {
    return EMPTY;
  }
}

export async function saveDb(db: Db): Promise<boolean> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(db));
    return true;
  } catch {
    return false;
  }
}

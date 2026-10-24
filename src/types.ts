export interface Box { x: number; y: number; width: number; height: number }
export interface Puzzle { id: string; category: string; title: string; instruction?: string; components?: (Box & { component: string; assetId?: string; content?: { assetId: string; type: string; value?: string } })[]; operators?: Box[]; countFrame?: Box; legend?: Box & { order: string[]; suffix: string } }
export interface Session { id: string; name: string; status: string; round: number; correct: number; elapsedMs: number; puzzle: Puzzle | null; score: number; totalRounds: number }
export interface Leader { id: string; rank: number; name: string; correct: number; elapsedMs: number }
export interface Settings { idleTimeoutSeconds: number; resultTimeoutSeconds: number; maxGameSeconds: number; scoringMode: string }
export const formatTime = (ms: number) => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
export async function api<T>(path: string, data?: unknown): Promise<T> {
 const r = await fetch('/api' + path, data === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
 const body = await r.json(); if (!r.ok) throw new Error(body.error || 'Please try again.'); return body;
}

import type { VercelRequest, VercelResponse } from '@vercel/node';

export type Handler = (req: VercelRequest, res: VercelResponse) => void | Promise<void>;

export function ok(res: VercelResponse, data: unknown) {
  return res.status(200).json(data);
}

export function created(res: VercelResponse, data: unknown) {
  return res.status(201).json(data);
}

export function notFound(res: VercelResponse, msg = 'Not found') {
  return res.status(404).json({ error: msg });
}

export function badRequest(res: VercelResponse, msg: string) {
  return res.status(400).json({ error: msg });
}

export function serverError(res: VercelResponse, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error('[API Error]', message);
  return res.status(500).json({ error: message });
}

export function generateRef(prefix: string): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `${prefix}-${year}-${rand}`;
}

export function allowMethods(res: VercelResponse, methods: string[]) {
  res.setHeader('Allow', methods.join(', '));
  return res.status(405).json({ error: `Method not allowed. Use: ${methods.join(', ')}` });
}

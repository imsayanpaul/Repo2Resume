import { handleGemini, sendResult } from '../server/handlers.js';

// A busy model plus one corrective pass can take over a minute
export const config = { maxDuration: 120 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendResult(res, { status: 405, json: { error: 'Use POST.' } });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  sendResult(res, await handleGemini(body, process.env));
}

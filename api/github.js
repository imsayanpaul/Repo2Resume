import { handleGithub, sendResult } from '../server/handlers.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendResult(res, { status: 405, json: { error: 'Use GET.' } });
  sendResult(res, await handleGithub(req.query || {}, process.env));
}

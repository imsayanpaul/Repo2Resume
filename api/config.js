import { handleConfig, sendResult } from '../server/handlers.js';

export default function handler(req, res) {
  sendResult(res, handleConfig(process.env));
}

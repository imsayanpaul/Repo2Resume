// Repo2Resume
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleConfig, handleGenerate, handleGithub, sendResult } from './server/handlers.js';

/**
 * Serves the /api functions during `npm run dev`, mirroring Vercel.
 * Keys are read from .env.local without the VITE_ prefix, so they stay server-side.
 */
function apiDevServer(env) {
  return {
    name: 'repo2resume-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        try {
          if (url.pathname === '/api/config') return sendResult(res, handleConfig(env));
          if (url.pathname === '/api/github') return sendResult(res, await handleGithub(Object.fromEntries(url.searchParams), env));
          if (url.pathname === '/api/generate' && req.method === 'POST') {
            let raw = '';
            for await (const chunk of req) raw += chunk;
            return sendResult(res, await handleGenerate(JSON.parse(raw || '{}'), env));
          }
        } catch (err) {
          return sendResult(res, { status: 500, json: { error: err.message } });
        }
        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), apiDevServer({ GROQ_API_KEY: env.GROQ_API_KEY, GEMINI_API_KEY: env.GEMINI_API_KEY, GITHUB_TOKEN: env.GITHUB_TOKEN })],
    server: {
      port: 3000,
      open: true
    }
  };
});

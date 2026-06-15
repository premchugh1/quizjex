/**
 * QuizJex Server Configuration
 * ─────────────────────────────
 * All tunable values live here.
 * Secrets come from .env — never hardcode them.
 */

require('dotenv').config();

const config = {
  // ── Server ────────────────────────────────────────────────────────────────
  port: parseInt(process.env.PORT, 10) || 3001,

  // ── Azure OpenAI ──────────────────────────────────────────────────────────
  azure: {
    endpoint:   process.env.AZURE_OPENAI_ENDPOINT,
    apiKey:     process.env.AZURE_OPENAI_API_KEY,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT  || 'gpt-4.1',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
  },

  // ── Game rules ────────────────────────────────────────────────────────────
  game: {
    minQuestions:      5,    // minimum selectable question count
    maxQuestions:      10,   // maximum selectable question count
    roomCodeLength:    4,    // digits in the join code
    roomCloseDelaySec: 5,    // seconds before a host-abandoned room is deleted
  },

  // ── CORS ──────────────────────────────────────────────────────────────────
  // Set to your deployed client URL in production, '*' for local dev
  clientOrigin: process.env.CLIENT_ORIGIN || '*',
};

module.exports = config;

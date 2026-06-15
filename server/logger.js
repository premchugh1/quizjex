/**
 * QuizJex Session Logger
 * ─────────────────────
 * Creates one log file per server startup under ./logs/
 * File name: YYYY-MM-DD_HH-MM-SS.log
 *
 * Usage:
 *   const log = require('./logger');
 *   log.info('Room created', { code, topic, questionCount });
 *   log.warn('Join rejected', { code, reason: 'game already started' });
 *   log.error('Azure OpenAI failed', { message: err.message, stack: err.stack });
 */

const fs   = require('fs');
const path = require('path');

// ── Setup log directory & file ──────────────────────────────────────────────
const LOGS_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

const startedAt  = new Date();
const fileStamp  = startedAt.toISOString().slice(0, 19).replace(/:/g, '-');   // 2026-06-15_09-30-00
const LOG_FILE   = path.join(LOGS_DIR, `${fileStamp}.log`);
const stream     = fs.createWriteStream(LOG_FILE, { flags: 'a' });

// ── Helper ──────────────────────────────────────────────────────────────────
function now() {
  return new Date().toISOString();
}

function write(level, msg, meta) {
  const metaPart = meta ? '  ' + JSON.stringify(meta) : '';
  const line     = `[${now()}] [${level.padEnd(5)}] ${msg}${metaPart}`;
  stream.write(line + '\n');
  // Mirror to console with colour hint
  if (level === 'ERROR') {
    console.error(line);
  } else if (level === 'WARN') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────
const log = {
  info  : (msg, meta) => write('INFO',  msg, meta),
  warn  : (msg, meta) => write('WARN',  msg, meta),
  error : (msg, meta) => write('ERROR', msg, meta),
  /** Log the file path so you know where to look */
  filePath: LOG_FILE,
};

// Banner written once at startup
stream.write(`\n${'='.repeat(80)}\n`);
stream.write(`  QuizJex Server Session — started ${startedAt.toISOString()}\n`);
stream.write(`  Log file : ${LOG_FILE}\n`);
stream.write(`${'='.repeat(80)}\n\n`);

module.exports = log;

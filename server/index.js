const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const config = require('./config');
const log = require('./logger');

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: config.clientOrigin, methods: ['GET', 'POST'] },
});

// -- SQLite setup -------------------------------------------------------------
const DB_PATH = path.join(__dirname, 'rooms.db');
const db = new Database(DB_PATH);
db.exec(`CREATE TABLE IF NOT EXISTS rooms (
  code TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)`);
// Clean up rooms older than 3 hours on startup
db.prepare('DELETE FROM rooms WHERE updated_at < ?').run(Date.now() - 3 * 60 * 60 * 1000);
log.info('SQLite ready', { path: DB_PATH });
console.log('SQLite ready: ' + DB_PATH);

// -- Room storage helpers -----------------------------------------------------
function roomToObj(room) {
  return { ...room, players: Object.fromEntries(room.players), answers: Object.fromEntries(room.answers) };
}
function objToRoom(obj) {
  return { ...obj, players: new Map(Object.entries(obj.players)), answers: new Map(Object.entries(obj.answers)) };
}

const getStmt  = db.prepare('SELECT data FROM rooms WHERE code = ?');
const setStmt  = db.prepare('INSERT OR REPLACE INTO rooms (code, data, updated_at) VALUES (?, ?, ?)');
const delStmt  = db.prepare('DELETE FROM rooms WHERE code = ?');
const cntStmt  = db.prepare('SELECT COUNT(*) as n FROM rooms');

function getRoom(code) {
  const row = getStmt.get(code);
  return row ? objToRoom(JSON.parse(row.data)) : null;
}
function saveRoom(code, room) {
  setStmt.run(code, JSON.stringify(roomToObj(room)), Date.now());
}
function deleteRoom(code) {
  delStmt.run(code);
}
function roomCount() {
  return cntStmt.get().n;
}
function generateCode() {
  let code;
  do { code = Math.floor(1000 + Math.random() * 9000).toString(); }
  while (getRoom(code));
  return code;
}

// -- Placeholder questions ----------------------------------------------------
const PLACEHOLDER_QUESTIONS = [
  { question: 'What is the capital of France?', options: ['A. Berlin', 'B. Madrid', 'C. Paris', 'D. Rome'], correct: 'C', explanation: 'Paris is the beautiful capital of France!' },
  { question: 'How many players are on a football team?', options: ['A. 9', 'B. 10', 'C. 11', 'D. 12'], correct: 'C', explanation: '11 players per team on the pitch!' },
  { question: 'What do you call a group of lions?', options: ['A. Pack', 'B. Herd', 'C. Flock', 'D. Pride'], correct: 'D', explanation: 'A group of lions is called a Pride!' },
  { question: 'How many strings does a standard guitar have?', options: ['A. 4', 'B. 5', 'C. 6', 'D. 7'], correct: 'C', explanation: 'A standard guitar has 6 strings!' },
  { question: 'What is the largest ocean on Earth?', options: ['A. Atlantic', 'B. Indian', 'C. Arctic', 'D. Pacific'], correct: 'D', explanation: 'The Pacific Ocean is the largest!' },
  { question: 'Which planet is known as the Red Planet?', options: ['A. Venus', 'B. Mars', 'C. Jupiter', 'D. Saturn'], correct: 'B', explanation: 'Mars is called the Red Planet!' },
  { question: 'Where was pizza invented?', options: ['A. France', 'B. Spain', 'C. Italy', 'D. Greece'], correct: 'C', explanation: 'Pizza was invented in Italy!' },
  { question: 'What is the largest animal on Earth?', options: ['A. Elephant', 'B. Giraffe', 'C. Great White Shark', 'D. Blue Whale'], correct: 'D', explanation: 'The Blue Whale is the largest animal ever!' },
  { question: 'How many rings are on the Olympic flag?', options: ['A. 3', 'B. 4', 'C. 5', 'D. 6'], correct: 'C', explanation: 'The Olympic flag has 5 colourful rings!' },
  { question: 'Which company made Minecraft?', options: ['A. Nintendo', 'B. Mojang', 'C. EA', 'D. Activision'], correct: 'B', explanation: 'Minecraft was made by Mojang!' },
];

async function generateQuestions(topic, count) {
  if (config.azure.apiKey) {
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({
        apiKey: config.azure.apiKey,
        baseURL: config.azure.endpoint + 'openai/deployments/' + config.azure.deployment,
        defaultHeaders: { 'api-key': config.azure.apiKey },
        defaultQuery: { 'api-version': config.azure.apiVersion },
      });
      const res = await openai.chat.completions.create({
        model: config.azure.deployment,
        messages: [
          { role: 'system', content: 'You are a fun quiz master for kids aged 7-14. Always return valid JSON only, nothing else.' },
          { role: 'user', content: 'Create exactly ' + count + ' multiple choice quiz questions about "' + topic + '" for kids aged 7-14. Make them fun and educational!\n\nReturn this exact JSON structure:\n{\n  "questions": [\n    {\n      "question": "Question text with a relevant emoji",\n      "options": ["A. option one", "B. option two", "C. option three", "D. option four"],\n      "correct": "A",\n      "explanation": "Fun brief explanation with emoji"\n    }\n  ]\n}' },
        ],
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(res.choices[0].message.content);
      const qs = Array.isArray(parsed) ? parsed : (parsed.questions || []);
      if (qs.length > 0) { log.info('AI questions generated', { topic, count: qs.length }); return qs.slice(0, count); }
    } catch (e) {
      log.error('Azure OpenAI failed -- using placeholders', { message: e.message, stack: e.stack });
    }
  }
  log.warn('No Azure key or AI failed -- serving placeholder questions', { topic, count });
  const shuffled = [...PLACEHOLDER_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// -- Socket.IO ----------------------------------------------------------------
io.on('connection', (socket) => {
  log.info('Client connected', { socketId: socket.id });

  socket.on('createRoom', async ({ topic, questionCount, leaderboardStyle, decoration, nickname, avatar }) => {
    log.info('createRoom request', { nickname, topic, questionCount, socketId: socket.id });
    socket.emit('loadingQuestions', { message: 'Generating ' + questionCount + ' questions about "' + topic + '"...' });
    try {
      const questions = await generateQuestions(topic, parseInt(questionCount, 10));
      const code = generateCode();
      const room = {
        code, hostId: socket.id, topic, questions, leaderboardStyle, decoration,
        players: new Map([[socket.id, { id: socket.id, nickname, avatar, score: 0, isHost: true }]]),
        currentQIndex: -1, gameState: 'lobby', answers: new Map(),
      };
      saveRoom(code, room);
      socket.join(code);
      socket.data.roomCode = code;
      socket.data.isHost = true;
      log.info('Room created', { code, topic, questionCount: questions.length, host: nickname });
      socket.emit('roomCreated', { code, questionCount: questions.length });
    } catch (err) {
      log.error('createRoom failed', { message: err.message, stack: err.stack });
      socket.emit('serverError', { message: 'Failed to create room. Please try again.' });
    }
  });

  socket.on('joinRoom', ({ code, nickname, avatar }) => {
    log.info('joinRoom request', { code, nickname, socketId: socket.id });
    const room = getRoom(code);
    if (!room) {
      log.warn('joinRoom failed -- room not found', { code, nickname, socketId: socket.id });
      socket.emit('joinError', { message: 'Room not found! Check your code.' });
      return;
    }
    if (room.gameState !== 'lobby') {
      log.warn('joinRoom failed -- game already started', { code, nickname });
      socket.emit('joinError', { message: 'Game already started! Try again next round.' });
      return;
    }
    room.players.set(socket.id, { id: socket.id, nickname, avatar, score: 0, isHost: false });
    saveRoom(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.isHost = false;
    const playerList = Array.from(room.players.values());
    log.info('Player joined lobby', { code, nickname, totalPlayers: room.players.size });
    io.to(code).emit('lobbyUpdate', { players: playerList });
    io.to(code).emit('playerJoined', { nickname, avatar, totalPlayers: room.players.size });
    socket.emit('joinSuccess', { code, players: playerList, decoration: room.decoration, topic: room.topic });
  });

  socket.on('startGame', ({ code }) => {
    const room = getRoom(code);
    if (!room || room.hostId !== socket.id) return;
    log.info('Game started', { code, topic: room.topic, playerCount: room.players.size });
    room.players.forEach((p) => { p.score = 0; });
    room.currentQIndex = 0;
    room.gameState = 'question';
    room.answers.clear();
    saveRoom(code, room);
    io.to(code).emit('gameStarted');
    broadcastQuestion(room);
  });

  function broadcastQuestion(room) {
    room.answers.clear();
    room.gameState = 'question';
    const q = room.questions[room.currentQIndex];
    saveRoom(room.code, room);
    log.info('Question broadcast', { code: room.code, questionIndex: room.currentQIndex, total: room.questions.length });
    io.to(room.code).emit('newQuestion', {
      questionIndex: room.currentQIndex,
      totalQuestions: room.questions.length,
      question: q.question,
      options: q.options,
    });
  }

  socket.on('submitAnswer', ({ code, answer }) => {
    const room = getRoom(code);
    if (!room || room.gameState !== 'question') return;
    if (room.answers.has(socket.id)) return;
    const q = room.questions[room.currentQIndex];
    const isCorrect = answer.toUpperCase() === q.correct.toUpperCase();
    room.answers.set(socket.id, { answer, isCorrect });
    const player = room.players.get(socket.id);
    log.info('Answer submitted', { code, nickname: player && player.nickname, answer, isCorrect });
    if (isCorrect && player) player.score += 1;
    saveRoom(code, room);
    socket.emit('answerFeedback', { isCorrect, correctAnswer: q.correct, yourAnswer: answer, explanation: q.explanation });
    const allAnswered = Array.from(room.players.keys()).every((id) => room.answers.has(id));
    if (allAnswered && room.players.size > 0) {
      log.info('All players answered -- auto-reveal', { code });
      revealAndBroadcast(room);
    }
  });

  function revealAndBroadcast(room) {
    room.gameState = 'reveal';
    const q = room.questions[room.currentQIndex];
    saveRoom(room.code, room);
    const scores = Array.from(room.players.values()).sort((a, b) => b.score - a.score).map((p) => ({ nickname: p.nickname, score: p.score, avatar: p.avatar }));
    io.to(room.code).emit('revealAnswer', { correctAnswer: q.correct, explanation: q.explanation, scores });
  }

  socket.on('nextQuestion', ({ code }) => {
    const room = getRoom(code);
    if (!room || room.hostId !== socket.id) return;
    room.currentQIndex++;
    if (room.currentQIndex >= room.questions.length) { endGame(room); }
    else if (room.leaderboardStyle === 'each') { showLeaderboard(room, false); }
    else { broadcastQuestion(room); }
  });

  function showLeaderboard(room, isFinal) {
    room.gameState = 'leaderboard';
    saveRoom(room.code, room);
    const sorted = Array.from(room.players.values()).sort((a, b) => b.score - a.score).map((p) => ({ nickname: p.nickname, score: p.score, avatar: p.avatar }));
    io.to(room.code).emit('showLeaderboard', { players: sorted, isFinal, nextQuestionIndex: room.currentQIndex, totalQuestions: room.questions.length });
  }

  socket.on('continueGame', ({ code }) => {
    const room = getRoom(code);
    if (!room || room.hostId !== socket.id) return;
    broadcastQuestion(room);
  });

  function endGame(room) {
    room.gameState = 'ended';
    saveRoom(room.code, room);
    const sorted = Array.from(room.players.values()).sort((a, b) => b.score - a.score).map((p) => ({ nickname: p.nickname, score: p.score, avatar: p.avatar }));
    log.info('Game ended', { code: room.code, winner: sorted[0] && sorted[0].nickname });
    io.to(room.code).emit('gameEnded', { players: sorted, totalQuestions: room.questions.length });
  }

  socket.on('playAgain', ({ code }) => {
    const room = getRoom(code);
    if (!room || room.hostId !== socket.id) return;
    room.currentQIndex = -1;
    room.gameState = 'lobby';
    room.answers.clear();
    room.players.forEach((p) => { p.score = 0; });
    saveRoom(code, room);
    io.to(room.code).emit('backToLobby', { players: Array.from(room.players.values()), decoration: room.decoration });
  });

  socket.on('disconnect', (reason) => {
    const code = socket.data && socket.data.roomCode;
    log.info('Client disconnected', { socketId: socket.id, reason, roomCode: code || 'none' });
    if (!code) return;
    const room = getRoom(code);
    if (!room) return;
    if (room.hostId === socket.id) {
      log.warn('Host disconnected -- closing room', { code, reason });
      io.to(code).emit('hostLeft', { message: 'The host left the game!' });
      setTimeout(() => deleteRoom(code), config.game.roomCloseDelaySec * 1000);
    } else {
      const leavingPlayer = room.players.get(socket.id);
      log.info('Player left lobby', { code, nickname: leavingPlayer && leavingPlayer.nickname });
      room.players.delete(socket.id);
      saveRoom(code, room);
      io.to(code).emit('lobbyUpdate', { players: Array.from(room.players.values()) });
    }
  });
});

app.get('/health', (_, res) => res.json({ ok: true, rooms: roomCount() }));

httpServer.listen(config.port, () => {
  log.info('QuizJex server started', { port: config.port, logFile: log.filePath });
  log.info('Azure OpenAI: ' + (config.azure.apiKey ? 'connected' : 'not configured -- using placeholders'));
  console.log('\nQuizJex running on http://localhost:' + config.port);
  console.log('Logging to: ' + log.filePath + '\n');
});

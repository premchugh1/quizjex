const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// In-memory room storage
const rooms = new Map();

function generateCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(code));
  return code;
}

// 10 fun placeholder questions used when no API key is set
const PLACEHOLDER_QUESTIONS = [
  { question: '🌍 What is the capital of France?', options: ['A. Berlin', 'B. Madrid', 'C. Paris', 'D. Rome'], correct: 'C', explanation: 'Paris is the beautiful capital of France! 🗼' },
  { question: '⚽ How many players are on a football team?', options: ['A. 9', 'B. 10', 'C. 11', 'D. 12'], correct: 'C', explanation: '11 players per team on the pitch! ⚽' },
  { question: '🦁 What do you call a group of lions?', options: ['A. Pack', 'B. Herd', 'C. Flock', 'D. Pride'], correct: 'D', explanation: 'A group of lions is called a Pride! 🦁' },
  { question: '🎵 How many strings does a standard guitar have?', options: ['A. 4', 'B. 5', 'C. 6', 'D. 7'], correct: 'C', explanation: 'A standard guitar has 6 strings! 🎸' },
  { question: '🌊 What is the largest ocean on Earth?', options: ['A. Atlantic', 'B. Indian', 'C. Arctic', 'D. Pacific'], correct: 'D', explanation: 'The Pacific Ocean is the largest! 🌊' },
  { question: '🚀 Which planet is known as the Red Planet?', options: ['A. Venus', 'B. Mars', 'C. Jupiter', 'D. Saturn'], correct: 'B', explanation: 'Mars is called the Red Planet! 🔴' },
  { question: '🍕 Where was pizza invented?', options: ['A. France', 'B. Spain', 'C. Italy', 'D. Greece'], correct: 'C', explanation: 'Pizza was invented in Italy! 🇮🇹' },
  { question: '🐳 What is the largest animal on Earth?', options: ['A. Elephant', 'B. Giraffe', 'C. Great White Shark', 'D. Blue Whale'], correct: 'D', explanation: 'The Blue Whale is the largest animal ever! 🐋' },
  { question: '🏅 How many rings are on the Olympic flag?', options: ['A. 3', 'B. 4', 'C. 5', 'D. 6'], correct: 'C', explanation: 'The Olympic flag has 5 colourful rings! 🏅' },
  { question: '🎮 Which company made Minecraft?', options: ['A. Nintendo', 'B. Mojang', 'C. EA', 'D. Activision'], correct: 'B', explanation: 'Minecraft was made by Mojang! ⛏️' },
];

async function generateQuestions(topic, count) {
  if (process.env.AZURE_OPENAI_API_KEY) {
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
        defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY },
        defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION },
      });
      const res = await openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT,
        messages: [
          {
            role: 'system',
            content: 'You are a fun quiz master for kids aged 7-14. Always return valid JSON only, nothing else.',
          },
          {
            role: 'user',
            content: `Create exactly ${count} multiple choice quiz questions about "${topic}" for kids aged 7-14. Make them fun and educational!\n\nReturn this exact JSON structure:\n{\n  "questions": [\n    {\n      "question": "Question text with a relevant emoji",\n      "options": ["A. option one", "B. option two", "C. option three", "D. option four"],\n      "correct": "A",\n      "explanation": "Fun brief explanation with emoji"\n    }\n  ]\n}`,
          },
        ],
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(res.choices[0].message.content);
      const qs = Array.isArray(parsed) ? parsed : (parsed.questions || []);
      if (qs.length > 0) return qs.slice(0, count);
    } catch (e) {
      console.error('⚠️  Azure OpenAI error, falling back to placeholder:', e.message);
    }
  }
  // Shuffle placeholder and return requested count
  const shuffled = [...PLACEHOLDER_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // ─── HOST: Create a room ─────────────────────────────────────────────────
  socket.on('createRoom', async ({ topic, questionCount, leaderboardStyle, decoration, nickname, avatar }) => {
    socket.emit('loadingQuestions', { message: `🤖 Generating ${questionCount} questions about "${topic}"...` });
    try {
      const questions = await generateQuestions(topic, parseInt(questionCount, 10));
      const code = generateCode();
      rooms.set(code, {
        code,
        hostId: socket.id,
        topic,
        questions,
        leaderboardStyle,   // 'each' | 'end'
        decoration,
        players: new Map(),
        currentQIndex: -1,
        gameState: 'lobby',
        answers: new Map(),
      });

      // Add host as a player too
      rooms.get(code).players.set(socket.id, { id: socket.id, nickname, avatar, score: 0, isHost: true });

      socket.join(code);
      socket.data.roomCode = code;
      socket.data.isHost = true;

      socket.emit('roomCreated', { code, questionCount: questions.length });
    } catch (err) {
      console.error(err);
      socket.emit('serverError', { message: '❌ Failed to create room. Please try again.' });
    }
  });

  // ─── PLAYER: Join a room ─────────────────────────────────────────────────
  socket.on('joinRoom', ({ code, nickname, avatar }) => {
    const room = rooms.get(code);
    if (!room) {
      socket.emit('joinError', { message: '❌ Room not found! Check your code.' });
      return;
    }
    if (room.gameState !== 'lobby') {
      socket.emit('joinError', { message: '⏳ Game already started! Try again next round.' });
      return;
    }

    room.players.set(socket.id, { id: socket.id, nickname, avatar, score: 0, isHost: false });
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.isHost = false;

    const playerList = Array.from(room.players.values());
    io.to(code).emit('lobbyUpdate', { players: playerList });
    io.to(code).emit('playerJoined', { nickname, avatar, totalPlayers: room.players.size });
    socket.emit('joinSuccess', { code, players: playerList, decoration: room.decoration, topic: room.topic });
  });

  // ─── HOST: Start the game ─────────────────────────────────────────────────
  socket.on('startGame', ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;

    room.players.forEach((p) => { p.score = 0; });
    room.currentQIndex = 0;
    room.gameState = 'question';
    room.answers.clear();

    io.to(code).emit('gameStarted');
    broadcastQuestion(room);
  });

  function broadcastQuestion(room) {
    room.answers.clear();
    room.gameState = 'question';
    const q = room.questions[room.currentQIndex];
    io.to(room.code).emit('newQuestion', {
      questionIndex: room.currentQIndex,
      totalQuestions: room.questions.length,
      question: q.question,
      options: q.options,
    });
  }

  // ─── PLAYER: Submit answer ────────────────────────────────────────────────
  socket.on('submitAnswer', ({ code, answer }) => {
    const room = rooms.get(code);
    if (!room || room.gameState !== 'question') return;
    if (room.answers.has(socket.id)) return; // already answered

    const q = room.questions[room.currentQIndex];
    const isCorrect = answer.toUpperCase() === q.correct.toUpperCase();

    room.answers.set(socket.id, { answer, isCorrect });
    if (isCorrect) {
      const player = room.players.get(socket.id);
      if (player) player.score += 1;
    }

    socket.emit('answerFeedback', {
      isCorrect,
      correctAnswer: q.correct,
      yourAnswer: answer,
      explanation: q.explanation,
    });

    // Auto-reveal when all players have answered
    const allAnswered = Array.from(room.players.keys()).every((id) => room.answers.has(id));
    if (allAnswered && room.players.size > 0) revealAndBroadcast(room);
  });

  function revealAndBroadcast(room) {
    room.gameState = 'reveal';
    const q = room.questions[room.currentQIndex];
    const scores = Array.from(room.players.values())
      .sort((a, b) => b.score - a.score)
      .map((p) => ({ nickname: p.nickname, score: p.score, avatar: p.avatar }));
    io.to(room.code).emit('revealAnswer', {
      correctAnswer: q.correct,
      explanation: q.explanation,
      scores,
    });
  }

  // ─── HOST: Next question (called after answer reveal) ────────────────────
  socket.on('nextQuestion', ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;

    room.currentQIndex++;
    if (room.currentQIndex >= room.questions.length) {
      endGame(room);
    } else if (room.leaderboardStyle === 'each') {
      showLeaderboard(room, false);
    } else {
      broadcastQuestion(room);
    }
  });

  function showLeaderboard(room, isFinal) {
    room.gameState = 'leaderboard';
    const sorted = Array.from(room.players.values())
      .sort((a, b) => b.score - a.score)
      .map((p) => ({ nickname: p.nickname, score: p.score, avatar: p.avatar }));
    io.to(room.code).emit('showLeaderboard', {
      players: sorted,
      isFinal,
      nextQuestionIndex: room.currentQIndex,
      totalQuestions: room.questions.length,
    });
  }

  // ─── HOST: Continue from intermediate leaderboard ────────────────────────
  socket.on('continueGame', ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    broadcastQuestion(room);
  });

  function endGame(room) {
    room.gameState = 'ended';
    const sorted = Array.from(room.players.values())
      .sort((a, b) => b.score - a.score)
      .map((p) => ({ nickname: p.nickname, score: p.score, avatar: p.avatar }));
    io.to(room.code).emit('gameEnded', { players: sorted, totalQuestions: room.questions.length });
  }

  // ─── HOST: Play again ─────────────────────────────────────────────────────
  socket.on('playAgain', ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;

    room.currentQIndex = -1;
    room.gameState = 'lobby';
    room.answers.clear();
    room.players.forEach((p) => { p.score = 0; });

    io.to(room.code).emit('backToLobby', {
      players: Array.from(room.players.values()),
      decoration: room.decoration,
    });
  });

  // ─── Disconnect handling ──────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
    const code = socket.data?.roomCode;
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;

    if (room.hostId === socket.id) {
      io.to(code).emit('hostLeft', { message: '😢 The host left the game!' });
      setTimeout(() => rooms.delete(code), 5000);
    } else {
      room.players.delete(socket.id);
      io.to(code).emit('lobbyUpdate', { players: Array.from(room.players.values()) });
    }
  });
});

app.get('/health', (_, res) => res.json({ ok: true, rooms: rooms.size }));

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🎮 QuizJex server running on http://localhost:${PORT}`);
  console.log(`🤖 AI Questions: ${process.env.AZURE_OPENAI_API_KEY ? '✅ Azure OpenAI connected' : '⚠️  No API key — using placeholder questions'}`);
});

import { io } from 'socket.io-client';

// ── Server URL ───────────────────────────────────────────────────────────────
// Set in .env (local) or .env.production (Azure).
// DO NOT hardcode here — edit the .env files instead.
//
//  .env              →  EXPO_PUBLIC_SERVER_URL=http://localhost:3001
//  .env.production   →  EXPO_PUBLIC_SERVER_URL=https://quizjex-server.azurewebsites.net
//
const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3001';

const socket = io(SERVER_URL, { autoConnect: false });

export default socket;

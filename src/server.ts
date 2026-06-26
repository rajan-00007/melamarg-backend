import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import logger from './utils/logger';
import { initMeetupSocket } from './modules/meetup/meetup.socket';

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// Create HTTP Server by wrapping Express app
const server = createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for the socket connection
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true
  }
});

// Initialize Meetup Socket handlers
initMeetupSocket(io);

// Start listening on server (HTTP + WebSockets)
server.listen(Number(PORT), HOST, () => {
  logger.info(`Server is running on http://${HOST}:${PORT}`);
});


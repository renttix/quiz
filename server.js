const express = require('express');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Track active quizzes and participants
const activeQuizzes = new Map();
const participants = new Map();

// MongoDB connection with proper error handling
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const createSocketServer = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    connectTimeout: 60000,
  });

  // Socket connection handling with error management
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Error handling for socket
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Host events
    socket.on('host:join', (hostId) => {
      socket.join(`host:${hostId}`);
      console.log(`Host joined: ${hostId}`);
    });

    socket.on('host:start-quiz', (quizId) => {
      console.log('Starting quiz:', quizId);
      const quiz = { 
        isActive: true,
        id: quizId,
        participants: new Set(),
        currentQuestion: null,
        started: true
      };
      activeQuizzes.set(quizId, quiz);
      io.emit('quiz:started', quizId);
      console.log(`Quiz started: ${quizId}`);
      console.log('Active quizzes:', Array.from(activeQuizzes.entries()));
    });

    socket.on('host:next-question', (data) => {
      console.log('Received next question:', data);
      const quiz = activeQuizzes.get(data.quizId);
      if (quiz) {
        quiz.currentQuestion = data;
        // Broadcast to all participants
        io.emit('quiz:next-question', data);
        console.log('Next question sent:', data);
      }
    });

    socket.on('host:end-quiz', (data) => {
      const quiz = activeQuizzes.get(data.quizId);
      if (quiz) {
        io.emit('quiz:ended', data.leaderboard);
        activeQuizzes.delete(data.quizId);
        console.log(`Quiz ended: ${data.quizId}`);
      }
    });

    // Participant events
    socket.on('participant:check-active-quiz', (data) => {
      console.log('Checking active quizzes for participant:', data);
      console.log('Active quizzes:', Array.from(activeQuizzes.entries()));
      
      // Find the first active quiz
      let foundActiveQuiz = false;
      for (const [quizId, quiz] of activeQuizzes.entries()) {
        console.log('Checking quiz:', quizId, 'isActive:', quiz.isActive, 'started:', quiz.started);
        if (quiz.isActive && quiz.started) {
          console.log('Found active quiz:', quizId);
          foundActiveQuiz = true;
          
          // Add participant to quiz
          quiz.participants.add(data.participantId);
          participants.set(socket.id, {
            quizId,
            participantId: data.participantId
          });

          // Join quiz room
          socket.join(`quiz:${quizId}`);
          
          // Notify host
          io.to(`host:${quizId}`).emit('participant:joined', {
            participantId: data.participantId,
            name: data.name,
            id: data.participantId,
            score: 0
          });

          // Send quiz started event
          socket.emit('quiz:started', quizId);
          console.log('Sent quiz:started event');
          
          // If there's a current question, send it
          if (quiz.currentQuestion) {
            socket.emit('quiz:next-question', quiz.currentQuestion);
            console.log('Sent current question:', quiz.currentQuestion);
          }

          break;
        }
      }

      if (!foundActiveQuiz) {
        console.log('No active quiz found');
        socket.emit('quiz:not-found');
      }
    });

    socket.on('participant:join', (data) => {
      console.log('Participant joining:', data);
      const quiz = activeQuizzes.get(data.quizId);
      if (quiz) {
        console.log('Found quiz:', data.quizId);
        
        // Add participant to quiz
        quiz.participants.add(data.participantId);
        participants.set(socket.id, {
          quizId: data.quizId,
          participantId: data.participantId
        });

        // Join quiz room
        socket.join(`quiz:${data.quizId}`);
        
        // Notify host
        io.to(`host:${data.quizId}`).emit('participant:joined', {
          participantId: data.participantId,
          name: data.name,
          id: data.participantId,
          score: 0
        });

        // Send current quiz state
        if (quiz.isActive && quiz.started) {
          socket.emit('quiz:started', data.quizId);
          console.log('Sent quiz:started event');
          if (quiz.currentQuestion) {
            socket.emit('quiz:next-question', quiz.currentQuestion);
            console.log('Sent current question:', quiz.currentQuestion);
          }
        }
        
        console.log('Participant joined:', data);
      } else {
        console.log('Quiz not found:', data.quizId);
        socket.emit('quiz:not-found');
      }
    });

    socket.on('participant:answer', (data) => {
      const quiz = activeQuizzes.get(data.quizId);
      if (quiz) {
        const isCorrect = quiz.currentQuestion.question.correctAnswer === data.answer;
        io.to(`host:${data.quizId}`).emit('answer:received', {
          ...data,
          isCorrect
        });
        console.log('Answer received:', data, 'isCorrect:', isCorrect);
      }
    });

    socket.on('disconnect', () => {
      // Clean up participant data
      const participant = participants.get(socket.id);
      if (participant) {
        const quiz = activeQuizzes.get(participant.quizId);
        if (quiz) {
          quiz.participants.delete(participant.participantId);
        }
        participants.delete(socket.id);
      }
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

const startServer = async () => {
  try {
    await connectDB();

    // Create Express app
    const expressApp = express();
    expressApp.use(cors());

    // Create HTTP server
    const server = createServer(expressApp);

    // Create Socket.IO server
    const io = createSocketServer(server);

    // Handle Next.js requests
    expressApp.all('*', (req, res) => handle(req, res));

    // Start server
    const PORT = parseInt(process.env.PORT || '3000', 10);
    server.listen(PORT, () => {
      console.log(`> Server ready on http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

// Prepare Next.js and start server
app.prepare().then(() => {
  startServer();
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server...');
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Closing server...');
  mongoose.connection.close();
  process.exit(0);
});

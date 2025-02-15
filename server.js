const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const next = require('next');
const cors = require('cors');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Track active quizzes and participants
const activeQuizzes = new Map();
const participants = new Map();

// MongoDB connection with proper error handling
const connectDB = async () => {
  try {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB connected successfully');
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

app.prepare().then(() => {
  const server = express();
  const httpServer = createServer(server);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['polling'],
    allowUpgrades: false,
    pingTimeout: 10000,
    pingInterval: 5000,
    cookie: false,
    connectTimeout: 10000,
  });

  // Connect to MongoDB
  connectDB();

  // Enable CORS
  server.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  }));

  // Socket.IO connection handling
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
    });

    socket.on('host:next-question', (data) => {
      console.log('Received next question:', data);
      const quiz = activeQuizzes.get(data.quizId);
      if (quiz) {
        quiz.currentQuestion = data;
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
      
      // Find the first active quiz
      let foundActiveQuiz = false;
      for (const [quizId, quiz] of activeQuizzes.entries()) {
        if (quiz.isActive && quiz.started) {
          console.log('Found active quiz:', quizId);
          foundActiveQuiz = true;
          
          quiz.participants.add(data.participantId);
          participants.set(socket.id, {
            quizId,
            participantId: data.participantId
          });

          socket.join(`quiz:${quizId}`);
          
          io.to(`host:${quizId}`).emit('participant:joined', {
            participantId: data.participantId,
            name: data.name,
            id: data.participantId,
            score: 0
          });

          socket.emit('quiz:started', quizId);
          
          if (quiz.currentQuestion) {
            socket.emit('quiz:next-question', quiz.currentQuestion);
          }

          break;
        }
      }

      if (!foundActiveQuiz) {
        socket.emit('quiz:not-found');
      }
    });

    socket.on('participant:join', (data) => {
      const quiz = activeQuizzes.get(data.quizId);
      if (quiz) {
        quiz.participants.add(data.participantId);
        participants.set(socket.id, {
          quizId: data.quizId,
          participantId: data.participantId
        });

        socket.join(`quiz:${data.quizId}`);
        
        io.to(`host:${data.quizId}`).emit('participant:joined', {
          participantId: data.participantId,
          name: data.name,
          id: data.participantId,
          score: 0
        });

        if (quiz.isActive && quiz.started) {
          socket.emit('quiz:started', data.quizId);
          if (quiz.currentQuestion) {
            socket.emit('quiz:next-question', quiz.currentQuestion);
          }
        }
      } else {
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
      }
    });

    socket.on('disconnect', () => {
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

  // Handle all other routes with Next.js
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  // Start server
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

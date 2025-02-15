import { Server as SocketIOServer } from 'socket.io';
import { NextResponse } from 'next/server';
import type { NextApiResponse } from 'next';
import type { Server as HTTPServer } from 'http';
import type { Socket as NetSocket } from 'net';

interface SocketServer extends HTTPServer {
  io?: SocketIOServer;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

const activeQuizzes = new Map();
const participants = new Map();

export async function GET(req: Request, res: NextApiResponseWithSocket) {
  if (res.socket.server.io) {
    return NextResponse.json({ message: 'Socket is already running' });
  }

  const io = new SocketIOServer(res.socket.server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    connectTimeout: 60000,
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

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
    });

    socket.on('host:next-question', (data) => {
      const quiz = activeQuizzes.get(data.quizId);
      if (quiz) {
        quiz.currentQuestion = data;
        io.emit('quiz:next-question', data);
      }
    });

    socket.on('host:end-quiz', (data) => {
      const quiz = activeQuizzes.get(data.quizId);
      if (quiz) {
        io.emit('quiz:ended', data.leaderboard);
        activeQuizzes.delete(data.quizId);
      }
    });

    // Participant events
    socket.on('participant:check-active-quiz', (data) => {
      let foundActiveQuiz = false;
      for (const [quizId, quiz] of activeQuizzes.entries()) {
        if (quiz.isActive && quiz.started) {
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
    });
  });

  res.socket.server.io = io;
  return NextResponse.json({ message: 'Socket server running' });
}

export const runtime = 'nodejs';

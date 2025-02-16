"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Socket } from 'socket.io-client';
import { getSocket, disconnectSocket } from '@/lib/socket';

interface Question {
  _id: string;
  category: string;
  question: string;
  options: string[];
}

interface LeaderboardEntry {
  name: string;
  score: number;
}

interface SocketError {
  message: string;
}

function JoinQuizContent() {
  const searchParams = useSearchParams();
  const participantName = searchParams.get('name');
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [quizEnded, setQuizEnded] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socketInit = async () => {
      try {
        await fetch('/api/socket');
        const socketInstance = getSocket();
        setSocket(socketInstance);

        // Generate participant ID immediately
        const pid = Date.now().toString();
        setParticipantId(pid);

        socketInstance.on('connect', () => {
          console.log('Connected to socket server');
          // Request active quiz state on connect
          socketInstance.emit('participant:check-active-quiz', { participantId: pid, name: participantName });
        });

        socketInstance.on('quiz:started', (newQuizId: string) => {
          console.log('Quiz started with ID:', newQuizId);
          setQuizId(newQuizId);
          setError(null);
          socketInstance.emit('participant:join', {
            quizId: newQuizId,
            participantId: pid,
            name: participantName,
          });
        });

        socketInstance.on('quiz:next-question', (data: { questionIndex: number; question: Question }) => {
          console.log('Received question:', data);
          setCurrentQuestion(data.question);
          setSelectedAnswer(null);
          setHasAnswered(false);
          setTimeLeft(15);
          setError(null);
        });

        socketInstance.on('quiz:ended', (finalLeaderboard: LeaderboardEntry[]) => {
          setQuizEnded(true);
          setLeaderboard(finalLeaderboard);
          setError(null);
        });

        socketInstance.on('quiz:not-found', () => {
          console.log('No active quiz found');
          setError('No active quiz found. Please wait for a quiz to start.');
        });

        socketInstance.on('connect_error', (error: SocketError) => {
          console.error('Socket connection error:', error);
          setError('Connection error. Please try again.');
        });

        socketInstance.on('disconnect', (reason: string) => {
          console.log('Disconnected from socket server:', reason);
          if (reason === 'io server disconnect') {
            // Reconnect if server disconnected
            socketInstance.connect();
          }
        });

        return socketInstance;
      } catch (err) {
        console.error('Socket initialization error:', err);
        setError('Failed to connect to the quiz server.');
        return null;
      }
    };

    if (participantName) {
      socketInit();
    }

    return () => {
      disconnectSocket();
    };
  }, [participantName]);

  // Timer countdown
  useEffect(() => {
    if (currentQuestion && !hasAnswered && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentQuestion, hasAnswered, timeLeft]);

  const handleAnswerSubmit = (answer: string) => {
    if (!hasAnswered && socket && quizId && participantId && currentQuestion) {
      setSelectedAnswer(answer);
      setHasAnswered(true);

      socket.emit('participant:answer', {
        quizId,
        participantId,
        questionId: currentQuestion._id,
        answer,
        timeToAnswer: 15 - timeLeft,
      });
    }
  };

  if (!participantName) {
    return <div className="text-center">Please enter your name to join the quiz</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-xl font-bold mb-4">Welcome, {participantName}!</h2>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (quizEnded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-center mb-6">Quiz Ended</h2>
        <div className="max-w-md mx-auto bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">Final Leaderboard</h3>
          <div className="space-y-2">
            {leaderboard.map((player, index) => (
              <div
                key={index}
                className="flex justify-between items-center bg-gray-700 p-3 rounded"
              >
                <span>
                  {index + 1}. {player.name}
                </span>
                <span className="font-mono">{player.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-xl font-bold mb-4">Welcome, {participantName}!</h2>
        <p>Waiting for the quiz to start...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Timer */}
        <div className="mb-6 flex justify-between items-center">
          <span className="text-sm text-gray-400">{currentQuestion.category}</span>
          {!hasAnswered && (
            <span className="text-lg font-mono">
              Time left: {timeLeft}s
            </span>
          )}
        </div>

        {/* Question */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl mb-6">{currentQuestion.question}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSubmit(option)}
                disabled={hasAnswered}
                className={`p-4 rounded-lg text-left transition-colors ${
                  selectedAnswer === option
                    ? 'bg-primary text-white'
                    : 'bg-gray-700 hover:bg-gray-600'
                } ${hasAnswered ? 'cursor-not-allowed opacity-75' : ''}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {hasAnswered && (
          <div className="text-center text-gray-400">
            Answer submitted! Waiting for next question...
          </div>
        )}
      </div>
    </div>
  );
}

export default function JoinQuiz() {
  return (
    <Suspense fallback={<div className="text-center">Loading...</div>}>
      <JoinQuizContent />
    </Suspense>
  );
}

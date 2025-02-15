"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Socket } from 'socket.io-client';
import { getSocket, disconnectSocket } from '@/lib/socket';
import QuestionManager from '@/components/QuestionManager';

interface Participant {
  id: string;
  name: string;
  score: number;
}

interface Question {
  _id: string;
  category: string;
  question: string;
  options: string[];
  correctAnswer: string;
}

interface QuizSession {
  _id: string;
  hostId: string;
  isActive: boolean;
  currentQuestionIndex: number;
  questions: Question[];
  participants: Participant[];
}

export default function HostDashboard() {
  const { hostId } = useParams();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'quiz' | 'questions'>('quiz');
  const [isPaused, setIsPaused] = useState(false);
  const [questionStats, setQuestionStats] = useState<{
    totalAnswers: number;
    correctAnswers: number;
  }>({ totalAnswers: 0, correctAnswers: 0 });

  useEffect(() => {
    const fetchSession = async () => {
      try {
        console.log('Fetching session for hostId:', hostId);
        // Get host code from localStorage (saved during login)
        const hostCode = localStorage.getItem('hostCode');
        if (!hostCode) {
          setError('Host code not found. Please login again.');
          return;
        }
        const response = await fetch(`/api/quiz-sessions?hostId=${hostId}&hostCode=${hostCode}`);
        const data = await response.json();
        
        if (data.success) {
          console.log('Session data:', data.data);
          setSession(data.data);
        } else {
          console.error('Failed to load session:', data.message);
          setError('Failed to load quiz session');
        }
      } catch (err) {
        console.error('Error fetching session:', err);
        setError('Failed to load quiz session');
      } finally {
        setLoading(false);
      }
    };

    const initSocket = async () => {
      await fetch('/api/socket');
      const socketInstance = getSocket(true); // true for host
      setSocket(socketInstance);

      socketInstance.on('connect', () => {
        console.log('Connected to socket server');
        socketInstance.emit('host:join', hostId);
      });

      socketInstance.on('participant:joined', (data) => {
        console.log('Participant joined:', data);
        setSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            participants: [...prev.participants, data],
          };
        });
      });

      socketInstance.on('answer:received', (data) => {
        console.log('Answer received:', data);
        setQuestionStats(prev => ({
          totalAnswers: prev.totalAnswers + 1,
          correctAnswers: prev.correctAnswers + (data.isCorrect ? 1 : 0)
        }));
        
        setSession((prev) => {
          if (!prev) return prev;
          const updatedParticipants = prev.participants.map((p) => {
            if (p.id === data.participantId) {
              return {
                ...p,
                score: data.isCorrect ? p.score + 10 : p.score,
              };
            }
            return p;
          });
          return {
            ...prev,
            participants: updatedParticipants,
          };
        });
      });

      return socketInstance;
    };

    const initialize = async () => {
      await fetchSession();
      await initSocket();
    };

    initialize();

    return () => {
      disconnectSocket();
    };
  }, [hostId]);

  const handleStartQuiz = async () => {
    if (!session || !socket) return;
    
    socket.emit('host:start-quiz', session._id);
    
    // Send initial question
    const currentQuestion = session.questions[session.currentQuestionIndex];
    socket.emit('host:next-question', {
      quizId: session._id,
      questionIndex: session.currentQuestionIndex,
      question: currentQuestion
    });
    
    await fetch(`/api/quiz-sessions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session._id,
        action: 'start',
      }),
    });
  };

  const handleNextQuestion = async () => {
    if (!session || !socket) return;
    
    const nextIndex = session.currentQuestionIndex + 1;
    const nextQuestion = session.questions[nextIndex];
    
    socket.emit('host:next-question', {
      quizId: session._id,
      questionIndex: nextIndex,
      question: nextQuestion
    });
    
    await fetch(`/api/quiz-sessions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session._id,
        action: 'next-question',
      }),
    });

    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        currentQuestionIndex: nextIndex
      };
    });

    setQuestionStats({ totalAnswers: 0, correctAnswers: 0 });
  };

  const handleEndQuiz = async () => {
    if (!session || !socket) return;
    
    socket.emit('host:end-quiz', {
      quizId: session._id,
      leaderboard: session.participants.sort((a, b) => b.score - a.score)
    });
    
    await fetch(`/api/quiz-sessions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session._id,
        action: 'end',
      }),
    });
  };

  if (loading) {
    return <div className="text-center">Loading quiz session...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  if (!session) {
    return <div className="text-center">No quiz session found</div>;
  }

  const currentQuestion = session.questions[session.currentQuestionIndex];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Tab Navigation */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveTab('quiz')}
          className={`px-4 py-2 rounded-md ${
            activeTab === 'quiz'
              ? 'bg-primary text-white'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          Quiz Controls
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={`px-4 py-2 rounded-md ${
            activeTab === 'questions'
              ? 'bg-primary text-white'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          Question Bank
        </button>
      </div>

      {activeTab === 'questions' ? (
        <QuestionManager />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column - Participant List */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Participants</h2>
            <div className="space-y-2">
              {session.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex justify-between items-center bg-gray-700 p-2 rounded"
                >
                  <span>{participant.name}</span>
                  <span className="font-mono">{participant.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Middle Column - Current Question */}
          <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold">Current Question</h2>
                {currentQuestion && (
                  <div className="text-sm text-gray-400">
                    Answers: {questionStats.totalAnswers} | Correct: {questionStats.correctAnswers}
                  </div>
                )}
              </div>
              {currentQuestion ? (
                <>
                  <div className="mb-4">
                    <span className="text-sm text-gray-400">
                      {currentQuestion.category}
                    </span>
                    <p className="text-lg mt-2">{currentQuestion.question}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {currentQuestion.options.map((option, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          option === currentQuestion.correctAnswer
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-gray-600'
                        }`}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p>No question selected</p>
              )}
            </div>

            {/* Quiz Controls */}
            <div className="flex justify-between mt-8">
              <button
                onClick={handleStartQuiz}
                disabled={session.isActive}
                className="px-4 py-2 bg-green-600 text-white rounded-md disabled:opacity-50"
              >
                Start Quiz
              </button>
              <button
                onClick={handleNextQuestion}
                disabled={!session.isActive || session.currentQuestionIndex >= session.questions.length - 1}
                className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
              >
                Next Question
              </button>
              <button
                onClick={handleEndQuiz}
                disabled={!session.isActive}
                className="px-4 py-2 bg-red-600 text-white rounded-md disabled:opacity-50"
              >
                End Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

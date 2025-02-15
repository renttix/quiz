import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import QuizSession from '@/lib/models/QuizSession';
import Question from '@/lib/models/Question';

const HOST_CODE = '@08009992820'; // As specified in requirements

export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();
    const { hostCode } = data;
    const categories = ['80s Music', '90s Music', 'Geography', 'Sport', 'TV & Film'];

    console.log('Host code:', hostCode);

    // Verify host code
    if (hostCode !== HOST_CODE) {
      return NextResponse.json(
        { success: false, message: 'Invalid host code' },
        { status: 401 }
      );
    }

    // Create a sample question if none exist
    const existingQuestions = await Question.find({});
    console.log('Existing questions:', existingQuestions.length);
    
    if (existingQuestions.length === 0) {
      console.log('Creating sample question');
      await Question.create({
        category: '80s Music',
        question: 'Which band released the hit song "Sweet Dreams (Are Made of This)" in 1983?',
        options: ['Eurythmics', 'The Police', 'Duran Duran', 'Tears for Fears'],
        correctAnswer: 'Eurythmics'
      });
    }

    // Get random questions
    const questions = await Question.aggregate([
      { $match: { category: { $in: categories } } },
      { $sample: { size: 1 } },
    ]);

    console.log('Found questions:', questions.length);

    const session = await QuizSession.create({
      questions: questions.map(q => q._id),
      hostId: Date.now().toString(),
      isActive: false,
      currentQuestionIndex: 0,
      participants: [],
    });

    console.log('Created session:', session._id);

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session._id,
        hostId: session.hostId,
      },
    });
  } catch (error: any) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();
    const { sessionId, action, participantData } = data;

    const session = await QuizSession.findById(sessionId).populate('questions');
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Quiz session not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'start':
        session.isActive = true;
        session.startTime = new Date();
        break;

      case 'join':
        // Add new participant
        const { name } = participantData;
        const participantId = Date.now().toString();
        session.participants.push({
          id: participantId,
          name,
          score: 0,
          answers: [],
        });
        break;

      case 'submit-answer':
        // Record participant's answer
        const { participantId: pid, questionId, answer, timeToAnswer } = participantData;
        const participant = session.participants.find((p: { id: string }) => p.id === pid);
        if (!participant) {
          return NextResponse.json(
            { success: false, message: 'Participant not found' },
            { status: 404 }
          );
        }

        const question = await Question.findById(questionId);
        const isCorrect = question?.correctAnswer === answer;
        
        participant.answers.push({
          questionId,
          answer,
          isCorrect,
          timeToAnswer,
        });

        if (isCorrect) {
          participant.score += 10;
        }
        break;

      case 'next-question':
        session.currentQuestionIndex += 1;
        break;

      case 'end':
        session.isActive = false;
        session.endTime = new Date();
        break;

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }

    await session.save();
    return NextResponse.json({ success: true, data: session });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const hostId = searchParams.get('hostId');
    const hostCode = searchParams.get('hostCode');

    // If hostId is provided, verify host code
    if (hostId && (!hostCode || hostCode !== HOST_CODE)) {
      return NextResponse.json(
        { success: false, message: 'Invalid host code' },
        { status: 401 }
      );
    }

    const query = sessionId ? { _id: sessionId } : hostId ? { hostId } : {};
    const session = await QuizSession.findOne(query).populate('questions');

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Quiz session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: session });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';

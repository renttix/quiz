import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import QuizSession from '@/lib/models/QuizSession';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// MongoDB connection with proper error handling
const connectDB = async () => {
  try {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI as string);
      console.log('MongoDB connected successfully');
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const data = await req.json();
    const quizSession = new QuizSession(data);
    await quizSession.save();

    return new Response(JSON.stringify(quizSession), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error creating quiz session:', error);
    return new Response(JSON.stringify({ error: 'Failed to create quiz session' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const quizSessions = await QuizSession.find().sort({ createdAt: -1 });
    return new Response(JSON.stringify(quizSessions), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error fetching quiz sessions:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch quiz sessions' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

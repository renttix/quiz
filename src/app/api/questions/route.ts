import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Question, { IQuestion } from '@/lib/models/Question';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();

    // Handle bulk import
    if (Array.isArray(data)) {
      // Validate each question
      const validQuestions = data.filter(q => 
        q.category && 
        q.question && 
        Array.isArray(q.options) && 
        q.options.length === 4 &&
        q.correctAnswer &&
        q.options.includes(q.correctAnswer)
      );

      if (validQuestions.length === 0) {
        return NextResponse.json(
          { success: false, message: 'No valid questions found in import' },
          { status: 400 }
        );
      }

      const questions = await Question.insertMany(validQuestions);
      return NextResponse.json({
        success: true,
        message: `Imported ${questions.length} questions`,
        data: questions,
      });
    }

    // Handle single question
    const question = await Question.create(data);
    return NextResponse.json({ success: true, data: question });
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
    const category = searchParams.get('category');
    
    const query = category ? { category } : {};
    const questions = await Question.find(query).sort({ createdAt: -1 });
    
    return NextResponse.json({ success: true, data: questions });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Question ID is required' },
        { status: 400 }
      );
    }

    const question = await Question.findByIdAndDelete(id);
    if (!question) {
      return NextResponse.json(
        { success: false, message: 'Question not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: question });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';

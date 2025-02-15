import mongoose, { Schema, Document } from 'mongoose';

export interface IQuizSession extends Document {
  hostId: string;
  isActive: boolean;
  currentQuestionIndex: number;
  questions: mongoose.Types.ObjectId[];
  participants: Array<{
    id: string;
    name: string;
    score: number;
    answers: Array<{
      questionId: mongoose.Types.ObjectId;
      answer: string;
      isCorrect: boolean;
      timeToAnswer: number;
    }>;
  }>;
  startTime: Date;
  endTime?: Date;
}

const QuizSessionSchema = new Schema<IQuizSession>({
  hostId: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  currentQuestionIndex: { type: Number, default: 0 },
  questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
  participants: [{
    id: String,
    name: String,
    score: { type: Number, default: 0 },
    answers: [{
      questionId: { type: Schema.Types.ObjectId, ref: 'Question' },
      answer: String,
      isCorrect: Boolean,
      timeToAnswer: Number,
    }],
  }],
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
});

export default mongoose.models.QuizSession || mongoose.model<IQuizSession>('QuizSession', QuizSessionSchema);

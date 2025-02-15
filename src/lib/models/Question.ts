import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  category: string;
  question: string;
  options: string[];
  correctAnswer: string;
}

const QuestionSchema = new Schema<IQuestion>({
  category: { type: String, required: true },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: String, required: true },
});

export default mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IExpense extends Document {
  category: 'material' | 'equipment' | 'marketing' | 'office' | 'miscellaneous' | 'salary' | 'fuel' | 'inventory';
  amount: number;
  date: string; // Format: YYYY-MM-DD
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>({
  category: { 
    type: String, 
    enum: ['material', 'equipment', 'marketing', 'office', 'miscellaneous', 'salary', 'fuel', 'inventory'], 
    required: true 
  },
  amount: { type: Number, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  description: { type: String, default: '' },
}, {
  timestamps: true
});

ExpenseSchema.index({ date: -1 });
ExpenseSchema.index({ category: 1, date: -1 });

export default mongoose.model<IExpense>('Expense', ExpenseSchema);

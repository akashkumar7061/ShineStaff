import { Request, Response } from 'express';
import Expense from '../models/Expense';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLog';

export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const { category, startDate, endDate } = req.query;
    const filter: any = {};

    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const expenses = await Expense.find(filter).sort({ date: -1 });
    res.status(200).json(expenses);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { category, amount, date, description } = req.body;

    if (!category || !amount || !date) {
      return res.status(400).json({ message: 'Category, amount, and date are required' });
    }

    const expense = new Expense({
      category,
      amount: Number(amount),
      date,
      description: description || ''
    });

    await expense.save();

    logAudit(req, {
      action: 'created',
      entityType: 'Expense',
      entityId: expense._id.toString(),
      summary: `Logged expense: ₹${amount} for ${category} (${description || 'No description'})`
    });

    res.status(201).json({ message: 'Expense logged successfully', expense });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByIdAndDelete(id);

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    logAudit(req, {
      action: 'deleted',
      entityType: 'Expense',
      entityId: id,
      summary: `Deleted expense: ₹${expense.amount} for ${expense.category}`
    });

    res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

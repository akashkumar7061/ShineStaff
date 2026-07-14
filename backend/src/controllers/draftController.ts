import { Request, Response } from 'express';
import Draft from '../models/Draft';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const getDrafts = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const drafts = await Draft.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.status(200).json(drafts);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch drafts', error: err.message });
  }
};

export const upsertDraft = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { draftId, clientName, formData } = req.body;
  if (!draftId) {
    return res.status(400).json({ message: 'draftId is required' });
  }

  try {
    const draft = await Draft.findOneAndUpdate(
      { userId: req.user.id, draftId },
      { clientName: clientName || 'Untitled Draft', formData },
      { new: true, upsert: true }
    );
    res.status(200).json({ message: 'Draft saved successfully', draft });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to save draft', error: err.message });
  }
};

export const deleteDraft = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { draftId } = req.params;

  try {
    await Draft.deleteOne({ userId: req.user.id, draftId });
    res.status(200).json({ message: 'Draft deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to delete draft', error: err.message });
  }
};

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { PracticeProgress } from '../models/PracticeProgress';
import { Kit } from '../models/Kit';
import { PrepKit } from '../../shared/types';

export const getPracticeProgress = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    const { kitId } = req.params;
    let progress = await PracticeProgress.findOne({ userId: req.user.userId, kitId });

    if (!progress) {
      progress = await PracticeProgress.create({
        userId: req.user.userId,
        kitId,
        completedCardIds: [],
        ratings: new Map(),
      });
    }

    res.json({ progress });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const updatePracticeCard = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    const { kitId } = req.params;
    const { cardId, rating } = req.body;

    if (!cardId || rating === undefined) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'cardId and rating (1-5) are required' });
      return;
    }

    let progress = await PracticeProgress.findOne({ userId: req.user.userId, kitId });
    if (!progress) {
      progress = new PracticeProgress({
        userId: req.user.userId,
        kitId,
        completedCardIds: [],
        ratings: new Map(),
      });
    }

    if (!progress.completedCardIds.includes(cardId)) {
      progress.completedCardIds.push(cardId);
    }

    progress.ratings.set(cardId, Number(rating));
    await progress.save();

    res.json({ progress });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

/**
 * Creative Feature: Interview Weak Spots Report
 */
export const getWeakSpotsReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    const { kitId } = req.params;
    const kitDoc = await Kit.findOne({ _id: kitId, userId: req.user.userId });
    if (!kitDoc) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Kit not found' });
      return;
    }

    const kit: PrepKit = kitDoc.data;
    const progress = await PracticeProgress.findOne({ userId: req.user.userId, kitId });

    const ratingsMap = progress ? progress.ratings : new Map();

    const lowConfidenceFlashcards: any[] = [];
    const weakRequirementIds = new Set<string>();

    kit.flashcards.forEach((card) => {
      const rating = ratingsMap.get ? ratingsMap.get(card.id) : ratingsMap[card.id];
      if (rating !== undefined && rating <= 2) {
        lowConfidenceFlashcards.push({ card, rating });
        if (card.requirement_ids) {
          card.requirement_ids.forEach((id) => weakRequirementIds.add(id));
        }
      }
    });

    const weakRequirements = kit.role.requirements.filter((r) =>
      weakRequirementIds.has(r.id)
    );

    res.json({
      report: {
        totalCards: kit.flashcards.length,
        cardsReviewed: progress ? progress.completedCardIds.length : 0,
        weakCardCount: lowConfidenceFlashcards.length,
        weakFlashcards: lowConfidenceFlashcards,
        weakRequirements,
        recommendation:
          lowConfidenceFlashcards.length > 0
            ? `Focus revisions on ${weakRequirements.map((r) => r.text).join(', ') || 'flagged weak cards'}.`
            : 'Great job! No severe weak spots identified yet. Continue practicing.',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

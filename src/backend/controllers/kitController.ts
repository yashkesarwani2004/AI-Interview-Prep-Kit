import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Kit } from '../models/Kit';
import { pipelineController } from '../services/PipelineController';
import { researchPipelineService } from '../services/ResearchPipelineService';
import { interviewKitGenerationService } from '../services/InterviewKitGenerationService';
import { llmService } from '../services/LLMService';
import { CoverageEngine } from '../services/CoverageEngine';
import { ScheduleEngine } from '../services/ScheduleEngine';
import { PrepKit, KitQuestion, QuestionCategory } from '../../shared/types';
import { PrepKitSchema } from '../../shared/schemas';

export const createKit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const { jd, company_url, days, validate_only } = req.body;

    // 1. Validate Job Description
    if (!jd || typeof jd !== 'string' || jd.trim().length === 0) {
      res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Job description is required and must not be empty.',
      });
      return;
    }

    // 2. Validate Company URL
    if (!company_url || typeof company_url !== 'string') {
      res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Company website URL is required.',
      });
      return;
    }

    try {
      const parsedUrl = new URL(company_url);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
    } catch {
      res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Please provide a valid HTTP or HTTPS company website URL (e.g., https://company.com).',
      });
      return;
    }

    // 3. Validate Days Available
    const parsedDays = Number(days);
    if (!days || isNaN(parsedDays) || !Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 60) {
      res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Interview preparation timeline must be an integer between 1 and 60 days.',
      });
      return;
    }

    if (validate_only === true) {
      res.status(200).json({
        success: true,
        message: 'Input validated successfully.',
        received: { jd_chars: jd.length, company_url, days: parsedDays },
      });
      return;
    }

    // Run structured research & retrieval pipeline
    const researchResult = await researchPipelineService.runResearchPipeline(jd, company_url);

    // Run full pipeline to generate complete kit
    const generatedData: PrepKit = await pipelineController.generateKit({
      jd,
      companyUrl: company_url,
      days: parsedDays,
    });

    const kitDoc = await Kit.create({
      userId: req.user.userId,
      title: `${generatedData.source.company} - ${generatedData.source.role}`,
      companyName: generatedData.source.company,
      data: generatedData,
    });

    res.status(201).json({ id: kitDoc._id.toString(), kit: kitDoc.data, researchResult });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Kit generation failed' });
  }
};

export const runResearchOnly = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const { jd, company_url, days } = req.body;

    if (!jd || typeof jd !== 'string' || jd.trim().length === 0) {
      res.status(400).json({ error: 'INVALID_INPUT', message: 'Job description is required.' });
      return;
    }
    if (!company_url || typeof company_url !== 'string') {
      res.status(400).json({ error: 'INVALID_INPUT', message: 'Company URL is required.' });
      return;
    }

    const researchResult = await researchPipelineService.runResearchPipeline(jd, company_url);

    res.status(200).json({
      success: true,
      days: Number(days) || 5,
      researchResult,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Research pipeline failed' });
  }
};

export const generateKitProtected = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const { jd, companyUrl, company_url, days } = req.body;
    const targetUrl = companyUrl || company_url;

    if (!jd || typeof jd !== 'string' || jd.trim().length === 0) {
      res.status(400).json({ error: 'INVALID_INPUT', message: 'Job description is required.' });
      return;
    }
    if (!targetUrl || typeof targetUrl !== 'string') {
      res.status(400).json({ error: 'INVALID_INPUT', message: 'Company URL is required.' });
      return;
    }

    const generatedKit = await interviewKitGenerationService.generateKit({
      jd,
      companyUrl: targetUrl,
      days: Number(days) || 5,
    });

    const kitDoc = await Kit.create({
      userId: req.user.userId,
      title: `${generatedKit.source.company} - ${generatedKit.source.role}`,
      companyName: generatedKit.source.company,
      data: generatedKit,
    });

    res.status(201).json({
      id: kitDoc._id.toString(),
      kit: kitDoc.data,
      status: 'success',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Generation failed' });
  }
};

export const getKits = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    const kits = await Kit.find({ userId: req.user.userId }).sort({ updatedAt: -1 });
    res.json({
      kits: kits.map((k) => ({
        id: k._id.toString(),
        title: k.title,
        companyName: k.companyName,
        createdAt: k.createdAt,
        updatedAt: k.updatedAt,
        data: k.data,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const getKitById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    const kit = await Kit.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!kit) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Kit not found or access denied' });
      return;
    }

    res.json({ id: kit._id.toString(), kit: kit.data });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const updateKit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    const { kit: updatedData } = req.body;
    if (!updatedData) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Kit payload is required' });
      return;
    }

    // Validate with Zod
    const validation = PrepKitSchema.safeParse(updatedData);
    if (!validation.success) {
      res.status(400).json({ error: 'INVALID_SCHEMA', details: validation.error.format() });
      return;
    }

    const kit = await Kit.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { data: updatedData, title: `${updatedData.source.company} - ${updatedData.source.role}` },
      { new: true }
    );

    if (!kit) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Kit not found' });
      return;
    }

    res.json({ id: kit._id.toString(), kit: kit.data });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const deleteKit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    const kit = await Kit.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!kit) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Kit not found' });
      return;
    }

    res.json({ message: 'Kit deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

/**
 * Regenerate a single section while preserving manual edits/pinned/custom items
 */
export const regenerateSection = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    const { section, category } = req.body;
    const kitDoc = await Kit.findOne({ _id: req.params.id, userId: req.user.userId });

    if (!kitDoc) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Kit not found' });
      return;
    }

    const currentKit: PrepKit = kitDoc.data;

    if (section === 'company_brief') {
      const newBrief = await llmService.generateCompanyBrief(
        currentKit.source.company,
        currentKit.company_brief.what_they_do,
        currentKit.source.pages_used
      );
      currentKit.company_brief = newBrief;
    } else if (section === 'category' && category) {
      const targetCat = category as QuestionCategory;
      // Preserve items that are edited, pinned, or custom
      const preservedQuestions = currentKit.questions.filter(
        (q) => q.category === targetCat && (q.isEdited || q.isPinned || q.isCustom)
      );

      // Generate new questions for category
      const freshQuestions = await llmService.generateCategoryQuestions(
        targetCat,
        currentKit.role.requirements,
        currentKit.source.company,
        currentKit.questions.length
      );

      // Merge preserved with fresh
      const otherCategoryQuestions = currentKit.questions.filter(
        (q) => q.category !== targetCat
      );

      currentKit.questions = [...otherCategoryQuestions, ...preservedQuestions, ...freshQuestions];

      // Re-compute coverage & schedule
      currentKit.coverage = CoverageEngine.buildCoverageMetadata(
        currentKit.role.requirements,
        currentKit.questions,
        currentKit.coverage.passes
      );

      currentKit.schedule = ScheduleEngine.allocateSchedule(
        currentKit.schedule.days_available,
        currentKit.role.requirements,
        currentKit.questions
      );
    } else if (section === 'schedule') {
      currentKit.schedule = ScheduleEngine.allocateSchedule(
        currentKit.schedule.days_available,
        currentKit.role.requirements,
        currentKit.questions
      );
    }

    kitDoc.data = currentKit;
    await kitDoc.save();

    res.json({ id: kitDoc._id.toString(), kit: kitDoc.data });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

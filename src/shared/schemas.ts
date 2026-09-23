import { z } from 'zod';

export const RequirementKindSchema = z.enum(['technical', 'behavioural', 'domain']);
export const RequirementPrioritySchema = z.enum(['must', 'nice']);

export const KitRequirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  kind: RequirementKindSchema,
  priority: RequirementPrioritySchema,
});

export const KitRoleSchema = z.object({
  title: z.string(),
  seniority: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(KitRequirementSchema),
});

export const KitSourceSchema = z.object({
  company: z.string(),
  company_url: z.string(),
  role: z.string(),
  location: z.string(),
  jd_chars: z.number().int().nonnegative(),
  researched_at: z.string(),
  pages_used: z.array(z.string()),
});

export const CompanyBriefSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  sources: z.array(z.string()),
});

export const QuestionCategorySchema = z.enum([
  'technical',
  'behavioural',
  'system-design',
  'company-fit',
]);

export const KitQuestionSchema = z.object({
  id: z.string().min(1),
  requirement_ids: z.array(z.string()),
  category: QuestionCategorySchema,
  prompt: z.string().min(1),
  answer_outline: z.string(),
  difficulty: z.number().int().min(1).max(3),
  isEdited: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  isCustom: z.boolean().optional(),
});

export const KitFlashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  requirement_ids: z.array(z.string()),
  isEdited: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  isCustom: z.boolean().optional(),
});

export const ScheduleDaySchema = z.object({
  day: z.number().int().positive(),
  focus: z.string(),
  question_ids: z.array(z.string()),
  minutes: z.number().int().nonnegative(),
});

export const KitScheduleSchema = z.object({
  days_available: z.number().int().positive(),
  days: z.array(ScheduleDaySchema),
});

export const KitCoverageSchema = z.object({
  uncovered_requirement_ids: z.array(z.string()),
  passes: z.number().int().nonnegative(),
});

export const PrepKitSchema = z.object({
  source: KitSourceSchema,
  company_brief: CompanyBriefSchema,
  role: KitRoleSchema,
  questions: z.array(KitQuestionSchema),
  flashcards: z.array(KitFlashcardSchema),
  schedule: KitScheduleSchema,
  coverage: KitCoverageSchema,
});

// Appendix B Batch Schemas

export const BatchTestCaseSchema = z.object({
  id: z.string().min(1),
  jd: z.string(),
  company_url: z.string(),
  days: z.number().int().positive(),
});

export const BatchCaseErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export const BatchKitResultSchema = z.object({
  id: z.string(),
  status: z.enum(['ok', 'failed']),
  kit: PrepKitSchema.nullable(),
  error: BatchCaseErrorSchema.nullable(),
});

export const BatchOutputSchema = z.object({
  version: z.string(),
  generated_at: z.string(),
  kits: z.array(BatchKitResultSchema),
});

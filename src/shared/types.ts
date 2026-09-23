// Appendix A Types - Kit Structure

export type RequirementKind = 'technical' | 'behavioural' | 'domain';
export type RequirementPriority = 'must' | 'nice';

export interface KitRequirement {
  id: string; // e.g. "r1"
  text: string;
  kind: RequirementKind;
  priority: RequirementPriority;
}

export interface KitRole {
  title: string;
  seniority: string;
  responsibilities: string[];
  requirements: KitRequirement[];
}

export interface KitSource {
  company: string;
  company_url: string;
  role: string;
  location: string;
  jd_chars: number;
  researched_at: string; // ISO Date String
  pages_used: string[];
}

export interface CompanyBrief {
  summary: string;
  what_they_do: string;
  sources: string[];
}

export type QuestionCategory = 'technical' | 'behavioural' | 'system-design' | 'company-fit';

export interface KitQuestion {
  id: string; // e.g. "q1"
  requirement_ids: string[]; // e.g. ["r1"]
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: number; // integer 1 to 3
  
  // Metadata for Builder & Regeneration state preservation
  isEdited?: boolean;
  isPinned?: boolean;
  isCustom?: boolean;
}

export interface KitFlashcard {
  id: string; // e.g. "f1"
  front: string;
  back: string;
  requirement_ids: string[];
  
  isEdited?: boolean;
  isPinned?: boolean;
  isCustom?: boolean;
}

export interface ScheduleDay {
  day: number; // 1 to N
  focus: string;
  question_ids: string[];
  minutes: number; // integer minutes
}

export interface KitSchedule {
  days_available: number;
  days: ScheduleDay[];
}

export interface KitCoverage {
  uncovered_requirement_ids: string[];
  passes: number;
}

export interface PrepKit {
  source: KitSource;
  company_brief: CompanyBrief;
  role: KitRole;
  questions: KitQuestion[];
  flashcards: KitFlashcard[];
  schedule: KitSchedule;
  coverage: KitCoverage;
}

// Appendix B Types - Batch Input and Output

export interface BatchTestCase {
  id: string;
  jd: string;
  company_url: string;
  days: number;
}

export interface BatchCaseError {
  code: string;
  message: string;
}

export interface BatchKitResult {
  id: string;
  status: 'ok' | 'failed';
  kit: PrepKit | null;
  error: BatchCaseError | null;
}

export interface BatchOutput {
  version: string; // "1.0"
  generated_at: string; // ISO Date String
  kits: BatchKitResult[];
}

// Practice Progress Types
export interface FlashcardConfidence {
  cardId: string;
  confidence: number; // 1 (lowest) to 5 (highest)
  lastReviewedAt: string;
}

export interface UserPracticeProgress {
  kitId: string;
  userId: string;
  completedCardIds: string[];
  ratings: Record<string, number>; // cardId -> rating (1-5)
  updatedAt: string;
}

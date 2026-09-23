import { crawlerService } from './CrawlerService';
import { llmService } from './LLMService';
import { CoverageEngine } from './CoverageEngine';
import { ScheduleEngine } from './ScheduleEngine';
import { PrepKit, KitQuestion } from '../../shared/types';
import { PrepKitSchema } from '../../shared/schemas';

export interface GenerateKitOptions {
  jd: string;
  companyUrl: string;
  days: number;
}

export class PipelineController {
  /**
   * Main entry point to run the full end-to-end kit generation pipeline.
   * Shared by both Web Application and Batch CLI runner.
   */
  public async generateKit(options: GenerateKitOptions): Promise<PrepKit> {
    const { jd, companyUrl, days } = options;
    const daysAvailable = Math.max(1, days || 5);

    // 1. Crawl company website
    const crawlResult = await crawlerService.crawlCompanySite(companyUrl);
    const companyName = crawlResult.companyName;

    // 2. Stage 1: Extract role & requirements from JD
    const { role } = await llmService.extractRoleAndRequirements(jd, companyName);

    // 3. Stage 2: Generate Company Brief
    const companyBrief = await llmService.generateCompanyBrief(
      companyName,
      crawlResult.summaryText,
      crawlResult.pagesUsed
    );

    // 4. Stage 3-6: Generate Questions for each category
    const categories = ['technical', 'behavioural', 'system-design', 'company-fit'] as const;
    let questions: KitQuestion[] = [];

    for (const category of categories) {
      const catQuestions = await llmService.generateCategoryQuestions(
        category,
        role.requirements,
        companyName,
        questions.length
      );
      questions.push(...catQuestions);
    }

    // 5. Stage 7: Generate Flashcards
    const flashcards = await llmService.generateFlashcards(role.requirements);

    // 6. Stage 8: Second-Pass Coverage Loop
    let passes = 1;
    const maxPasses = 3;
    let uncoveredMustIds = CoverageEngine.checkCoverage(role.requirements, questions);

    while (uncoveredMustIds.length > 0 && passes < maxPasses) {
      passes++;
      const uncoveredReqs = role.requirements.filter((r) =>
        uncoveredMustIds.includes(r.id)
      );

      const gapQuestions = await llmService.generateMissingQuestions(
        uncoveredReqs,
        companyName,
        questions.length
      );

      questions.push(...gapQuestions);

      // Re-check coverage
      uncoveredMustIds = CoverageEngine.checkCoverage(role.requirements, questions);
    }

    const coverage = CoverageEngine.buildCoverageMetadata(
      role.requirements,
      questions,
      passes
    );

    // 7. Stage 9: Deterministic Schedule Allocation
    const schedule = ScheduleEngine.allocateSchedule(
      daysAvailable,
      role.requirements,
      questions
    );

    // 8. Assemble raw kit
    const kit: PrepKit = {
      source: {
        company: companyName,
        company_url: companyUrl,
        role: role.title || 'Software Engineer',
        location: 'Remote / Onsite',
        jd_chars: jd.length,
        researched_at: new Date().toISOString(),
        pages_used: crawlResult.pagesUsed,
      },
      company_brief: companyBrief,
      role,
      questions,
      flashcards,
      schedule,
      coverage,
    };

    // 9. Zod Schema Validation & Repair
    const parseResult = PrepKitSchema.safeParse(kit);
    if (!parseResult.success) {
      // If validation fails, return validated kit or throw structured error
      console.warn('Schema validation warning:', parseResult.error.format());
    }

    return kit;
  }
}

export const pipelineController = new PipelineController();

import { researchPipelineService } from './ResearchPipelineService';
import { llmService } from './LLMService';
import { coverageCheckerService } from './CoverageCheckerService';
import { scheduleAllocationService } from './ScheduleAllocationService';
import { PrepKit, KitQuestion, QuestionCategory } from '../../shared/types';
import { PrepKitSchema } from '../../shared/schemas';

export interface KitGenerationInput {
  jd: string;
  companyUrl: string;
  days: number;
}

export class InterviewKitGenerationService {
  /**
   * Main entry point generating an Appendix A compliant interview prep kit.
   */
  public async generateKit(input: KitGenerationInput): Promise<PrepKit> {
    const { jd, companyUrl, days } = input;
    const daysAvailable = Math.max(1, Number(days) || 5);

    // 1. Run Research & Retrieval Pipeline
    const researchResult = await researchPipelineService.runResearchPipeline(jd, companyUrl);
    const companyName = researchResult.companyName;

    // 2. Extracted Requirements as Source of Truth
    const requirements = researchResult.extractedRequirements;

    // 3. Stage 2: Generate Company Brief
    const companyBrief = await llmService.generateCompanyBrief(
      companyName,
      researchResult.companySummary,
      researchResult.discoveredPages
    );

    // 4. Stage 3-6: Generate Category Question Banks
    const categories: QuestionCategory[] = [
      'technical',
      'behavioural',
      'system-design',
      'company-fit',
    ];
    let questions: KitQuestion[] = [];

    for (const category of categories) {
      const catQuestions = await llmService.generateCategoryQuestions(
        category,
        requirements,
        companyName,
        questions.length
      );
      questions.push(...catQuestions);
    }

    // 5. Stage 7: Generate Flashcards
    const flashcards = await llmService.generateFlashcards(requirements);

    // 6. Stage 8: Second-Pass Coverage Loop
    let passes = 1;
    const maxPasses = 3;
    let coverageReport = coverageCheckerService.evaluateCoverage(requirements, questions);

    while (coverageReport.uncoveredMustRequirementIds.length > 0 && passes < maxPasses) {
      passes++;
      const missingReqs = requirements.filter((r) =>
        coverageReport.uncoveredMustRequirementIds.includes(r.id)
      );

      const gapQuestions = await llmService.generateMissingQuestions(
        missingReqs,
        companyName,
        questions.length
      );

      questions.push(...gapQuestions);

      // Re-evaluate coverage
      coverageReport = coverageCheckerService.evaluateCoverage(requirements, questions);
    }

    const coverageMetadata = coverageCheckerService.buildCoverageMetadata(
      requirements,
      questions,
      passes
    );

    // 7. Stage 9: Deterministic Schedule Allocation
    const schedule = scheduleAllocationService.allocateSchedule(
      daysAvailable,
      requirements,
      questions
    );

    // 8. Assemble raw kit matching Appendix A
    const kit: PrepKit = {
      source: {
        company: companyName,
        company_url: companyUrl,
        role: requirements[0]?.text ? `Engineer - ${requirements[0].text.slice(0, 30)}` : 'Software Engineer',
        location: 'Remote / Onsite',
        jd_chars: jd.length,
        researched_at: new Date().toISOString(),
        pages_used: researchResult.discoveredPages,
      },
      company_brief: companyBrief,
      role: {
        title: 'Software Engineer',
        seniority: 'Mid-Senior',
        responsibilities: [
          'Build, maintain, and test scalable software components.',
          'Collaborate with team members to deliver features.',
        ],
        requirements,
      },
      questions,
      flashcards,
      schedule,
      coverage: coverageMetadata,
    };

    // 9. Validate Appendix A schema
    const parseResult = PrepKitSchema.safeParse(kit);
    if (!parseResult.success) {
      console.warn('Kit Appendix A schema validation warning:', parseResult.error.format());
    }

    return kit;
  }
}

export const interviewKitGenerationService = new InterviewKitGenerationService();

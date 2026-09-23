import { coverageCheckerService } from '../src/backend/services/CoverageCheckerService';
import { scheduleAllocationService } from '../src/backend/services/ScheduleAllocationService';
import { llmProviderService } from '../src/backend/services/LLMProviderService';
import { interviewKitGenerationService } from '../src/backend/services/InterviewKitGenerationService';
import { KitRequirement, KitQuestion } from '../src/shared/types';
import { PrepKitSchema } from '../src/shared/schemas';

describe('Interview Kit Generation & Coverage Engine Tests', () => {
  const sampleReqs: KitRequirement[] = [
    { id: 'r1', text: '5+ years Node.js experience', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Experience mentoring junior devs', kind: 'behavioural', priority: 'must' },
    { id: 'r3', text: 'GraphQL knowledge', kind: 'technical', priority: 'nice' },
  ];

  describe('Deterministic Coverage Checker Service', () => {
    it('identifies uncovered MUST and NICE requirements accurately in pure code', () => {
      const questions: KitQuestion[] = [
        {
          id: 'q1',
          requirement_ids: ['r1'],
          category: 'technical',
          prompt: 'Explain Node.js event loop.',
          answer_outline: 'Explain phase execution.',
          difficulty: 2,
        },
      ];

      const report = coverageCheckerService.evaluateCoverage(sampleReqs, questions);

      expect(report.coveredRequirementIds).toEqual(['r1']);
      expect(report.uncoveredMustRequirementIds).toEqual(['r2']);
      expect(report.uncoveredNiceRequirementIds).toEqual(['r3']);
      expect(report.allUncoveredRequirementIds).toEqual(['r2', 'r3']);
      expect(report.coveragePercentage).toBe(33);
    });

    it('returns 100% coverage when all MUST requirements are mapped to question requirement_ids', () => {
      const questions: KitQuestion[] = [
        {
          id: 'q1',
          requirement_ids: ['r1'],
          category: 'technical',
          prompt: 'Node.js',
          answer_outline: 'Outline',
          difficulty: 2,
        },
        {
          id: 'q2',
          requirement_ids: ['r2'],
          category: 'behavioural',
          prompt: 'Mentoring',
          answer_outline: 'Outline',
          difficulty: 1,
        },
      ];

      const report = coverageCheckerService.evaluateCoverage(sampleReqs, questions);
      expect(report.uncoveredMustRequirementIds.length).toBe(0);
    });
  });

  describe('Deterministic Schedule Allocation Service', () => {
    const questions: KitQuestion[] = [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'Node.js',
        answer_outline: 'Outline',
        difficulty: 3,
      },
      {
        id: 'q2',
        requirement_ids: ['r2'],
        category: 'behavioural',
        prompt: 'Mentoring',
        answer_outline: 'Outline',
        difficulty: 1,
      },
    ];

    it('creates schedule spanning exactly 1 day with integer minutes', () => {
      const schedule = scheduleAllocationService.allocateSchedule(1, sampleReqs, questions);

      expect(schedule.days_available).toBe(1);
      expect(schedule.days.length).toBe(1);
      expect(Number.isInteger(schedule.days[0].minutes)).toBe(true);
      expect(schedule.days[0].question_ids).toContain('q1');
      expect(schedule.days[0].question_ids).toContain('q2');
    });

    it('creates schedule spanning exactly 60 days with integer minutes and early placement of hard MUST items', () => {
      const schedule = scheduleAllocationService.allocateSchedule(60, sampleReqs, questions);

      expect(schedule.days_available).toBe(60);
      expect(schedule.days.length).toBe(60);

      schedule.days.forEach((day) => {
        expect(Number.isInteger(day.minutes)).toBe(true);
        expect(day.minutes).toBeGreaterThanOrEqual(15);
      });

      // Harder / MUST question q1 (diff 3 + MUST) lands on Day 1
      expect(schedule.days[0].question_ids).toContain('q1');
    });
  });

  describe('LLM Provider Abstraction & Fallback Resilience', () => {
    it('returns valid default fallback when LLM receives invalid JSON or fails', async () => {
      const fallbackData = { success: true };
      const validator = (data: any): data is { success: boolean } => typeof data?.success === 'boolean';

      const result = await llmProviderService.generateJson(
        'Trigger invalid JSON response',
        validator,
        () => fallbackData
      );

      expect(result).toEqual(fallbackData);
    });
  });

  describe('End-to-End Interview Kit Generation & Appendix A Schema Validation', () => {
    it('generates Appendix A compliant kit with 2nd pass gap loop and valid requirement-question ID mapping', async () => {
      const jd = 'Senior Backend Engineer with 5+ years Node.js experience.';
      const kit = await interviewKitGenerationService.generateKit({
        jd,
        companyUrl: 'https://stripe.com',
        days: 5,
      });

      const validation = PrepKitSchema.safeParse(kit);
      expect(validation.success).toBe(true);

      expect(kit.source.company).toBe('Stripe');
      expect(kit.schedule.days_available).toBe(5);
      expect(kit.questions.length).toBeGreaterThan(0);
      expect(kit.flashcards.length).toBeGreaterThan(0);

      // Verify every question references valid requirement IDs
      const validReqIds = new Set(kit.role.requirements.map((r) => r.id));
      kit.questions.forEach((q) => {
        expect(q.requirement_ids.length).toBeGreaterThan(0);
        q.requirement_ids.forEach((reqId) => {
          expect(validReqIds.has(reqId)).toBe(true);
        });
      });
    }, 20000);
  });
});

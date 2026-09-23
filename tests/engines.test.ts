import { CoverageEngine } from '../src/backend/services/CoverageEngine';
import { ScheduleEngine } from '../src/backend/services/ScheduleEngine';
import { CrawlerService } from '../src/backend/services/CrawlerService';
import { KitRequirement, KitQuestion } from '../src/shared/types';
import { PrepKitSchema, BatchOutputSchema } from '../src/shared/schemas';

describe('Deterministic Coverage Engine', () => {
  const reqs: KitRequirement[] = [
    { id: 'r1', text: '5+ years Node.js', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Experience mentoring', kind: 'behavioural', priority: 'must' },
    { id: 'r3', text: 'GraphQL knowledge', kind: 'technical', priority: 'nice' },
  ];

  it('correctly flags uncovered MUST requirements', () => {
    const questions: KitQuestion[] = [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'Node.js questions',
        answer_outline: 'Outline',
        difficulty: 2,
      },
    ];

    const uncovered = CoverageEngine.checkCoverage(reqs, questions);
    expect(uncovered).toEqual(['r2']); // r2 is MUST and uncovered, r3 is NICE
  });

  it('returns empty uncovered list when all MUST requirements have question coverage', () => {
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

    const uncovered = CoverageEngine.checkCoverage(reqs, questions);
    expect(uncovered).toEqual([]);
  });
});

describe('Deterministic Schedule Engine', () => {
  const reqs: KitRequirement[] = [
    { id: 'r1', text: 'TypeScript', kind: 'technical', priority: 'must' },
  ];
  const questions: KitQuestion[] = [
    {
      id: 'q1',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'TS generics',
      answer_outline: 'Outline',
      difficulty: 3,
    },
    {
      id: 'q2',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'TS interfaces',
      answer_outline: 'Outline',
      difficulty: 1,
    },
  ];

  it('creates schedule with exact requested days and integer minutes', () => {
    const schedule = ScheduleEngine.allocateSchedule(5, reqs, questions);

    expect(schedule.days_available).toBe(5);
    expect(schedule.days.length).toBe(5);

    schedule.days.forEach((day) => {
      expect(Number.isInteger(day.minutes)).toBe(true);
      expect(day.minutes).toBeGreaterThanOrEqual(15);
      expect(typeof day.focus).toBe('string');
    });
  });

  it('handles 1-day schedule correctly', () => {
    const schedule = ScheduleEngine.allocateSchedule(1, reqs, questions);
    expect(schedule.days_available).toBe(1);
    expect(schedule.days.length).toBe(1);
    expect(schedule.days[0].question_ids).toContain('q1');
    expect(schedule.days[0].question_ids).toContain('q2');
  });

  it('handles 60-day schedule correctly without crashing', () => {
    const schedule = ScheduleEngine.allocateSchedule(60, reqs, questions);
    expect(schedule.days_available).toBe(60);
    expect(schedule.days.length).toBe(60);
  });
});

describe('Crawler Service & SSRF Security', () => {
  const crawler = new CrawlerService();

  it('blocks dangerous SSRF private URLs when local crawl is disabled', () => {
    const originalEnv = process.env.ALLOW_LOCAL_CRAWL;
    process.env.ALLOW_LOCAL_CRAWL = 'false';

    expect(crawler.isUrlSafe('http://169.254.169.254/latest/meta-data/')).toBe(false);
    expect(crawler.isUrlSafe('http://localhost:5000/admin')).toBe(false);
    expect(crawler.isUrlSafe('http://192.168.1.1/router')).toBe(false);

    process.env.ALLOW_LOCAL_CRAWL = originalEnv;
  });

  it('ranks hiring and career links higher than random pages', () => {
    const scoreCareers = crawler.rankLink('https://example.com/careers/engineering', 'Join Our Team');
    const scoreBlog = crawler.rankLink('https://example.com/blog/news-update', 'Read Blog');

    expect(scoreCareers).toBeGreaterThan(scoreBlog);
  });
});

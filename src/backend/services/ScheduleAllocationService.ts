import { KitRequirement, KitQuestion, KitSchedule, ScheduleDay } from '../../shared/types';

export class ScheduleAllocationService {
  /**
   * Arithmetic allocation of question items into exactly `daysRequested` days.
   */
  public allocateSchedule(
    daysRequested: number,
    requirements: KitRequirement[],
    questions: KitQuestion[]
  ): KitSchedule {
    const numDays = Math.max(1, Math.floor(daysRequested));

    // Priority map: requirement ID -> priority
    const priorityMap = new Map<string, string>();
    for (const req of requirements) {
      priorityMap.set(req.id, req.priority);
    }

    // Score questions: Must requirements + difficulty (3 > 2 > 1) assigned higher priority score
    const scoredQuestions = questions.map((q) => {
      let isMust = false;
      if (q.requirement_ids) {
        for (const reqId of q.requirement_ids) {
          if (priorityMap.get(reqId) === 'must') {
            isMust = true;
            break;
          }
        }
      }

      const score = (isMust ? 100 : 0) + (q.difficulty || 1) * 10;
      return { question: q, score };
    });

    // Sort descending by priority score
    scoredQuestions.sort((a, b) => b.score - a.score);

    // Initialize schedule days array of length numDays
    const days: ScheduleDay[] = Array.from({ length: numDays }, (_, i) => ({
      day: i + 1,
      focus: '',
      question_ids: [],
      minutes: 0,
    }));

    if (scoredQuestions.length === 0) {
      for (let i = 0; i < numDays; i++) {
        days[i].focus = `Day ${i + 1}: General Preparation & Review`;
        days[i].minutes = 30;
      }
      return { days_available: numDays, days };
    }

    // Distribute questions across available days (higher priority landed on earlier days)
    scoredQuestions.forEach(({ question }, idx) => {
      const targetDayIdx = Math.min(
        Math.floor((idx / scoredQuestions.length) * numDays),
        numDays - 1
      );

      days[targetDayIdx].question_ids.push(question.id);
      const questionMinutes = (question.difficulty || 1) * 15;
      days[targetDayIdx].minutes += questionMinutes;
    });

    // Finalize focus and guarantee integer minutes
    for (let i = 0; i < numDays; i++) {
      const dayQuestions = days[i].question_ids
        .map((qId) => questions.find((q) => q.id === qId))
        .filter(Boolean) as KitQuestion[];

      if (dayQuestions.length > 0) {
        const catCounts: Record<string, number> = {};
        for (const q of dayQuestions) {
          catCounts[q.category] = (catCounts[q.category] || 0) + 1;
        }
        const dominantCat = Object.keys(catCounts).reduce((a, b) =>
          catCounts[a] > catCounts[b] ? a : b
        );
        days[i].focus = `Day ${i + 1}: Focus on ${dominantCat.replace('-', ' ').toUpperCase()}`;
      } else {
        days[i].focus = `Day ${i + 1}: Review and Practical Exercises`;
        days[i].minutes = 30;
      }

      days[i].minutes = Math.round(Math.max(15, days[i].minutes));
    }

    return {
      days_available: numDays,
      days,
    };
  }
}

export const scheduleAllocationService = new ScheduleAllocationService();

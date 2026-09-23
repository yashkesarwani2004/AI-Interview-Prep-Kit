import { KitRequirement, KitQuestion, KitSchedule, ScheduleDay } from '../../shared/types';

export class ScheduleEngine {
  /**
   * Deterministically allocates questions into exactly `daysAvailable` days.
   * Priority rule: Higher difficulty questions & MUST requirement questions scheduled earlier.
   */
  public static allocateSchedule(
    daysAvailable: number,
    requirements: KitRequirement[],
    questions: KitQuestion[]
  ): KitSchedule {
    const numDays = Math.max(1, Math.floor(daysAvailable));

    // Map requirement ID -> priority
    const reqPriorityMap = new Map<string, string>();
    for (const req of requirements) {
      reqPriorityMap.set(req.id, req.priority);
    }

    // Score and sort questions based on priority & difficulty
    // High difficulty (3) & MUST requirements get highest priority score
    const scoredQuestions = questions.map((q) => {
      let isMust = false;
      if (q.requirement_ids) {
        for (const reqId of q.requirement_ids) {
          if (reqPriorityMap.get(reqId) === 'must') {
            isMust = true;
            break;
          }
        }
      }

      // Priority score formula: Must(100) + Difficulty(30/20/10)
      const priorityScore = (isMust ? 100 : 0) + (q.difficulty || 1) * 10;
      return { question: q, score: priorityScore };
    });

    // Sort descending by priority score
    scoredQuestions.sort((a, b) => b.score - a.score);

    // Prepare empty schedule days
    const days: ScheduleDay[] = Array.from({ length: numDays }, (_, i) => ({
      day: i + 1,
      focus: '',
      question_ids: [],
      minutes: 0,
    }));

    if (scoredQuestions.length === 0) {
      for (let i = 0; i < numDays; i++) {
        days[i].focus = `Day ${i + 1}: General Interview Preparation`;
        days[i].minutes = 30;
      }
      return { days_available: numDays, days };
    }

    // Distribute questions across available days (round-robin / greedy filling)
    // Earlier items land on earlier days
    scoredQuestions.forEach(({ question }, index) => {
      // Map index into target day
      const targetDayIndex = Math.floor((index / scoredQuestions.length) * numDays);
      const safeDayIndex = Math.min(targetDayIndex, numDays - 1);

      days[safeDayIndex].question_ids.push(question.id);

      // Estimate minutes per question: difficulty 1 -> 15 min, 2 -> 25 min, 3 -> 40 min
      const estMinutes = (question.difficulty || 1) * 15;
      days[safeDayIndex].minutes += estMinutes;
    });

    // Post-process days: Assign focus labels and ensure non-zero integer minutes
    for (let i = 0; i < numDays; i++) {
      const dayQuestions = days[i].question_ids.map((id) =>
        questions.find((q) => q.id === id)
      ).filter(Boolean) as KitQuestion[];

      if (dayQuestions.length > 0) {
        // Find dominant category for focus
        const categoryCounts: Record<string, number> = {};
        for (const q of dayQuestions) {
          categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;
        }
        const mainCategory = Object.keys(categoryCounts).reduce((a, b) =>
          categoryCounts[a] > categoryCounts[b] ? a : b
        );
        days[i].focus = `Day ${i + 1}: Focus on ${mainCategory.replace('-', ' ').toUpperCase()} Concepts`;
      } else {
        days[i].focus = `Day ${i + 1}: Review and Mock Practice`;
        days[i].minutes = 30; // Default minimum integer minutes
      }

      // Guarantee minutes is an integer
      days[i].minutes = Math.round(Math.max(15, days[i].minutes));
    }

    return {
      days_available: numDays,
      days,
    };
  }
}

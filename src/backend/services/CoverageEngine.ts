import { KitRequirement, KitQuestion, KitCoverage } from '../../shared/types';

export class CoverageEngine {
  /**
   * Deterministically finds all uncovered MUST requirements.
   * A requirement is covered if at least one question references its ID in requirement_ids.
   */
  public static checkCoverage(
    requirements: KitRequirement[],
    questions: KitQuestion[]
  ): string[] {
    const coveredRequirementIds = new Set<string>();

    for (const q of questions) {
      if (Array.isArray(q.requirement_ids)) {
        for (const reqId of q.requirement_ids) {
          coveredRequirementIds.add(reqId);
        }
      }
    }

    const uncoveredMustRequirementIds: string[] = [];

    for (const req of requirements) {
      if (req.priority === 'must' && !coveredRequirementIds.has(req.id)) {
        uncoveredMustRequirementIds.push(req.id);
      }
    }

    return uncoveredMustRequirementIds;
  }

  /**
   * Formats the final KitCoverage object for Appendix A
   */
  public static buildCoverageMetadata(
    requirements: KitRequirement[],
    questions: KitQuestion[],
    passesCompleted: number
  ): KitCoverage {
    const uncovered = this.checkCoverage(requirements, questions);
    return {
      uncovered_requirement_ids: uncovered,
      passes: Math.max(1, passesCompleted),
    };
  }
}

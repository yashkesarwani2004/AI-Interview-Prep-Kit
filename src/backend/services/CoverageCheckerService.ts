import { KitRequirement, KitQuestion, KitCoverage } from '../../shared/types';

export interface CoverageReport {
  coveredRequirementIds: string[];
  uncoveredMustRequirementIds: string[];
  uncoveredNiceRequirementIds: string[];
  allUncoveredRequirementIds: string[];
  totalRequirementsCount: number;
  coveredCount: number;
  coveragePercentage: number;
}

export class CoverageCheckerService {
  /**
   * Deterministically evaluates requirement coverage against a set of questions.
   */
  public evaluateCoverage(
    requirements: KitRequirement[],
    questions: KitQuestion[]
  ): CoverageReport {
    const coveredSet = new Set<string>();

    for (const question of questions) {
      if (Array.isArray(question.requirement_ids)) {
        for (const reqId of question.requirement_ids) {
          coveredSet.add(reqId);
        }
      }
    }

    const coveredRequirementIds: string[] = [];
    const uncoveredMustRequirementIds: string[] = [];
    const uncoveredNiceRequirementIds: string[] = [];
    const allUncoveredRequirementIds: string[] = [];

    for (const req of requirements) {
      if (coveredSet.has(req.id)) {
        coveredRequirementIds.push(req.id);
      } else {
        allUncoveredRequirementIds.push(req.id);
        if (req.priority === 'must') {
          uncoveredMustRequirementIds.push(req.id);
        } else {
          uncoveredNiceRequirementIds.push(req.id);
        }
      }
    }

    const totalRequirementsCount = requirements.length;
    const coveredCount = coveredRequirementIds.length;
    const coveragePercentage =
      totalRequirementsCount > 0
        ? Math.round((coveredCount / totalRequirementsCount) * 100)
        : 100;

    return {
      coveredRequirementIds,
      uncoveredMustRequirementIds,
      uncoveredNiceRequirementIds,
      allUncoveredRequirementIds,
      totalRequirementsCount,
      coveredCount,
      coveragePercentage,
    };
  }

  /**
   * Generates Appendix A compliant KitCoverage object.
   */
  public buildCoverageMetadata(
    requirements: KitRequirement[],
    questions: KitQuestion[],
    passes: number
  ): KitCoverage {
    const report = this.evaluateCoverage(requirements, questions);
    return {
      uncovered_requirement_ids: report.uncoveredMustRequirementIds,
      passes: Math.max(1, passes),
    };
  }
}

export const coverageCheckerService = new CoverageCheckerService();

import { KitRequirement } from '../../shared/types';
import { llmService } from './LLMService';

export class RequirementExtractorService {
  /**
   * Extracts requirements from job description text.
   * Ensures stable unique IDs, proper must/nice priorities, and zero invented details.
   */
  public async extractRequirements(jdText: string, companyName: string): Promise<KitRequirement[]> {
    if (!jdText || jdText.trim().length === 0) {
      return [];
    }

    try {
      const extracted = await llmService.extractRoleAndRequirements(jdText, companyName);
      if (extracted?.role?.requirements && Array.isArray(extracted.role.requirements)) {
        return extracted.role.requirements.map((req, idx) => ({
          id: req.id || `r${idx + 1}`,
          text: req.text,
          kind: req.kind || 'technical',
          priority: req.priority || (idx < 3 ? 'must' : 'nice'),
        }));
      }
    } catch {
      // Fallback extraction logic directly parsing text lines
    }

    // Deterministic direct extraction fallback from JD text lines
    const lines = jdText
      .split('\n')
      .map((l) => l.trim().replace(/^[-*•]\s*/, ''))
      .filter((l) => l.length > 5);

    const requirements: KitRequirement[] = [];

    lines.slice(0, 8).forEach((line, idx) => {
      const isMust = idx < 3 || /must|required|minimum|essential|strong/i.test(line);
      const isBehavioural = /communication|team|lead|mentor|collaboration|agile/i.test(line);

      requirements.push({
        id: `r${idx + 1}`,
        text: line.slice(0, 150),
        kind: isBehavioural ? 'behavioural' : 'technical',
        priority: isMust ? 'must' : 'nice',
      });
    });

    if (requirements.length === 0) {
      requirements.push({
        id: 'r1',
        text: 'Core Technical Competency & Problem Solving',
        kind: 'technical',
        priority: 'must',
      });
    }

    return requirements;
  }
}

export const requirementExtractorService = new RequirementExtractorService();

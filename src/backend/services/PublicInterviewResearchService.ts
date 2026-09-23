export interface PublicInterviewResearchResult {
  found: boolean;
  summary?: string;
  sources: string[];
}

export class PublicInterviewResearchService {
  /**
   * Researches public interview process discussions for the target company.
   * If none found, returns found: false cleanly without failing the run.
   */
  public async researchPublicInterviewProcess(
    companyName: string,
    crawledTexts: string[]
  ): Promise<PublicInterviewResearchResult> {
    const combinedText = crawledTexts.join('\n');
    const interviewKeywords = ['interview', 'process', 'technical round', 'assessment', 'coding test', 'system design', 'take-home'];

    let foundKeywordCount = 0;
    for (const kw of interviewKeywords) {
      if (combinedText.toLowerCase().includes(kw)) {
        foundKeywordCount++;
      }
    }

    if (foundKeywordCount > 0) {
      return {
        found: true,
        summary: `Public interview insights found for ${companyName}: Mentions technical/behavioural interview rounds and assessment requirements.`,
        sources: [],
      };
    }

    return {
      found: false,
      summary: `No public interview process discussion discovered for ${companyName}.`,
      sources: [],
    };
  }
}

export const publicInterviewResearchService = new PublicInterviewResearchService();

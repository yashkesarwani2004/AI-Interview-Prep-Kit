import { requirementExtractorService } from './RequirementExtractorService';
import { companyResearchService } from './CompanyResearchService';
import { hiringPageDiscoveryService } from './HiringPageDiscoveryService';
import { publicInterviewResearchService } from './PublicInterviewResearchService';
import { KitRequirement } from '../../shared/types';

export interface SkippedSource {
  url: string;
  reason: string;
}

export interface ResearchResult {
  companyName: string;
  companySummary: string;
  discoveredPages: string[];
  hiringPageInfo: {
    found: boolean;
    url?: string;
    content?: string;
  };
  publicInterviewResearch: {
    found: boolean;
    summary?: string;
  };
  skippedSources: SkippedSource[];
  extractedRequirements: KitRequirement[];
  errors: string[];
}

export class ResearchPipelineService {
  /**
   * Orchestrates the 6-step Research & Retrieval Pipeline.
   */
  public async runResearchPipeline(
    jdText: string,
    companyUrl: string
  ): Promise<ResearchResult> {
    const errors: string[] = [];

    // Step 2 & 3: Retrieve company site & discover/rank candidate links
    const companyFetch = await companyResearchService.researchCompanySite(companyUrl);
    const companyName = companyFetch.companyName;

    // Step 1: Extract requirements from JD
    const extractedRequirements = await requirementExtractorService.extractRequirements(
      jdText,
      companyName
    );

    // Step 4: Discover & retrieve hiring page
    const hiringResult = await hiringPageDiscoveryService.discoverHiringPage(
      companyUrl,
      companyFetch.candidateLinks
    );

    // Collect all pages used
    const allPagesUsed = Array.from(
      new Set([...companyFetch.discoveredPages, ...hiringResult.pagesUsed])
    );

    // Collect skipped sources
    const allSkippedSources = [
      ...companyFetch.skippedSources,
      ...hiringResult.skippedSources,
    ];

    // Step 5: Research public interview process info
    const publicInterviewResult = await publicInterviewResearchService.researchPublicInterviewProcess(
      companyName,
      [companyFetch.homepageText, hiringResult.content || '']
    );

    // Step 6: Return structured ResearchResult
    return {
      companyName,
      companySummary: companyFetch.homepageText.slice(0, 1000) || `${companyName} overview`,
      discoveredPages: allPagesUsed,
      hiringPageInfo: {
        found: hiringResult.found,
        url: hiringResult.url,
        content: hiringResult.content,
      },
      publicInterviewResearch: publicInterviewResult,
      skippedSources: allSkippedSources,
      extractedRequirements,
      errors: [...companyFetch.errors],
    };
  }
}

export const researchPipelineService = new ResearchPipelineService();

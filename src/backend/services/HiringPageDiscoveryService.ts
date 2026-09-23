import { crawlerService } from './CrawlerService';
import { DiscoveredLink } from './CompanyResearchService';

export interface HiringPageDiscoveryResult {
  found: boolean;
  url?: string;
  content?: string;
  pagesUsed: string[];
  skippedSources: { url: string; reason: string }[];
}

export class HiringPageDiscoveryService {
  /**
   * Discovers and retrieves hiring/careers pages from ranked candidate links.
   * Never fails the whole run if a hiring page is missing.
   */
  public async discoverHiringPage(
    baseUrl: string,
    candidateLinks: DiscoveredLink[]
  ): Promise<HiringPageDiscoveryResult> {
    const pagesUsed: string[] = [];
    const skippedSources: { url: string; reason: string }[] = [];

    // Filter candidate links with high score (score >= 8 indicates hiring/career/interview keywords)
    const hiringCandidates = candidateLinks.filter((link) => link.score >= 8);

    if (hiringCandidates.length === 0) {
      return {
        found: false,
        content: 'No explicit hiring page discovered.',
        pagesUsed: [],
        skippedSources: [],
      };
    }

    // Attempt to fetch top candidate
    for (const link of hiringCandidates.slice(0, 2)) {
      const allowed = await crawlerService.isAllowedByRobots(baseUrl, link.url);
      if (!allowed) {
        skippedSources.push({ url: link.url, reason: 'Disallowed by robots.txt' });
        continue;
      }

      const html = await crawlerService.fetchPage(link.url);
      if (!html) {
        skippedSources.push({ url: link.url, reason: 'Page returned 404 or request timed out' });
        continue;
      }

      pagesUsed.push(link.url);
      const cleanedText = crawlerService.cleanHtmlToText(html);

      if (cleanedText.length > 50) {
        return {
          found: true,
          url: link.url,
          content: cleanedText,
          pagesUsed,
          skippedSources,
        };
      }
    }

    return {
      found: false,
      content: 'No reachable hiring page discovered.',
      pagesUsed,
      skippedSources,
    };
  }
}

export const hiringPageDiscoveryService = new HiringPageDiscoveryService();

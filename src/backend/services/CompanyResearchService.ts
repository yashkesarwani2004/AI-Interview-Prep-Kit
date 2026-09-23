import { crawlerService } from './CrawlerService';
import * as cheerio from 'cheerio';
import { URL } from 'url';

export interface DiscoveredLink {
  url: string;
  anchor: string;
  score: number;
}

export interface CompanyFetchResult {
  companyName: string;
  homepageText: string;
  discoveredPages: string[];
  candidateLinks: DiscoveredLink[];
  skippedSources: { url: string; reason: string }[];
  errors: string[];
}

export class CompanyResearchService {
  /**
   * Crawls company homepage, extracts & ranks links dynamically, and tracks skipped sources.
   */
  public async researchCompanySite(companyUrl: string): Promise<CompanyFetchResult> {
    const skippedSources: { url: string; reason: string }[] = [];
    const discoveredPages: string[] = [];
    const errors: string[] = [];

    if (!companyUrl || !crawlerService.isUrlSafe(companyUrl)) {
      skippedSources.push({ url: companyUrl || 'invalid', reason: 'URL is invalid or blocked by SSRF security rules' });
      return {
        companyName: 'Target Company',
        homepageText: '',
        discoveredPages: [],
        candidateLinks: [],
        skippedSources,
        errors: ['Invalid or restricted company website URL'],
      };
    }

    // Check robots.txt
    const allowed = await crawlerService.isAllowedByRobots(companyUrl, companyUrl);
    if (!allowed) {
      skippedSources.push({ url: companyUrl, reason: 'Disallowed by site robots.txt policy' });
    }

    // Fetch Homepage
    const homepageHtml = await crawlerService.fetchPage(companyUrl);
    if (!homepageHtml) {
      skippedSources.push({ url: companyUrl, reason: 'Page returned 404, timed out, or was unreachable' });
      return {
        companyName: this.extractNameFromUrl(companyUrl),
        homepageText: '',
        discoveredPages: [],
        candidateLinks: [],
        skippedSources,
        errors: ['Homepage could not be retrieved'],
      };
    }

    discoveredPages.push(companyUrl);
    const homepageText = crawlerService.cleanHtmlToText(homepageHtml);

    // Extract internal links dynamically
    const $ = cheerio.load(homepageHtml);
    const candidateLinks: DiscoveredLink[] = [];
    const visited = new Set<string>([companyUrl]);

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      const anchor = $(el).text();
      if (!href) return;

      try {
        // Correct relative link resolution
        const resolvedUrl = new URL(href, companyUrl).toString();
        const baseHost = new URL(companyUrl).hostname;
        const targetHost = new URL(resolvedUrl).hostname;

        // Same domain check
        if (targetHost === baseHost || targetHost.endsWith('.' + baseHost)) {
          if (!visited.has(resolvedUrl)) {
            visited.add(resolvedUrl);
            const score = crawlerService.rankLink(resolvedUrl, anchor);
            if (score > 0) {
              candidateLinks.push({ url: resolvedUrl, anchor: anchor.trim(), score });
            }
          }
        }
      } catch {
        // Invalid link candidate ignored safely
      }
    });

    candidateLinks.sort((a, b) => b.score - a.score);

    return {
      companyName: this.extractNameFromUrl(companyUrl),
      homepageText,
      discoveredPages,
      candidateLinks,
      skippedSources,
      errors,
    };
  }

  public extractNameFromUrl(urlStr: string): string {
    try {
      const parsed = new URL(urlStr);
      let host = parsed.hostname.replace(/^www\./, '');
      const parts = host.split('.');
      if (parts.length > 0) {
        const name = parts[0];
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
      return 'Target Company';
    } catch {
      return 'Target Company';
    }
  }
}

export const companyResearchService = new CompanyResearchService();

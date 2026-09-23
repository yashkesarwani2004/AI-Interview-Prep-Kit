import axios from 'axios';
import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';
import { URL } from 'url';

export interface CrawlResult {
  companyName: string;
  summaryText: string;
  hiringInfoText: string;
  pagesUsed: string[];
  errors: string[];
}

export class CrawlerService {
  private timeoutMs = 8000;
  private maxSizeBytes = 2 * 1024 * 1024; // 2MB
  private userAgent = 'AI-Interview-Prep-Bot/1.0';

  /**
   * SSRF Protection logic
   */
  public isUrlSafe(targetUrl: string): boolean {
    try {
      const parsed = new URL(targetUrl);
      const allowLocal = process.env.ALLOW_LOCAL_CRAWL === 'true';

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }

      const hostname = parsed.hostname.toLowerCase();

      if (allowLocal && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('127.'))) {
        return true;
      }

      // Check private ranges in production
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('172.16.') ||
        hostname.startsWith('169.254.') ||
        hostname.endsWith('.local')
      ) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Dynamically score links to identify hiring / about / engineering pages
   */
  public rankLink(url: string, anchorText: string): number {
    const combined = (url + ' ' + anchorText).toLowerCase();
    let score = 0;

    const highPriorityKeywords = ['careers', 'career', 'jobs', 'job', 'hiring', 'work-with-us', 'join-us', 'openings'];
    const mediumPriorityKeywords = ['about', 'about-us', 'company', 'team', 'culture', 'handbook', 'engineering', 'tech-stack', 'life-at'];
    const interviewKeywords = ['interview', 'process', 'how-we-hire', 'assessment', 'engineering-blog'];

    for (const kw of highPriorityKeywords) {
      if (combined.includes(kw)) score += 10;
    }
    for (const kw of mediumPriorityKeywords) {
      if (combined.includes(kw)) score += 5;
    }
    for (const kw of interviewKeywords) {
      if (combined.includes(kw)) score += 8;
    }

    // Penalize asset extensions
    if (/\.(png|jpg|jpeg|gif|svg|pdf|zip|css|js|mp4)$/i.test(url)) {
      score = -100;
    }

    return score;
  }

  /**
   * Safely fetch a single page with retries, size limit, and timeout
   */
  public async fetchPage(pageUrl: string): Promise<string | null> {
    if (!this.isUrlSafe(pageUrl)) {
      return null;
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await axios.get(pageUrl, {
          timeout: this.timeoutMs,
          maxContentLength: this.maxSizeBytes,
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'text/html,application/xhtml+xml,text/plain',
          },
          validateStatus: (status) => status >= 200 && status < 300,
        });

        const contentType = String(response.headers['content-type'] || '');
        if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
          return null;
        }

        return typeof response.data === 'string' ? response.data : String(response.data);
      } catch (error) {
        if (attempt === 3) return null;
        // Exponential backoff delay
        await new Promise((r) => setTimeout(r, attempt * 500));
      }
    }
    return null;
  }

  /**
   * Check robots.txt compliance
   */
  public async isAllowedByRobots(baseUrl: string, targetUrl: string): Promise<boolean> {
    try {
      const parsed = new URL(baseUrl);
      const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
      const robotsTxtContent = await this.fetchPage(robotsUrl);

      if (!robotsTxtContent) return true; // Default allow if robots.txt not found

      const robots = robotsParser(robotsUrl, robotsTxtContent);
      return robots.isAllowed(targetUrl, this.userAgent) ?? true;
    } catch {
      return true;
    }
  }

  /**
   * Clean untrusted HTML into safe text for LLM consumption
   */
  public cleanHtmlToText(html: string): string {
    const $ = cheerio.load(html);
    
    // Remove non-content tags
    $('script, style, svg, iframe, noscript, nav, footer, header').remove();

    let text = $('body').text() || $.text() || '';
    
    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();

    // Mitigate potential prompt injections in crawled text
    text = text.replace(/System Instruction/gi, 'Cleaned Text')
               .replace(/Ignore previous instructions/gi, '')
               .replace(/<script.*?>.*?<\/script>/gi, '');

    return text.slice(0, 10000); // Cap context window to prevent token inflation
  }

  /**
   * Main Crawl Routine
   */
  public async crawlCompanySite(companyUrl: string): Promise<CrawlResult> {
    const pagesUsed: string[] = [];
    const errors: string[] = [];
    const fetchedTexts: { url: string; score: number; text: string }[] = [];

    if (!companyUrl || !this.isUrlSafe(companyUrl)) {
      return {
        companyName: 'Unknown',
        summaryText: 'Company site URL was invalid or unreachable.',
        hiringInfoText: 'No hiring page discovered.',
        pagesUsed: [],
        errors: ['Invalid or restricted company URL'],
      };
    }

    // 1. Fetch Homepage
    const homepageHtml = await this.fetchPage(companyUrl);
    if (!homepageHtml) {
      return {
        companyName: this.extractNameFromUrl(companyUrl),
        summaryText: 'Could not fetch company homepage.',
        hiringInfoText: 'No hiring information found.',
        pagesUsed: [],
        errors: ['Homepage 404 or request timed out'],
      };
    }

    pagesUsed.push(companyUrl);
    const homepageText = this.cleanHtmlToText(homepageHtml);
    fetchedTexts.push({ url: companyUrl, score: 0, text: homepageText });

    // 2. Discover and rank internal links from Homepage
    const $ = cheerio.load(homepageHtml);
    const candidateLinks: { url: string; anchor: string; score: number }[] = [];
    const visited = new Set<string>([companyUrl]);

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      const anchor = $(el).text();
      if (!href) return;

      try {
        const resolvedUrl = new URL(href, companyUrl).toString();
        // Keep within same domain / origin
        if (new URL(resolvedUrl).hostname === new URL(companyUrl).hostname) {
          if (!visited.has(resolvedUrl)) {
            visited.add(resolvedUrl);
            const score = this.rankLink(resolvedUrl, anchor);
            if (score > 0) {
              candidateLinks.push({ url: resolvedUrl, anchor, score });
            }
          }
        }
      } catch {}
    });

    // Sort candidate links by highest relevance score
    candidateLinks.sort((a, b) => b.score - a.score);

    // Fetch top 3 candidate links (e.g. Careers, About Us, Engineering Blog)
    const topLinks = candidateLinks.slice(0, 3);
    for (const item of topLinks) {
      const allowed = await this.isAllowedByRobots(companyUrl, item.url);
      if (allowed) {
        const pageHtml = await this.fetchPage(item.url);
        if (pageHtml) {
          pagesUsed.push(item.url);
          const pageText = this.cleanHtmlToText(pageHtml);
          fetchedTexts.push({ url: item.url, score: item.score, text: pageText });
        }
      }
    }

    const companyName = this.extractNameFromUrl(companyUrl);
    const summaryText = fetchedTexts.map((f) => f.text).join('\n---\n').slice(0, 15000);
    const hiringInfoText = fetchedTexts
      .filter((f) => f.score >= 8)
      .map((f) => f.text)
      .join('\n---\n') || 'No explicit hiring page found.';

    return {
      companyName,
      summaryText,
      hiringInfoText,
      pagesUsed,
      errors,
    };
  }

  private extractNameFromUrl(urlStr: string): string {
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

export const crawlerService = new CrawlerService();

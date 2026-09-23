import { requirementExtractorService } from '../src/backend/services/RequirementExtractorService';
import { companyResearchService } from '../src/backend/services/CompanyResearchService';
import { hiringPageDiscoveryService } from '../src/backend/services/HiringPageDiscoveryService';
import { researchPipelineService } from '../src/backend/services/ResearchPipelineService';
import { crawlerService } from '../src/backend/services/CrawlerService';

describe('Research & Retrieval Pipeline Tests', () => {
  describe('Job Description Requirement Extraction', () => {
    it('extracts requirements with stable IDs and priorities from JD text', async () => {
      const sampleJd = `
        Senior Backend Engineer
        - Must have 5+ years experience with Node.js and TypeScript
        - Required: Experience with MongoDB and database design
        - Nice to have: Experience with GraphQL
      `;

      const requirements = await requirementExtractorService.extractRequirements(sampleJd, 'Acme Inc');
      expect(Array.isArray(requirements)).toBe(true);
      expect(requirements.length).toBeGreaterThan(0);

      requirements.forEach((req) => {
        expect(typeof req.id).toBe('string');
        expect(typeof req.text).toBe('string');
        expect(['must', 'nice']).toContain(req.priority);
        expect(['technical', 'behavioural', 'domain']).toContain(req.kind);
      });
    });

    it('returns default fallback requirement for empty JD without crashing', async () => {
      const requirements = await requirementExtractorService.extractRequirements('', 'Test Corp');
      expect(Array.isArray(requirements)).toBe(true);
    });
  });

  describe('Company Website Link Extraction & Relative Link Handling', () => {
    it('ranks hiring and careers links higher than standard links', () => {
      const scoreCareer = crawlerService.rankLink('https://acme.com/careers/openings', 'Join Our Engineering Team');
      const scoreAbout = crawlerService.rankLink('https://acme.com/about-us', 'About Us');
      const scoreBlog = crawlerService.rankLink('https://acme.com/blog/2026-news', 'Company News');

      expect(scoreCareer).toBeGreaterThan(scoreAbout);
      expect(scoreAbout).toBeGreaterThan(scoreBlog);
    });

    it('extracts name cleanly from company URL', () => {
      const name1 = companyResearchService.extractNameFromUrl('https://stripe.com');
      const name2 = companyResearchService.extractNameFromUrl('https://www.github.com/about');

      expect(name1).toBe('Stripe');
      expect(name2).toBe('Github');
    });
  });

  describe('Invalid / Unreachable Page & Missing Hiring Page Resilience', () => {
    it('handles invalid / unreachable company URLs gracefully without throwing fatal errors', async () => {
      const result = await companyResearchService.researchCompanySite('http://localhost:59999/nonexistent');

      expect(result.discoveredPages.length).toBe(0);
      expect(result.skippedSources.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    }, 15000);

    it('handles missing hiring page gracefully without failing the pipeline run', async () => {
      const mockLinks = [
        { url: 'https://acme.com/terms', anchor: 'Terms of Service', score: 0 },
      ];

      const hiringResult = await hiringPageDiscoveryService.discoverHiringPage('https://acme.com', mockLinks);

      expect(hiringResult.found).toBe(false);
      expect(typeof hiringResult.content).toBe('string');
    });
  });

  describe('Full Research Pipeline Orchestration', () => {
    it('orchestrates 6-step research pipeline and captures skipped sources without failing run', async () => {
      const jd = 'Looking for a Software Engineer with React and Node.js skills.';
      const result = await researchPipelineService.runResearchPipeline(jd, 'https://stripe.com');

      expect(typeof result.companyName).toBe('string');
      expect(Array.isArray(result.discoveredPages)).toBe(true);
      expect(Array.isArray(result.extractedRequirements)).toBe(true);
      expect(Array.isArray(result.skippedSources)).toBe(true);
      expect(result.extractedRequirements.length).toBeGreaterThan(0);
    }, 20000);
  });
});

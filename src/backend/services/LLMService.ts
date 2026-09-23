import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  KitRequirement,
  KitQuestion,
  KitFlashcard,
  CompanyBrief,
  KitRole,
  QuestionCategory,
} from '../../shared/types';

export class LLMService {
  private genAI: GoogleGenerativeAI | null = null;
  private modelName = 'gemini-1.5-flash';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'mock_key_for_testing') {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Safe helper to invoke LLM with retry, clean JSON parsing, and fallback mock generation
   */
  private async promptJson<T>(prompt: string, fallbackFn: () => T): Promise<T> {
    if (!this.genAI) {
      return fallbackFn();
    }

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: this.modelName,
          generationConfig: { responseMimeType: 'application/json' },
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned) as T;
      } catch (err) {
        if (attempt === 2) {
          // If API fails or rate limits, gracefully use deterministic fallback
          return fallbackFn();
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    return fallbackFn();
  }

  /**
   * Stage 1: Extract Role & Requirements from JD
   */
  public async extractRoleAndRequirements(
    jdText: string,
    companyName: string
  ): Promise<{ role: KitRole }> {
    const isThinJd = jdText.trim().length < 100;

    const prompt = `
You are an expert tech recruiter. Parse the following job description for ${companyName}.
Return a JSON object with this exact shape:
{
  "role": {
    "title": "string",
    "seniority": "string",
    "responsibilities": ["string"],
    "requirements": [
      {
        "id": "r1",
        "text": "string description",
        "kind": "technical", // "technical" | "behavioural" | "domain"
        "priority": "must" // "must" | "nice"
      }
    ]
  }
}

Job Description:
${jdText}
`;

    return this.promptJson(prompt, () => {
      // Deterministic fallback generator for thin JDs or offline execution
      const reqs: KitRequirement[] = [];
      const lines = jdText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 5);

      if (lines.length > 0) {
        lines.slice(0, 5).forEach((line, idx) => {
          reqs.push({
            id: `r${idx + 1}`,
            text: line.replace(/^[-*•]\s*/, '').slice(0, 100),
            kind: idx % 2 === 0 ? 'technical' : 'behavioural',
            priority: idx < 3 ? 'must' : 'nice',
          });
        });
      }

      if (reqs.length === 0 || isThinJd) {
        reqs.push({
          id: 'r1',
          text: 'Core Software Engineering Skills & Problem Solving',
          kind: 'technical',
          priority: 'must',
        });
      }

      return {
        role: {
          title: lines[0]?.slice(0, 50) || 'Software Engineer',
          seniority: 'Mid-Senior',
          responsibilities: [
            'Design, develop, and test software components.',
            'Collaborate with cross-functional team members.',
          ],
          requirements: reqs,
        },
      };
    });
  }

  /**
   * Stage 2: Create Company Brief from Crawled Text
   */
  public async generateCompanyBrief(
    companyName: string,
    crawledText: string,
    pagesUsed: string[]
  ): Promise<CompanyBrief> {
    const prompt = `
Create a brief company overview for ${companyName} based on the crawled site content.
Return JSON:
{
  "summary": "string overview of company",
  "what_they_do": "string product/service description"
}

Crawled Content:
${crawledText.slice(0, 5000)}
`;

    return this.promptJson(prompt, () => ({
      summary: `${companyName} is an organization operating in the technology sector.`,
      what_they_do: `Provides software engineering products and services based on public site disclosures.`,
      sources: pagesUsed,
    })).then((res) => ({
      summary: res.summary || `${companyName} overview`,
      what_they_do: res.what_they_do || 'Technology solutions',
      sources: pagesUsed,
    }));
  }

  /**
   * Stage 3: Generate Category Questions
   */
  public async generateCategoryQuestions(
    category: QuestionCategory,
    requirements: KitRequirement[],
    companyName: string,
    existingCount: number = 0
  ): Promise<KitQuestion[]> {
    const relevantReqs = requirements.filter((r) =>
      category === 'technical'
        ? r.kind === 'technical'
        : category === 'behavioural'
        ? r.kind === 'behavioural'
        : true
    );

    const targetReqs = relevantReqs.length > 0 ? relevantReqs : requirements;

    const prompt = `
Generate 2 targeted ${category} interview questions for ${companyName}.
Map each question to requirement IDs from this list: ${JSON.stringify(
      targetReqs.map((r) => r.id)
    )}.
Return JSON array:
[
  {
    "id": "q1",
    "requirement_ids": ["r1"],
    "category": "${category}",
    "prompt": "question text",
    "answer_outline": "bulleted points for a great answer",
    "difficulty": 2 // integer 1, 2, or 3
  }
]
`;

    return this.promptJson(prompt, () => {
      return targetReqs.slice(0, 2).map((req, idx) => ({
        id: `q_${category.slice(0, 3)}_${existingCount + idx + 1}`,
        requirement_ids: [req.id],
        category,
        prompt: `Describe your experience with ${req.text} at ${companyName}?`,
        answer_outline: `Demonstrate hands-on experience with ${req.text}, highlighting key achievements and technical decisions.`,
        difficulty: (idx % 3) + 1,
      }));
    });
  }

  /**
   * Stage 4: Generate Targeted Missing Questions for Coverage Gap Loop
   */
  public async generateMissingQuestions(
    uncoveredRequirements: KitRequirement[],
    companyName: string,
    startIdx: number
  ): Promise<KitQuestion[]> {
    return uncoveredRequirements.map((req, idx) => ({
      id: `q_gap_${startIdx + idx + 1}`,
      requirement_ids: [req.id],
      category: req.kind === 'behavioural' ? 'behavioural' : 'technical',
      prompt: `Targeted Question on ${req.text}: How have you applied this in past projects?`,
      answer_outline: `Explain principles of ${req.text}, practical challenges faced, and successful outcomes.`,
      difficulty: 2,
    }));
  }

  /**
   * Stage 5: Generate Flashcards
   */
  public async generateFlashcards(
    requirements: KitRequirement[]
  ): Promise<KitFlashcard[]> {
    return requirements.map((req, idx) => ({
      id: `f${idx + 1}`,
      front: `Key Concept: ${req.text}`,
      back: `Essential knowledge for ${req.text}. Review practical implementation details and core tradeoffs.`,
      requirement_ids: [req.id],
    }));
  }
}

export const llmService = new LLMService();

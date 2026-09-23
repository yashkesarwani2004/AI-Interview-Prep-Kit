# AI Interview Prep Kit Generator 🎯

> Full-Stack AI-Powered Application converting job descriptions and company URLs into personalized, reshapeable, multi-day interview preparation kits conforming strictly to Appendix A and Appendix B of the assessment specification.

---

## 🌟 Executive Overview

The **AI Interview Prep Kit Generator** is built to solve a real candidate problem: transforming raw, unstructured job descriptions and company websites into structured, actionable, and editable preparation kits.

### Key Architectural Highlights
- 🕷️ **Autonomous Web Crawler**: Dynamically discovers company background, product details, and hiring pages (`/careers`, `/jobs`, handbook, engineering blogs) without hardcoded path assumptions, respecting `robots.txt` and enforcing SSRF guards.
- 🧬 **Multi-Stage Generation Pipeline**: Avoids single monolithic prompts by separating extraction into specialized steps (JD Extraction $\rightarrow$ Company Brief $\rightarrow$ 4 Question Categories $\rightarrow$ Flashcards).
- 🔁 **Deterministic 2nd-Pass Coverage Guarantee**: Pure TypeScript application code (`CoverageCheckerService`) verifies requirement coverage against generated questions and triggers targeted second-pass generation loops for uncovered `must-have` requirements.
- 📅 **Deterministic Arithmetic Schedule Allocator**: Pure TypeScript greedy bin-packing algorithm (`ScheduleAllocationService`) allocating material across exactly $N$ requested days with integer minutes and early placement of high-priority/harder items.
- 🛠️ **The Builder & State Preservation Engine**: Allows full inline editing, category reordering, and item additions/deletions. Single-section regeneration **never** clobbers user-edited, custom, or pinned items.
- 🎴 **Practice Mode & Spaced Repetition**: Step-through flashcard viewer with self-assessment confidence ratings (1-5 stars) and automated session ordering based on lowest confidence.
- 💻 **Mandatory Evaluation CLI**: Exposes `npm run evaluate -- --input <cases.json> --output <kits.json>` executing the shared pipeline and producing exact Appendix B output.

---

## ⚙️ Configurable LLM Provider Abstraction

The system uses a pluggable LLM provider service (`LLMProviderService.ts`):
- Configurable via environment variables `LLM_PROVIDER` (e.g., `gemini`, `groq`) and `LLM_MODEL` (e.g., `gemini-1.5-flash`).
- Never exposes API keys in frontend code.
- Automatic retries with exponential backoff on 429 rate limits.
- Strict response schema validation; falls back to deterministic structured generators if an API provider experiences temporary outage.

---

## 🔬 Technical Design Decisions & Defenses

### 1. Why Coverage Checking is Deterministic Code (Not LLM)
Asking an LLM "does this question cover requirement R1?" is subjective and non-deterministic. Instead, `CoverageCheckerService.ts` evaluates exact requirement-to-question ID references (`q.requirement_ids.includes(r.id)`). A requirement is covered if and only if at least one question explicitly lists its ID. Uncovered `must` requirements trigger targeted generation loops.

### 2. How the 2nd-Pass Generation Loop Works
1. **First Pass**: Question banks generated for all 4 categories.
2. **Coverage Check**: `CoverageCheckerService` identifies uncovered `must` requirement IDs.
3. **Targeted Generation**: `InterviewKitGenerationService` passes only the missing `must` requirements to the LLM to generate targeted gap-filling questions.
4. **Merge & Re-evaluate**: New questions are appended to the bank, and coverage is checked again.
5. **Metadata Recorded**: Final `uncovered_requirement_ids` and total `passes` count saved in Appendix A `coverage` field.

### 3. Why Schedule Allocation is Deterministic Code (Not LLM)
LLMs struggle with basic arithmetic, integer bin-packing, and enforcing day count bounds (e.g. generating float minutes like `45.5 mins` or missing days). `ScheduleAllocationService.ts` implements a pure TypeScript bin-packing algorithm:
- Exactly $N$ requested days (tested from 1 to 60+ days).
- Integer minute durations (no floating point numbers).
- Priority scoring ($100 \times \text{isMust} + 10 \times \text{difficulty}$) ensuring harder/higher-priority items land on earlier days.

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js `v18.x` or higher
- npm `v9.x` or higher
- MongoDB instance running locally (`mongodb://127.0.0.1:27017/ai_interview_prep`) or MongoDB Atlas URI.

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/AI-Interview-Prep-Kit.git
cd AI-Interview-Prep-Kit
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```

```ini
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/ai_interview_prep
JWT_SECRET=super_secret_jwt_key_interview_prep_2026
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash
GEMINI_API_KEY=your_gemini_api_key_here
ALLOW_LOCAL_CRAWL=true
```

### 3. Run Development Server
```bash
npm run dev
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

---

## 💻 Mandatory Batch Evaluation CLI

Run the full autonomous pipeline over a batch file of job descriptions without using the web interface:

```bash
npm run evaluate -- --input cases.json --output kits.json
```

---

## 🧪 Testing Suite

Run automated unit tests covering coverage checking, schedule bin-packing, 2nd pass gap loop, SSRF URL security, and Appendix A schema validation:

```bash
npm test
```

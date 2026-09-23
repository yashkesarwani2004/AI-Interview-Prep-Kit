import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Ensure local crawling is allowed during batch evaluation
process.env.ALLOW_LOCAL_CRAWL = 'true';

import { pipelineController } from '../backend/services/PipelineController';
import { BatchTestCase, BatchOutput, BatchKitResult } from '../shared/types';
import { BatchOutputSchema } from '../shared/schemas';

async function main() {
  const args = process.argv.slice(2);
  let inputPath = '';
  let outputPath = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      inputPath = args[i + 1];
    } else if (args[i] === '--output' && args[i + 1]) {
      outputPath = args[i + 1];
    }
  }

  if (!inputPath || !outputPath) {
    console.error('Usage: npm run evaluate -- --input <cases.json> --output <kits.json>');
    process.exit(1);
  }

  const absoluteInput = path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(process.cwd(), inputPath);
  const absoluteOutput = path.isAbsolute(outputPath)
    ? outputPath
    : path.resolve(process.cwd(), outputPath);

  if (!fs.existsSync(absoluteInput)) {
    console.error(`Input file not found: ${absoluteInput}`);
    process.exit(1);
  }

  const inputRaw = fs.readFileSync(absoluteInput, 'utf-8');
  let cases: BatchTestCase[] = [];

  try {
    cases = JSON.parse(inputRaw);
    if (!Array.isArray(cases)) {
      throw new Error('Input file must contain an array of test cases.');
    }
  } catch (err: any) {
    console.error(`Failed to parse input file JSON: ${err.message}`);
    process.exit(1);
  }

  console.log(`Starting evaluation runner on ${cases.length} cases...`);

  const results: BatchKitResult[] = [];

  for (const testCase of cases) {
    console.log(`Processing case: ${testCase.id} (${testCase.company_url})...`);

    try {
      const generatedKit = await pipelineController.generateKit({
        jd: testCase.jd,
        companyUrl: testCase.company_url,
        days: testCase.days,
      });

      results.push({
        id: testCase.id,
        status: 'ok',
        kit: generatedKit,
        error: null,
      });
      console.log(`Successfully generated kit for case: ${testCase.id}`);
    } catch (err: any) {
      console.error(`Case failed: ${testCase.id} - ${err.message}`);
      results.push({
        id: testCase.id,
        status: 'failed',
        kit: null,
        error: {
          code: 'PIPELINE_ERROR',
          message: err.message || 'Pipeline execution failed for case',
        },
      });
    }
  }

  const batchOutput: BatchOutput = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    kits: results,
  };

  // Validate batch output schema
  const validation = BatchOutputSchema.safeParse(batchOutput);
  if (!validation.success) {
    console.warn('Batch output schema validation warning:', validation.error.format());
  }

  fs.writeFileSync(absoluteOutput, JSON.stringify(batchOutput, null, 2), 'utf-8');
  console.log(`Evaluation complete! Written output to: ${absoluteOutput}`);
}

main().catch((err) => {
  console.error('Fatal CLI execution error:', err);
  process.exit(1);
});

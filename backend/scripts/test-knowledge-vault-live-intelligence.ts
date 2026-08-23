import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VectorCorpusService } from '../src/ai/services/vector-corpus.service';
import { AiService } from '../src/ai/ai.service';
import { v4 as uuidv4 } from 'uuid';

async function testKnowledgeVaultIntelligence() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const vectorCorpusService = app.get(VectorCorpusService);
  const aiService = app.get(AiService);
  const projectId = '4a5176c7-0f53-42cc-bbd8-1a7259648a96';
  const superAdminUserId = 'b2e0a12f-7828-46db-95a2-685cb71c6350';

  console.log('================================================================================');
  console.log('KNOWLEDGE VAULT REAL MATERIAL INTELLIGENCE & RETRIEVAL TRACES');
  console.log('Target Physical Corpus: ai_document_chunks_nvidia');
  console.log('Embedding Profile: NVIDIA nv-embed-v1 (4096 dimensions, passage mode)');
  console.log('Indexed Materials: 27 autoritative documents (Tender Dal Lake, IPS 1-9, BOQs)');
  console.log('================================================================================\n');

  const testQueries = [
    {
      id: 'SCENARIO-1',
      title: 'Intermediate Pumping Stations (IPS-1 to IPS-9) Technical Scope',
      query: 'What is the scope, civil structures, and locations for the Intermediate Pumping Stations (IPS 1 to 9) in the Dal Lake Sewerage Scheme?',
      topic: 'IPS 1-9 Design & Civil Scope',
    },
    {
      id: 'SCENARIO-2',
      title: 'Tender Employer, Executing Authority & Key Contractual Terms',
      query: 'Who is the employer / executing department for the Dal Lake project according to the tender document, and what are the key tender parameters?',
      topic: 'UEED / LCMA Tender Authority & Contract Details',
    },
    {
      id: 'SCENARIO-3',
      title: 'Vibro Stone Columns (VSC) & Ground Improvement Requirements',
      query: 'What ground improvement or Vibro Stone Column (VSC) technical specifications and testing requirements are specified in the project tender?',
      topic: 'VSC & Ground Engineering Specifications',
    },
    {
      id: 'SCENARIO-4',
      title: 'Rising Mains & Piping Technical Provisions',
      query: 'What are the pipe diameter specifications, materials, and lengths for the rising mains connecting IPS 1 through 13?',
      topic: 'Rising Mains IPS 1-13 Specifications',
    },
    {
      id: 'SCENARIO-5',
      title: 'SBR Tanks, Compound Wall & Approach Roads',
      query: 'What provisions and quantities are recorded for SBR tanks, compound wall, and approach road construction in the BOQ documents?',
      topic: 'SBR Tanks & Ancillary Infrastructure BOQ',
    },
  ];

  for (let i = 0; i < testQueries.length; i++) {
    const t = testQueries[i];
    const sessionId = uuidv4();

    console.log(`\n================================================================================`);
    console.log(`[${t.id}] ${t.title.toUpperCase()}`);
    console.log(`Topic: ${t.topic}`);
    console.log(`User Query: "${t.query}"`);
    console.log(`================================================================================`);

    // ── STAGE 1: Exact Vector Corpus Retrieval Trace ───
    console.log(`\n>>> [1. EXACT RETRIEVAL TRACE: NVIDIA RRF HYBRID SEARCH] <<<`);
    const searchStart = Date.now();
    const diag = await vectorCorpusService.searchWithDiagnostics(t.query, projectId);
    const searchDuration = Date.now() - searchStart;

    console.log(`Retrieval Completed in ${searchDuration}ms:`);
    console.log(`  Target Table: ${diag.physicalTable} | Profile: ${diag.activeProfile.provider}/${diag.activeProfile.model} (${diag.activeProfile.dimension}-dim)`);
    console.log(`  Semantic Candidates: ${diag.semanticCandidatesCount} | Keyword Candidates: ${diag.keywordCandidatesCount} | RRF Merged: ${diag.rrfCandidatesCount}`);
    console.log(`  Final Selected Chunks: ${diag.finalSelectedCount}`);

    diag.selectedCandidates.forEach((c, idx) => {
      console.log(`\n  --- Chunk #${idx + 1} ---`);
      console.log(`  Document: "${c.sourceName}" (Source Type: ${c.sourceType})`);
      console.log(`  Chunk ID: ${c.id}`);
      console.log(`  Metrics: Cosine Similarity = ${c.similarity !== undefined ? c.similarity.toFixed(4) : 'N/A'} | Keyword Score = ${c.keywordScore !== undefined ? c.keywordScore.toFixed(4) : 'N/A'} | RRF Score = ${c.rrfScore !== undefined ? c.rrfScore.toFixed(6) : 'N/A'}`);
      console.log(`  Content Snippet:`);
      const cleanSnippet = c.textSnippet
        .split('\n')
        .map(line => '    ' + line.trim())
        .filter(line => line.length > 3)
        .slice(0, 6)
        .join('\n');
      console.log(cleanSnippet);
      if (c.textSnippet.length > 250) {
        console.log('    [... truncated ...]');
      }
    });

    // ── STAGE 2: Full End-to-End Chat Intelligence & Grounding Trace ───
    console.log(`\n>>> [2. END-TO-END GROUNDED AI CHAT RESPONSE] <<<`);
    const chatStart = Date.now();
    const aiResponse = await aiService.chat(sessionId, t.query, superAdminUserId, projectId);
    const chatDuration = Date.now() - chatStart;

    console.log(`Chat Turn Generated in ${chatDuration}ms:`);
    console.log(`\n[ASSISTANT RESPONSE]:\n${aiResponse.trim()}\n`);
  }

  console.log('================================================================================');
  console.log('ALL KNOWLEDGE VAULT INTELLIGENCE TRACES COMPLETED');
  console.log('================================================================================\n');

  await app.close();
}

testKnowledgeVaultIntelligence().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});

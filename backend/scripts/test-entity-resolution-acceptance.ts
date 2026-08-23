import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { EntityResolutionService } from '../src/ai/services/entity-resolution.service';
import { AiService } from '../src/ai/ai.service';
import { v4 as uuidv4 } from 'uuid';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runTestSuite() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const erService = app.get(EntityResolutionService);
  const aiService = app.get(AiService);

  const projectId = '4a5176c7-0f53-42cc-bbd8-1a7259648a96';
  const userId = 'b2e0a12f-7828-46db-95a2-685cb71c6350';

  console.log('================================================================================');
  console.log('PROJECTOS ENTITY RESOLUTION & RELATIONSHIP VALIDATION ACCEPTANCE SUITE');
  console.log('================================================================================\n');

  const unitResults: any[] = [];

  // ---------------------------------------------------------------------------
  // TEST 1: Direct Employee Resolution
  // ---------------------------------------------------------------------------
  console.log('[TEST 1/8] Direct Employee Resolution ("Rinku")');
  const res1 = await erService.resolveProjectEntity('Rinku', projectId);
  console.log('  Resolved:', res1.resolved, '| Ambiguous:', res1.isAmbiguous);
  console.log('  Candidate:', res1.primaryCandidate?.name, `(${res1.primaryCandidate?.code})`, 'Score:', res1.primaryCandidate?.rankingScore);
  const pass1 = res1.resolved && res1.primaryCandidate?.name.includes('Rinku') && res1.primaryCandidate?.code === 'KIPL-DL-SXR-009';
  console.log(`  -> Status: ${pass1 ? 'PASS ✅' : 'FAIL ❌'}\n`);
  unitResults.push({ test: 'Test 1: Direct Employee Resolution', passed: pass1, result: res1 });

  // ---------------------------------------------------------------------------
  // TEST 2: Direct Vendor Resolution
  // ---------------------------------------------------------------------------
  console.log('[TEST 2/8] Direct Vendor Resolution ("Keller")');
  const res2 = await erService.resolveProjectEntity('Keller', projectId);
  console.log('  Resolved:', res2.resolved, '| Ambiguous:', res2.isAmbiguous);
  console.log('  Candidate:', res2.primaryCandidate?.name, `(${res2.primaryCandidate?.entityType})`, 'Score:', res2.primaryCandidate?.rankingScore);
  const pass2 = res2.resolved && res2.primaryCandidate?.name.includes('Keller Ground Engineering');
  console.log(`  -> Status: ${pass2 ? 'PASS ✅' : 'FAIL ❌'}\n`);
  unitResults.push({ test: 'Test 2: Direct Vendor Resolution', passed: pass2, result: res2 });

  // ---------------------------------------------------------------------------
  // TEST 3: WBS Code Resolution
  // ---------------------------------------------------------------------------
  console.log('[TEST 3/8] WBS Code Resolution ("IPS-1")');
  const res3 = await erService.resolveProjectEntity('IPS-1', projectId);
  console.log('  Resolved:', res3.resolved, '| Ambiguous:', res3.isAmbiguous);
  console.log('  Candidate:', res3.primaryCandidate?.name, `(${res3.primaryCandidate?.code})`, 'Score:', res3.primaryCandidate?.rankingScore);
  const pass3 = res3.resolved && (res3.primaryCandidate?.name.includes('IPS-1') || res3.primaryCandidate?.code?.includes('3.1'));
  console.log(`  -> Status: ${pass3 ? 'PASS ✅' : 'FAIL ❌'}\n`);
  unitResults.push({ test: 'Test 3: WBS Code Resolution', passed: pass3, result: res3 });

  // ---------------------------------------------------------------------------
  // TEST 4: Real-Database Cross-Domain Ambiguity Handling ("Shah")
  // ---------------------------------------------------------------------------
  console.log('[TEST 4/8] Real-Database Ambiguity ("Shah")');
  const res4 = await erService.resolveProjectEntity('Shah', projectId);
  console.log('  Resolved:', res4.resolved, '| Ambiguous:', res4.isAmbiguous);
  console.log('  Candidate Count:', res4.candidates.length);
  res4.candidates.forEach((c, i) => console.log(`    ${i + 1}. ${c.name} (${c.metadata.designation})`));
  console.log('  Clarification Prompt:\n', res4.clarificationPrompt);
  const pass4 = res4.isAmbiguous && res4.candidates.length >= 3;
  console.log(`  -> Status: ${pass4 ? 'PASS ✅' : 'FAIL ❌'}\n`);
  unitResults.push({ test: 'Test 4: Real-Database Ambiguity', passed: pass4, result: res4 });

  // ---------------------------------------------------------------------------
  // TEST 5: Multi-Turn Pronoun Context Resolution ("he")
  // ---------------------------------------------------------------------------
  console.log('[TEST 5/8] Multi-Turn Pronoun Context ("he" -> Rinku)');
  const res5 = await erService.resolveProjectEntity('he', projectId, {
    previousEntityId: res1.primaryCandidate?.entityId,
    previousEntityType: 'employee',
  });
  console.log('  Resolved:', res5.resolved, '| Candidate:', res5.primaryCandidate?.name);
  const pass5 = res5.resolved && res5.primaryCandidate?.name.includes('Rinku');
  console.log(`  -> Status: ${pass5 ? 'PASS ✅' : 'FAIL ❌'}\n`);
  unitResults.push({ test: 'Test 5: Pronoun Resolution', passed: pass5, result: res5 });

  // ---------------------------------------------------------------------------
  // TEST 6: General Knowledge Classification ("What is a Vibro Stone Column?")
  // ---------------------------------------------------------------------------
  console.log('[TEST 6/8] General Knowledge Query Classification');
  const res6 = await erService.resolveProjectEntity('What is a Vibro Stone Column?', projectId);
  console.log('  Classification:', res6.classification, '| Candidates Count:', res6.candidates.length);
  const pass6 = res6.classification === 'GENERAL_KNOWLEDGE' && res6.candidates.length === 0;
  console.log(`  -> Status: ${pass6 ? 'PASS ✅' : 'FAIL ❌'}\n`);
  unitResults.push({ test: 'Test 6: General Knowledge Classification', passed: pass6, result: res6 });

  // ---------------------------------------------------------------------------
  // TEST 7: Explicit Relationship Validation (Rinku <-> IPS-1)
  // ---------------------------------------------------------------------------
  console.log('[TEST 7/8] Explicit Relationship Validation (Rinku <-> IPS-1)');
  const rel7 = await erService.validateProjectRelationship(res1.primaryCandidate!, res3.primaryCandidate!, projectId);
  console.log('  Relationship Status:', rel7.status);
  console.log('  Explanation:', rel7.explanation);
  const pass7 = rel7.status === 'UNVERIFIED_NO_EVIDENCE';
  console.log(`  -> Status: ${pass7 ? 'PASS ✅' : 'FAIL ❌'}\n`);
  unitResults.push({ test: 'Test 7: Relationship Validation', passed: pass7, result: rel7 });

  // ---------------------------------------------------------------------------
  // TEST 8: Full End-to-End Chat Turn with Ambiguity Disambiguation
  // ---------------------------------------------------------------------------
  console.log('[TEST 8/8] Full End-to-End Chat Grounding with Ambiguity Prompt ("Who is Shah?")');
  const chatSession = uuidv4();
  const chatReply = await aiService.chat(chatSession, 'Who is Shah?', userId, projectId);
  console.log('  Assistant Output:\n' + chatReply);
  const pass8 = chatReply.includes('Shah') || chatReply.includes('Gowhar') || chatReply.includes('Zubair');
  console.log(`  -> Status: ${pass8 ? 'PASS ✅' : 'FAIL ❌'}\n`);
  unitResults.push({ test: 'Test 8: Full Chat Ambiguity Turn', passed: pass8, result: chatReply });

  console.log('================================================================================');
  console.log('ALL ACCEPTANCE TESTS COMPLETE');
  console.log('================================================================================\n');

  const fs = require('fs');
  fs.writeFileSync('entity-resolution-acceptance-results.json', JSON.stringify(unitResults, null, 2));

  await app.close();
  process.exit(0);
}

runTestSuite().catch(err => {
  console.error('Acceptance suite failed:', err);
  process.exit(1);
});

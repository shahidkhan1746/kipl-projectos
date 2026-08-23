import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { EntityResolutionService } from '../src/ai/services/entity-resolution.service';

async function runFocusedRegression() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const erService = app.get(EntityResolutionService);
  const projectId = '4a5176c7-0f53-42cc-bbd8-1a7259648a96';

  console.log('================================================================================');
  console.log('FOCUSED ENTITY RESOLUTION SHORT-NAME REGRESSION SUITE (9 TESTS)');
  console.log('================================================================================\n');

  const testCases = [
    {
      name: 'Test 1: "Shah" (Word-Boundary Token Ambiguity)',
      query: 'Shah',
      expected: (r: any) =>
        r.isAmbiguous &&
        r.candidates.length === 3 &&
        r.candidates.every((c: any) => c.name.endsWith('Shah')) &&
        !r.candidates.some((c: any) => c.name.includes('Shahid')),
      desc: 'Matches only Gowhar Shah, Zubair Shah, Wajih ud Din Shah (excludes Shahid Khan)',
    },
    {
      name: 'Test 2: "Shahid" (Discrete Token Match)',
      query: 'Shahid',
      expected: (r: any) =>
        r.resolved &&
        !r.isAmbiguous &&
        r.primaryCandidate?.name === 'Shahid Khan',
      desc: 'Resolves to Shahid Khan as single dominant match',
    },
    {
      name: 'Test 3: "Khan" (Discrete Surname Token Match)',
      query: 'Khan',
      expected: (r: any) =>
        r.resolved &&
        !r.isAmbiguous &&
        r.primaryCandidate?.name === 'Shahid Khan',
      desc: 'Resolves to Shahid Khan as single dominant match',
    },
    {
      name: 'Test 4: "Ali" (No False-Positive Substring Collision)',
      query: 'Ali',
      expected: (r: any) =>
        !r.candidates.some((c: any) => c.sourceType === 'STRUCTURED_ENTITY'),
      desc: 'Discards false-positive substring hits like "Liaison" or "Khalid"',
    },
    {
      name: 'Test 5: "Raj" (No False-Positive Substring Collision)',
      query: 'Raj',
      expected: (r: any) =>
        !r.candidates.some((c: any) => c.sourceType === 'STRUCTURED_ENTITY'),
      desc: 'Discards false-positive substring hits like "Rajesh"',
    },
    {
      name: 'Test 6: "Ram" (No False-Positive Substring Collision)',
      query: 'Ram',
      expected: (r: any) =>
        !r.candidates.some((c: any) => c.sourceType === 'STRUCTURED_ENTITY'),
      desc: 'Discards false-positive substring hits like "Program" or "Ramesh"',
    },
    {
      name: 'Test 7: "Rinku" (Legitimate Employee Lookup)',
      query: 'Rinku',
      expected: (r: any) =>
        r.resolved &&
        !r.isAmbiguous &&
        r.primaryCandidate?.code === 'KIPL-DL-SXR-009',
      desc: 'Resolves to employee Rinku (Poclain Operator)',
    },
    {
      name: 'Test 8: "Keller" (Legitimate Subcontractor Lookup)',
      query: 'Keller',
      expected: (r: any) =>
        r.resolved &&
        !r.isAmbiguous &&
        r.primaryCandidate?.name.includes('Keller Ground Engineering'),
      desc: 'Resolves to vendor Keller Ground Engineering Pvt Ltd',
    },
    {
      name: 'Test 9: "IPS-1" (Legitimate WBS Task Lookup)',
      query: 'IPS-1',
      expected: (r: any) =>
        r.resolved &&
        !r.isAmbiguous &&
        (r.primaryCandidate?.code === '3.1' || r.primaryCandidate?.name.includes('IPS-1')),
      desc: 'Resolves to WBS Task IPS-1 at Node 102',
    },
  ];

  const results: any[] = [];
  let passedCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`[TEST ${i + 1}/9] ${tc.name}`);
    console.log(`  Query: "${tc.query}"`);
    const res = await erService.resolveProjectEntity(tc.query, projectId);
    const pass = tc.expected(res);

    console.log(`  Resolved: ${res.resolved} | Ambiguous: ${res.isAmbiguous}`);
    console.log(`  Candidate Count: ${res.candidates.length}`);
    if (res.primaryCandidate) {
      console.log(`  Primary Candidate: ${res.primaryCandidate.name} (${res.primaryCandidate.entityType}) [Score: ${res.primaryCandidate.rankingScore}]`);
    }
    if (res.candidates.length > 1) {
      res.candidates.forEach((c, idx) => console.log(`    ${idx + 1}. ${c.name} (${c.entityType}) [Score: ${c.rankingScore}]`));
    }
    console.log(`  -> Status: ${pass ? 'PASS ✅' : 'FAIL ❌'} (${tc.desc})\n`);

    if (pass) passedCount++;
    results.push({ name: tc.name, query: tc.query, passed: pass, result: res });
  }

  console.log('================================================================================');
  console.log(`RESULTS: ${passedCount}/${testCases.length} TESTS PASSED (${((passedCount / testCases.length) * 100).toFixed(1)}%)`);
  console.log('================================================================================\n');

  await app.close();
  process.exit(passedCount === testCases.length ? 0 : 1);
}

runFocusedRegression().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});

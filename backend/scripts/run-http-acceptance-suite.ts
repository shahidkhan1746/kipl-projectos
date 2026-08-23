import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import * as fs from 'fs';
dotenv.config();

const BASE_URL = 'http://localhost:3000/api/v1';
const PROJECT_ID = '4a5176c7-0f53-42cc-bbd8-1a7259648a96';
const USER_ID = 'b2e0a12f-7828-46db-95a2-685cb71c6350'; // admin@kipl.com

const ACCEPTANCE_TESTS = [
  {
    id: 1,
    title: 'Employee Lookup: Rinku',
    query: 'Who is Rinku?',
    expectedType: 'EMPLOYEE_STRUCTURED',
    expectedEntities: ['Rinku', 'Poclain Operator', 'Labour'],
    mustNotContain: ['subcontractor', 'vendor'],
  },
  {
    id: 2,
    title: 'Ambiguity Resolution: Shah',
    query: 'Who is Shah?',
    expectedType: 'AMBIGUOUS_CLARIFICATION',
    expectedEntities: ['Gowhar Shah', 'Zubair Shah', 'Wajih ud Din Shah'],
    mustNotContain: ['Shahid Khan'],
  },
  {
    id: 3,
    title: 'Cross-Domain Entity Resolution: Keller',
    query: 'Who is Keller?',
    expectedType: 'VENDOR_STRUCTURED',
    expectedEntities: ['Keller Ground Engineering Pvt Ltd', 'subcontractor'],
    mustNotContain: ['employee Keller', 'KIPL-DL-SXR'],
  },
  {
    id: 4,
    title: 'WBS Entity Resolution: IPS-1',
    query: 'Tell me about IPS-1.',
    expectedType: 'WBS_STRUCTURED',
    expectedEntities: ['IPS-1 at Node 102', '3.1'],
    mustNotContain: ['Keller assigned', 'Rinku assigned'],
  },
  {
    id: 5,
    title: 'WBS Task Responsibility: IPS-1',
    query: 'Who is responsible for IPS-1?',
    expectedType: 'WBS_RESPONSIBILITY',
    expectedEntities: ['Civil Team', 'IPS-1 at Node 102'],
    mustNotContain: ['Keller Ground Engineering', 'Rinku'],
  },
  {
    id: 6,
    title: 'Relationship Validation: Rinku on IPS-1',
    query: 'Is Rinku working on IPS-1?',
    expectedType: 'RELATIONSHIP_VALIDATION_NEGATIVE',
    expectedEntities: ['Rinku', 'Poclain Operator'],
    expectedDisclaimers: ['no explicit evidence', 'no authoritative link', 'not verified', "don't currently have evidence", 'no evidence', 'no records', 'not currently link'],
    mustNotContain: ['Yes, Rinku is working on IPS-1', 'assigned to IPS-1'],
  },
  {
    id: 7,
    title: 'General Engineering Knowledge: Vibro Stone Column',
    query: 'What is a Vibro Stone Column?',
    expectedType: 'GENERAL_KNOWLEDGE',
    expectedKeywords: ['ground improvement', 'aggregate', 'soil', 'bearing capacity'],
    mustNotContain: ['Keller is working on IPS-1 in this project'],
  },
  {
    id: 8,
    title: 'Project-Specific VSC Scope',
    query: 'What Vibro Stone Column work is specified in our project?',
    expectedType: 'KNOWLEDGE_VAULT_PROJECT_DOCS',
    expectedKeywords: ['tender', 'ground improvement', 'specifications', 'documents'],
    mustNotContain: ['Rinku is doing VSC'],
  },
  {
    id: 9,
    title: 'Tender / Client Directives: UEED on IPS-1',
    query: 'What did UEED say about IPS-1?',
    expectedType: 'KNOWLEDGE_VAULT_PROJECT_DOCS',
    expectedKeywords: ['UEED', 'Intermediate Pumping Station', 'IPS', 'tender'],
    mustNotContain: ['Rinku is managing UEED'],
  },
  {
    id: 10,
    title: 'Unified ProjectOS Knowledge Integration: IPS-1',
    query: 'Tell me everything ProjectOS knows about IPS-1.',
    expectedType: 'INTEGRATED_KNOWLEDGE',
    expectedEntities: ['3.1', 'IPS-1 at Node 102'],
    mustNotContain: ['Keller performed IPS-1', 'Rinku is assigned to IPS-1'],
  },
];

async function runHttpSuite() {
  console.log('================================================================================');
  console.log('PROJECTOS INTELLIGENCE 10-TEST ACCEPTANCE SUITE (REAL HTTP API PATH)');
  console.log(`Target URL: ${BASE_URL}/ai/chat`);
  console.log(`Target Project: ${PROJECT_ID}`);
  console.log(`User ID: ${USER_ID} (super_admin)`);
  console.log('================================================================================\n');

  // 1. Generate JWT Token
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
  const token = jwt.sign({ sub: USER_ID, role: 'super_admin' }, jwtSecret, { expiresIn: '1h' });

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 2. Fetch runtime configuration from running HTTP server
  console.log('[1/2] Verifying runtime AI config via GET /api/v1/ai/config...');
  const configRes = await fetch(`${BASE_URL}/ai/config`, { headers });
  const configData: any = await configRes.json();
  console.log('Active Keys in Server Pool:');
  console.table(configData?.keys?.map((k: any) => ({
    id: k.id,
    provider: k.provider,
    label: k.label,
    model: k.model,
    enabled: k.enabled,
    priority: k.priority,
  })));

  // 3. Run all 10 acceptance tests
  console.log('\n[2/2] Executing 10 Acceptance Tests via HTTP POST /api/v1/ai/chat...\n');
  const results: any[] = [];

  for (const t of ACCEPTANCE_TESTS) {
    const sessionId = crypto.randomUUID();
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`TEST ${t.id}: ${t.title}`);
    console.log(`Query: "${t.query}" (Session UUID: ${sessionId})`);
    console.log(`--------------------------------------------------------------------------------`);

    const startTime = Date.now();
    try {
      const resp = await fetch(`${BASE_URL}/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId,
          query: t.query,
          projectId: PROJECT_ID,
        }),
      });

      const data: any = await resp.json();
      const elapsed = Date.now() - startTime;
      const answer = data?.text || '';

      console.log(`Response received in ${elapsed}ms (HTTP ${resp.status}):\n${answer}\n`);

      // Evaluate Pass / Fail
      let passed = true;
      const failureReasons: string[] = [];

      // Check required entities / keywords
      if (t.expectedEntities) {
        for (const exp of t.expectedEntities) {
          if (!answer.toLowerCase().includes(exp.toLowerCase())) {
            passed = false;
            failureReasons.push(`Missing expected entity/token: "${exp}"`);
          }
        }
      }

      if (t.expectedKeywords) {
        let keywordHit = false;
        for (const kw of t.expectedKeywords) {
          if (answer.toLowerCase().includes(kw.toLowerCase())) {
            keywordHit = true;
            break;
          }
        }
        if (!keywordHit) {
          passed = false;
          failureReasons.push(`Missing required keywords from [${t.expectedKeywords.join(', ')}]`);
        }
      }

      if (t.expectedDisclaimers) {
        let disclaimerHit = false;
        for (const d of t.expectedDisclaimers) {
          if (answer.toLowerCase().includes(d.toLowerCase())) {
            disclaimerHit = true;
            break;
          }
        }
        if (!disclaimerHit) {
          passed = false;
          failureReasons.push(`Missing relationship disclaimer from [${t.expectedDisclaimers.join(', ')}]`);
        }
      }

      // Check forbidden substrings
      if (t.mustNotContain) {
        for (const forb of t.mustNotContain) {
          if (answer.toLowerCase().includes(forb.toLowerCase())) {
            passed = false;
            failureReasons.push(`Found forbidden hallucinated string: "${forb}"`);
          }
        }
      }

      console.log(`Result: ${passed ? '>>> PASS <<<' : '>>> FAIL <<<'}`);
      if (!passed) {
        console.log(`Failure Reasons: ${failureReasons.join(' | ')}`);
      }

      results.push({
        testId: t.id,
        title: t.title,
        query: t.query,
        passed,
        elapsed,
        failureReasons,
        answer,
      });
    } catch (err: any) {
      console.error(`HTTP ERROR on Test ${t.id}:`, err.message);
      results.push({
        testId: t.id,
        title: t.title,
        query: t.query,
        passed: false,
        failureReasons: [err.message],
      });
    }
  }

  // Summary Table
  console.log('\n================================================================================');
  console.log('ACCEPTANCE SUITE SUMMARY (REAL HTTP API PATH)');
  console.log('================================================================================');
  console.table(results.map(r => ({
    Test: r.testId,
    Title: r.title,
    Passed: r.passed ? 'PASS ✅' : 'FAIL ❌',
    Duration: `${r.elapsed}ms`,
    Notes: r.failureReasons?.join('; ') || 'OK',
  })));

  fs.writeFileSync(
    'C:/Users/DELL/.gemini/antigravity/brain/c27f059d-64e7-4763-b40c-592157efeba8/scratch/http_acceptance_results.json',
    JSON.stringify(results, null, 2)
  );

  const totalPassed = results.filter(r => r.passed).length;
  console.log(`\nFinal Score: ${totalPassed} / ${results.length} (${(totalPassed / results.length * 100).toFixed(0)}%) Passed.`);
}

runHttpSuite().catch(console.error);

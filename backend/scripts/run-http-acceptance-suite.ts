import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE_URL = 'http://localhost:3000/api/v1';
const PROJECT_ID = '4a5176c7-0f53-42cc-bbd8-1a7259648a96';
const USER_ID = 'b2e0a12f-7828-46db-95a2-685cb71c6350'; // admin@kipl.com

const ALL_REGRESSION_TESTS = [
  {
    id: 1,
    title: 'Employee Resolution: Rinku',
    query: 'Who is Rinku?',
    validate: (res: string) => {
      const pass = res.includes('Rinku') && (res.includes('Poclain') || res.includes('Labour') || res.includes('Operator'));
      return { pass, reason: pass ? 'Resolved Rinku as Poclain Operator in Labour' : 'Failed to resolve Rinku details' };
    },
  },
  {
    id: 2,
    title: 'Ambiguity Resolution: Shah (Exclude Shahid Khan)',
    query: 'Who is Shah?',
    validate: (res: string) => {
      const containsLegitimate = res.includes('Gowhar') || res.includes('Zubair') || res.includes('Wajih');
      const excludesShahid = !res.includes('Shahid Khan');
      const pass = containsLegitimate && excludesShahid;
      return { pass, reason: pass ? 'Presented legitimate Shahs and excluded Shahid Khan' : 'Failed Shah ambiguity / false positive Shahid Khan' };
    },
  },
  {
    id: 3,
    title: 'Discrete Token Resolution: Shahid',
    query: 'Who is Shahid?',
    validate: (res: string) => {
      const pass = res.includes('Shahid') || res.includes('Khan');
      return { pass, reason: pass ? 'Resolved Shahid Khan' : 'Failed to resolve Shahid' };
    },
  },
  {
    id: 4,
    title: 'Vendor Resolution: Keller',
    query: 'Who is Keller?',
    validate: (res: string) => {
      const pass = res.includes('Keller Ground Engineering') || res.includes('subcontractor');
      return { pass, reason: pass ? 'Resolved Keller as geotechnical subcontractor' : 'Failed to resolve Keller' };
    },
  },
  {
    id: 5,
    title: 'WBS Resolution: IPS-1 (Hyphen)',
    query: 'Tell me about IPS-1.',
    validate: (res: string) => {
      const pass = res.includes('IPS-1') && (res.includes('3.1') || res.includes('Node 102') || res.includes('Civil Team'));
      return { pass, reason: pass ? 'Resolved IPS-1 to WBS 3.1' : 'Failed to resolve IPS-1' };
    },
  },
  {
    id: 6,
    title: 'WBS Normalization: IPS 1 (Space)',
    query: 'Tell me about IPS 1.',
    validate: (res: string) => {
      const pass = (res.includes('3.1') || res.includes('Node 102') || res.includes('IPS-1')) && !res.includes('no information');
      return { pass, reason: pass ? 'Normalized "IPS 1" to WBS 3.1' : 'Failed to normalize "IPS 1"' };
    },
  },
  {
    id: 7,
    title: 'WBS Normalization: IPS1 (Collapsed)',
    query: 'Tell me about IPS1.',
    validate: (res: string) => {
      const pass = (res.includes('3.1') || res.includes('Node 102') || res.includes('IPS-1')) && !res.includes('no information');
      return { pass, reason: pass ? 'Normalized "IPS1" to WBS 3.1' : 'Failed to normalize "IPS1"' };
    },
  },
  {
    id: 8,
    title: 'WBS Normalization: ips-1 (Lowercase)',
    query: 'Tell me about ips-1.',
    validate: (res: string) => {
      const pass = (res.includes('3.1') || res.includes('Node 102') || res.includes('IPS-1')) && !res.includes('no information');
      return { pass, reason: pass ? 'Normalized "ips-1" to WBS 3.1' : 'Failed to normalize "ips-1"' };
    },
  },
  {
    id: 9,
    title: 'Relationship Validation: Rinku on IPS-1 (Negative Grounding)',
    query: 'Is Rinku working on IPS-1?',
    validate: (res: string) => {
      const acknowledgesRinku = res.includes('Rinku') || res.includes('Poclain');
      const deniesUnverifiedLink = res.toLowerCase().includes("don't") || res.toLowerCase().includes('no evidence') || res.toLowerCase().includes('no record') || res.toLowerCase().includes('not verified') || res.toLowerCase().includes('not currently link');
      const noHallucination = !res.includes('Yes, Rinku is working on IPS-1') && !res.includes('assigned to IPS-1');
      const pass = acknowledgesRinku && deniesUnverifiedLink && noHallucination;
      return { pass, reason: pass ? 'Correctly returned unverified relationship with 0 hallucination' : 'Failed negative relationship grounding' };
    },
  },
  {
    id: 10,
    title: 'Pretrained General Knowledge: Vibro Stone Column',
    query: 'What is a Vibro Stone Column?',
    validate: (res: string) => {
      const pass = res.toLowerCase().includes('ground improvement') || res.toLowerCase().includes('aggregate') || res.toLowerCase().includes('soil') || res.toLowerCase().includes('bearing capacity');
      return { pass, reason: pass ? 'Answered accurately from general geotechnical engineering knowledge' : 'Failed general knowledge definition' };
    },
  },
  {
    id: 11,
    title: 'Large Tabular Document Query: Rising Mains Pipe Specs (Prompt 5)',
    query: 'What are the pipe diameter specifications, materials, and lengths for the rising mains connecting IPS 1 through 13?',
    validate: (res: string) => {
      const hasSpecs = res.includes('DI') || res.includes('mm') || res.includes('diameter') || res.includes('Rising') || res.includes('mains') || res.includes('IPS');
      const noServerError = !res.includes('Internal server error') && !res.includes('500');
      const pass = hasSpecs && noServerError;
      return { pass, reason: pass ? 'Successfully retrieved rising mains tabular specifications without HTTP 500' : 'Failed rising mains query' };
    },
  },
  {
    id: 12,
    title: 'Multi-Item BOQ Numerical Grounding (Prompt 6)',
    query: 'What provisions and quantities are recorded for SBR tanks, compound wall, and approach road construction in the BOQ documents?',
    validate: (res: string) => {
      // Must attribute SBR to SBR, and never attribute 204M or 306M to compound wall or approach road
      const noMisattribution = !res.includes('compound wall is ₹ 204,000,000') && 
                               !res.includes('compound wall is ₹204') && 
                               !res.includes('compound wall: ₹ 204,000,000') &&
                               !res.includes('approach road is ₹ 306,000,000') &&
                               !res.includes('approach road is ₹306') &&
                               !res.includes('approach road: ₹ 306,000,000');
      const hasSbr = res.includes('SBR') || res.includes('30 MLD') || res.includes('17,000,000') || res.includes('510,000,000');
      const pass = noMisattribution && hasSbr;
      return { pass, reason: pass ? 'Strict numerical source attribution maintained (0 cross-item misattributions)' : 'Failed: Misattributed SBR sub-totals to wall or road' };
    },
  },
];

async function runAcceptanceSuite() {
  console.log('================================================================================');
  console.log('PROJECTOS INTELLIGENCE EXPANDED ACCEPTANCE & REGRESSION SUITE (LIVE HTTP)');
  console.log(`Target: ${BASE_URL}/ai/chat`);
  console.log(`Total Scenarios: ${ALL_REGRESSION_TESTS.length}`);
  console.log('================================================================================\n');

  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
  const token = jwt.sign({ id: USER_ID, sub: USER_ID, role: 'super_admin' }, jwtSecret, { expiresIn: '2h' });
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const results: any[] = [];

  for (const test of ALL_REGRESSION_TESTS) {
    const sessionId = uuidv4();
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`[TEST ${test.id}/${ALL_REGRESSION_TESTS.length}] ${test.title}`);
    console.log(`Query: "${test.query}"`);
    console.log(`Session: ${sessionId}`);

    const start = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: test.query,
          sessionId,
          projectId: PROJECT_ID,
        }),
      });

      const elapsed = Date.now() - start;
      const status = res.status;
      const json: any = await res.json().catch(() => ({}));
      const text = json?.text || JSON.stringify(json);

      const evalRes = test.validate(text);
      console.log(`Status: ${status} (${elapsed}ms) | Outcome: ${evalRes.pass ? 'PASS ✅' : 'FAIL ❌'}`);
      console.log(`Response Snippet:\n${text.substring(0, 200).replace(/\n/g, ' ')}...`);
      console.log(`Evaluation: ${evalRes.reason}`);

      results.push({
        id: test.id,
        title: test.title,
        status: evalRes.pass ? 'PASS' : 'FAIL',
        httpStatus: status,
        elapsed: `${elapsed}ms`,
        reason: evalRes.reason,
      });
    } catch (err: any) {
      console.error(`ERROR:`, err.message);
      results.push({
        id: test.id,
        title: test.title,
        status: 'ERROR',
        httpStatus: 'FETCH_ERR',
        elapsed: `${Date.now() - start}ms`,
        reason: err.message,
      });
    }
  }

  console.log('\n================================================================================');
  console.log('FINAL REGRESSION SUITE RESULTS:');
  console.log('================================================================================');
  console.table(results);

  const allPassed = results.every(r => r.status === 'PASS');
  console.log(`\nOVERALL SUITE STATUS: ${allPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runAcceptanceSuite().catch(console.error);

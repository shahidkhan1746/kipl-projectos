const { Client } = require('pg');
const c = new Client({ connectionString: 'postgres://postgres.pfgivrzqsgbxiuhloinu:Vpcea46fg%401746@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres' });
c.connect()
  .then(() => c.query('CREATE EXTENSION IF NOT EXISTS vector'))
  .then(() => { console.log('Vector extension created'); c.end() })
  .catch(e => { console.error(e); c.end() });

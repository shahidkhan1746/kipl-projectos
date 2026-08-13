const { Client } = require('pg');
const c = new Client({ connectionString: 'postgres://postgres.pfgivrzqsgbxiuhloinu:Vpcea46fg%401746@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres' });
c.connect()
  .then(() => c.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"))
  .then(r => { console.log('Tables:', r.rows.map(r => r.table_name)); return c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'meetings' ORDER BY ordinal_position") })
  .then(r => { console.log('\nMeetings columns:', r.rows); c.end() })
  .catch(e => { console.error(e); c.end() });

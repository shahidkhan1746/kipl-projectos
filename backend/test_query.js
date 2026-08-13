const { Client } = require('pg');
const c = new Client({ connectionString: 'postgres://postgres.pfgivrzqsgbxiuhloinu:Vpcea46fg%401746@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres' });
c.connect().then(() => c.query('SELECT attendees, "agendaItems", action_items FROM meetings ORDER BY created_at DESC LIMIT 1'))
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); c.end() })
  .catch(console.error);

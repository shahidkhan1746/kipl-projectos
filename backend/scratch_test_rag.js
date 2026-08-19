const { DataSource } = require('typeorm')
require('dotenv').config()

async function check() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
    entities: [],
    synchronize: false
  })

  await ds.initialize()
  console.log('Connected to DB')

  const docs = await ds.query(`SELECT id, "documentName", "category", "sourceType", "fileUrl", "totalChunks", "status" FROM ai_knowledge_documents`)
  console.log('Knowledge Documents:', docs)

  const chunkCounts = await ds.query(`SELECT "sourceType", count(*) FROM ai_document_chunks GROUP BY "sourceType"`)
  console.log('Chunk Counts by sourceType:', chunkCounts)

  // Search for "IPS" in chunks
  const ipsChunks = await ds.query(`SELECT "sourceName", "sourceType", substring(text, 1, 200) as preview FROM ai_document_chunks WHERE text ILIKE '%IPS%1%' OR text ILIKE '%Intermediate Pumping%' LIMIT 10`)
  console.log('Chunks containing IPS:', ipsChunks)

  await ds.destroy()
}

check().catch(console.error)

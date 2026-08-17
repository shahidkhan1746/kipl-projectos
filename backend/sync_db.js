const { DataSource } = require('typeorm')
require('dotenv').config()

const ds = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: { rejectUnauthorized: false },
  synchronize: true,
  entities: [__dirname + '/dist/**/*.entity.js'],
})

ds.initialize()
  .then(() => {
    console.log('Database synced successfully.')
    return ds.query(`CREATE INDEX IF NOT EXISTS document_embedding_idx ON ai_document_chunks USING hnsw (embedding vector_cosine_ops)`)
  })
  .then(() => {
    console.log('Index created.')
    process.exit(0)
  })
  .catch(console.error)

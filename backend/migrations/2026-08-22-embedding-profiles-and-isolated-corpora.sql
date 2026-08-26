-- Migration: Embedding Profiles & Isolated Vector Corpora
-- Created: 2026-08-22

-- 1. Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Embedding Profile Registry Table
CREATE TABLE IF NOT EXISTS ai_embedding_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  dimension INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'migrating',
  table_name VARCHAR(100) NOT NULL,
  key_id VARCHAR(255) NULL,
  base_url VARCHAR(255) NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Partial unique index ensuring at most ONE profile can be 'active'
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_embedding_profile 
ON ai_embedding_profiles (status) 
WHERE status = 'active';

-- 3. Isolated Physical Vector Corpus for NVIDIA (4096 dimensions)
CREATE TABLE IF NOT EXISTS ai_document_chunks_nvidia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES ai_embedding_profiles(id) ON DELETE RESTRICT,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  dimension INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  project_id VARCHAR(255) NULL,
  source_id VARCHAR(255) NULL,
  source_type VARCHAR(255) NULL,
  source_name VARCHAR(255) NULL,
  text TEXT NOT NULL,
  embedding vector(4096) NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chunks_nvidia_profile ON ai_document_chunks_nvidia(profile_id);
CREATE INDEX IF NOT EXISTS idx_chunks_nvidia_source ON ai_document_chunks_nvidia(source_id, source_type);
CREATE INDEX IF NOT EXISTS idx_chunks_nvidia_project ON ai_document_chunks_nvidia(project_id);
CREATE INDEX IF NOT EXISTS idx_chunks_nvidia_fts ON ai_document_chunks_nvidia USING gin(to_tsvector('english', text));

-- 4. Isolated Physical Vector Corpus for Gemini (3072 dimensions)
CREATE TABLE IF NOT EXISTS ai_document_chunks_gemini (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES ai_embedding_profiles(id) ON DELETE RESTRICT,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  dimension INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  project_id VARCHAR(255) NULL,
  source_id VARCHAR(255) NULL,
  source_type VARCHAR(255) NULL,
  source_name VARCHAR(255) NULL,
  text TEXT NOT NULL,
  embedding vector(3072) NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chunks_gemini_profile ON ai_document_chunks_gemini(profile_id);
CREATE INDEX IF NOT EXISTS idx_chunks_gemini_source ON ai_document_chunks_gemini(source_id, source_type);
CREATE INDEX IF NOT EXISTS idx_chunks_gemini_project ON ai_document_chunks_gemini(project_id);
CREATE INDEX IF NOT EXISTS idx_chunks_gemini_fts ON ai_document_chunks_gemini USING gin(to_tsvector('english', text));

-- 5. Seed Initial Active Profile (NVIDIA NV-Embed-V1) and Candidate Profile (Gemini Embedding 2)
INSERT INTO ai_embedding_profiles (id, name, provider, model, dimension, version, status, table_name)
SELECT 
  'e1000000-0000-0000-0000-000000000001'::uuid,
  'NVIDIA NV-Embed-V1 (4096d)',
  'nvidia',
  'nvidia/nv-embed-v1',
  4096,
  1,
  'active',
  'ai_document_chunks_nvidia'
WHERE NOT EXISTS (
  SELECT 1 FROM ai_embedding_profiles WHERE id = 'e1000000-0000-0000-0000-000000000001'::uuid
);

INSERT INTO ai_embedding_profiles (id, name, provider, model, dimension, version, status, table_name)
SELECT 
  'e2000000-0000-0000-0000-000000000002'::uuid,
  'Gemini Embedding 2 (3072d)',
  'gemini',
  'gemini-embedding-2',
  3072,
  1,
  'migrating',
  'ai_document_chunks_gemini'
WHERE NOT EXISTS (
  SELECT 1 FROM ai_embedding_profiles WHERE id = 'e2000000-0000-0000-0000-000000000002'::uuid
);

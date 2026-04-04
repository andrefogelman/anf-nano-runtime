-- Enable pgvector if not already
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_trgm for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Chunks table for cadernos técnicos
CREATE TABLE IF NOT EXISTS ob_sinapi_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file text NOT NULL,          -- e.g. "SINAPI-CT-ALVENARIA-DE-VEDACAO.pdf"
  source_title text NOT NULL,         -- e.g. "Alvenaria de Vedação"
  page_number integer,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  content_length integer NOT NULL,
  embedding vector(384),              -- MiniLM-L6-v2 dimension
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ob_sinapi_chunks_embedding ON ob_sinapi_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS idx_ob_sinapi_chunks_source ON ob_sinapi_chunks(source_file);
CREATE INDEX IF NOT EXISTS idx_ob_sinapi_chunks_content_trgm ON ob_sinapi_chunks USING gin (content gin_trgm_ops);

-- RLS: public read
ALTER TABLE ob_sinapi_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY ob_sinapi_chunks_public_read ON ob_sinapi_chunks FOR SELECT USING (true);

-- Vector search function
CREATE OR REPLACE FUNCTION search_sinapi_chunks(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  source_file text,
  source_title text,
  page_number integer,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.source_file,
    c.source_title,
    c.page_number,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM ob_sinapi_chunks c
  WHERE 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

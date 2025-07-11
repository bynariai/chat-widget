-- ================================
-- COMPLETE SUPABASE SCHEMA RECREATION
-- ================================
-- Includes: All tables + advanced hybrid search functionality
-- Compatible with: text-embedding-3-small (1536 dimensions)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ================================
-- KNOWLEDGE_BASE TABLE (Advanced)
-- ================================

-- Drop existing objects
DROP FUNCTION IF EXISTS match_documents(VECTOR(1536), INT, JSONB);
DROP INDEX IF EXISTS knowledge_base_embedding_idx;
DROP INDEX IF EXISTS knowledge_base_metadata_idx;
DROP INDEX IF EXISTS knowledge_base_fts_idx;
DROP INDEX IF EXISTS knowledge_base_client_idx;
DROP TABLE IF EXISTS knowledge_base CASCADE;

-- Create the main table with advanced FTS
CREATE TABLE knowledge_base (
    -- Base attributes
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata (includes client_id, website info, context, etc.)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Full text search (searches both content and AI-generated context)
    fts TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english', 
            COALESCE(content, '') || ' ' || 
            COALESCE(metadata->>'context', '') || ' ' ||
            COALESCE(metadata->>'page_title', '') || ' ' ||
            COALESCE(metadata->>'source_url', '')
        )
    ) STORED,
    
    -- Dense embeddings for semantic search (1536 dimensions)
    embedding VECTOR(1536)
);

-- Optimized indexes
CREATE INDEX knowledge_base_embedding_idx 
    ON knowledge_base 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX knowledge_base_fts_idx 
    ON knowledge_base 
    USING GIN(fts);

CREATE INDEX knowledge_base_metadata_idx 
    ON knowledge_base 
    USING GIN(metadata);

-- Client isolation index for multi-tenant performance
CREATE INDEX knowledge_base_client_idx 
    ON knowledge_base 
    USING BTREE ((metadata->>'client_id'));

-- Advanced hybrid search function with RRF
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(1536),
    match_count INT DEFAULT 10,
    filter JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    id BIGINT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
    client_id_filter TEXT;
    query_text TEXT;
    semantic_weight FLOAT := 0.7;
    keyword_weight FLOAT := 0.3;
    rrf_k INT := 60;
BEGIN
    -- Extract client_id and query_text from filter
    client_id_filter := filter->>'client_id';
    query_text := filter->>'query_text';
    
    -- Validate required parameters
    IF query_embedding IS NULL THEN
        RAISE EXCEPTION 'query_embedding cannot be NULL';
    END IF;
    
    -- If no query_text provided, fall back to semantic-only search
    IF query_text IS NULL OR query_text = '' THEN
        RETURN QUERY
        SELECT 
            d.id,
            d.content,
            d.metadata,
            (1 - (d.embedding <=> query_embedding)) AS similarity
        FROM knowledge_base d
        WHERE 
            (client_id_filter IS NULL OR d.metadata->>'client_id' = client_id_filter)
            AND (filter - 'client_id' - 'query_text' = '{}'::jsonb OR d.metadata @> (filter - 'client_id' - 'query_text'))
        ORDER BY d.embedding <=> query_embedding
        LIMIT match_count;
        RETURN;
    END IF;
    
    -- Hybrid search with RRF (Reciprocal Rank Fusion)
    RETURN QUERY
    WITH 
    -- Semantic search results
    semantic_results AS (
        SELECT 
            d.id,
            ROW_NUMBER() OVER (ORDER BY d.embedding <=> query_embedding) AS rank,
            (1 - (d.embedding <=> query_embedding)) AS semantic_score
        FROM knowledge_base d
        WHERE 
            (client_id_filter IS NULL OR d.metadata->>'client_id' = client_id_filter)
            AND (filter - 'client_id' - 'query_text' = '{}'::jsonb OR d.metadata @> (filter - 'client_id' - 'query_text'))
        ORDER BY d.embedding <=> query_embedding
        LIMIT match_count * 3
    ),
    
    -- Keyword search results (searches content + AI context)
    keyword_results AS (
        SELECT 
            d.id,
            ROW_NUMBER() OVER (
                ORDER BY ts_rank_cd(d.fts, websearch_to_tsquery('english', query_text)) DESC
            ) AS rank,
            ts_rank_cd(d.fts, websearch_to_tsquery('english', query_text)) AS keyword_score
        FROM knowledge_base d
        WHERE 
            d.fts @@ websearch_to_tsquery('english', query_text)
            AND (client_id_filter IS NULL OR d.metadata->>'client_id' = client_id_filter)
            AND (filter - 'client_id' - 'query_text' = '{}'::jsonb OR d.metadata @> (filter - 'client_id' - 'query_text'))
        ORDER BY ts_rank_cd(d.fts, websearch_to_tsquery('english', query_text)) DESC
        LIMIT match_count * 3
    ),
    
    -- Combine using RRF
    combined AS (
        SELECT 
            COALESCE(s.id, k.id) AS doc_id,
            COALESCE(s.semantic_score, 0) AS semantic_score,
            COALESCE(k.keyword_score, 0) AS keyword_score,
            -- RRF score calculation
            (
                COALESCE(1.0 / (rrf_k + s.rank), 0.0) * semantic_weight +
                COALESCE(1.0 / (rrf_k + k.rank), 0.0) * keyword_weight
            ) AS rrf_score
        FROM semantic_results s
        FULL OUTER JOIN keyword_results k ON s.id = k.id
    )
    
    -- Final results optimized for query retriever rerank
    SELECT 
        d.id,
        d.content,
        d.metadata,
        c.rrf_score AS similarity
    FROM combined c
    JOIN knowledge_base d ON c.doc_id = d.id
    ORDER BY c.rrf_score DESC
    LIMIT match_count;
END;
$$;

-- ================================
-- ANALYTICS & METRICS TABLES
-- ================================

-- Create chat_analytics table
CREATE TABLE IF NOT EXISTS chat_analytics (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(100),
    session_id VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INTEGER,
    query_length INTEGER,
    tokens_used INTEGER,
    cached_response BOOLEAN DEFAULT FALSE,
    success BOOLEAN DEFAULT TRUE,
    error_type VARCHAR(100)
);

-- Create error logging table
CREATE TABLE IF NOT EXISTS chat_errors (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    workflow_name VARCHAR(255),
    execution_id VARCHAR(255),
    error_message TEXT,
    client_id VARCHAR(100),
    session_id VARCHAR(255),
    last_node_executed VARCHAR(255),
    error_context JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create chat_memory table
CREATE TABLE IF NOT EXISTS chat_memory (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    message JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add created_at column if missing
ALTER TABLE chat_memory
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add other potentially missing columns
ALTER TABLE chat_memory
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing rows to have timestamps
UPDATE chat_memory
SET created_at = CURRENT_TIMESTAMP
WHERE created_at IS NULL;

-- Create performance metrics table
CREATE TABLE IF NOT EXISTS chat_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    client_id VARCHAR(100) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    response_time_ms INTEGER,
    tokens_used INTEGER,
    success BOOLEAN NOT NULL,
    error_type VARCHAR(100),
    message_length INTEGER,
    model_used VARCHAR(50)
);

-- ================================
-- PERFORMANCE INDEXES
-- ================================

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_client_timestamp ON chat_analytics (client_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_session ON chat_analytics (session_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_errors_client_id ON chat_errors(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_errors_timestamp ON chat_errors(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_errors_resolved ON chat_errors(resolved);
CREATE INDEX IF NOT EXISTS idx_chat_metrics_client_id ON chat_metrics(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_metrics_timestamp ON chat_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_metrics_success ON chat_metrics(success);

-- Safe index creation - only if columns exist
DO $$
BEGIN
    -- Index on session_id (this should exist)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_memory' AND column_name='session_id') THEN
        CREATE INDEX IF NOT EXISTS idx_chat_memory_session_id ON chat_memory(session_id);
    END IF;

    -- Index on created_at (only if it exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_memory' AND column_name='created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_chat_memory_created_at ON chat_memory(created_at);
    END IF;
END
$$;

-- ================================
-- UTILITY FUNCTIONS
-- ================================

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_memory_updated_at 
    BEFORE UPDATE ON chat_memory 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- OPTIONAL: ROW LEVEL SECURITY
-- ================================
-- Uncomment these lines for production multi-tenant security

-- ALTER TABLE chat_analytics ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_errors ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_memory ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_metrics ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Sample RLS policies (modify as needed)
-- CREATE POLICY "Users can view their own data" ON chat_analytics
--     FOR SELECT USING (auth.uid()::text = client_id);

-- CREATE POLICY "Users can insert their own data" ON chat_analytics
--     FOR INSERT WITH CHECK (auth.uid()::text = client_id);
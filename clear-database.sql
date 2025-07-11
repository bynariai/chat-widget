-- ================================
-- COMPLETE DATABASE CLEANUP
-- ================================
-- WARNING: This will delete ALL data and structure

-- Drop all tables (CASCADE removes dependencies)
DROP TABLE IF EXISTS knowledge_base CASCADE;
DROP TABLE IF EXISTS chat_analytics CASCADE;
DROP TABLE IF EXISTS chat_errors CASCADE;
DROP TABLE IF EXISTS chat_memory CASCADE;
DROP TABLE IF EXISTS chat_metrics CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS match_documents(VECTOR(1536), INT, JSONB);
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop all indexes (in case any remain)
DROP INDEX IF EXISTS knowledge_base_embedding_idx;
DROP INDEX IF EXISTS knowledge_base_fts_idx;
DROP INDEX IF EXISTS knowledge_base_metadata_idx;
DROP INDEX IF EXISTS knowledge_base_client_idx;
DROP INDEX IF EXISTS idx_client_timestamp;
DROP INDEX IF EXISTS idx_session;
DROP INDEX IF EXISTS idx_chat_errors_client_id;
DROP INDEX IF EXISTS idx_chat_errors_timestamp;
DROP INDEX IF EXISTS idx_chat_errors_resolved;
DROP INDEX IF EXISTS idx_chat_metrics_client_id;
DROP INDEX IF EXISTS idx_chat_metrics_timestamp;
DROP INDEX IF EXISTS idx_chat_metrics_success;
DROP INDEX IF EXISTS idx_chat_memory_session_id;
DROP INDEX IF EXISTS idx_chat_memory_created_at;

-- Reset sequences (if they exist)
DROP SEQUENCE IF EXISTS knowledge_base_id_seq CASCADE;
DROP SEQUENCE IF EXISTS chat_analytics_id_seq CASCADE;
DROP SEQUENCE IF EXISTS chat_errors_id_seq CASCADE;
DROP SEQUENCE IF EXISTS chat_memory_id_seq CASCADE;
DROP SEQUENCE IF EXISTS chat_metrics_id_seq CASCADE;

-- Drop any triggers
DROP TRIGGER IF EXISTS update_chat_memory_updated_at ON chat_memory;

-- Optional: Drop extensions if you want to start completely fresh
-- DROP EXTENSION IF EXISTS vector;
-- DROP EXTENSION IF EXISTS pg_trgm;

-- ================================
-- VERIFICATION QUERIES
-- ================================
-- Run these to confirm everything is gone:

-- Check remaining tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Check remaining functions
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';

-- Check remaining indexes
SELECT indexname FROM pg_indexes WHERE schemaname = 'public';
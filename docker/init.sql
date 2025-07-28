-- Initial database schema for MCP Prompt Management
-- This file is executed when the PostgreSQL container starts

-- Create database if it doesn't exist (handled by POSTGRES_DB env var)
-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Prompts table (latest versions)
CREATE TABLE IF NOT EXISTS prompts (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  description VARCHAR(500),
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  variables TEXT[] DEFAULT '{}',
  category VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1
);

-- Prompt versions table (historical versions)
CREATE TABLE IF NOT EXISTS prompt_versions (
  id VARCHAR(255) NOT NULL,
  version INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  description VARCHAR(500),
  is_template BOOLEAN NOT NULL,
  variables TEXT[] DEFAULT '{}',
  category VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  PRIMARY KEY (id, version),
  FOREIGN KEY (id) REFERENCES prompts(id) ON DELETE CASCADE
);

-- Tags table (normalized)
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

-- Prompt-tag relationships
CREATE TABLE IF NOT EXISTS prompt_tags (
  prompt_id VARCHAR(255) NOT NULL,
  tag_id INTEGER NOT NULL,
  
  PRIMARY KEY (prompt_id, tag_id),
  FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);



-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prompts_name ON prompts(name);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_is_template ON prompts(is_template);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON prompts(created_at);
CREATE INDEX IF NOT EXISTS idx_prompts_updated_at ON prompts(updated_at);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_prompts_content_fts ON prompts USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_prompts_name_fts ON prompts USING gin(to_tsvector('english', name));

-- Index for prompt versions
CREATE INDEX IF NOT EXISTS idx_prompt_versions_id_version ON prompt_versions(id, version);

-- Index for tags
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- Index for prompt tags
CREATE INDEX IF NOT EXISTS idx_prompt_tags_prompt_id ON prompt_tags(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_tags_tag_id ON prompt_tags(tag_id);

 
-- String Manager Database Schema

-- 사용자 테이블
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 프로젝트 테이블
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 프로젝트 멤버 테이블 (권한 관리)
CREATE TABLE project_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- 'owner', 'admin', 'member', 'viewer'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id)
);

-- 앱 테이블
CREATE TABLE apps (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  current_version INTEGER DEFAULT 1,
  columns TEXT[], -- JSON array of column names
  key_column VARCHAR(255),
  value_column VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 스트링 테이블
CREATE TABLE strings (
  id SERIAL PRIMARY KEY,
  app_id INTEGER REFERENCES apps(id) ON DELETE CASCADE,
  string_key VARCHAR(500) NOT NULL,
  string_value TEXT NOT NULL,
  additional_columns JSONB, -- 추가 컬럼들
  status VARCHAR(50), -- 'new', 'modified', null
  modified_at TIMESTAMP,
  modified_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(app_id, string_key)
);

-- 버전 히스토리 테이블
CREATE TABLE versions (
  id SERIAL PRIMARY KEY,
  app_id INTEGER REFERENCES apps(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  publisher_id INTEGER REFERENCES users(id),
  publisher_name VARCHAR(255),
  notes TEXT,
  strings_snapshot JSONB, -- 해당 버전의 스트링들
  notifications JSONB, -- 변경사항 알림들
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(app_id, version_number)
);

-- 실시간 변경사항 추적 (pending changes)
CREATE TABLE pending_changes (
  id SERIAL PRIMARY KEY,
  app_id INTEGER REFERENCES apps(id) ON DELETE CASCADE,
  string_id INTEGER REFERENCES strings(id) ON DELETE CASCADE,
  change_type VARCHAR(50) NOT NULL, -- 'new', 'modified', 'deleted'
  old_value JSONB,
  new_value JSONB,
  changed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_strings_app_id ON strings(app_id);
CREATE INDEX idx_strings_status ON strings(status);
CREATE INDEX idx_versions_app_id ON versions(app_id);
CREATE INDEX idx_pending_changes_app_id ON pending_changes(app_id);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
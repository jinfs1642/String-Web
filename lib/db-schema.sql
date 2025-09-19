-- String Manager Database Schema
-- PostgreSQL schema for the string management application

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project members table (for future multi-user support)
CREATE TABLE IF NOT EXISTS project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Apps table
CREATE TABLE IF NOT EXISTS apps (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    current_version INTEGER NOT NULL DEFAULT 1,
    columns JSONB,
    key_column VARCHAR(255),
    value_column VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Strings table
CREATE TABLE IF NOT EXISTS strings (
    id SERIAL PRIMARY KEY,
    app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    key VARCHAR(500) NOT NULL,
    value TEXT NOT NULL,
    additional_columns JSONB DEFAULT '{}',
    status VARCHAR(20) CHECK (status IN ('new', 'modified')),
    modified_at TIMESTAMP WITH TIME ZONE,
    modified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Versions table (for history tracking)
CREATE TABLE IF NOT EXISTS versions (
    id SERIAL PRIMARY KEY,
    app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    publisher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    publisher_name VARCHAR(255),
    notes TEXT,
    strings_snapshot JSONB NOT NULL,
    notifications JSONB DEFAULT '[]',
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pending changes table (for future audit trail)
CREATE TABLE IF NOT EXISTS pending_changes (
    id SERIAL PRIMARY KEY,
    app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    string_id INTEGER NOT NULL REFERENCES strings(id) ON DELETE CASCADE,
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('new', 'modified', 'deleted')),
    old_value JSONB,
    new_value JSONB,
    changed_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_apps_project_id ON apps(project_id);
CREATE INDEX IF NOT EXISTS idx_strings_app_id ON strings(app_id);
CREATE INDEX IF NOT EXISTS idx_strings_status ON strings(status);
CREATE INDEX IF NOT EXISTS idx_versions_app_id ON versions(app_id);
CREATE INDEX IF NOT EXISTS idx_versions_version_number ON versions(version_number);
CREATE INDEX IF NOT EXISTS idx_pending_changes_app_id ON pending_changes(app_id);

-- Insert sample data
INSERT INTO users (email, name, avatar_url) 
VALUES ('admin@example.com', 'Admin User', 'https://github.com/identicons/admin.png')
ON CONFLICT (email) DO NOTHING;

-- Get the admin user ID for sample data
DO $$
DECLARE
    admin_user_id INTEGER;
    sample_project_id INTEGER;
    sample_app_id INTEGER;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@example.com';
    
    IF admin_user_id IS NOT NULL THEN
        -- Create sample project
        INSERT INTO projects (name, description, created_by)
        VALUES ('샘플 프로젝트', '개발 및 테스트용 샘플 프로젝트', admin_user_id)
        ON CONFLICT DO NOTHING
        RETURNING id INTO sample_project_id;
        
        -- Get project ID if it already exists
        IF sample_project_id IS NULL THEN
            SELECT id INTO sample_project_id FROM projects WHERE name = '샘플 프로젝트' AND created_by = admin_user_id;
        END IF;
        
        -- Create sample app
        INSERT INTO apps (project_id, name, current_version, columns, key_column, value_column)
        VALUES (
            sample_project_id,
            '메인 앱',
            1,
            '["No", "String ID (Key)", "Korean", "English", "Status"]'::jsonb,
            'String ID (Key)',
            'Korean'
        )
        ON CONFLICT DO NOTHING
        RETURNING id INTO sample_app_id;
        
        -- Get app ID if it already exists
        IF sample_app_id IS NULL THEN
            SELECT id INTO sample_app_id FROM apps WHERE name = '메인 앱' AND project_id = sample_project_id;
        END IF;
        
        -- Create sample strings
        INSERT INTO strings (app_id, key, value, additional_columns, modified_by)
        VALUES 
            (sample_app_id, 'welcome_message', '환영합니다!', '{"No": "1", "English": "Welcome!", "Status": "Active"}'::jsonb, admin_user_id),
            (sample_app_id, 'goodbye_message', '안녕히 가세요!', '{"No": "2", "English": "Goodbye!", "Status": "Active"}'::jsonb, admin_user_id)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
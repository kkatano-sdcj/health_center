-- =====================================================
-- Health Center Database Schema Migration
-- Version: 1.0.0
-- Date: 2025-01-03
-- Description: Complete user management and FAQ system schema
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- =====================================================
-- SECTION 1: USER MANAGEMENT SCHEMA
-- =====================================================

-- 1.1 Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
    -- Basic information
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    name_short VARCHAR(100),
    name_english VARCHAR(200),
    
    -- Organization structure
    type VARCHAR(50) DEFAULT 'company',
    parent_id UUID REFERENCES organizations(id),
    hierarchy_path LTREE,
    level INTEGER DEFAULT 0,
    
    -- Contact information
    address TEXT,
    phone_number VARCHAR(20),
    fax_number VARCHAR(20),
    email VARCHAR(255),
    website_url VARCHAR(500),
    
    -- Status management
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT organizations_no_self_parent CHECK (id != parent_id)
);

-- 1.2 Departments Table
CREATE TABLE IF NOT EXISTS departments (
    -- Basic information
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_short VARCHAR(100),
    name_en VARCHAR(100),
    description TEXT,
    
    -- Hierarchy structure
    parent_id UUID REFERENCES departments(id),
    hierarchy_path LTREE,
    level INTEGER DEFAULT 0,
    
    -- Department information
    department_type VARCHAR(50),
    manager_user_id UUID,
    
    -- Contact information
    phone_number VARCHAR(20),
    extension_number VARCHAR(10),
    email VARCHAR(255),
    location VARCHAR(200),
    
    -- Status management
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT departments_no_self_parent CHECK (id != parent_id),
    CONSTRAINT departments_unique_code_per_org UNIQUE (organization_id, code),
    CONSTRAINT departments_code_format CHECK (code ~ '^[A-Z0-9_]+$'),
    CONSTRAINT departments_level_positive CHECK (level >= 0)
);

-- 1.3 Roles Table
CREATE TABLE IF NOT EXISTS roles (
    -- Basic information
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Role attributes
    role_type VARCHAR(20) DEFAULT 'standard' CHECK (role_type IN ('system', 'standard', 'custom')),
    is_system_role BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    
    -- Permission settings
    permissions JSONB DEFAULT '[]',
    faq_permissions JSONB DEFAULT '{}',
    restrictions JSONB DEFAULT '{}',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT roles_name_format CHECK (name ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT roles_priority_range CHECK (priority BETWEEN 0 AND 1000)
);

-- 1.4 Users Table
CREATE TABLE IF NOT EXISTS users (
    -- Basic identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    
    -- Profile information
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(200),
    full_name_japanese VARCHAR(200),
    employee_id VARCHAR(50) UNIQUE,
    avatar_url VARCHAR(500),
    
    -- Organization information
    organization_id UUID REFERENCES organizations(id),
    department_id UUID REFERENCES departments(id),
    position_title VARCHAR(100),
    license_number VARCHAR(100),
    
    -- Contact information
    phone_number VARCHAR(20),
    mobile_number VARCHAR(20),
    extension_number VARCHAR(10),
    
    -- Authentication information
    password_hash VARCHAR(255),
    password_salt VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    
    -- MFA settings
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    mfa_backup_codes JSON,
    
    -- Account status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_until TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    
    -- Role and permissions
    role_id UUID NOT NULL REFERENCES roles(id),
    permissions JSONB DEFAULT '[]',
    
    -- Settings and preferences
    timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',
    language VARCHAR(10) DEFAULT 'ja',
    notification_preferences JSONB DEFAULT '{}',
    theme VARCHAR(20) DEFAULT 'light',
    preferences JSONB DEFAULT '{}',
    
    -- Statistics
    faqs_created_count INTEGER DEFAULT 0,
    faqs_resolved_count INTEGER DEFAULT 0,
    last_login_at TIMESTAMP WITH TIME ZONE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT users_username_length CHECK (char_length(username) >= 3),
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_failed_attempts_positive CHECK (failed_login_attempts >= 0)
);

-- Add foreign key constraint after users table is created
ALTER TABLE departments ADD CONSTRAINT departments_manager_user_id_fkey 
    FOREIGN KEY (manager_user_id) REFERENCES users(id);

-- 1.5 User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    -- Session identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255) UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session information
    device_info JSONB DEFAULT '{}',
    ip_address INET NOT NULL,
    user_agent TEXT,
    location_info JSONB,
    
    -- Status management
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Security
    created_from VARCHAR(50),
    security_flags JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT sessions_expires_future CHECK (expires_at > created_at)
);

-- 1.6 Audit Logs Table (Partitioned)
CREATE TABLE IF NOT EXISTS audit_logs (
    -- Basic identification
    id BIGSERIAL,
    log_id UUID DEFAULT gen_random_uuid(),
    
    -- Operation information
    user_id UUID REFERENCES users(id),
    session_id UUID REFERENCES user_sessions(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    
    -- Detailed information
    details JSONB DEFAULT '{}',
    old_values JSONB,
    new_values JSONB,
    
    -- Context
    ip_address INET NOT NULL,
    user_agent TEXT,
    request_id UUID,
    
    -- Result
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT audit_status_values CHECK (status IN ('success', 'failure', 'partial')),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create initial partitions for audit logs
CREATE TABLE IF NOT EXISTS audit_logs_2025_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE IF NOT EXISTS audit_logs_2025_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE IF NOT EXISTS audit_logs_2025_03 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- =====================================================
-- SECTION 2: FAQ MANAGEMENT SCHEMA
-- =====================================================

-- 2.1 FAQ Categories Table
CREATE TABLE IF NOT EXISTS faq_categories (
    -- Basic information
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Hierarchy structure
    parent_id UUID REFERENCES faq_categories(id),
    hierarchy_path LTREE,
    level INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    
    -- Display settings
    color_code VARCHAR(7),
    icon_name VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Statistics
    faq_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT categories_no_self_parent CHECK (id != parent_id),
    CONSTRAINT categories_color_format CHECK (color_code IS NULL OR color_code ~ '^#[0-9A-Fa-f]{6}$')
);

-- 2.2 FAQs Table
CREATE TABLE IF NOT EXISTS faqs (
    -- Basic identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- Question and answer information
    question_title VARCHAR(500) NOT NULL,
    question_content TEXT NOT NULL,
    answer_content TEXT,
    
    -- Classification information
    category_id UUID NOT NULL REFERENCES faq_categories(id),
    package_name VARCHAR(100),
    tags JSONB DEFAULT '[]',
    
    -- Related information
    related_ticket_number VARCHAR(100),
    related_faq_ids UUID[] DEFAULT '{}',
    
    -- Status management
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- User information
    questioner_id UUID REFERENCES users(id),
    assignee_id UUID REFERENCES users(id),
    
    -- Statistics
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    
    -- Date information
    question_date DATE NOT NULL,
    response_date DATE,
    resolved_date DATE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    search_vector TSVECTOR,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT faqs_dates_logical CHECK (
        (response_date IS NULL OR response_date >= question_date) AND
        (resolved_date IS NULL OR resolved_date >= question_date)
    )
);

-- 2.3 FAQ Comments Table
CREATE TABLE IF NOT EXISTS faq_comments (
    -- Basic information
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faq_id UUID NOT NULL REFERENCES faqs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Comment content
    comment_type VARCHAR(20) DEFAULT 'comment' CHECK (comment_type IN ('comment', 'status_change', 'assignment', 'resolution')),
    content TEXT NOT NULL,
    
    -- Status change information
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    
    -- Attachments
    attachments JSONB DEFAULT '[]',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2.4 FAQ Attachments Table
CREATE TABLE IF NOT EXISTS faq_attachments (
    -- Basic information
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faq_id UUID NOT NULL REFERENCES faqs(id) ON DELETE CASCADE,
    uploaded_by_user_id UUID NOT NULL REFERENCES users(id),
    
    -- File information
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64),
    
    -- Metadata
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT attachments_file_size_positive CHECK (file_size > 0)
);

-- 2.5 FAQ Audit Logs Table
CREATE TABLE IF NOT EXISTS faq_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    faq_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SECTION 3: INDEXES
-- =====================================================

-- User Management Indexes
CREATE INDEX idx_organizations_code ON organizations(code);
CREATE INDEX idx_organizations_parent_id ON organizations(parent_id);
CREATE INDEX idx_organizations_hierarchy_path ON organizations USING GIST(hierarchy_path);
CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_active_sort ON organizations(is_active, sort_order);

CREATE INDEX idx_departments_organization_id ON departments(organization_id);
CREATE INDEX idx_departments_code ON departments(organization_id, code);
CREATE INDEX idx_departments_parent_id ON departments(parent_id);
CREATE INDEX idx_departments_hierarchy_path ON departments USING GIST(hierarchy_path);
CREATE INDEX idx_departments_manager ON departments(manager_user_id);
CREATE INDEX idx_departments_type ON departments(department_type);
CREATE INDEX idx_departments_active_sort ON departments(is_active, sort_order);

CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_active_priority ON roles(is_active, priority DESC);
CREATE INDEX idx_roles_type ON roles(role_type);
CREATE INDEX idx_roles_system ON roles(is_system_role);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_employee_id ON users(employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_active_verified ON users(is_active, is_verified);
CREATE INDEX idx_users_full_name ON users(full_name_japanese) WHERE full_name_japanese IS NOT NULL;
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_last_login ON users(last_login_at DESC) WHERE last_login_at IS NOT NULL;
CREATE INDEX idx_users_locked ON users(id, locked_until) WHERE is_locked = TRUE;
CREATE INDEX idx_users_password_reset ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;
CREATE INDEX idx_users_mfa_enabled ON users(id) WHERE mfa_enabled = TRUE;

CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_refresh_token ON user_sessions(refresh_token) WHERE refresh_token IS NOT NULL;
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id, is_active, expires_at);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_sessions_ip_address ON user_sessions(ip_address);
CREATE INDEX idx_sessions_user_active ON user_sessions(user_id, is_active, expires_at) WHERE is_active = TRUE;

CREATE INDEX idx_audit_user_id ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_ip_address ON audit_logs(ip_address);
CREATE INDEX idx_audit_status ON audit_logs(status) WHERE status != 'success';

-- FAQ Management Indexes
CREATE INDEX idx_categories_code ON faq_categories(code);
CREATE INDEX idx_categories_parent_id ON faq_categories(parent_id);
CREATE INDEX idx_categories_hierarchy_path ON faq_categories USING GIST(hierarchy_path);
CREATE INDEX idx_categories_active_sort ON faq_categories(is_active, sort_order);

CREATE INDEX idx_faqs_record_number ON faqs(record_number);
CREATE INDEX idx_faqs_category_id ON faqs(category_id);
CREATE INDEX idx_faqs_status ON faqs(status, created_at DESC);
CREATE INDEX idx_faqs_questioner_id ON faqs(questioner_id);
CREATE INDEX idx_faqs_assignee_id ON faqs(assignee_id);
CREATE INDEX idx_faqs_question_date ON faqs(question_date DESC);
CREATE INDEX idx_faqs_package_name ON faqs(package_name) WHERE package_name IS NOT NULL;
CREATE INDEX idx_faqs_priority_status ON faqs(priority, status);
CREATE INDEX idx_faqs_search_vector ON faqs USING GIN(search_vector);
CREATE INDEX idx_faqs_tags ON faqs USING GIN(tags);
CREATE INDEX idx_faqs_related_ids ON faqs USING GIN(related_faq_ids);
CREATE INDEX idx_faqs_category_status_date ON faqs(category_id, status, question_date DESC);
CREATE INDEX idx_faqs_assignee_status ON faqs(assignee_id, status) WHERE assignee_id IS NOT NULL;
CREATE INDEX idx_faqs_unresolved ON faqs(question_date DESC) WHERE status IN ('open', 'in_progress');
CREATE INDEX idx_faqs_with_tickets ON faqs(related_ticket_number) WHERE related_ticket_number IS NOT NULL;

CREATE INDEX idx_comments_faq_id ON faq_comments(faq_id, created_at DESC);
CREATE INDEX idx_comments_user_id ON faq_comments(user_id);
CREATE INDEX idx_comments_type ON faq_comments(comment_type);

CREATE INDEX idx_attachments_faq_id ON faq_attachments(faq_id);
CREATE INDEX idx_attachments_uploaded_by ON faq_attachments(uploaded_by_user_id);
CREATE INDEX idx_attachments_filename ON faq_attachments(filename);
CREATE INDEX idx_attachments_hash ON faq_attachments(file_hash);

-- Full-text search indexes
CREATE INDEX idx_users_search ON users USING GIN(
    to_tsvector('english', 
        COALESCE(display_name, '') || ' ' ||
        COALESCE(full_name_japanese, '') || ' ' ||
        COALESCE(email, '') || ' ' ||
        COALESCE(employee_id, '')
    )
);

CREATE INDEX idx_departments_search ON departments USING GIN(
    to_tsvector('english', 
        COALESCE(name, '') || ' ' ||
        COALESCE(name_short, '') || ' ' ||
        COALESCE(code, '')
    )
);

-- =====================================================
-- SECTION 4: FUNCTIONS AND TRIGGERS
-- =====================================================

-- 4.1 Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to all tables with updated_at column
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_faq_categories_updated_at BEFORE UPDATE ON faq_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_faqs_updated_at BEFORE UPDATE ON faqs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_faq_comments_updated_at BEFORE UPDATE ON faq_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.2 FAQ full-text search vector update function
CREATE OR REPLACE FUNCTION update_faq_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english',
        COALESCE(NEW.question_title, '') || ' ' ||
        COALESCE(NEW.question_content, '') || ' ' ||
        COALESCE(NEW.answer_content, '') || ' ' ||
        COALESCE(NEW.package_name, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER faqs_search_vector_update
    BEFORE INSERT OR UPDATE ON faqs
    FOR EACH ROW EXECUTE FUNCTION update_faq_search_vector();

-- 4.3 Audit log trigger for users table
CREATE OR REPLACE FUNCTION audit_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id,
        old_values, new_values, ip_address, created_at
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        'user',
        COALESCE(NEW.id::text, OLD.id::text),
        to_jsonb(OLD),
        to_jsonb(NEW),
        '127.0.0.1'::inet,
        CURRENT_TIMESTAMP
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_user_changes();

-- 4.4 FAQ audit log trigger
CREATE OR REPLACE FUNCTION log_faq_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO faq_audit_logs (
        faq_id, user_id, action, old_values, new_values, ip_address
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        auth.uid(),
        TG_OP,
        to_jsonb(OLD),
        to_jsonb(NEW),
        '127.0.0.1'::inet
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER faq_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON faqs
    FOR EACH ROW EXECUTE FUNCTION log_faq_changes();

-- 4.5 Session cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP 
       OR (last_activity_at < CURRENT_TIMESTAMP - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql;

-- 4.6 Update hierarchy path function for departments
CREATE OR REPLACE FUNCTION update_department_hierarchy_path()
RETURNS TRIGGER AS $$
DECLARE
    parent_path LTREE;
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.hierarchy_path = NEW.id::text::ltree;
        NEW.level = 0;
    ELSE
        SELECT hierarchy_path, level + 1
        INTO parent_path, NEW.level
        FROM departments
        WHERE id = NEW.parent_id;
        
        IF parent_path IS NULL THEN
            RAISE EXCEPTION 'Parent department not found';
        END IF;
        
        NEW.hierarchy_path = parent_path || NEW.id::text;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_department_hierarchy
    BEFORE INSERT OR UPDATE OF parent_id ON departments
    FOR EACH ROW EXECUTE FUNCTION update_department_hierarchy_path();

-- 4.7 Update hierarchy path function for organizations
CREATE OR REPLACE FUNCTION update_organization_hierarchy_path()
RETURNS TRIGGER AS $$
DECLARE
    parent_path LTREE;
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.hierarchy_path = NEW.id::text::ltree;
        NEW.level = 0;
    ELSE
        SELECT hierarchy_path, level + 1
        INTO parent_path, NEW.level
        FROM organizations
        WHERE id = NEW.parent_id;
        
        IF parent_path IS NULL THEN
            RAISE EXCEPTION 'Parent organization not found';
        END IF;
        
        NEW.hierarchy_path = parent_path || NEW.id::text;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organization_hierarchy
    BEFORE INSERT OR UPDATE OF parent_id ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_organization_hierarchy_path();

-- 4.8 Update hierarchy path function for FAQ categories
CREATE OR REPLACE FUNCTION update_faq_category_hierarchy_path()
RETURNS TRIGGER AS $$
DECLARE
    parent_path LTREE;
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.hierarchy_path = NEW.id::text::ltree;
        NEW.level = 0;
    ELSE
        SELECT hierarchy_path, level + 1
        INTO parent_path, NEW.level
        FROM faq_categories
        WHERE id = NEW.parent_id;
        
        IF parent_path IS NULL THEN
            RAISE EXCEPTION 'Parent category not found';
        END IF;
        
        NEW.hierarchy_path = parent_path || NEW.id::text;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_faq_category_hierarchy
    BEFORE INSERT OR UPDATE OF parent_id ON faq_categories
    FOR EACH ROW EXECUTE FUNCTION update_faq_category_hierarchy_path();

-- =====================================================
-- SECTION 5: INITIAL DATA
-- =====================================================

-- 5.1 Initial Organizations
INSERT INTO organizations (id, code, name, name_short, type, hierarchy_path, level) VALUES
('30000000-0000-0000-0000-000000000001', 'MEDICAL_CORP', '医療法人健康センター', '健康センター', 'hospital', '30000000-0000-0000-0000-000000000001', 0)
ON CONFLICT (id) DO NOTHING;

-- 5.2 Initial Departments
INSERT INTO departments (id, organization_id, code, name, department_type, hierarchy_path, level) VALUES
('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'IT_DEPT', 'IT部門', 'technical', '40000000-0000-0000-0000-000000000001', 0),
('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'SUPPORT', 'サポートセンター', 'support', '40000000-0000-0000-0000-000000000002', 0),
('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'MEDICAL', '医事課', 'administrative', '40000000-0000-0000-0000-000000000003', 0),
('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', 'INTERNAL', '内科', 'medical', '40000000-0000-0000-0000-000000000004', 0),
('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000001', 'SURGERY', '外科', 'medical', '40000000-0000-0000-0000-000000000005', 0),
('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000001', 'ADMIN', '事務部', 'administrative', '40000000-0000-0000-0000-000000000006', 0)
ON CONFLICT (id) DO NOTHING;

-- 5.3 Initial Roles
INSERT INTO roles (id, name, display_name, description, role_type, is_system_role, permissions, faq_permissions) VALUES
('20000000-0000-0000-0000-000000000001', 'super_admin', 'システム管理者', 'すべての権限を持つ最高管理者', 'system', TRUE, '["*"]', '{"read": true, "write": true, "delete": true, "manage_categories": true}'),
('20000000-0000-0000-0000-000000000002', 'admin', '管理者', '管理機能へのアクセス権限', 'system', TRUE, '["users:*", "departments:*", "roles:read", "faq:*"]', '{"read": true, "write": true, "delete": true, "manage_categories": true}'),
('20000000-0000-0000-0000-000000000003', 'support_engineer', 'サポートエンジニア', 'FAQ対応・管理権限', 'standard', FALSE, '["faq:*", "users:read"]', '{"read": true, "write": true, "assign": true, "resolve": true}'),
('20000000-0000-0000-0000-000000000004', 'doctor', '医師', '医師向け機能へのアクセス権限', 'standard', FALSE, '["conversations:*", "notes:*", "patients:read", "faq:read"]', '{"read": true, "create": true, "comment": true}'),
('20000000-0000-0000-0000-000000000005', 'nurse', '看護師', '看護師向け機能へのアクセス権限', 'standard', FALSE, '["conversations:read", "notes:read", "patients:read", "faq:read"]', '{"read": true, "create": true, "comment": true}'),
('20000000-0000-0000-0000-000000000006', 'questioner', '質問者', 'FAQ質問・閲覧権限', 'standard', FALSE, '["faq:read", "faq:create"]', '{"read": true, "create": true, "comment": true}'),
('20000000-0000-0000-0000-000000000007', 'viewer', '閲覧者', 'FAQ閲覧のみ権限', 'standard', FALSE, '["faq:read"]', '{"read": true}')
ON CONFLICT (id) DO NOTHING;

-- 5.4 Initial FAQ Categories
INSERT INTO faq_categories (id, code, name, description, hierarchy_path, level, sort_order) VALUES
('10000000-0000-0000-0000-000000000001', 'ACCOUNTING', '会計カード', '会計入力・修正関連', '10000000-0000-0000-0000-000000000001', 0, 1),
('10000000-0000-0000-0000-000000000002', 'RECEIPT', 'レセプト', 'レセプト作成・提出関連', '10000000-0000-0000-0000-000000000002', 0, 2),
('10000000-0000-0000-0000-000000000003', 'DPC', 'DPC', 'DPC制度・分岐関連', '10000000-0000-0000-0000-000000000003', 0, 3),
('10000000-0000-0000-0000-000000000004', 'BILLING', '収納・請求', '収納業務・請求書関連', '10000000-0000-0000-0000-000000000004', 0, 4),
('10000000-0000-0000-0000-000000000005', 'MASTER', 'マスタ', '各種マスタ設定関連', '10000000-0000-0000-0000-000000000005', 0, 5),
('10000000-0000-0000-0000-000000000006', 'STATISTICS', '統計・DWH', '統計処理・データ分析関連', '10000000-0000-0000-0000-000000000006', 0, 6),
('10000000-0000-0000-0000-000000000007', 'PRESCRIPTION', '処方・オーダ', '処方・オーダリング関連', '10000000-0000-0000-0000-000000000007', 0, 7),
('10000000-0000-0000-0000-000000000008', 'DIAGNOSIS', '病名', '病名登録・管理関連', '10000000-0000-0000-0000-000000000008', 0, 8),
('10000000-0000-0000-0000-000000000009', 'OUTPATIENT', '外来', '外来業務全般', '10000000-0000-0000-0000-000000000009', 0, 9),
('10000000-0000-0000-0000-000000000010', 'INPATIENT', '入院', '入院業務全般', '10000000-0000-0000-0000-000000000010', 0, 10),
('10000000-0000-0000-0000-000000000011', 'SYSTEM', 'システム', 'システム障害・環境設定関連', '10000000-0000-0000-0000-000000000011', 0, 11),
('10000000-0000-0000-0000-000000000012', 'REPORT', '帳票', '帳票出力・印刷関連', '10000000-0000-0000-0000-000000000012', 0, 12),
('10000000-0000-0000-0000-000000000013', 'DISPLAY', '画面表示', '画面表示不具合関連', '10000000-0000-0000-0000-000000000013', 0, 13),
('10000000-0000-0000-0000-000000000014', 'OTHER', 'その他', '上記に分類されないその他', '10000000-0000-0000-0000-000000000014', 0, 14)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 6: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY users_select_policy ON users
    FOR SELECT USING (
        auth.uid() = id OR
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role_id IN (
                SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
            )
        )
    );

CREATE POLICY users_update_policy ON users
    FOR UPDATE USING (
        auth.uid() = id OR
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role_id IN (
                SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
            )
        )
    );

-- Create RLS policies for FAQs
CREATE POLICY faq_read_policy ON faqs
    FOR SELECT USING (
        -- Admins and support engineers can read all
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role_id IN (
                SELECT id FROM roles 
                WHERE name IN ('admin', 'super_admin', 'support_engineer')
            )
        )
        OR
        -- Users can read their own FAQs
        questioner_id = auth.uid()
        OR
        assignee_id = auth.uid()
        OR
        -- Everyone can read resolved FAQs
        status = 'resolved'
    );

CREATE POLICY faq_write_policy ON faqs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role_id IN (
                SELECT id FROM roles 
                WHERE name IN ('admin', 'super_admin', 'support_engineer')
            )
        )
    );

-- Create RLS policies for sessions
CREATE POLICY sessions_user_policy ON user_sessions
    FOR ALL USING (user_id = auth.uid());

-- Create RLS policies for audit logs (read-only for admins)
CREATE POLICY audit_logs_read_policy ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role_id IN (
                SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
            )
        )
    );

-- =====================================================
-- SECTION 7: GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE ON users, user_sessions, faqs, faq_comments, faq_attachments TO authenticated;
GRANT DELETE ON user_sessions TO authenticated;

-- Grant permissions to service role (for backend operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =====================================================
-- Migration Complete
-- =====================================================
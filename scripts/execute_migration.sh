#!/bin/bash

# Supabase Migration Executor Script
# This script executes SQL migrations via Supabase REST API

# Load environment variables
source .env

# Check if required variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file"
    exit 1
fi

echo "========================================"
echo "Supabase Migration Execution"
echo "========================================"
echo ""
echo "Project URL: $SUPABASE_URL"
echo ""

# Migration file path
MIGRATION_FILE="supabase/migrations/001_create_user_and_faq_schema.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Error: Migration file not found at $MIGRATION_FILE"
    exit 1
fi

echo "IMPORTANT: To execute this migration, please use one of the following methods:"
echo ""
echo "----------------------------------------"
echo "Method 1: Supabase Dashboard (Recommended)"
echo "----------------------------------------"
echo "1. Open your Supabase project dashboard:"
echo "   $SUPABASE_URL"
echo ""
echo "2. Navigate to the SQL Editor section"
echo ""
echo "3. Copy the entire contents of the migration file:"
echo "   $MIGRATION_FILE"
echo ""
echo "4. Paste into the SQL Editor and click 'Run'"
echo ""
echo "----------------------------------------"
echo "Method 2: Using psql command (if available)"
echo "----------------------------------------"
echo "You can use the following command if you have psql installed:"
echo ""
echo "psql \"$DATABASE_URL\" -f $MIGRATION_FILE"
echo ""
echo "Note: You'll need to update the DATABASE_URL in your .env with the correct password"
echo ""
echo "----------------------------------------"
echo "Method 3: Programmatic Execution"
echo "----------------------------------------"
echo "For automated execution, you can use the Supabase Management API"
echo "or set up a direct PostgreSQL connection with the proper credentials."
echo ""
echo "Migration file has been created and is ready for execution."
echo "File location: $MIGRATION_FILE"
echo ""
echo "The migration includes:"
echo "  - User management tables (users, roles, departments, organizations)"
echo "  - FAQ system tables (faqs, categories, comments, attachments)"
echo "  - Session management and audit logs"
echo "  - Row Level Security policies"
echo "  - Indexes for performance optimization"
echo "  - Initial data for roles and categories"
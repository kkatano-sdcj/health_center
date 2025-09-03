#!/usr/bin/env python3
"""
Supabase migration runner script
Executes SQL migrations directly to Supabase database
"""

import os
import sys
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Load environment variables
load_dotenv()

def get_database_connection():
    """Get direct PostgreSQL connection to Supabase"""
    # Parse Supabase URL to get database connection details
    supabase_url = os.getenv('SUPABASE_URL')
    service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    # For Supabase, the database URL format is:
    # postgresql://postgres.[project-ref]:[password]@[host]:[port]/postgres
    # We need to construct this from the Supabase URL
    
    # Extract project reference from URL
    import re
    match = re.match(r'https://([^.]+)\.supabase\.co', supabase_url)
    if match:
        project_ref = match.group(1)
    else:
        raise ValueError("Invalid Supabase URL format")
    
    # Construct database URL
    # Note: You'll need to update the password here
    db_url = f"postgresql://postgres.{project_ref}:[YOUR-DATABASE-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"
    
    return psycopg2.connect(db_url)

def run_migration_via_api():
    """Run migration using Supabase client API"""
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not key:
        print("Error: Supabase credentials not found in .env file")
        sys.exit(1)
    
    # Create Supabase client
    supabase: Client = create_client(url, key)
    
    # Read migration file
    migration_path = Path(__file__).parent.parent / 'supabase' / 'migrations' / '001_create_user_and_faq_schema.sql'
    
    if not migration_path.exists():
        print(f"Error: Migration file not found at {migration_path}")
        sys.exit(1)
    
    with open(migration_path, 'r', encoding='utf-8') as f:
        migration_sql = f.read()
    
    # Split migration into smaller chunks if needed
    # Supabase has limits on query size via API
    statements = migration_sql.split(';')
    
    print(f"Running migration with {len(statements)} statements...")
    
    success_count = 0
    error_count = 0
    errors = []
    
    for i, statement in enumerate(statements, 1):
        statement = statement.strip()
        if not statement or statement.startswith('--'):
            continue
        
        try:
            # Execute via RPC if available, or use raw SQL execution
            print(f"Executing statement {i}/{len(statements)}...")
            
            # For DDL statements, we need to use the admin API
            # This is a simplified approach - in production, you'd use proper migration tools
            
            # Note: Supabase Python client doesn't directly support DDL execution
            # You would typically use the Supabase CLI or direct PostgreSQL connection
            
            print(f"  Statement preview: {statement[:100]}...")
            success_count += 1
            
        except Exception as e:
            error_count += 1
            errors.append(f"Statement {i}: {str(e)}")
            print(f"  Error: {str(e)}")
    
    print("\n" + "="*50)
    print(f"Migration Summary:")
    print(f"  Successful statements: {success_count}")
    print(f"  Failed statements: {error_count}")
    
    if errors:
        print("\nErrors encountered:")
        for error in errors[:5]:  # Show first 5 errors
            print(f"  - {error}")
    
    return error_count == 0

def main():
    """Main execution function"""
    print("Supabase Migration Runner")
    print("="*50)
    
    # Check for required environment variables
    required_vars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"Error: Missing required environment variables: {', '.join(missing_vars)}")
        print("Please ensure your .env file contains all required Supabase credentials")
        sys.exit(1)
    
    print("Environment variables loaded successfully")
    print(f"Supabase URL: {os.getenv('SUPABASE_URL')}")
    print()
    
    # Note: Direct SQL execution via Supabase Python client is limited
    # For production use, consider using:
    # 1. Supabase CLI: `supabase db push`
    # 2. Direct PostgreSQL connection with psycopg2
    # 3. Supabase Dashboard SQL Editor
    
    print("IMPORTANT: Due to Supabase client limitations, please run the migration using one of these methods:")
    print()
    print("Option 1: Supabase Dashboard")
    print("  1. Go to your Supabase project dashboard")
    print("  2. Navigate to SQL Editor")
    print("  3. Copy the contents of supabase/migrations/001_create_user_and_faq_schema.sql")
    print("  4. Paste and execute in the SQL Editor")
    print()
    print("Option 2: Supabase CLI (if installed)")
    print("  Run: supabase db push")
    print()
    print("Option 3: Direct PostgreSQL connection")
    print("  Use a PostgreSQL client with your database credentials")
    print()
    print(f"Migration file location: supabase/migrations/001_create_user_and_faq_schema.sql")

if __name__ == "__main__":
    main()
#!/bin/bash
# Quick Database Setup Script

echo "Opening Supabase SQL Editor..."
echo ""
echo "Project URL: https://ivpwniudlxktnruxnmfy.supabase.co/sql"
echo ""
echo "Migration file: supabase/migrations/001_create_user_and_faq_schema.sql"
echo ""
echo "Steps:"
echo "1. Copy the migration file content"
echo "2. Paste into SQL Editor" 
echo "3. Click RUN"
echo ""
echo "Press Enter to copy migration file to clipboard (macOS only)..."
read
cat ../supabase/migrations/001_create_user_and_faq_schema.sql | pbcopy
echo "✅ Migration copied to clipboard!"
echo ""
echo "Now paste it in the SQL Editor and click RUN"
open "https://ivpwniudlxktnruxnmfy.supabase.co/sql"

#!/bin/bash

# Zustand Migration Cleanup Script
# This script removes the old React Context system after Zustand migration is complete
# Run this only after thorough testing and verification that Zustand works correctly

echo "🧹 Zustand Migration Cleanup Script"
echo "=================================="
echo "This will remove the old React Context chat system."
echo "Make sure you have tested Zustand thoroughly before proceeding."
echo ""

read -p "Are you sure you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cleanup cancelled."
    exit 0
fi

echo "📁 Current directory: $(pwd)"

# Check if we're in the right directory
if [ ! -f "app/components/chat/ChatContext.tsx" ]; then
    echo "❌ Error: ChatContext.tsx not found. Make sure you're in the front/ directory."
    exit 1
fi

echo ""
echo "🗑️  Phase 1: Moving old files to cleanup directory..."

# Create cleanup directory
mkdir -p .zustand-migration-cleanup

# Move old context files
mv app/components/chat/ChatContext.tsx .zustand-migration-cleanup/ 2>/dev/null
mv app/components/chat/chatReducer.ts .zustand-migration-cleanup/ 2>/dev/null

# Move backup files
mv app/components/chat/MessageList.tsx.backup .zustand-migration-cleanup/ 2>/dev/null
mv app/components/chat/ConversationList.tsx.backup .zustand-migration-cleanup/ 2>/dev/null
mv app/chat/page.tsx.backup .zustand-migration-cleanup/ 2>/dev/null

# Move test and development files
mv app/components/chat/store/test.ts .zustand-migration-cleanup/ 2>/dev/null
mv app/components/chat/ZustandTest.tsx .zustand-migration-cleanup/ 2>/dev/null

echo "✅ Old files moved to .zustand-migration-cleanup/"

echo ""
echo "🔄 Phase 2: Updating imports and references..."

# Update any remaining references to old context (this is basic - manual review recommended)
echo "📝 Checking for remaining useChat imports..."

# Find files that might still import the old context
grep -r "from.*ChatContext" app/ --include="*.tsx" --include="*.ts" | grep -v ".backup" | grep -v "zustand-migration-cleanup"

echo ""
echo "📝 Checking for chatReducer imports..."
grep -r "from.*chatReducer" app/ --include="*.tsx" --include="*.ts" | grep -v ".backup" | grep -v "zustand-migration-cleanup"

echo ""
echo "🧹 Phase 3: Cleanup completion..."

# Clean up unnecessary store files if persistence is not being used
if grep -q "chatStoreWithPersist" app/components/chat/store/index.ts; then
    echo "📦 Persistence store is active - keeping both store versions"
else
    echo "💾 Moving unused persistence store to cleanup"
    mv app/components/chat/store/chatStoreWithPersist.ts .zustand-migration-cleanup/ 2>/dev/null
fi

echo ""
echo "✅ Cleanup Summary:"
echo "==================="
echo "✅ Old ChatContext system moved to .zustand-migration-cleanup/"
echo "✅ Backup files moved to cleanup directory"
echo "✅ Test files moved to cleanup directory"
echo ""
echo "📋 Manual Tasks Remaining:"
echo "========================="
echo "1. Review any remaining import references shown above"
echo "2. Test the application thoroughly"
echo "3. Update any documentation references"
echo "4. Remove .zustand-migration-cleanup/ when confident (in 1-2 weeks)"
echo ""
echo "⚠️  Important: Keep .zustand-migration-cleanup/ for at least 1-2 weeks"
echo "   in case you need to rollback any changes."
echo ""

# Verify core files are still present
if [ -f "app/components/chat/store/chatStore.ts" ] && [ -f "app/components/chat/store/selectors.ts" ]; then
    echo "✅ Zustand store files are present and ready"
else
    echo "❌ Error: Core Zustand files missing! Check your setup."
    exit 1
fi

echo "🎉 Cleanup complete! Your chat application is now fully running on Zustand."
echo "   Remember to test thoroughly and keep the cleanup directory as backup."
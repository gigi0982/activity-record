#!/bin/bash

# Activity Record System - Core Smoke Test
# Checks basic connectivity and core API endpoints

BASE_URL="http://localhost:3000"

echo "🚀 Starting Smoke Tests..."

# 1. Check if public page is reachable
echo -n "Checking main page... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL")
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ [200 OK]"
else
    echo "❌ [$HTTP_CODE] FAILED"
fi

# 2. Check GAS API connectivity (should be 401 without session)
echo -n "Checking API protection... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/gas?action=getActivities")
if [ "$HTTP_CODE" -eq 401 ]; then
    echo "✅ [401 Protected]"
else
    echo "⚠️ [$HTTP_CODE] Unexpected status (Expected 401)"
fi

# 3. Check health endpoint (if any)
echo -n "Checking Auth health... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/me")
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 401 ]; then
    echo "✅ [Reachable]"
else
    echo "❌ [$HTTP_CODE] Connection error"
fi

echo "🏁 Smoke tests complete."

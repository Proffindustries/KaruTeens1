#!/bin/bash
# scripts/bench_test.sh

API_URL="http://localhost:3000/api"
TOKEN=$1

if [ -z "$TOKEN" ]; then
    echo "Usage: ./scripts/bench_test.sh <JWT_TOKEN>"
    exit 1
fi

echo "--- Benchmarking Feed Endpoint ---"
time curl -s -o /dev/null -H "Authorization: Bearer $TOKEN" "$API_URL/posts/feed"

echo ""
echo "--- Benchmarking Posts List Endpoint (Admin) ---"
time curl -s -o /dev/null -H "Authorization: Bearer $TOKEN" "$API_URL/admin/posts?limit=50"

echo ""
echo "--- Benchmarking Trending Topics ---"
time curl -s -o /dev/null -H "Authorization: Bearer $TOKEN" "$API_URL/posts/trending"

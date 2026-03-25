#!/bin/bash
# Quick manual smoke test for the API

BASE="http://localhost:3001"
echo "=== Testing Health Check ==="
curl -s "$BASE/up"
echo ""

echo "=== Testing Autocomplete ==="
curl -s "$BASE/api/v1/locations?query=Maldives" | python3 -m json.tool

echo "=== Testing Hotel Search ==="
curl -s -X POST "$BASE/api/v1/searches" \
  -H "Content-Type: application/json" \
  -d '{"location":"Maldives","keywords":["honeymoon"]}' \
  | python3 -m json.tool

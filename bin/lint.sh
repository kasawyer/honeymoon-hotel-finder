#!/bin/bash
set -e

echo "=== Ruby (RuboCop) ==="
cd backend
bundle exec rubocop
cd ..

echo ""
echo "=== JavaScript (ESLint) ==="
cd frontend
npx eslint src/
cd ..

echo ""
echo "✅ All linting passed"

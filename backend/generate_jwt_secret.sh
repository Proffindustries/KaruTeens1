#!/bin/bash

# Generate strong JWT secret
echo "Generating strong JWT secret..."
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')

echo ""
echo "✅ Generated JWT Secret:"
echo "$JWT_SECRET"
echo ""
echo "Add this to your .env file:"
echo "JWT_SECRET=\"$JWT_SECRET\""
echo ""
echo "⚠️  Keep this secret secure and never commit it to version control!"

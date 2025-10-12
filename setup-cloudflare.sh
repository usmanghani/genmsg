#!/bin/bash

# Setup script for GenMsg Cloudflare Worker
set -e

echo "🚀 GenMsg Cloudflare Worker Setup"
echo "=================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm $(npm --version) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Check if wrangler is available
if ! command -v npx wrangler &> /dev/null; then
    echo "❌ Wrangler not found in node_modules"
    exit 1
fi

echo "✅ Wrangler available"
echo ""

# Login to Cloudflare
echo "🔐 Logging in to Cloudflare..."
echo "   (This will open a browser window)"
npx wrangler login
echo "✅ Logged in to Cloudflare"
echo ""

# Create KV namespace
echo "📝 Creating KV namespace for rate limiting..."
KV_OUTPUT=$(npx wrangler kv:namespace create "RATE_LIMIT_KV" 2>&1)
echo "$KV_OUTPUT"

# Extract KV namespace ID
KV_ID=$(echo "$KV_OUTPUT" | grep -o 'id = "[^"]*"' | head -1 | cut -d'"' -f2)

if [ -z "$KV_ID" ]; then
    echo "⚠️  Could not extract KV namespace ID automatically."
    echo "   Please update wrangler.toml manually with the ID shown above."
else
    echo "✅ KV namespace created with ID: $KV_ID"
    
    # Update wrangler.toml with KV ID
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/YOUR_KV_NAMESPACE_ID/$KV_ID/" wrangler.toml
    else
        # Linux
        sed -i "s/YOUR_KV_NAMESPACE_ID/$KV_ID/" wrangler.toml
    fi
    
    echo "✅ Updated wrangler.toml with KV namespace ID"
fi

echo ""

# Set up secrets
echo "🔑 Setting up secrets..."
echo "   You will be prompted to enter your API keys."
echo ""

echo "📝 Enter your OpenAI API key:"
npx wrangler secret put OPENAI_API_KEY

echo ""
echo "📝 Enter your API secret (for authentication):"
npx wrangler secret put API_SECRET

echo ""
echo "✅ Secrets configured"
echo ""

# Create .dev.vars for local development
echo "📝 Creating .dev.vars file for local development..."
if [ ! -f .dev.vars ]; then
    cat > .dev.vars << 'EOF'
# Local development environment variables
# NEVER commit this file to git!

OPENAI_API_KEY=your-openai-key-here
API_SECRET=your-secret-here
EOF
    echo "✅ Created .dev.vars file"
    echo "   ⚠️  Remember to update .dev.vars with your actual secrets for local development!"
else
    echo "⚠️  .dev.vars already exists, skipping..."
fi

echo ""

# Run type check
echo "🔍 Running type check..."
npm run type-check
echo "✅ Type check passed"
echo ""

# Summary
echo "=================================="
echo "✨ Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Update .dev.vars with your actual API keys (for local development)"
echo "2. Test locally:"
echo "   npm run dev"
echo ""
echo "3. Deploy to Cloudflare:"
echo "   npm run deploy"
echo ""
echo "4. View logs:"
echo "   npm run tail"
echo ""
echo "📖 For more details, see README-CLOUDFLARE.md"
echo ""

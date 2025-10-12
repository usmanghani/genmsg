# GenMsg - Cloudflare Workers Quick Start

This is a TypeScript port of your Python FastAPI service, optimized for Cloudflare Workers.

## What's Been Created

```
genmsg/
├── src/
│   └── index.ts              # Main worker code (TS version of main.py)
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── wrangler.toml             # Cloudflare Workers config
├── setup-cloudflare.sh       # Automated setup script
├── README-CLOUDFLARE.md      # Detailed documentation
└── .gitignore.cloudflare     # Git ignore rules
```

## Key Features Ported

✅ **OpenAI Integration** - Same GPT-5 Nano model  
✅ **Authentication** - Same secret-based auth  
✅ **Rate Limiting** - 10 req/min on `/generate`, 60 req/min on `/`  
✅ **Conversation History** - Identical API  
✅ **CORS** - Enabled by default  
✅ **Error Handling** - Same error responses  

## Differences from FastAPI Version

| Feature | FastAPI (Python) | Cloudflare (TypeScript) |
|---------|------------------|-------------------------|
| **Language** | Python | TypeScript |
| **Runtime** | uvicorn/Docker | V8 isolate (serverless) |
| **Deployment** | Render (container) | Cloudflare Edge (300+ locations) |
| **Cold Start** | 3-5 seconds | <1ms |
| **Rate Limiting** | slowapi (in-memory) | KV namespace (distributed) |
| **Environment Vars** | .env files | Wrangler secrets |
| **Cost** | $7-21/month | $0-5/month (free tier available) |
| **Auto-scaling** | Limited by plan | Unlimited, automatic |

## Quick Setup (3 Steps)

### 1. Run Setup Script

```bash
chmod +x setup-cloudflare.sh
./setup-cloudflare.sh
```

This will:
- Install npm dependencies
- Login to Cloudflare
- Create KV namespace for rate limiting
- Set up secrets (prompts you for keys)
- Create `.dev.vars` template

### 2. Update Local Environment

Edit `.dev.vars` for local development:

```bash
# .dev.vars (gitignored, never commit!)
OPENAI_API_KEY=sk-your-actual-openai-key
API_SECRET=7139248544
```

### 3. Test & Deploy

```bash
# Test locally
npm run dev
# Visit http://localhost:8787

# Deploy to production
npm run deploy
# Gets URL like: https://genmsg.your-subdomain.workers.dev
```

## Manual Setup (Alternative)

If the script doesn't work:

```bash
# 1. Install dependencies
npm install

# 2. Login to Cloudflare
npx wrangler login

# 3. Create KV namespace
npx wrangler kv:namespace create "RATE_LIMIT_KV"
# Copy the ID and update wrangler.toml

# 4. Set secrets
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put API_SECRET

# 5. Deploy
npm run deploy
```

## Testing the API

Same API as FastAPI version - just change the URL!

```bash
# Health check (no auth)
curl https://your-worker.workers.dev/

# Generate text (with auth)
curl -X POST https://your-worker.workers.dev/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Say something nice",
    "conversation_history": [],
    "secret": "7139248544"
  }'
```

## Common Commands

```bash
# Local development
npm run dev              # Start local server (localhost:8787)

# Deployment
npm run deploy           # Deploy to production
npm run tail             # View live logs

# Utilities
npm run type-check       # Check TypeScript types
npx wrangler secret list # List configured secrets
```

## Migration from Render/FastAPI

Your existing client code (iOS Shortcut, etc.) **doesn't need changes**! Just update the URL:

**Old (Render):**
```
https://genmsg.onrender.com/generate
```

**New (Cloudflare):**
```
https://genmsg.your-subdomain.workers.dev/generate
```

Same request format, same response format, same authentication.

## Cost Comparison

### Render (FastAPI + Docker)
- **Free tier**: Limited hours, sleeps after inactivity
- **Paid**: $7+/month for always-on service
- Single region (e.g., Oregon)

### Cloudflare Workers
- **Free tier**: 100,000 requests/day (enough for personal use)
- **Paid**: $5/month for 10M requests
- Global edge network (300+ locations)
- No cold starts on free tier

## Advantages of Cloudflare Workers

1. **Faster**: Sub-millisecond cold starts vs 3-5 seconds
2. **Cheaper**: Free tier is generous, paid tier is $5/month
3. **Global**: Automatically deployed to 300+ locations
4. **Simpler**: No Docker, no containers, just deploy
5. **Auto-scaling**: Handles traffic spikes automatically

## When to Use FastAPI Instead

- Need long-running computations (>50ms CPU time limit on Workers)
- Need to read/write large files
- Need background jobs
- Prefer Python ecosystem
- Need SSH/direct server access

## Troubleshooting

### "No KV namespace with id"
```bash
# Create KV namespace
npx wrangler kv:namespace create "RATE_LIMIT_KV"
# Update the ID in wrangler.toml
```

### "Invalid authentication secret"
```bash
# Check secrets are set
npx wrangler secret list

# Reset if needed
npx wrangler secret put API_SECRET
```

### Local dev not working
```bash
# Ensure .dev.vars exists with valid keys
cat .dev.vars

# Should contain:
# OPENAI_API_KEY=sk-...
# API_SECRET=...
```

## Next Steps

- [ ] Deploy to Cloudflare and test
- [ ] Update iOS Shortcut with new URL
- [ ] Monitor usage in Cloudflare dashboard
- [ ] Consider custom domain (optional)
- [ ] Set up alerting for errors (optional)

## Resources

- **Full Documentation**: `README-CLOUDFLARE.md`
- **Cloudflare Dashboard**: https://dash.cloudflare.com
- **Wrangler Docs**: https://developers.cloudflare.com/workers/wrangler/
- **OpenAI API Docs**: https://platform.openai.com/docs

## Support

If you run into issues:

1. Check `README-CLOUDFLARE.md` for detailed troubleshooting
2. View logs: `npm run tail`
3. Check Cloudflare dashboard for metrics
4. Verify secrets: `npx wrangler secret list`

---

**Ready to deploy?** Just run:
```bash
npm run deploy
```

Your API will be live on Cloudflare's global edge network in seconds! 🚀

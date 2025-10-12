# GenMsg - Cloudflare Workers Version

TypeScript implementation of the GenMsg API running on Cloudflare Workers. This provides the same functionality as the FastAPI version but with edge computing benefits.

## Features

- ✅ OpenAI GPT-5 Nano integration
- ✅ Rate limiting (10 req/min per IP on `/generate`, 60 req/min on `/`)
- ✅ Authentication via API secret
- ✅ Conversation history support
- ✅ CORS enabled
- ✅ Global edge deployment
- ✅ Serverless (no containers needed)

## Prerequisites

- Node.js 18+ or npm/yarn/pnpm
- Cloudflare account (free tier works)
- Wrangler CLI (installed via npm)
- OpenAI API key

## Setup

### 1. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 2. Create KV Namespace

Rate limiting requires a Cloudflare KV namespace:

```bash
# Create KV namespace for development
wrangler kv:namespace create "RATE_LIMIT_KV"

# Create KV namespace for production
wrangler kv:namespace create "RATE_LIMIT_KV" --preview false
```

This will output an ID like `1234567890abcdef`. Copy this ID and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "1234567890abcdef"  # Replace with your actual ID
```

### 3. Set Secrets

Store your API keys securely using Wrangler secrets (NEVER commit these):

```bash
# Set OpenAI API key
wrangler secret put OPENAI_API_KEY
# Paste your OpenAI key when prompted

# Set API authentication secret
wrangler secret put API_SECRET
# Paste your secret when prompted (e.g., "7139248544")
```

### 4. Login to Cloudflare

```bash
wrangler login
```

This opens a browser window to authenticate with Cloudflare.

## Development

### Local Development

```bash
# Start local development server (uses Miniflare)
npm run dev

# Or with wrangler directly
wrangler dev
```

The worker will be available at `http://localhost:8787`

**Note:** Local development uses `.dev.vars` file for secrets:

```bash
# Create .dev.vars file (gitignored)
cat > .dev.vars << EOF
OPENAI_API_KEY=sk-your-key-here
API_SECRET=your-secret-here
EOF
```

### Testing the API

```bash
# Test root endpoint (no auth required)
curl http://localhost:8787/

# Test generate endpoint (requires auth)
curl -X POST http://localhost:8787/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Say hello",
    "conversation_history": [],
    "secret": "your-secret-here"
  }'
```

### Type Checking

```bash
npm run type-check
```

## Deployment

### Deploy to Cloudflare

```bash
# Deploy to production
npm run deploy

# Or with wrangler directly
wrangler deploy
```

After deployment, your worker will be available at:
```
https://genmsg.<your-subdomain>.workers.dev
```

### View Logs

```bash
# Tail live logs from production
npm run tail

# Or with wrangler directly
wrangler tail
```

### Environment Management

For multiple environments (staging, production):

```bash
# Deploy to specific environment
wrangler deploy --env production

# Set secrets for specific environment
wrangler secret put OPENAI_API_KEY --env production
```

Update `wrangler.toml` with environment configs:

```toml
[env.production]
name = "genmsg-production"
[[env.production.kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "your-production-kv-id"
```

## API Endpoints

### GET `/`

Health check endpoint.

**Rate Limit:** 60 requests per minute per IP

**Response:**
```json
{
  "message": "GPT-5 Nano Cloudflare Worker is running!"
}
```

### POST `/generate`

Generate text using OpenAI GPT-5 Nano.

**Rate Limit:** 10 requests per minute per IP

**Request Body:**
```json
{
  "prompt": "Your prompt here",
  "conversation_history": ["optional", "previous", "messages"],
  "secret": "your-api-secret"
}
```

**Response (Success):**
```json
{
  "generated_text": "Generated response from GPT-5 Nano"
}
```

**Response (Rate Limited - 429):**
```json
{
  "error": "Rate limit exceeded. Maximum 10 requests per minute."
}
```

**Response (Unauthorized - 401):**
```json
{
  "error": "Invalid authentication secret"
}
```

## Architecture

### Key Differences from FastAPI Version

| Feature | FastAPI | Cloudflare Workers |
|---------|---------|-------------------|
| **Runtime** | Python/uvicorn | V8 isolate |
| **Deployment** | Container (Docker) | Serverless edge |
| **Cold Start** | ~1-5 seconds | <1ms |
| **Scaling** | Manual/autoscale | Automatic (global) |
| **Rate Limiting** | slowapi + memory | KV namespace |
| **Cost** | Server/container costs | Pay-per-request |
| **Locations** | Single region | 300+ edge locations |

### Rate Limiting Implementation

- Uses Cloudflare KV for distributed rate limit tracking
- Per-IP rate limiting using sliding window algorithm
- Separate limits for `/` (60/min) and `/generate` (10/min)
- Automatically expires old entries using KV TTL

### IP Detection

Priority order:
1. `CF-Connecting-IP` (Cloudflare's real IP)
2. `X-Forwarded-For` (first IP in chain)
3. `X-Real-IP` (fallback)

## Cost Considerations

Cloudflare Workers pricing (as of 2024):

**Free Tier:**
- 100,000 requests/day
- 10ms CPU time per request

**Paid Plan ($5/month):**
- 10M requests/month included
- $0.50 per additional million requests
- 50ms CPU time per request

**KV Storage (separate):**
- 100,000 reads/day (free)
- 1,000 writes/day (free)
- $0.50 per million reads
- $5.00 per million writes

## Monitoring

### View Metrics

In Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select your worker
3. View Metrics tab for:
   - Request count
   - Error rate
   - CPU time
   - Response time

### Custom Logging

Add to your worker code:
```typescript
console.log('Custom log message', { data: 'value' });
```

View logs:
```bash
wrangler tail
```

## Troubleshooting

### "Error: No KV namespace with id"
- Create KV namespace: `wrangler kv:namespace create "RATE_LIMIT_KV"`
- Update `wrangler.toml` with the generated ID

### "Error: Missing environment variable"
- Set secrets: `wrangler secret put OPENAI_API_KEY`
- For local dev, add to `.dev.vars` file

### "Rate limit exceeded" on every request
- Check KV namespace is properly configured
- Verify KV binding in `wrangler.toml`
- Check KV namespace permissions

### "Invalid authentication secret"
- Verify secret is set: `wrangler secret list`
- Check secret value matches what client is sending
- For local dev, ensure `.dev.vars` has correct value

### OpenAI API errors
- Verify API key is valid
- Check model name is correct: `gpt-5-nano-2025-08-07`
- Ensure API key has necessary permissions

## Comparison with Render Deployment

| Aspect | Render (Docker) | Cloudflare Workers |
|--------|-----------------|-------------------|
| **Setup** | More complex (Docker) | Simpler (just deploy) |
| **Maintenance** | Container updates | Automatic platform updates |
| **Global** | Single region | 300+ edge locations |
| **Cold starts** | Slow (~3-5s) | Near instant (<1ms) |
| **Scaling** | Limited by plan | Unlimited, automatic |
| **Cost** | $7/month minimum | $0-5/month typical |
| **Debugging** | Full logs, SSH access | Logs only, no SSH |

## Migration from FastAPI

If migrating from the FastAPI version:

1. **Environment variables**: Use `wrangler secret put` instead of `.env` files
2. **Rate limiting**: Uses KV instead of in-memory storage
3. **Conversation history**: Same API format
4. **Authentication**: Same secret-based auth
5. **Endpoints**: Identical API surface

The client code (iOS Shortcut, etc.) doesn't need changes - just update the URL.

## Security Notes

- ✅ Secrets stored in Cloudflare (never in code)
- ✅ HTTPS enforced automatically
- ✅ Rate limiting prevents abuse
- ✅ IP-based rate limiting uses real client IP
- ✅ CORS configured for controlled access
- ⚠️ Consider adding request signing for additional security
- ⚠️ Monitor usage to prevent unexpected costs

## Next Steps

- [ ] Add response caching for repeated prompts
- [ ] Implement request signing for stronger auth
- [ ] Add Durable Objects for stateful conversations
- [ ] Set up custom domain
- [ ] Add monitoring/alerting (e.g., via webhooks)
- [ ] Implement cost controls/budgets

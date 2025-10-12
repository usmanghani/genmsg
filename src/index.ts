import OpenAI from 'openai';

// Types
interface GenerationRequest {
	prompt: string;
	conversation_history?: string[];
	secret: string;
}

interface Env {
	OPENAI_API_KEY: string;
	API_SECRET: string;
	RATE_LIMIT_KV: KVNamespace;
}

// Rate limiter class
class RateLimiter {
	private kv: KVNamespace;
	private limit: number;
	private windowSeconds: number;

	constructor(kv: KVNamespace, limit: number = 10, windowSeconds: number = 60) {
		this.kv = kv;
		this.limit = limit;
		this.windowSeconds = windowSeconds;
	}

	async checkLimit(clientIP: string, endpoint: string): Promise<{ allowed: boolean; remaining: number }> {
		const key = `ratelimit:${clientIP}:${endpoint}`;
		const now = Date.now();
		const windowStart = now - this.windowSeconds * 1000;

		// Get existing requests
		const existing = await this.kv.get(key, 'json') as number[] | null;
		const requests = existing || [];

		// Filter out requests outside the window
		const validRequests = requests.filter((timestamp) => timestamp > windowStart);

		if (validRequests.length >= this.limit) {
			return { allowed: false, remaining: 0 };
		}

		// Add current request
		validRequests.push(now);

		// Store with TTL equal to window size
		await this.kv.put(key, JSON.stringify(validRequests), {
			expirationTtl: this.windowSeconds,
		});

		return { allowed: true, remaining: this.limit - validRequests.length };
	}
}

// Helper to get real client IP
function getClientIP(request: Request): string {
	// Cloudflare provides CF-Connecting-IP header
	const cfConnectingIP = request.headers.get('CF-Connecting-IP');
	if (cfConnectingIP) return cfConnectingIP;

	// Fallback to X-Forwarded-For
	const xForwardedFor = request.headers.get('X-Forwarded-For');
	if (xForwardedFor) {
		return xForwardedFor.split(',')[0].trim();
	}

	// Last resort
	const xRealIP = request.headers.get('X-Real-IP');
	return xRealIP || 'unknown';
}

// Helper to create JSON response
function jsonResponse(data: any, status: number = 200, headers: Record<string, string> = {}): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
	});
}

// Main worker
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const clientIP = getClientIP(request);

		// CORS headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: corsHeaders,
			});
		}

		// Initialize rate limiter
		const rateLimiter = new RateLimiter(env.RATE_LIMIT_KV);

		// Root endpoint
		if (url.pathname === '/' && request.method === 'GET') {
			const { allowed, remaining } = await rateLimiter.checkLimit(clientIP, 'root');

			if (!allowed) {
				return jsonResponse(
					{ error: 'Rate limit exceeded. Please try again later.' },
					429,
					corsHeaders
				);
			}

			return jsonResponse(
				{ message: 'GPT-5 Nano Cloudflare Worker is running!' },
				200,
				{ ...corsHeaders, 'X-RateLimit-Remaining': remaining.toString() }
			);
		}

		// Generate endpoint
		if (url.pathname === '/generate' && request.method === 'POST') {
			try {
				// Check rate limit (10 requests per minute)
				const { allowed, remaining } = await rateLimiter.checkLimit(clientIP, 'generate');

				if (!allowed) {
					return jsonResponse(
						{ error: 'Rate limit exceeded. Maximum 10 requests per minute.' },
						429,
						corsHeaders
					);
				}

				// Parse request body
				let body: GenerationRequest;
				try {
					body = await request.json() as GenerationRequest;
				} catch (e) {
					return jsonResponse(
						{ error: 'Invalid JSON in request body' },
						400,
						corsHeaders
					);
				}

				// Validate required fields
				if (!body.prompt || !body.secret) {
					return jsonResponse(
						{ error: 'Missing required fields: prompt and secret' },
						400,
						corsHeaders
					);
				}

				// Verify authentication secret
				if (body.secret !== env.API_SECRET) {
					return jsonResponse(
						{ error: 'Invalid authentication secret' },
						401,
						corsHeaders
					);
				}

				// Initialize OpenAI client
				const openai = new OpenAI({
					apiKey: env.OPENAI_API_KEY,
				});

				// Build messages array
				const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

				if (body.conversation_history && Array.isArray(body.conversation_history)) {
					for (const msg of body.conversation_history) {
						messages.push({ role: 'user', content: msg });
					}
				}

				messages.push({ role: 'user', content: body.prompt });

				// Call OpenAI API
				const response = await openai.chat.completions.create({
					model: 'gpt-5-nano-2025-08-07',
					messages: messages,
				});

				// Extract content from response
				const message = response.choices[0]?.message;
				let textOutput = '';

				if (message?.content) {
					const content = message.content;

					if (typeof content === 'string') {
						textOutput = content;
					} else if (Array.isArray(content)) {
						// Handle array of content items
						const parts: string[] = [];
						for (const item of content) {
							if (typeof item === 'string') {
								parts.push(item);
							} else if (typeof item === 'object' && item !== null) {
								// Try to extract text from object
								const itemObj = item as any;
								if ('text' in itemObj) {
									parts.push(String(itemObj.text));
								} else if ('content' in itemObj) {
									parts.push(String(itemObj.content));
								} else {
									parts.push(String(item));
								}
							} else {
								parts.push(String(item));
							}
						}
						textOutput = parts.join(' ');
					} else {
						textOutput = String(content);
					}
				}

				textOutput = textOutput.trim();

				if (!textOutput) {
					return jsonResponse(
						{ generated_text: 'No content generated' },
						200,
						{ ...corsHeaders, 'X-RateLimit-Remaining': remaining.toString() }
					);
				}

				return jsonResponse(
					{ generated_text: textOutput },
					200,
					{ ...corsHeaders, 'X-RateLimit-Remaining': remaining.toString() }
				);
			} catch (error) {
				console.error('Error in /generate:', error);

				const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

				return jsonResponse(
					{ error: errorMessage },
					500,
					corsHeaders
				);
			}
		}

		// 404 for unknown routes
		return jsonResponse(
			{ error: 'Not found' },
			404,
			corsHeaders
		);
	},
};

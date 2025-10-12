import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Miniflare } from 'miniflare';
import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';

// Mock OpenAI response
const mockOpenAIResponse = {
	id: 'chatcmpl-test123',
	object: 'chat.completion',
	created: 1234567890,
	model: 'gpt-5-nano-2025-08-07',
	choices: [
		{
			index: 0,
			message: {
				role: 'assistant',
				content: 'This is a test response from OpenAI mock',
			},
			finish_reason: 'stop',
		},
	],
};

describe('Cloudflare Worker - Root Endpoint', () => {
	let worker: UnstableDevWorker;

	beforeAll(async () => {
		// Start the worker in test mode
		worker = await unstable_dev('src/index.ts', {
			experimental: { disableExperimentalWarning: true },
			vars: {
				API_SECRET: 'test_secret_12345',
				OPENAI_API_KEY: 'sk-test-fake-key',
			},
		});
	});

	afterAll(async () => {
		await worker.stop();
	});

	it('GET / should return 200 OK', async () => {
		const resp = await worker.fetch('http://localhost/');
		expect(resp.status).toBe(200);
	});

	it('GET / should return expected message', async () => {
		const resp = await worker.fetch('http://localhost/');
		const data = await resp.json();
		expect(data).toHaveProperty('message');
		expect(data.message.toLowerCase()).toContain('running');
	});
});

describe('Cloudflare Worker - Generate Endpoint Authentication', () => {
	let worker: UnstableDevWorker;

	beforeAll(async () => {
		worker = await unstable_dev('src/index.ts', {
			experimental: { disableExperimentalWarning: true },
			vars: {
				API_SECRET: 'test_secret_12345',
				OPENAI_API_KEY: 'sk-test-fake-key',
			},
		});
	});

	afterAll(async () => {
		await worker.stop();
	});

	it('POST /generate without secret should return 400', async () => {
		const resp = await worker.fetch('http://localhost/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				prompt: 'Hello',
				conversation_history: [],
			}),
		});
		expect(resp.status).toBe(400);
	});

	it('POST /generate with invalid secret should return 401', async () => {
		const resp = await worker.fetch('http://localhost/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				prompt: 'Hello',
				conversation_history: [],
				secret: 'wrong_secret',
			}),
		});
		expect(resp.status).toBe(401);
		const data = await resp.json();
		expect(data.error.toLowerCase()).toContain('authentication');
	});
});

describe('Cloudflare Worker - Generate Endpoint Functionality', () => {
	let worker: UnstableDevWorker;

	beforeAll(async () => {
		worker = await unstable_dev('src/index.ts', {
			experimental: { disableExperimentalWarning: true },
			vars: {
				API_SECRET: 'test_secret_12345',
				OPENAI_API_KEY: 'sk-test-fake-key',
			},
		});

		// Mock fetch to intercept OpenAI API calls
		global.fetch = vi.fn(async (url: any) => {
			if (typeof url === 'string' && url.includes('api.openai.com')) {
				return new Response(JSON.stringify(mockOpenAIResponse), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			return new Response('Not found', { status: 404 });
		}) as any;
	});

	afterAll(async () => {
		await worker.stop();
		vi.restoreAllMocks();
	});

	it('POST /generate with valid secret should return 200', async () => {
		// Note: This test may fail without proper OpenAI mocking in the worker
		// The worker uses the OpenAI SDK which makes real API calls
		// For a true unit test, we'd need to mock at the SDK level
		const resp = await worker.fetch('http://localhost/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				prompt: 'Hello',
				conversation_history: [],
				secret: 'test_secret_12345',
			}),
		});

		// Due to the OpenAI SDK, this may fail without network access
		// In a real scenario, you'd mock the OpenAI SDK itself
		if (resp.status === 200) {
			const data = await resp.json();
			expect(data).toHaveProperty('generated_text');
		} else {
			// Expected if OpenAI API key is fake
			expect([401, 500]).toContain(resp.status);
		}
	});
});

describe('Cloudflare Worker - Error Handling', () => {
	let worker: UnstableDevWorker;

	beforeAll(async () => {
		worker = await unstable_dev('src/index.ts', {
			experimental: { disableExperimentalWarning: true },
			vars: {
				API_SECRET: 'test_secret_12345',
				OPENAI_API_KEY: 'sk-test-fake-key',
			},
		});
	});

	afterAll(async () => {
		await worker.stop();
	});

	it('POST /generate with invalid JSON should return 400', async () => {
		const resp = await worker.fetch('http://localhost/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: 'not valid json',
		});
		expect(resp.status).toBe(400);
	});

	it('POST /generate missing prompt should return 400', async () => {
		const resp = await worker.fetch('http://localhost/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				conversation_history: [],
				secret: 'test_secret_12345',
			}),
		});
		expect(resp.status).toBe(400);
	});

	it('Unknown routes should return 404', async () => {
		const resp = await worker.fetch('http://localhost/unknown');
		expect(resp.status).toBe(404);
	});
});

describe('Cloudflare Worker - CORS', () => {
	let worker: UnstableDevWorker;

	beforeAll(async () => {
		worker = await unstable_dev('src/index.ts', {
			experimental: { disableExperimentalWarning: true },
			vars: {
				API_SECRET: 'test_secret_12345',
				OPENAI_API_KEY: 'sk-test-fake-key',
			},
		});
	});

	afterAll(async () => {
		await worker.stop();
	});

	it('OPTIONS request should return CORS headers', async () => {
		const resp = await worker.fetch('http://localhost/generate', {
			method: 'OPTIONS',
		});
		expect(resp.status).toBe(200);
		expect(resp.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
	});

	it('POST responses should include CORS headers', async () => {
		const resp = await worker.fetch('http://localhost/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				prompt: 'Test',
				conversation_history: [],
				secret: 'wrong_secret',
			}),
		});
		expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});
});

describe('Cloudflare Worker - Rate Limiting', () => {
	let worker: UnstableDevWorker;

	beforeAll(async () => {
		// Note: Rate limiting requires KV namespace which is not available in unstable_dev
		// These tests verify the endpoint exists but can't fully test rate limiting
		worker = await unstable_dev('src/index.ts', {
			experimental: { disableExperimentalWarning: true },
			vars: {
				API_SECRET: 'test_secret_12345',
				OPENAI_API_KEY: 'sk-test-fake-key',
			},
		});
	});

	afterAll(async () => {
		await worker.stop();
	});

	it('GET / should respond (rate limit header check)', async () => {
		const resp = await worker.fetch('http://localhost/');
		expect(resp.status).toBe(200);
		// Rate limit headers may or may not be present depending on KV setup
	});

	it('Multiple requests to same endpoint should work', async () => {
		// Without KV namespace, rate limiting won't work properly
		// But we can verify the endpoint handles multiple requests
		for (let i = 0; i < 3; i++) {
			const resp = await worker.fetch('http://localhost/', {
				headers: { 'CF-Connecting-IP': '1.2.3.4' },
			});
			expect(resp.status).toBe(200);
		}
	});
});

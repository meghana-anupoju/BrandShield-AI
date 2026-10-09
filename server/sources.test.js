import test from 'node:test';
import assert from 'node:assert/strict';
import { collectLiveCandidates } from './sources.js';

test('live provider results map into normalized social and app candidates', async () => {
  const fetchMock = async (url) => {
    if (url.startsWith('https://public.api.bsky.app/')) {
      return {
        ok: true,
        json: async () => ({
          actors: [{
            did: 'did:plc:sample',
            handle: 'novapay.example',
            displayName: 'NovaPay Support',
            description: 'Verify your account to claim a reward.',
            followersCount: 12,
            createdAt: '2025-01-01T00:00:00Z',
          }],
        }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        results: [{
          trackId: 42,
          trackName: 'NovaPay Wallet',
          bundleId: 'com.example.wallet',
          sellerName: 'Example Seller',
          trackViewUrl: 'https://apps.apple.com/app/id42',
          description: 'A sample wallet app.',
        }],
      }),
    };
  };

  const result = await collectLiveCandidates('NovaPay', fetchMock);

  assert.equal(result.socialCandidates[0].platform, 'Bluesky');
  assert.equal(result.socialCandidates[0].username, 'novapay.example');
  assert.equal(result.socialCandidates[0].source, 'Bluesky public API');
  assert.equal(result.appCandidates[0].store, 'Apple App Store');
  assert.equal(result.appCandidates[0].publisher, 'Example Seller');
  assert.deepEqual(result.sourceStatuses.map((source) => source.status), ['connected', 'connected']);
});

test('provider failures are surfaced independently without losing the other source', async () => {
  const fetchMock = async (url) => {
    if (url.startsWith('https://public.api.bsky.app/')) {
      return { ok: false, status: 429 };
    }
    return { ok: true, json: async () => ({ results: [] }) };
  };

  const result = await collectLiveCandidates('NovaPay', fetchMock);

  assert.equal(result.socialCandidates.length, 0);
  assert.equal(result.appCandidates.length, 0);
  assert.equal(result.sourceStatuses[0].status, 'unavailable');
  assert.match(result.sourceStatuses[0].detail, /429/);
  assert.equal(result.sourceStatuses[1].status, 'connected');
});

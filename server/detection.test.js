import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDetections, similarityScore } from './detection.js';
import { brandProfile, socialCandidates, appCandidates } from './data.js';

test('look-alike matching handles transposition, spacing, and added words', () => {
  assert.ok(similarityScore('NovaPya', 'NovaPay') >= 70);
  assert.equal(similarityScore('Nova Pay', 'NovaPay'), 100);
  assert.ok(similarityScore('NovaPay Support', 'NovaPay') >= 50);
});

test('registered social accounts and apps are excluded from threat alerts', () => {
  const result = buildDetections(brandProfile, socialCandidates, appCandidates);

  assert.equal(result.officialExcluded, 2);
  assert.ok(result.detections.some((detection) => detection.candidateId === 'soc-official-1' && detection.isOfficial));
  assert.ok(result.detections.some((detection) => detection.candidateId === 'app-official-1' && detection.isOfficial));
  assert.ok(result.detections.filter((detection) => detection.isOfficial).every((detection) => detection.riskScore === 0));
});

test('suspicious social accounts and apps are flagged but unrelated assets are not', () => {
  const social = {
    id: 'fake-social',
    platform: 'X',
    displayName: 'NovaPya Support',
    username: 'novapya_help',
    profileUrl: 'https://x.com/novapya_help',
    bio: 'Urgent payment required. Verify your account to claim your reward.',
    verified: false,
    source: 'test',
  };
  const unrelatedSocial = {
    id: 'unrelated-social',
    platform: 'LinkedIn',
    displayName: 'Nova Financial Services',
    username: 'novafinancial',
    profileUrl: 'https://linkedin.com/company/novafinancial',
    bio: 'Independent financial advisory firm. Not affiliated with NovaPay.',
    verified: true,
    source: 'test',
  };
  const fakeApp = {
    id: 'fake-app',
    appName: 'NovaPay Wallet',
    store: 'Google Play',
    packageId: 'com.unrelated.publisher.wallet',
    publisher: 'Unknown Publisher',
    storeUrl: 'https://play.google.com/store/apps/details?id=com.unrelated.publisher.wallet',
    description: 'Verify your account to claim your reward.',
    source: 'test',
  };
  const unrelatedApp = {
    id: 'unrelated-app',
    appName: 'PayMate Wallet',
    store: 'Apple App Store',
    packageId: 'com.paymate.wallet',
    publisher: 'PayMate Ltd',
    storeUrl: 'https://apps.apple.com/app/paymate',
    description: 'A digital wallet for everyday spending and budgeting.',
    source: 'test',
  };

  const result = buildDetections(brandProfile, [social, unrelatedSocial], [fakeApp, unrelatedApp]);

  assert.ok(result.detections.some((detection) => detection.candidateId === 'fake-social' && !detection.isOfficial));
  assert.ok(result.detections.some((detection) => detection.candidateId === 'fake-app' && !detection.isOfficial));
  assert.ok(!result.detections.some((detection) => detection.candidateId === 'unrelated-social'));
  assert.ok(!result.detections.some((detection) => detection.candidateId === 'unrelated-app'));
});

test('saved official assets drive matching instead of fixed brand assumptions', () => {
  const customProfile = {
    ...brandProfile,
    companyName: 'Acme Orbit',
    officialSocials: [{
      id: 'official-acme',
      platform: 'Instagram',
      displayName: 'Acme Orbit',
      username: 'acmeorbit',
      url: 'https://instagram.com/acmeorbit',
      verified: true,
    }],
    officialApps: [{
      id: 'official-acme-app',
      appName: 'Acme Orbit',
      store: 'Google Play',
      publisher: 'Acme Orbit Ltd',
      url: 'https://play.google.com/store/apps/details?id=io.acme.orbit',
      packageId: 'io.acme.orbit',
    }],
    knownPublishers: ['Acme Orbit Ltd'],
  };
  const result = buildDetections(
    customProfile,
    [{
      id: 'acme-social',
      platform: 'Instagram',
      displayName: 'Acme Orbit',
      username: 'acmeorbit',
      profileUrl: 'https://instagram.com/acmeorbit',
      bio: 'Official account',
      verified: true,
      source: 'test',
    }],
    [{
      id: 'acme-app',
      appName: 'Acme Orbit',
      store: 'Google Play',
      packageId: 'io.acme.orbit',
      publisher: 'Acme Orbit Ltd',
      storeUrl: 'https://play.google.com/store/apps/details?id=io.acme.orbit',
      description: 'Official app',
      source: 'test',
    }],
  );

  assert.equal(result.officialExcluded, 2);
  assert.ok(result.detections.every((detection) => detection.isOfficial && detection.riskScore === 0));
});

test('analyst thresholds change the scan results', () => {
  const candidate = {
    id: 'threshold-social',
    platform: 'Instagram',
    displayName: 'NovaPay Support',
    username: 'novapay.support',
    profileUrl: 'https://instagram.com/novapay.support',
    bio: 'Customer help desk for NovaPay.',
    verified: false,
    source: 'test',
  };
  const permissive = buildDetections(brandProfile, [candidate], [], {
    nameSimilarityThreshold: 50,
    suspiciousKeywordThreshold: 25,
  });
  const strict = buildDetections(brandProfile, [candidate], [], {
    nameSimilarityThreshold: 90,
    suspiciousKeywordThreshold: 90,
  });

  assert.equal(permissive.detections.length, 1);
  assert.equal(strict.detections.length, 0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('brand profile and scan history survive database reconnection', async () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'brandshield-database-test-'));
  const databasePath = path.join(tempDirectory, 'brandshield.sqlite');
  const previousDatabasePath = process.env.DATABASE_PATH;
  const connections = [];

  try {
    process.env.DATABASE_PATH = databasePath;
    const firstConnection = await import(`./database.js?first=${Date.now()}`);
    connections.push(firstConnection);
    const profile = firstConnection.loadBrandProfile();
    profile.companyName = 'Persistent Demo Brand';
    firstConnection.persistBrandProfile(profile);

    firstConnection.persistScan({
      id: 'scan-persistence-test',
      timestamp: '2026-10-10T00:00:00.000Z',
      totalScanned: 4,
      socialScanned: 2,
      appScanned: 2,
      threatsDetected: 1,
      officialExcluded: 1,
      source: 'Demo Dataset',
      liveSourceAvailable: false,
      detections: [{ candidateId: 'candidate-1' }],
      sourceStatuses: [{ name: 'demo', status: 'demo' }],
    });
    firstConnection.persistCandidates(
      [{ id: 'persisted-social', username: 'sample' }],
      [{ id: 'persisted-app', appName: 'Sample' }],
    );

    const secondConnection = await import(`./database.js?second=${Date.now()}`);
    connections.push(secondConnection);

    assert.equal(secondConnection.loadBrandProfile().companyName, 'Persistent Demo Brand');
    assert.equal(secondConnection.getScanHistory()[0].id, 'scan-persistence-test');
    assert.equal(secondConnection.getScanById('scan-persistence-test').detections[0].candidateId, 'candidate-1');
    assert.equal(secondConnection.getCandidates().socialCandidates[0].id, 'persisted-social');
    assert.equal(secondConnection.getCandidates().appCandidates[0].id, 'persisted-app');
  } finally {
    connections.forEach((connection) => connection.closeDatabase());
    if (previousDatabasePath === undefined) delete process.env.DATABASE_PATH;
    else process.env.DATABASE_PATH = previousDatabasePath;
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});

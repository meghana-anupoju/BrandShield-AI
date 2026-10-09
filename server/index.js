import express from 'express';
import cors from 'cors';
import { brandProfile, socialCandidates, appCandidates } from './data.js';

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json());

function normalizeText(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function similarityScore(a = '', b = '') {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return 0;
  if (left === right) return 100;

  let distance = 0;
  const maxLength = Math.max(left.length, right.length);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    if (left[index] !== right[index]) {
      distance += 1;
    }
  }

  return Math.max(0, Math.round(((maxLength - distance) / maxLength) * 100));
}

function containsSuspiciousKeyword(text = '') {
  const haystack = text.toLowerCase();
  const matches = ['support', 'official', 'help', 'rewards', 'verify', 'security', 'care', 'service', 'offer'];
  return matches.filter((match) => haystack.includes(match));
}

function containsScamPhrase(text = '') {
  const haystack = text.toLowerCase();
  const matches = ['urgent payment', 'claim your reward', 'verify your credentials', 'guaranteed rewards', 'limited time'];
  return matches.filter((match) => haystack.includes(match));
}

function buildDetections() {
  const detections = [];

  for (const candidate of socialCandidates) {
    const combined = `${candidate.displayName} ${candidate.username} ${candidate.bio}`;
    const nameSimilarity = similarityScore(candidate.displayName, brandProfile.companyName);
    const usernameSimilarity = similarityScore(candidate.username, brandProfile.companyName);
    const suspiciousKeywords = containsSuspiciousKeyword(combined);
    const scamMatches = containsScamPhrase(candidate.bio || '');

    const triggered = [
      nameSimilarity >= 70,
      usernameSimilarity >= 70,
      suspiciousKeywords.length > 0,
      scamMatches.length > 0,
      !candidate.verified,
    ].filter(Boolean).length;

    const riskScore = Math.min(100, Math.max(0, triggered * 20 + (nameSimilarity >= 70 ? 10 : 0) + (scamMatches.length > 0 ? 15 : 0)));

    if (triggered > 0) {
      detections.push({
        id: `det-${candidate.id}`,
        candidateId: candidate.id,
        candidateName: candidate.displayName,
        assetType: 'Social Profile',
        platformOrStore: candidate.platform,
        url: candidate.profileUrl,
        riskScore,
        riskLevel: riskScore >= 75 ? 'Critical' : riskScore >= 50 ? 'High' : riskScore >= 25 ? 'Medium' : 'Low',
        similarityScore: Math.max(nameSimilarity, usernameSimilarity),
        indicators: [
          { type: 'Name Similarity', detail: `Display name similarity: ${nameSimilarity}%`, weight: 25, triggered: nameSimilarity >= 70 },
          { type: 'Suspicious Keywords', detail: suspiciousKeywords.length ? `Matches: ${suspiciousKeywords.join(', ')}` : 'No suspicious suffixes found', weight: 25, triggered: suspiciousKeywords.length > 0 },
          { type: 'Scam Detection', detail: scamMatches.length ? `Scam phrases: ${scamMatches.join(', ')}` : 'No scam language detected', weight: 25, triggered: scamMatches.length > 0 },
          { type: 'Verification Status', detail: candidate.verified ? 'Account is verified' : 'Account is not verified', weight: 15, triggered: !candidate.verified },
        ],
        detectionReasons: [
          nameSimilarity >= 70 ? `Name similarity ${nameSimilarity}%` : null,
          suspiciousKeywords.length ? `Brand mimic keywords found: ${suspiciousKeywords.join(', ')}` : null,
          scamMatches.length ? `Scam language detected: ${scamMatches.join(', ')}` : null,
          !candidate.verified ? 'Profile is not verified' : null,
        ].filter(Boolean),
        isOfficial: false,
        status: 'New',
        analystNotes: '',
        lastScanned: new Date().toISOString(),
        source: candidate.source,
        bio: candidate.bio,
        verified: candidate.verified,
        followerCount: candidate.followerCount,
      });
    }
  }

  for (const candidate of appCandidates) {
    const nameSimilarity = similarityScore(candidate.appName, brandProfile.companyName);
    const suspiciousKeywords = containsSuspiciousKeyword(`${candidate.appName} ${candidate.description}`);
    const scamMatches = containsScamPhrase(candidate.description || '');
    const riskScore = Math.min(100, Math.max(0, (nameSimilarity >= 70 ? 30 : 10) + (suspiciousKeywords.length > 0 ? 25 : 0) + (scamMatches.length > 0 ? 25 : 0)));

    if (riskScore >= 20) {
      detections.push({
        id: `det-${candidate.id}`,
        candidateId: candidate.id,
        candidateName: candidate.appName,
        assetType: 'Mobile App',
        platformOrStore: candidate.store,
        url: candidate.storeUrl,
        riskScore,
        riskLevel: riskScore >= 75 ? 'Critical' : riskScore >= 50 ? 'High' : riskScore >= 25 ? 'Medium' : 'Low',
        similarityScore: nameSimilarity,
        indicators: [
          { type: 'App Name Similarity', detail: `App name similarity: ${nameSimilarity}%`, weight: 30, triggered: nameSimilarity >= 60 },
          { type: 'Scam Detection', detail: scamMatches.length ? `Scam phrases: ${scamMatches.join(', ')}` : 'No scam language detected', weight: 25, triggered: scamMatches.length > 0 },
          { type: 'Brand Mimicry', detail: suspiciousKeywords.length ? `Keywords: ${suspiciousKeywords.join(', ')}` : 'No suspicious keywords', weight: 20, triggered: suspiciousKeywords.length > 0 },
        ],
        detectionReasons: [
          nameSimilarity >= 60 ? `App name similarity ${nameSimilarity}%` : null,
          suspiciousKeywords.length ? `Suspicious keywords detected: ${suspiciousKeywords.join(', ')}` : null,
          scamMatches.length ? `Scam language detected: ${scamMatches.join(', ')}` : null,
        ].filter(Boolean),
        isOfficial: false,
        status: 'New',
        analystNotes: '',
        lastScanned: new Date().toISOString(),
        source: candidate.source,
        description: candidate.description,
        publisher: candidate.publisher,
      });
    }
  }

  return detections;
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'brandshield-api',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/brand-profile', (req, res) => {
  res.json(brandProfile);
});

app.post('/api/scan', (req, res) => {
  const detections = buildDetections();
  res.json({
    id: `scan-${Date.now()}`,
    timestamp: new Date().toISOString(),
    totalScanned: socialCandidates.length + appCandidates.length,
    socialScanned: socialCandidates.length,
    appScanned: appCandidates.length,
    threatsDetected: detections.length,
    officialExcluded: 0,
    source: 'Live API Dataset',
    liveSourceAvailable: true,
    detections,
  });
});

app.listen(port, () => {
  console.log(`BrandShield API listening on http://localhost:${port}`);
});

import type {
  BrandProfile,
  CandidateSocial,
  CandidateApp,
  ThreatDetection,
  DetectionIndicator,
  RiskLevel,
  AssetType,
  InvestigationStatus,
} from '@/types';
import { similarityScore, normalizeText } from '@/lib/stringSimilarity';
import { containsSuspiciousSuffix, containsScamPhrase } from '@/lib/suspiciousKeywords';

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 75) return 'Critical';
  if (score >= 50) return 'High';
  if (score >= 25) return 'Medium';
  return 'Low';
}

function isOfficialSocial(candidate: CandidateSocial, profile: BrandProfile): boolean {
  for (const official of profile.officialSocials) {
    if (
      normalizeText(candidate.username) === normalizeText(official.username) ||
      candidate.profileUrl.toLowerCase().trim() === official.url.toLowerCase().trim()
    ) {
      return true;
    }
  }
  return false;
}

function isOfficialApp(candidate: CandidateApp, profile: BrandProfile): boolean {
  for (const official of profile.officialApps) {
    if (
      normalizeText(candidate.appName) === normalizeText(official.appName) &&
      normalizeText(candidate.publisher) === normalizeText(official.publisher)
    ) {
      return true;
    }
    if (
      official.packageId &&
      candidate.packageId &&
      normalizeText(candidate.packageId) === normalizeText(official.packageId)
    ) {
      return true;
    }
    if (candidate.storeUrl.toLowerCase().trim() === official.url.toLowerCase().trim()) {
      return true;
    }
  }
  return false;
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isKnownDomain(url: string, knownDomains: string[]): boolean {
  const domain = extractDomain(url);
  if (!domain) return false;
  return knownDomains.some((d) => domain === d.replace(/^www\./, '') || domain.endsWith('.' + d.replace(/^www\./, '')));
}

function isKnownPublisher(publisher: string, knownPublishers: string[]): boolean {
  const np = normalizeText(publisher);
  return knownPublishers.some((kp) => normalizeText(kp) === np);
}

function buildSocialDetection(
  candidate: CandidateSocial,
  profile: BrandProfile
): ThreatDetection {
  const brandName = profile.companyName;
  const indicators: DetectionIndicator[] = [];
  const reasons: string[] = [];
  let isOfficial = false;
  let similarity = 0;

  // Check official exclusion first
  if (isOfficialSocial(candidate, profile)) {
    isOfficial = true;
    return {
      id: `det-${candidate.id}`,
      candidateId: candidate.id,
      candidateName: candidate.displayName,
      assetType: 'Social Profile' as AssetType,
      platformOrStore: candidate.platform,
      url: candidate.profileUrl,
      riskScore: 0,
      riskLevel: 'Low' as RiskLevel,
      similarityScore: 100,
      indicators: [],
      detectionReasons: ['Official registered asset — excluded from alerts'],
      isOfficial: true,
      status: 'New' as InvestigationStatus,
      analystNotes: '',
      lastScanned: new Date().toISOString(),
      source: candidate.source,
      bio: candidate.bio,
      verified: candidate.verified,
      followerCount: candidate.followerCount,
    };
  }

  // Name similarity
  const nameSim = similarityScore(candidate.displayName, brandName);
  const userSim = similarityScore(candidate.username, brandName);
  similarity = Math.max(nameSim, userSim);

  indicators.push({
    type: 'Name Similarity',
    detail: `Display name "${candidate.displayName}" is ${nameSim}% similar to "${brandName}". Username "${candidate.username}" is ${userSim}% similar.`,
    weight: 25,
    triggered: similarity >= 70,
  });

  if (similarity >= 70) {
    reasons.push(`Name is ${similarity}% similar to brand "${brandName}"`);
  }

  // Suspicious suffix
  const combinedText = `${candidate.displayName} ${candidate.username}`;
  const suffixCheck = containsSuspiciousSuffix(combinedText);
  indicators.push({
    type: 'Suspicious Suffix/Prefix',
    detail: suffixCheck.found
      ? `Found impersonation keywords: ${suffixCheck.matched.join(', ')}`
      : 'No suspicious suffixes detected',
    weight: 20,
    triggered: suffixCheck.found,
  });
  if (suffixCheck.found && similarity >= 50) {
    reasons.push(`Uses impersonation keywords: ${suffixCheck.matched.join(', ')}`);
  }

  // Scam phrases in bio
  const scamCheck = containsScamPhrase(candidate.bio);
  indicators.push({
    type: 'Scam Language',
    detail: scamCheck.found
      ? `Bio contains scam-related phrases: ${scamCheck.matched.join(', ')}`
      : 'No scam phrases detected in bio',
    weight: 25,
    triggered: scamCheck.found,
  });
  if (scamCheck.found) {
    reasons.push(`Bio contains scam language: ${scamCheck.matched.join(', ')}`);
  }

  // URL/domain mismatch
  const urlMatchesOfficialDomain = isKnownDomain(candidate.profileUrl, profile.officialDomains);
  indicators.push({
    type: 'Domain Mismatch',
    detail: urlMatchesOfficialDomain
      ? 'Profile URL matches an official domain'
      : 'Profile URL does not match any official domain',
    weight: 10,
    triggered: !urlMatchesOfficialDomain && similarity >= 60,
  });
  if (!urlMatchesOfficialDomain && similarity >= 60) {
    reasons.push('Profile URL does not match official domains');
  }

  // Verification status
  indicators.push({
    type: 'Verification Status',
    detail: candidate.verified
      ? 'Account is verified by the platform'
      : 'Account is NOT verified by the platform',
    weight: 10,
    triggered: !candidate.verified && similarity >= 60,
  });
  if (!candidate.verified && similarity >= 60) {
    reasons.push('Account is unverified');
  }

  // Logo similarity (if available)
  if (candidate.logoSimilarity !== undefined && candidate.logoSimilarity > 0) {
    indicators.push({
      type: 'Logo Similarity',
      detail: `Logo similarity score: ${candidate.logoSimilarity}%`,
      weight: 15,
      triggered: candidate.logoSimilarity >= 70,
    });
    if (candidate.logoSimilarity >= 70) {
      reasons.push(`Profile logo is ${candidate.logoSimilarity}% similar to official logo`);
    }
  }

  // Calculate risk score
  const totalWeight = indicators.reduce((sum, ind) => sum + ind.weight, 0);
  const triggeredWeight = indicators
    .filter((ind) => ind.triggered)
    .reduce((sum, ind) => sum + ind.weight, 0);
  let riskScore = totalWeight > 0 ? Math.round((triggeredWeight / totalWeight) * 100) : 0;

  // Boost for high similarity + multiple indicators
  const triggeredCount = indicators.filter((ind) => ind.triggered).length;
  if (similarity >= 85 && triggeredCount >= 2) {
    riskScore = Math.min(100, riskScore + 15);
  }
  if (similarity === 100 && !candidate.verified) {
    riskScore = Math.min(100, riskScore + 10);
  }

  // Cap at 0 if no indicators triggered
  if (triggeredCount === 0) riskScore = Math.max(0, riskScore - 20);

  riskScore = Math.max(0, Math.min(100, riskScore));

  if (reasons.length === 0) {
    if (similarity < 50) {
      reasons.push('Low name similarity — unlikely to be impersonation');
    } else {
      reasons.push('Some indicators present — needs manual review');
    }
  }

  return {
    id: `det-${candidate.id}`,
    candidateId: candidate.id,
    candidateName: candidate.displayName,
    assetType: 'Social Profile',
    platformOrStore: candidate.platform,
    url: candidate.profileUrl,
    riskScore,
    riskLevel: riskLevelFromScore(riskScore),
    similarityScore: similarity,
    indicators,
    detectionReasons: reasons,
    isOfficial: false,
    status: 'New',
    analystNotes: '',
    lastScanned: new Date().toISOString(),
    source: candidate.source,
    bio: candidate.bio,
    verified: candidate.verified,
    followerCount: candidate.followerCount,
  };
}

function buildAppDetection(
  candidate: CandidateApp,
  profile: BrandProfile
): ThreatDetection {
  const brandName = profile.companyName;
  const indicators: DetectionIndicator[] = [];
  const reasons: string[] = [];
  let similarity = 0;

  // Check official exclusion
  if (isOfficialApp(candidate, profile)) {
    return {
      id: `det-${candidate.id}`,
      candidateId: candidate.id,
      candidateName: candidate.appName,
      assetType: 'Mobile App',
      platformOrStore: candidate.store,
      url: candidate.storeUrl,
      riskScore: 0,
      riskLevel: 'Low',
      similarityScore: 100,
      indicators: [],
      detectionReasons: ['Official registered app — excluded from alerts'],
      isOfficial: true,
      status: 'New',
      analystNotes: '',
      lastScanned: new Date().toISOString(),
      source: candidate.source,
      description: candidate.description,
      publisher: candidate.publisher,
    };
  }

  // Name similarity
  similarity = similarityScore(candidate.appName, brandName);

  indicators.push({
    type: 'Name Similarity',
    detail: `App name "${candidate.appName}" is ${similarity}% similar to "${brandName}".`,
    weight: 25,
    triggered: similarity >= 70,
  });

  if (similarity >= 70) {
    reasons.push(`App name is ${similarity}% similar to brand "${brandName}"`);
  }

  // Publisher mismatch
  const publisherKnown = isKnownPublisher(candidate.publisher, profile.knownPublishers);
  indicators.push({
    type: 'Publisher Mismatch',
    detail: publisherKnown
      ? `Publisher "${candidate.publisher}" matches a known official publisher`
      : `Publisher "${candidate.publisher}" does not match any known official publisher`,
    weight: 25,
    triggered: !publisherKnown && similarity >= 60,
  });
  if (!publisherKnown && similarity >= 60) {
    reasons.push(`Publisher "${candidate.publisher}" is not an official publisher`);
  }

  // Suspicious suffix in app name
  const suffixCheck = containsSuspiciousSuffix(candidate.appName);
  indicators.push({
    type: 'Suspicious Keywords in Name',
    detail: suffixCheck.found
      ? `App name contains keywords: ${suffixCheck.matched.join(', ')}`
      : 'No suspicious keywords in app name',
    weight: 15,
    triggered: suffixCheck.found,
  });
  if (suffixCheck.found) {
    reasons.push(`App name contains suspicious keywords: ${suffixCheck.matched.join(', ')}`);
  }

  // Scam phrases in description
  const scamCheck = containsScamPhrase(candidate.description);
  indicators.push({
    type: 'Suspicious Description',
    detail: scamCheck.found
      ? `Description contains suspicious phrases: ${scamCheck.matched.join(', ')}`
      : 'No suspicious phrases in description',
    weight: 20,
    triggered: scamCheck.found,
  });
  if (scamCheck.found) {
    reasons.push(`Description contains suspicious language: ${scamCheck.matched.join(', ')}`);
  }

  // Package ID mismatch (if official apps have package IDs)
  const officialPackageIds = profile.officialApps
    .filter((a) => a.packageId)
    .map((a) => a.packageId!);
  let packageMismatch = false;
  if (candidate.packageId && officialPackageIds.length > 0) {
    packageMismatch = !officialPackageIds.some(
      (pid) => normalizeText(pid) === normalizeText(candidate.packageId!)
    );
  }
  indicators.push({
    type: 'Package ID Mismatch',
    detail:
      candidate.packageId && packageMismatch
        ? `Package ID "${candidate.packageId}" differs from official package IDs`
        : 'Package ID matches or is not applicable',
    weight: 10,
    triggered: packageMismatch && similarity >= 60,
  });
  if (packageMismatch && similarity >= 60) {
    reasons.push('Package ID differs from official app');
  }

  // URL check
  const urlMatchesOfficialDomain = isKnownDomain(candidate.storeUrl, profile.officialDomains);
  indicators.push({
    type: 'Store URL Check',
    detail: urlMatchesOfficialDomain
      ? 'Store URL matches an official domain'
      : 'Store URL is from a standard app store',
    weight: 5,
    triggered: false,
  });

  // Calculate risk score
  const totalWeight = indicators.reduce((sum, ind) => sum + ind.weight, 0);
  const triggeredWeight = indicators
    .filter((ind) => ind.triggered)
    .reduce((sum, ind) => sum + ind.weight, 0);
  let riskScore = totalWeight > 0 ? Math.round((triggeredWeight / totalWeight) * 100) : 0;

  const triggeredCount = indicators.filter((ind) => ind.triggered).length;
  if (similarity >= 85 && triggeredCount >= 2) {
    riskScore = Math.min(100, riskScore + 15);
  }
  if (triggeredCount === 0) {
    riskScore = Math.max(0, riskScore - 20);
  }

  riskScore = Math.max(0, Math.min(100, riskScore));

  if (reasons.length === 0) {
    if (similarity < 50) {
      reasons.push('Low name similarity — unlikely to be impersonation');
    } else {
      reasons.push('Some indicators present — needs manual review');
    }
  }

  return {
    id: `det-${candidate.id}`,
    candidateId: candidate.id,
    candidateName: candidate.appName,
    assetType: 'Mobile App',
    platformOrStore: candidate.store,
    url: candidate.storeUrl,
    riskScore,
    riskLevel: riskLevelFromScore(riskScore),
    similarityScore: similarity,
    indicators,
    detectionReasons: reasons,
    isOfficial: false,
    status: 'New',
    analystNotes: '',
    lastScanned: new Date().toISOString(),
    source: candidate.source,
    description: candidate.description,
    publisher: candidate.publisher,
  };
}

export interface ScanOptions {
  socialCandidates: CandidateSocial[];
  appCandidates: CandidateApp[];
  profile: BrandProfile;
  source: string;
  liveSourceAvailable: boolean;
}

export function runScan(options: ScanOptions): ThreatDetection[] {
  const { socialCandidates, appCandidates, profile, source, liveSourceAvailable } = options;
  const detections: ThreatDetection[] = [];

  for (const candidate of socialCandidates) {
    const det = buildSocialDetection(candidate, profile);
    det.source = source;
    det.lastScanned = new Date().toISOString();
    detections.push(det);
  }

  for (const candidate of appCandidates) {
    const det = buildAppDetection(candidate, profile);
    det.source = source;
    det.lastScanned = new Date().toISOString();
    detections.push(det);
  }

  return detections;
}

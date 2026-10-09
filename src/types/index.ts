export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type InvestigationStatus =
  | 'New'
  | 'Investigating'
  | 'Confirmed Threat'
  | 'False Positive'
  | 'Resolved';

export type SocialPlatform =
  | 'Instagram'
  | 'Facebook'
  | 'LinkedIn'
  | 'X'
  | 'YouTube'
  | 'TikTok'
  | 'Telegram'
  | 'Other';

export type AppStore = 'Google Play' | 'Apple App Store' | 'Amazon Appstore' | 'Other';

export type AssetType = 'Social Profile' | 'Mobile App';

export interface OfficialSocialAsset {
  id: string;
  platform: SocialPlatform;
  displayName: string;
  username: string;
  url: string;
  verified: boolean;
}

export interface OfficialAppAsset {
  id: string;
  appName: string;
  store: AppStore;
  publisher: string;
  url: string;
  packageId?: string;
}

export interface BrandProfile {
  id: string;
  companyName: string;
  websiteUrl: string;
  description: string;
  logoDataUrl?: string;
  officialDomains: string[];
  officialSocials: OfficialSocialAsset[];
  officialApps: OfficialAppAsset[];
  knownPublishers: string[];
  updatedAt: string;
}

export interface DetectionIndicator {
  type: string;
  detail: string;
  weight: number;
  triggered: boolean;
}

export interface CandidateSocial {
  id: string;
  platform: SocialPlatform;
  displayName: string;
  username: string;
  profileUrl: string;
  bio: string;
  accountCreatedDate?: string;
  followerCount?: number;
  logoSimilarity?: number;
  verified: boolean;
  source: string;
  lastChecked: string;
}

export interface CandidateApp {
  id: string;
  appName: string;
  store: AppStore;
  packageId?: string;
  publisher: string;
  storeUrl: string;
  description: string;
  iconRef?: string;
  source: string;
  lastChecked: string;
}

export interface ThreatDetection {
  id: string;
  candidateId: string;
  candidateName: string;
  assetType: AssetType;
  platformOrStore: string;
  url: string;
  riskScore: number;
  riskLevel: RiskLevel;
  similarityScore: number;
  indicators: DetectionIndicator[];
  detectionReasons: string[];
  isOfficial: boolean;
  status: InvestigationStatus;
  analystNotes: string;
  lastScanned: string;
  source: string;
  bio?: string;
  description?: string;
  publisher?: string;
  verified?: boolean;
  followerCount?: number;
}

export interface ScanResult {
  id: string;
  timestamp: string;
  totalScanned: number;
  socialScanned: number;
  appScanned: number;
  threatsDetected: number;
  officialExcluded: number;
  source: string;
  liveSourceAvailable: boolean;
  detections: ThreatDetection[];
}

export interface AppSettings {
  nameSimilarityThreshold: number;
  suspiciousKeywordThreshold: number;
  autoExcludeOfficial: boolean;
  demoMode: boolean;
}

export type NavSection =
  | 'Overview'
  | 'Brand Profile'
  | 'Social Monitoring'
  | 'App Monitoring'
  | 'Threat Intelligence'
  | 'Reports'
  | 'About'
  | 'Settings';

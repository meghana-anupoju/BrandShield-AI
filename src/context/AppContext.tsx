import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  BrandProfile,
  ThreatDetection,
  AppSettings,
  InvestigationStatus,
  CandidateSocial,
  CandidateApp,
  NavSection,
  DataSourceStatus,
  ScanHistoryEntry,
} from '@/types';
import { storage } from '@/lib/storage';
import { runScan } from '@/lib/detectionEngine';
import { api } from '@/lib/api';
import {
  DEMO_BRAND_PROFILE,
  DEMO_SOCIAL_CANDIDATES,
  DEMO_APP_CANDIDATES,
} from '@/data/demoData';

interface AppContextValue {
  // Navigation
  activeSection: NavSection;
  setActiveSection: (section: NavSection) => void;

  // Auth / loading
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  isLoading: boolean;

  // Brand profile
  brandProfile: BrandProfile;
  saveBrandProfile: (profile: BrandProfile) => Promise<void>;

  // Detections
  detections: ThreatDetection[];
  runScanning: () => void;
  isScanning: boolean;
  lastScanTime: string | null;
  sourceStatuses: DataSourceStatus[];
  scanHistory: ScanHistoryEntry[];

  // Detection management
  updateDetectionStatus: (id: string, status: InvestigationStatus) => void;
  updateDetectionNotes: (id: string, notes: string) => void;

  // Settings
  settings: AppSettings;
  saveSettings: (settings: AppSettings) => void;

  // Import
  importCandidates: (socials: CandidateSocial[], apps: CandidateApp[]) => Promise<void>;
  importedSocials: CandidateSocial[];
  importedApps: CandidateApp[];

  // Reset
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSection] = useState<NavSection>('Overview');
  const [brandProfile, setBrandProfile] = useState<BrandProfile>(storage.getBrandProfile());
  const [detections, setDetections] = useState<ThreatDetection[]>(storage.getDetections());
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string | null>(storage.getLastScan());
  const [sourceStatuses, setSourceStatuses] = useState<DataSourceStatus[]>([
    { name: 'Built-in demo records', status: 'demo', detail: 'Sample detections are available locally.' },
    { name: 'Bluesky public API', status: 'not_checked', detail: 'Queried only when you run a scan.' },
    { name: 'Apple App Store Search API', status: 'not_checked', detail: 'Queried only when you run a scan.' },
  ]);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(storage.getSettings());
  const [importedSocials, setImportedSocials] = useState<CandidateSocial[]>([]);
  const [importedApps, setImportedApps] = useState<CandidateApp[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try { return localStorage.getItem('brandshield_auth') === 'true'; } catch { return false; }
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadInitialData = useCallback(async () => {
    try {
      const [profile, history] = await Promise.all([api.getBrandProfile(), api.getScanHistory()]);
      if (profile) {
        setBrandProfile(profile);
      }
      setScanHistory(history);
    } catch {
      setSourceStatuses([
        { name: 'Built-in demo records', status: 'demo', detail: 'Using local sample candidates.' },
        { name: 'Backend scan API', status: 'unavailable', detail: 'Could not reach the backend; live providers were not queried.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1800);
    void loadInitialData();
    return () => clearTimeout(timer);
  }, [loadInitialData]);

  const login = useCallback(() => {
    setIsAuthenticated(true);
    try { localStorage.setItem('brandshield_auth', 'true'); } catch { /* ignore */ }
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    try { localStorage.removeItem('brandshield_auth'); } catch { /* ignore */ }
  }, []);

  // Persist brand profile
  useEffect(() => {
    storage.saveBrandProfile(brandProfile);
  }, [brandProfile]);

  // Persist detections
  useEffect(() => {
    storage.saveDetections(detections);
  }, [detections]);

  // Persist settings
  useEffect(() => {
    storage.saveSettings(settings);
  }, [settings]);

  const saveBrandProfile = useCallback(async (profile: BrandProfile) => {
    const updatedProfile = { ...profile, updatedAt: new Date().toISOString() };
    setBrandProfile(updatedProfile);
    storage.saveBrandProfile(updatedProfile);
    await api.saveBrandProfile(updatedProfile);
  }, []);

  const runScanning = useCallback(async () => {
    setIsScanning(true);

    try {
      const scanResult = await api.runScan(settings);
      if (scanResult?.detections) {
        if (scanResult.sourceStatuses) setSourceStatuses(scanResult.sourceStatuses);
        const existingMap = new Map(detections.map((d) => [d.candidateId, d]));
        const merged = scanResult.detections.map((det) => {
          const existing = existingMap.get(det.candidateId);
          if (existing) {
            return {
              ...det,
              status: existing.status,
              analystNotes: existing.analystNotes,
            };
          }
          return det;
        });

        setDetections(merged);
        const now = scanResult.timestamp ?? new Date().toISOString();
        setLastScanTime(now);
        storage.saveLastScan(now);
        setScanHistory((history) => [{
          ...scanResult,
          timestamp: now,
        }, ...history.filter((scan) => scan.id !== scanResult.id)].slice(0, 20));
        setIsScanning(false);
        return;
      }
    } catch {
      setSourceStatuses([
        { name: 'Built-in demo records', status: 'demo', detail: 'Using local sample candidates.' },
        { name: 'Backend scan API', status: 'unavailable', detail: 'Could not reach the backend; live providers were not queried.' },
      ]);
    }

    // Simulate scan delay for UX
    setTimeout(() => {
      const socialCandidates = [...(settings.demoMode ? DEMO_SOCIAL_CANDIDATES : []), ...importedSocials];
      const appCandidates = [...(settings.demoMode ? DEMO_APP_CANDIDATES : []), ...importedApps];

      // Merge existing notes/statuses with new detections
      const existingMap = new Map(detections.map((d) => [d.candidateId, d]));

      const newDetections = runScan({
        socialCandidates,
        appCandidates,
        profile: brandProfile,
        source: settings.demoMode ? 'Demo Dataset' : 'Imported Dataset',
        liveSourceAvailable: false,
      });

      const merged = newDetections.map((det) => {
        const existing = existingMap.get(det.candidateId);
        if (existing) {
          return {
            ...det,
            status: existing.status,
            analystNotes: existing.analystNotes,
          };
        }
        return det;
      });

      setDetections(merged);
      setSourceStatuses([
        ...(settings.demoMode
          ? [{ name: 'Built-in demo records', status: 'demo' as const, detail: 'Sample candidate records included in this scan.' }]
          : []),
        { name: 'Imported analyst dataset', status: 'demo', detail: `${importedSocials.length} social and ${importedApps.length} app records` },
        { name: 'External provider APIs', status: 'unavailable', detail: 'Backend unavailable; external searches were not run.' },
      ]);
      const now = new Date().toISOString();
      setLastScanTime(now);
      storage.saveLastScan(now);
      setIsScanning(false);
    }, 1200);
  }, [importedSocials, importedApps, brandProfile, detections, settings]);

  const updateDetectionStatus = useCallback((id: string, status: InvestigationStatus) => {
    setDetections((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status } : d))
    );
  }, []);

  const updateDetectionNotes = useCallback((id: string, notes: string) => {
    setDetections((prev) =>
      prev.map((d) => (d.id === id ? { ...d, analystNotes: notes } : d))
    );
  }, []);

  const saveSettings = useCallback((s: AppSettings) => {
    setSettings(s);
  }, []);

  const importCandidates = useCallback(async (socials: CandidateSocial[], apps: CandidateApp[]) => {
    await api.saveCandidates(socials, apps);
    setImportedSocials((prev) => [...prev, ...socials]);
    setImportedApps((prev) => [...prev, ...apps]);
  }, []);

  const resetDemoData = useCallback(() => {
    storage.resetAll();
    setBrandProfile(DEMO_BRAND_PROFILE);
    setDetections([]);
    setLastScanTime(null);
    setImportedSocials([]);
    setImportedApps([]);
    setSettings(storage.getSettings());
  }, []);

  return (
    <AppContext.Provider
      value={{
        activeSection,
        setActiveSection,
        isAuthenticated,
        login,
        logout,
        isLoading,
        brandProfile,
        saveBrandProfile,
        detections,
        runScanning,
        isScanning,
        lastScanTime,
        sourceStatuses,
        scanHistory,
        updateDetectionStatus,
        updateDetectionNotes,
        settings,
        saveSettings,
        importCandidates,
        importedSocials,
        importedApps,
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

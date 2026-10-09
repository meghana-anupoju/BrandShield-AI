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
  saveBrandProfile: (profile: BrandProfile) => void;

  // Detections
  detections: ThreatDetection[];
  runScanning: () => void;
  isScanning: boolean;
  lastScanTime: string | null;

  // Detection management
  updateDetectionStatus: (id: string, status: InvestigationStatus) => void;
  updateDetectionNotes: (id: string, notes: string) => void;

  // Settings
  settings: AppSettings;
  saveSettings: (settings: AppSettings) => void;

  // Import
  importCandidates: (socials: CandidateSocial[], apps: CandidateApp[]) => void;
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
  const [settings, setSettings] = useState<AppSettings>(storage.getSettings());
  const [importedSocials, setImportedSocials] = useState<CandidateSocial[]>([]);
  const [importedApps, setImportedApps] = useState<CandidateApp[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try { return localStorage.getItem('brandshield_auth') === 'true'; } catch { return false; }
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadInitialData = useCallback(async () => {
    try {
      const profile = await api.getBrandProfile();
      if (profile) {
        setBrandProfile(profile);
      }

      const scan = await api.runScan();
      if (scan?.detections) {
        setDetections(scan.detections);
        if (scan.timestamp) {
          setLastScanTime(scan.timestamp);
          storage.saveLastScan(scan.timestamp);
        }
      }
    } catch {
      // Fall back to local demo data when the API is unavailable.
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

  const saveBrandProfile = useCallback((profile: BrandProfile) => {
    setBrandProfile({ ...profile, updatedAt: new Date().toISOString() });
  }, []);

  const runScanning = useCallback(async () => {
    setIsScanning(true);

    try {
      const scanResult = await api.runScan();
      if (scanResult?.detections) {
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
        setIsScanning(false);
        return;
      }
    } catch {
      // Fallback to the local scan engine when the API is unavailable.
    }

    // Simulate scan delay for UX
    setTimeout(() => {
      const socialCandidates = [...DEMO_SOCIAL_CANDIDATES, ...importedSocials];
      const appCandidates = [...DEMO_APP_CANDIDATES, ...importedApps];

      // Merge existing notes/statuses with new detections
      const existingMap = new Map(detections.map((d) => [d.candidateId, d]));

      const newDetections = runScan({
        socialCandidates,
        appCandidates,
        profile: brandProfile,
        source: 'Demo Dataset',
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
      const now = new Date().toISOString();
      setLastScanTime(now);
      storage.saveLastScan(now);
      setIsScanning(false);
    }, 1200);
  }, [importedSocials, importedApps, brandProfile, detections]);

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

  const importCandidates = useCallback((socials: CandidateSocial[], apps: CandidateApp[]) => {
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

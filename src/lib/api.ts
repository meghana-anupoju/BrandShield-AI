import type { AppSettings, BrandProfile, CandidateApp, CandidateSocial, ScanHistoryEntry, ScanResult } from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  getBrandProfile: () => request<BrandProfile | null>('/api/brand-profile'),
  saveBrandProfile: (profile: BrandProfile) =>
    request<BrandProfile>('/api/brand-profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    }),
  saveCandidates: (socials: CandidateSocial[], apps: CandidateApp[]) =>
    request<{ importedSocials: number; importedApps: number }>('/api/candidates', {
      method: 'POST',
      body: JSON.stringify({ socials, apps }),
    }),
  runScan: (settings?: AppSettings) => request<ScanResult>('/api/scan', {
    method: 'POST',
    body: settings ? JSON.stringify({ settings }) : undefined,
  }),
  getScanHistory: () => request<ScanHistoryEntry[]>('/api/scans?limit=20'),
  getScan: (id: string) => request<ScanResult>(`/api/scans/${encodeURIComponent(id)}`),
  getHealth: () => request<{ status: string; service: string; timestamp: string }>('/api/health'),
};

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
  getBrandProfile: () => request<{ id: string; companyName: string; [key: string]: unknown } | null>('/api/brand-profile'),
  runScan: () =>
    request<{
      id: string;
      timestamp: string;
      totalScanned: number;
      socialScanned: number;
      appScanned: number;
      threatsDetected: number;
      officialExcluded: number;
      source: string;
      liveSourceAvailable: boolean;
      detections: unknown[];
    }>('/api/scan', { method: 'POST' }),
  getHealth: () => request<{ status: string; service: string; timestamp: string }>('/api/health'),
};

import { useState, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Sliders,
  Upload,
  Database,
  AlertTriangle,
  RotateCcw,
  Info,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Toast } from '@/components/shared/Toast';
import { ConfirmDialog } from '@/components/shared/Toast';
import type { AppSettings, CandidateSocial, CandidateApp } from '@/types';

export function SettingsPage() {
  const { settings, saveSettings, resetDemoData, importCandidates, detections, brandProfile } = useApp();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showReset, setShowReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function showToast(type: 'success' | 'error' | 'info', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  function handleSaveSettings() {
    saveSettings(localSettings);
    showToast('success', 'Settings saved');
  }

  function handleReset() {
    resetDemoData();
    setShowReset(false);
    showToast('info', 'All data reset to defaults');
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'File must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        const socials: CandidateSocial[] = (data.socials || []).map((s: Record<string, unknown>, i: number) => ({
          id: `import-soc-${Date.now()}-${i}`,
          platform: s.platform as CandidateSocial['platform'],
          displayName: s.displayName as string,
          username: s.username as string,
          profileUrl: s.profileUrl as string,
          bio: (s.bio as string) || '',
          verified: (s.verified as boolean) || false,
          source: 'Imported',
          lastChecked: new Date().toISOString(),
          followerCount: s.followerCount as number | undefined,
          accountCreatedDate: s.accountCreatedDate as string | undefined,
          logoSimilarity: s.logoSimilarity as number | undefined,
        }));
        const apps: CandidateApp[] = (data.apps || []).map((a: Record<string, unknown>, i: number) => ({
          id: `import-app-${Date.now()}-${i}`,
          appName: a.appName as string,
          store: a.store as CandidateApp['store'],
          publisher: a.publisher as string,
          storeUrl: a.storeUrl as string,
          description: (a.description as string) || '',
          packageId: a.packageId as string | undefined,
          source: 'Imported',
          lastChecked: new Date().toISOString(),
        }));

        importCandidates(socials, apps);
        showToast('success', `Imported ${socials.length} social profiles and ${apps.length} apps`);
      } catch {
        showToast('error', 'Invalid JSON file format');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {toast && <Toast type={toast.type} message={toast.message} />}
      <ConfirmDialog
        open={showReset}
        title="Reset All Data?"
        message="This will reset the brand profile, all detections, settings, and imported data back to defaults. This cannot be undone."
        confirmLabel="Reset Everything"
        onConfirm={handleReset}
        onCancel={() => setShowReset(false)}
      />

      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
        <p className="text-slate-400 text-sm">Configure detection thresholds and data sources</p>
      </div>

      {/* Detection thresholds */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sliders size={18} className="text-sky-400" />
          <h2 className="text-sm font-semibold text-white">Detection Thresholds</h2>
        </div>

        <div className="space-y-5">
          <div>
            <label className="flex items-center justify-between text-sm text-slate-300 mb-2">
              <span>Name Similarity Threshold</span>
              <span className="text-sky-400 font-mono">{localSettings.nameSimilarityThreshold}%</span>
            </label>
            <input
              type="range"
              min={50}
              max={95}
              value={localSettings.nameSimilarityThreshold}
              onChange={(e) => setLocalSettings((s) => ({ ...s, nameSimilarityThreshold: parseInt(e.target.value) }))}
              className="w-full accent-sky-500"
            />
            <p className="text-xs text-slate-500 mt-1">Minimum similarity score to flag a candidate for review</p>
          </div>

          <div>
            <label className="flex items-center justify-between text-sm text-slate-300 mb-2">
              <span>Suspicious Keyword Threshold</span>
              <span className="text-sky-400 font-mono">{localSettings.suspiciousKeywordThreshold}%</span>
            </label>
            <input
              type="range"
              min={25}
              max={90}
              value={localSettings.suspiciousKeywordThreshold}
              onChange={(e) => setLocalSettings((s) => ({ ...s, suspiciousKeywordThreshold: parseInt(e.target.value) }))}
              className="w-full accent-sky-500"
            />
            <p className="text-xs text-slate-500 mt-1">Minimum risk score to trigger keyword-based alerts</p>
          </div>

          <div>
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={localSettings.autoExcludeOfficial}
                onChange={(e) => setLocalSettings((s) => ({ ...s, autoExcludeOfficial: e.target.checked }))}
                className="accent-sky-500 w-4 h-4"
              />
              Automatically exclude official assets from alerts
            </label>
            <p className="text-xs text-slate-500 mt-1 ml-7">Official assets take precedence over fuzzy similarity scoring</p>
          </div>

          <div>
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={localSettings.demoMode}
                onChange={(e) => setLocalSettings((s) => ({ ...s, demoMode: e.target.checked }))}
                className="accent-sky-500 w-4 h-4"
              />
              Demo mode (use synthetic data)
            </label>
            <p className="text-xs text-slate-500 mt-1 ml-7">When enabled, the app uses demo data instead of live API sources</p>
          </div>

          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors flex items-center gap-1.5"
          >
            <Save size={16} /> Save Settings
          </button>
        </div>
      </div>

      {/* Data import */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload size={18} className="text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">Import Candidate Data</h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Import candidate social profiles and mobile apps from a JSON file for testing. The file should contain a <code className="text-sky-400">{"{ socials: [...], apps: [...] }"}</code> structure.
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors flex items-center gap-1.5"
        >
          <Upload size={16} /> Choose JSON File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportFile}
        />
        <div className="mt-4 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
          <p className="text-xs text-slate-400">
            <Info size={12} className="inline mr-1" />
            Expected JSON format: <code className="text-sky-400">{"{ \"socials\": [{ \"platform\": \"Instagram\", \"displayName\": \"...\", \"username\": \"...\", \"profileUrl\": \"...\", \"bio\": \"...\" }], \"apps\": [{ \"appName\": \"...\", \"store\": \"Google Play\", \"publisher\": \"...\", \"storeUrl\": \"...\", \"description\": \"...\" }]"}</code>
          </p>
        </div>
      </div>

      {/* Data source status */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database size={18} className="text-violet-400" />
          <h2 className="text-sm font-semibold text-white">Data Source Status</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span className="text-sm text-slate-200">Demo Dataset</span>
            </div>
            <span className="text-xs text-emerald-400">Available</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-3">
              <AlertTriangle size={16} className="text-amber-400" />
              <span className="text-sm text-slate-200">Live API Sources</span>
            </div>
            <span className="text-xs text-amber-400">Not configured</span>
          </div>
          <div className="px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <p className="text-xs text-amber-300/80">
              <Info size={12} className="inline mr-1" />
              Live source unavailable — demo dataset remains available. Configure external API integrations to enable live monitoring.
            </p>
          </div>
        </div>
      </div>

      {/* System info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon size={18} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-white">System Information</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="px-3 py-2 rounded-lg bg-slate-800/50">
            <p className="text-xs text-slate-400">Brand</p>
            <p className="text-white font-medium">{brandProfile.companyName}</p>
          </div>
          <div className="px-3 py-2 rounded-lg bg-slate-800/50">
            <p className="text-xs text-slate-400">Total Detections</p>
            <p className="text-white font-medium">{detections.length}</p>
          </div>
          <div className="px-3 py-2 rounded-lg bg-slate-800/50">
            <p className="text-xs text-slate-400">Official Socials</p>
            <p className="text-white font-medium">{brandProfile.officialSocials.length}</p>
          </div>
          <div className="px-3 py-2 rounded-lg bg-slate-800/50">
            <p className="text-xs text-slate-400">Official Apps</p>
            <p className="text-white font-medium">{brandProfile.officialApps.length}</p>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-slate-900 border border-red-500/20 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={18} className="text-red-400" />
          <h2 className="text-sm font-semibold text-white">Danger Zone</h2>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Reset all data including brand profile, detections, notes, and settings back to defaults.
        </p>
        <button
          onClick={() => setShowReset(true)}
          className="px-4 py-2 rounded-lg bg-red-600/20 text-red-400 text-sm font-medium hover:bg-red-600/30 transition-colors flex items-center gap-1.5 border border-red-500/30"
        >
          <RotateCcw size={16} /> Reset All Data
        </button>
      </div>
    </div>
  );
}

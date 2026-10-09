import { useState } from 'react';
import {
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Info,
  FileText,
  Save,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Drawer } from '@/components/shared/Drawer';
import { RiskBadge, StatusBadge } from '@/components/shared/Badges';
import { Toast } from '@/components/shared/Toast';
import type { ThreatDetection, InvestigationStatus } from '@/types';

const STATUS_OPTIONS: InvestigationStatus[] = [
  'New',
  'Investigating',
  'Confirmed Threat',
  'False Positive',
  'Resolved',
];

export function ThreatDetailDrawer({
  detection,
  open,
  onClose,
}: {
  detection: ThreatDetection | null;
  open: boolean;
  onClose: () => void;
}) {
  const { updateDetectionStatus, updateDetectionNotes, runScanning, isScanning } = useApp();
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  if (!detection) return null;

  function showToast(type: 'success' | 'info', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  }

  function handleStatusChange(status: InvestigationStatus) {
    updateDetectionStatus(detection!.id, status);
    showToast('success', `Status updated to "${status}"`);
  }

  function handleSaveNotes() {
    updateDetectionNotes(detection!.id, notes);
    showToast('success', 'Analyst notes saved');
  }

  return (
    <>
      {toast && <Toast type={toast.type} message={toast.message} />}
      <Drawer open={open} onClose={onClose} title="Threat Detail">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-start gap-3 mb-3">
              <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                detection.isOfficial ? 'bg-emerald-500/10' : detection.riskLevel === 'Critical' || detection.riskLevel === 'High'
                  ? 'bg-red-500/10' : 'bg-amber-500/10'
              }`}>
                {detection.isOfficial ? (
                  <CheckCircle2 size={24} className="text-emerald-400" />
                ) : (
                  <AlertTriangle size={24} className={detection.riskLevel === 'Critical' || detection.riskLevel === 'High' ? 'text-red-400' : 'text-amber-400'} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-white truncate">{detection.candidateName}</h3>
                <p className="text-xs text-slate-400">{detection.assetType} · {detection.platformOrStore}</p>
                <div className="flex items-center gap-2 mt-2">
                  <RiskBadge level={detection.riskLevel} />
                  <span className="text-xs text-slate-400">Score: {detection.riskScore}/100</span>
                  <StatusBadge status={detection.status} />
                </div>
              </div>
            </div>
          </div>

          {/* Official banner */}
          {detection.isOfficial && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300">
              <CheckCircle2 size={16} />
              This is a registered official asset and has been excluded from impersonation alerts.
            </div>
          )}

          {/* URL */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Profile / Store URL</h4>
            <a
              href={detection.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 break-all"
            >
              <ExternalLink size={14} className="flex-shrink-0" />
              {detection.url}
            </a>
          </div>

          {/* Bio / Description */}
          {(detection.bio || detection.description) && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {detection.assetType === 'Social Profile' ? 'Bio' : 'Description'}
              </h4>
              <p className="text-sm text-slate-300 bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                {detection.bio || detection.description}
              </p>
            </div>
          )}

          {/* Additional info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <p className="text-xs text-slate-400">Similarity Score</p>
              <p className="text-lg font-bold text-white">{detection.similarityScore}%</p>
            </div>
            {detection.verified !== undefined && (
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                <p className="text-xs text-slate-400">Verified</p>
                <p className="text-lg font-bold text-white">{detection.verified ? 'Yes' : 'No'}</p>
              </div>
            )}
            {detection.followerCount !== undefined && (
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                <p className="text-xs text-slate-400">Followers</p>
                <p className="text-lg font-bold text-white">{detection.followerCount.toLocaleString()}</p>
              </div>
            )}
            {detection.publisher && (
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                <p className="text-xs text-slate-400">Publisher</p>
                <p className="text-sm font-bold text-white truncate">{detection.publisher}</p>
              </div>
            )}
          </div>

          {/* Detection reasons */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Detection Reasons</h4>
            <div className="space-y-2">
              {detection.detectionReasons.map((reason, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-300 bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                  <Info size={14} className="text-sky-400 flex-shrink-0 mt-0.5" />
                  {reason}
                </div>
              ))}
            </div>
          </div>

          {/* Evidence indicators */}
          {!detection.isOfficial && detection.indicators.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Evidence Indicators</h4>
              <div className="space-y-2">
                {detection.indicators.map((ind, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 text-sm rounded-lg p-3 border ${
                      ind.triggered
                        ? 'bg-red-500/5 border-red-500/20 text-slate-200'
                        : 'bg-slate-800/30 border-slate-700/30 text-slate-400'
                    }`}
                  >
                    {ind.triggered ? (
                      <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 size={14} className="text-emerald-400/50 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium">{ind.type}</p>
                      <p className="text-xs mt-0.5 opacity-80">{ind.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status management */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Investigation Status</h4>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    detection.status === status
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Analyst notes */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Analyst Notes</h4>
            <textarea
              value={notes || detection.analystNotes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add investigation notes..."
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:border-sky-500 focus:outline-none resize-none"
            />
            <button
              onClick={handleSaveNotes}
              className="mt-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Save size={14} /> Save Notes
            </button>
          </div>

          {/* Source info */}
          <div className="flex items-center gap-2 text-xs text-slate-500 border-t border-slate-800 pt-4">
            <FileText size={12} />
            Source: {detection.source} · Last scanned: {new Date(detection.lastScanned).toLocaleString()}
          </div>

          {/* Rescan */}
          <button
            onClick={() => { runScanning(); onClose(); }}
            disabled={isScanning}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RotateCcw size={16} /> Rescan All
          </button>
        </div>
      </Drawer>
    </>
  );
}

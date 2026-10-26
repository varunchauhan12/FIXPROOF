"use client";

import React, { useState, useRef } from "react";
import {
  Search,
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Shield,
  Layers,
  FileVideo,
  ExternalLink,
  Activity,
  Zap,
  ArrowRight,
  Database,
  RefreshCw,
  XCircle,
  Clock,
  ShieldAlert,
} from "lucide-react";
import {
  AssetRecord,
  VaultStatus,
  MatchAnalysisResult,
  ScanLifecycleState,
} from "@/lib/types";
import { scanSuspectVideo, formatBytes } from "@/lib/api";

interface ThreatHunterProps {
  assets: AssetRecord[];
  vaultStatus: VaultStatus | null;
  onNavigateToVault: () => void;
  onViewIncident: (incident: MatchAnalysisResult) => void;
}

interface ScanEvent {
  id: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "match" | "error";
  text: string;
}

export const ThreatHunter: React.FC<ThreatHunterProps> = ({
  assets,
  vaultStatus,
  onNavigateToVault,
  onViewIncident,
}) => {
  const [suspectFile, setSuspectFile] = useState<File | null>(null);
  const [scanState, setScanState] = useState<ScanLifecycleState>("idle");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [scanError, setScanError] = useState<string>("");
  const [scanResult, setScanResult] = useState<MatchAnalysisResult | null>(null);
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const indexedAssetsCount = assets.filter((a) => a.indexed).length;
  const isVaultReady = (vaultStatus?.vault_size ?? 0) > 0 && indexedAssetsCount > 0;

  const isScanActive =
    scanState === "uploading" ||
    scanState === "processing" ||
    scanState === "matching" ||
    scanState === "finalizing";

  const addEvent = (type: ScanEvent["type"], text: string) => {
    const newEvent: ScanEvent = {
      id: Math.random().toString(36).substring(2),
      timestamp: new Date().toLocaleTimeString(),
      type,
      text,
    };
    setEvents((prev) => [newEvent, ...prev]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isScanActive) return; // Prevent file change while scan is active

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSuspectFile(file);
      // Immediately clear any previous scan results or errors to prevent stale output
      setScanResult(null);
      setScanError("");
      setScanState("idle");
      setUploadProgress(0);
    }
  };

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspectFile || isScanActive) return;

    // Reset scan state completely before launching
    setScanResult(null);
    setScanError("");
    setEvents([]);
    setUploadProgress(0);
    setScanState("uploading");

    addEvent(
      "info",
      `Initiated forensic investigation for: ${suspectFile.name} (${formatBytes(suspectFile.size)})`
    );

    try {
      const result = await scanSuspectVideo(suspectFile, (progress) => {
        setUploadProgress(progress);
        if (progress >= 100) {
          setScanState("processing");
          addEvent("info", "Upload complete (100%). Server decoding stream and extracting frames...");
        }
      });

      // Scan completed successfully
      setScanState("completed");
      setScanResult(result);

      if (result.overall_status === "CANDIDATE_MATCH") {
        addEvent(
          "match",
          `⚠️ Confirmed ${result.candidate_matches_found} candidate visual match(es) with highest confidence of ${result.highest_confidence}% (Lowest L2: ${result.lowest_l2_distance?.toFixed(4)})`
        );
      } else if (result.overall_status === "SUSPECT") {
        addEvent(
          "warning",
          `Visual proximity match detected (${result.highest_confidence}% confidence, Lowest L2: ${result.lowest_l2_distance?.toFixed(4)})`
        );
      } else if (result.overall_status === "NO_REFERENCE_DATA") {
        addEvent(
          "warning",
          "Reference vault is empty. No reference vectors were available for comparison."
        );
      } else {
        addEvent(
          "success",
          `Forensic investigation complete: CLEAN. No visual matches found across ${result.total_frames_analyzed} frames.`
        );
      }

      addEvent(
        "info",
        `Forensic dossier recorded with incident ID: ${result.incident_id || "registered"}`
      );
    } catch (err: any) {
      // Scan failed
      const errorMessage =
        err?.message || "Threat scan failed. Check if the FixProof backend is running.";
      setScanState("failed");
      setScanError(errorMessage);
      setScanResult(null);
      addEvent("error", `Investigation failed: ${errorMessage}`);
    }
  };

  const handleResetScan = () => {
    setScanState("idle");
    setScanError("");
    setScanResult(null);
    setUploadProgress(0);
  };

  return (
    <div
      style={{
        background: "#090d16",
        borderRadius: 24,
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
      className="p-6 text-slate-100 max-w-7xl mx-auto space-y-6"
    >
      {/* ─── Top Operational Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-2 h-2 rounded-full ${
                isScanActive
                  ? "bg-amber-400 animate-ping"
                  : scanState === "completed"
                  ? "bg-teal-400"
                  : "bg-amber-500"
              }`}
            />
            <h2 className="text-[17px] font-extrabold text-white m-0">
              Sentinel Threat Hunter
            </h2>
          </div>
          <p className="text-[12px] text-slate-400 m-0">
            Automated visual similarity & perceptual hash forensics against official vault.
          </p>
        </div>

        {/* Vault Status Indicator */}
        <div
          style={{
            background: isVaultReady ? "rgba(13, 148, 136, 0.12)" : "rgba(245, 158, 11, 0.12)",
            border: `1px solid ${
              isVaultReady ? "rgba(13, 148, 136, 0.3)" : "rgba(245, 158, 11, 0.3)"
            }`,
            color: isVaultReady ? "#2dd4bf" : "#fbbf24",
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-bold"
        >
          <Database size={14} />
          <span>
            {isVaultReady
              ? `Targeting ${vaultStatus?.vault_size} vectors across ${indexedAssetsCount} registered assets`
              : "Vault is empty — Please register official footage"}
          </span>
        </div>
      </div>

      {/* Vault Empty Callout */}
      {!isVaultReady && (
        <div
          style={{
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
          }}
          className="p-4 rounded-xl flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-400 shrink-0" size={20} />
            <p className="text-[12px] text-amber-200 m-0">
              No official reference videos have been indexed into the FAISS vault yet. Threat Hunter needs at least one registered reference asset to compare suspect video against.
            </p>
          </div>
          <button
            onClick={onNavigateToVault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-extrabold shrink-0 transition-colors"
          >
            <span>Go to Asset Vault</span>
            <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* ─── Suspect Video Submission Control ─── */}
      <div
        style={{
          background: "#0f172a",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 18,
        }}
        className="p-5"
      >
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-400 mb-3">
          Submit Suspect Stream / Clip For Scanning
        </h3>

        <form onSubmit={handleStartScan} className="flex flex-col sm:flex-row gap-3">
          <div
            onClick={() => {
              if (!isScanActive) fileInputRef.current?.click();
            }}
            style={{
              border: suspectFile
                ? "1px solid #f59e0b"
                : "1px dashed rgba(255, 255, 255, 0.2)",
              background: "#1e293b",
              cursor: isScanActive ? "not-allowed" : "pointer",
              opacity: isScanActive ? 0.7 : 1,
            }}
            className="flex-1 px-4 py-3 rounded-xl flex items-center gap-3 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.mov,.avi,.mkv,.webm"
              onChange={handleFileChange}
              disabled={isScanActive}
              className="hidden"
            />
            <FileVideo size={20} className={suspectFile ? "text-amber-400" : "text-slate-400"} />
            <span className="text-[12px] text-slate-200 truncate font-medium">
              {suspectFile
                ? `${suspectFile.name} (${formatBytes(suspectFile.size)})`
                : "Select suspect video to inspect..."}
            </span>
          </div>

          <button
            type="submit"
            disabled={!suspectFile || isScanActive}
            style={{
              background:
                !suspectFile || isScanActive
                  ? "rgba(255, 255, 255, 0.1)"
                  : "linear-gradient(135deg, #f59e0b, #d97706)",
              boxShadow: !suspectFile || isScanActive ? "none" : "0 0 20px rgba(245, 158, 11, 0.3)",
            }}
            className="px-6 py-3 rounded-xl font-bold text-[13px] text-white flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:text-slate-500 transition-all shrink-0"
          >
            {isScanActive ? (
              <>
                <Loader2 size={15} className="animate-spin-smooth" />
                <span>
                  {scanState === "uploading"
                    ? `Uploading (${uploadProgress}%)...`
                    : "Investigating..."}
                </span>
              </>
            ) : (
              <>
                <Search size={15} />
                <span>Launch Scan</span>
              </>
            )}
          </button>
        </form>

        {/* Failed Scan Error Banner */}
        {scanState === "failed" && scanError && (
          <div className="mt-3 p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-red-300 text-[12px] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 truncate">
              <AlertTriangle size={16} className="text-red-400 shrink-0" />
              <span className="truncate">{scanError}</span>
            </div>
            <button
              onClick={handleResetScan}
              className="px-2.5 py-1 rounded-lg bg-red-900/60 hover:bg-red-900 text-red-200 text-[11px] font-bold shrink-0 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* ─── Main Investigation Layout (Left: Workflow & Results, Right: Audit Log) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Investigation Workflow & Match Result (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 18,
            }}
            className="p-5"
          >
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-4">
              Forensic Detection Pipeline
            </h4>

            {/* Pipeline Stage Steps */}
            <div className="space-y-3">
              {[
                {
                  step: 1,
                  key: "ingest",
                  label: "Ingest Suspect Clip",
                  desc: "Stream chunks to forensic storage",
                  active: scanState === "uploading",
                  done: ["processing", "matching", "finalizing", "completed"].includes(scanState),
                },
                {
                  step: 2,
                  key: "sampling",
                  label: "Temporal Sampling",
                  desc: "Extract keyframe images every 5s",
                  active: scanState === "processing",
                  done: ["matching", "finalizing", "completed"].includes(scanState),
                },
                {
                  step: 3,
                  key: "faiss",
                  label: "FAISS L2 Similarity Search",
                  desc: "MobileNetV3 576-dim feature distance",
                  active: scanState === "matching" || (scanState === "processing" && uploadProgress >= 100),
                  done: ["finalizing", "completed"].includes(scanState),
                },
                {
                  step: 4,
                  key: "phash",
                  label: "Perceptual Hash Cross-Check",
                  desc: "pHash hamming distance verification",
                  active: scanState === "finalizing",
                  done: scanState === "completed",
                },
              ].map((item) => {
                const isPassed = item.done;
                const isCurrent = item.active;

                return (
                  <div
                    key={item.key}
                    style={{
                      background: isCurrent
                        ? "rgba(245, 158, 11, 0.08)"
                        : isPassed
                        ? "rgba(13, 148, 136, 0.08)"
                        : "#1e293b",
                      border: `1px solid ${
                        isCurrent
                          ? "rgba(245, 158, 11, 0.3)"
                          : isPassed
                          ? "rgba(13, 148, 136, 0.3)"
                          : "rgba(255, 255, 255, 0.04)"
                      }`,
                    }}
                    className="p-3 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: isPassed
                            ? "#0d9488"
                            : isCurrent
                            ? "#f59e0b"
                            : "#334155",
                          color: "#ffffff",
                        }}
                        className="flex items-center justify-center text-[11px] font-black shrink-0"
                      >
                        {isPassed ? <CheckCircle2 size={14} /> : item.step}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-white m-0 leading-tight">
                          {item.label}
                        </p>
                        <p className="text-[11px] text-slate-400 m-0">{item.desc}</p>
                      </div>
                    </div>

                    {isCurrent && (
                      <div className="flex items-center gap-2">
                        {item.key === "ingest" && uploadProgress > 0 && uploadProgress < 100 && (
                          <span className="text-[11px] font-mono font-bold text-amber-400">
                            {uploadProgress}%
                          </span>
                        )}
                        <Loader2 size={16} className="text-amber-400 animate-spin-smooth shrink-0" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Neutral In-Flight Processing State (Shown strictly while active) ─── */}
          {isScanActive && (
            <div
              style={{
                background: "rgba(30, 41, 59, 0.6)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                borderRadius: 18,
              }}
              className="p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="text-amber-400 animate-spin-smooth" />
                  <span className="text-[12px] font-extrabold uppercase tracking-wider text-amber-300">
                    {scanState === "uploading"
                      ? "Uploading Video Stream"
                      : "Forensic Analysis in Progress"}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  State: {scanState.toUpperCase()}
                </span>
              </div>

              {scanState === "uploading" && (
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Transferring suspect video chunks to backend</span>
                    <span className="font-mono text-amber-400 font-bold">{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${uploadProgress}%` }}
                      className="h-full bg-amber-500 rounded-full transition-all duration-200"
                    />
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400 m-0 leading-relaxed">
                Evaluating temporal frames against MobileNetV3 reference embeddings. A final forensic outcome (CANDIDATE MATCH, SUSPECT, or CLEAN) is rendered only after all frames are verified.
              </p>
            </div>
          )}

          {/* ─── Results Summary Card (Shown ONLY on Completed Scan) ─── */}
          {scanState === "completed" && scanResult && (
            <div
              style={{
                background:
                  scanResult.overall_status === "CANDIDATE_MATCH"
                    ? "rgba(239, 68, 68, 0.08)"
                    : scanResult.overall_status === "SUSPECT"
                    ? "rgba(245, 158, 11, 0.08)"
                    : scanResult.overall_status === "NO_REFERENCE_DATA"
                    ? "rgba(100, 116, 139, 0.08)"
                    : "rgba(13, 148, 136, 0.08)",
                border: `1px solid ${
                  scanResult.overall_status === "CANDIDATE_MATCH"
                    ? "rgba(239, 68, 68, 0.3)"
                    : scanResult.overall_status === "SUSPECT"
                    ? "rgba(245, 158, 11, 0.3)"
                    : scanResult.overall_status === "NO_REFERENCE_DATA"
                    ? "rgba(100, 116, 139, 0.3)"
                    : "rgba(13, 148, 136, 0.3)"
                }`,
                borderRadius: 18,
              }}
              className="p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Forensic Outcome
                </span>
                <span
                  style={{
                    background:
                      scanResult.overall_status === "CANDIDATE_MATCH"
                        ? "#ef4444"
                        : scanResult.overall_status === "SUSPECT"
                        ? "#f59e0b"
                        : scanResult.overall_status === "NO_REFERENCE_DATA"
                        ? "#64748b"
                        : "#0d9488",
                  }}
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase text-white tracking-wider"
                >
                  {scanResult.overall_status.replace(/_/g, " ")}
                </span>
              </div>

              {scanResult.overall_status === "NO_REFERENCE_DATA" ? (
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-[12px] text-slate-300 space-y-2 mb-4">
                  <p className="font-bold text-white m-0">No Reference Vault Data</p>
                  <p className="text-slate-400 m-0">
                    {scanResult.message ||
                      "The reference vault is empty or contains no external reference footage. Candidate matching requires indexed assets."}
                  </p>
                  <button
                    onClick={onNavigateToVault}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>Add Official Assets in Vault</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 bg-black/30 rounded-xl">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-0.5">
                      Highest Confidence
                    </span>
                    <span className="text-xl font-black text-white">
                      {scanResult.highest_confidence}%
                    </span>
                  </div>

                  <div className="p-3 bg-black/30 rounded-xl">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-0.5">
                      Lowest L2 Distance
                    </span>
                    <span className="text-xl font-black text-white">
                      {scanResult.lowest_l2_distance !== null
                        ? scanResult.lowest_l2_distance.toFixed(4)
                        : "—"}
                    </span>
                  </div>

                  <div className="p-3 bg-black/30 rounded-xl">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-0.5">
                      Matched Frames
                    </span>
                    <span className="text-xl font-black text-white">
                      {scanResult.candidate_matches_found} / {scanResult.total_frames_analyzed}
                    </span>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400 italic mb-4">
                {scanResult.disclaimer}
              </p>

              <button
                onClick={() => onViewIncident(scanResult)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
              >
                <span>Inspect Detailed Evidence in Incidents</span>
                <ExternalLink size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Right: Live Event Feed (5 cols) */}
        <div className="lg:col-span-5">
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 18,
            }}
            className="p-5 h-full flex flex-col"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-teal-400" />
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-300 m-0">
                  Sentinel Audit Log
                </h4>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {isScanActive ? "Scanning" : "Ready"}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-[380px] pr-1">
              {events.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-center text-slate-600 text-[12px]">
                  No active scan. Submit a video above to observe real forensic telemetry.
                </div>
              ) : (
                events.map((evt) => (
                  <div
                    key={evt.id}
                    style={{
                      background:
                        evt.type === "match"
                          ? "rgba(239, 68, 68, 0.1)"
                          : evt.type === "warning"
                          ? "rgba(245, 158, 11, 0.1)"
                          : evt.type === "error"
                          ? "rgba(239, 68, 68, 0.15)"
                          : "rgba(255, 255, 255, 0.02)",
                      borderLeft: `3px solid ${
                        evt.type === "match" || evt.type === "error"
                          ? "#ef4444"
                          : evt.type === "warning"
                          ? "#f59e0b"
                          : evt.type === "success"
                          ? "#0d9488"
                          : "#64748b"
                      }`,
                    }}
                    className="p-2.5 rounded-r text-[11px] font-mono leading-relaxed"
                  >
                    <div className="text-[9px] text-slate-500 mb-0.5">{evt.timestamp}</div>
                    <div className="text-slate-200">{evt.text}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

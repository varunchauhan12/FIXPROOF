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
} from "lucide-react";
import { AssetRecord, VaultStatus, MatchAnalysisResult } from "@/lib/types";
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
  type: "info" | "success" | "warning" | "match";
  text: string;
}

export const ThreatHunter: React.FC<ThreatHunterProps> = ({
  assets,
  vaultStatus,
  onNavigateToVault,
  onViewIncident,
}) => {
  const [suspectFile, setSuspectFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<number>(0);
  const [scanError, setScanError] = useState<string>("");
  const [scanResult, setScanResult] = useState<MatchAnalysisResult | null>(null);
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const indexedAssetsCount = assets.filter((a) => a.indexed).length;
  const isVaultReady = (vaultStatus?.vault_size ?? 0) > 0 && indexedAssetsCount > 0;

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
    if (e.target.files && e.target.files[0]) {
      setSuspectFile(e.target.files[0]);
      setScanError("");
      setScanResult(null);
    }
  };

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspectFile) return;

    setIsScanning(true);
    setScanError("");
    setScanResult(null);
    setEvents([]);
    setScanStep(1);

    addEvent("info", `Initiated threat investigation for: ${suspectFile.name} (${formatBytes(suspectFile.size)})`);

    try {
      // Step 1: Uploading & Frame extraction
      setTimeout(() => {
        setScanStep(2);
        addEvent("info", "Extracting video frames every 5s via OpenCV...");
      }, 700);

      // Step 2: FAISS Querying
      setTimeout(() => {
        setScanStep(3);
        addEvent("info", `Searching FAISS vault containing ${vaultStatus?.vault_size ?? 0} reference vectors...`);
      }, 1800);

      const result = await scanSuspectVideo(suspectFile);

      setScanStep(4);
      addEvent(
        result.overall_status === "CANDIDATE_MATCH"
          ? "match"
          : result.overall_status === "SUSPECT"
          ? "warning"
          : "success",
        `Forensic scan completed: ${result.overall_status} (Analyzed ${result.total_frames_analyzed} frames)`
      );

      if (result.candidate_matches_found > 0) {
        addEvent(
          "match",
          `⚠️ Confirmed ${result.candidate_matches_found} candidate visual match(es) with highest confidence of ${result.highest_confidence}% (L2 distance: ${result.lowest_l2_distance})`
        );
      } else {
        addEvent("success", "No visual match found against current reference vault.");
      }

      setScanResult(result);
    } catch (err: any) {
      setScanError(err.message || "Threat scan failed. Ensure the backend is running.");
      addEvent("warning", `Scan error: ${err.message || "Failed to complete investigation"}`);
    } finally {
      setIsScanning(false);
    }
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
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
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
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: suspectFile
                ? "1px solid #f59e0b"
                : "1px dashed rgba(255, 255, 255, 0.2)",
              background: "#1e293b",
            }}
            className="flex-1 px-4 py-3 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-slate-800 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.mov,.avi,.mkv,.webm"
              onChange={handleFileChange}
              className="hidden"
            />
            <FileVideo size={20} className={suspectFile ? "text-amber-400" : "text-slate-400"} />
            <span className="text-[12px] text-slate-200 truncate font-medium">
              {suspectFile ? `${suspectFile.name} (${formatBytes(suspectFile.size)})` : "Select suspect video to inspect..."}
            </span>
          </div>

          <button
            type="submit"
            disabled={!suspectFile || isScanning}
            style={{
              background:
                !suspectFile || isScanning
                  ? "rgba(255, 255, 255, 0.1)"
                  : "linear-gradient(135deg, #f59e0b, #d97706)",
              boxShadow: !suspectFile || isScanning ? "none" : "0 0 20px rgba(245, 158, 11, 0.3)",
            }}
            className="px-6 py-3 rounded-xl font-bold text-[13px] text-white flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:text-slate-500 transition-all shrink-0"
          >
            {isScanning ? (
              <>
                <Loader2 size={15} className="animate-spin-smooth" />
                <span>Investigating...</span>
              </>
            ) : (
              <>
                <Search size={15} />
                <span>Launch Scan</span>
              </>
            )}
          </button>
        </form>

        {scanError && (
          <div className="mt-3 p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-400 text-[12px] flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>{scanError}</span>
          </div>
        )}
      </div>

      {/* ─── Main Investigation Layout (Left: Workflow, Right: Feed) ─── */}
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
                { step: 1, label: "Ingest Suspect Clip", desc: "Validate container & stream chunks" },
                { step: 2, label: "Temporal Sampling", desc: "Extract frame keypoints every 5s" },
                { step: 3, label: "FAISS L2 Similarity Search", desc: "MobileNetV3 576-dim feature distance" },
                { step: 4, label: "Perceptual Hash Cross-Check", desc: "pHash hamming distance verification" },
              ].map((item) => {
                const isPassed = scanStep > item.step;
                const isCurrent = scanStep === item.step;

                return (
                  <div
                    key={item.step}
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
                      <Loader2 size={16} className="text-amber-400 animate-spin-smooth shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Results Summary Card */}
          {scanResult && (
            <div
              style={{
                background:
                  scanResult.overall_status === "CANDIDATE_MATCH"
                    ? "rgba(239, 68, 68, 0.08)"
                    : scanResult.overall_status === "SUSPECT"
                    ? "rgba(245, 158, 11, 0.08)"
                    : "rgba(13, 148, 136, 0.08)",
                border: `1px solid ${
                  scanResult.overall_status === "CANDIDATE_MATCH"
                    ? "rgba(239, 68, 68, 0.3)"
                    : scanResult.overall_status === "SUSPECT"
                    ? "rgba(245, 158, 11, 0.3)"
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
                        : "#0d9488",
                  }}
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase text-white tracking-wider"
                >
                  {scanResult.overall_status}
                </span>
              </div>

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
              <span className="text-[10px] text-slate-500 font-mono">Live</span>
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
                          : "rgba(255, 255, 255, 0.02)",
                      borderLeft: `3px solid ${
                        evt.type === "match"
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

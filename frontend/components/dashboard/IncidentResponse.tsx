"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  FileVideo,
  Hash,
  Database,
  Search,
} from "lucide-react";
import { MatchAnalysisResult, FrameMatchDetail, AssetRecord } from "@/lib/types";
import { API_BASE, getIncidentsList } from "@/lib/api";

interface IncidentResponseProps {
  initialIncident?: MatchAnalysisResult | null;
  assets: AssetRecord[];
  onNavigateToVault: (assetId?: string) => void;
  onNavigateToHunter: () => void;
}

export const IncidentResponse: React.FC<IncidentResponseProps> = ({
  initialIncident,
  assets,
  onNavigateToVault,
  onNavigateToHunter,
}) => {
  const [incidents, setIncidents] = useState<MatchAnalysisResult[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<MatchAnalysisResult | null>(
    initialIncident || null
  );
  const [selectedFrameMatch, setSelectedFrameMatch] = useState<FrameMatchDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const data = await getIncidentsList();
      setIncidents(data);
      if (!selectedIncident && data.length > 0) {
        setSelectedIncident(data[0]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  useEffect(() => {
    if (initialIncident) {
      setSelectedIncident(initialIncident);
    }
  }, [initialIncident]);

  useEffect(() => {
    if (selectedIncident && selectedIncident.frame_matches.length > 0) {
      // Default to first match with candidate or first frame
      const firstWithMatch = selectedIncident.frame_matches.find(
        (f) => f.best_match?.match_confirmed
      );
      setSelectedFrameMatch(firstWithMatch || selectedIncident.frame_matches[0]);
    } else {
      setSelectedFrameMatch(null);
    }
  }, [selectedIncident]);

  return (
    <div
      style={{
        background: "#090d16",
        borderRadius: 24,
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
      className="p-6 text-slate-100 max-w-7xl mx-auto space-y-6"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <h2 className="text-[17px] font-extrabold text-white m-0">
              Incident Response & Forensic Comparison
            </h2>
          </div>
          <p className="text-[12px] text-slate-400 m-0">
            Side-by-side frame verification, MobileNetV3 cosine distances, and perceptual hash evidence.
          </p>
        </div>

        <button
          onClick={fetchIncidents}
          disabled={loading}
          style={{ border: "1px solid rgba(255, 255, 255, 0.15)" }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-[11px] font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin-smooth" : ""} />
          <span>Refresh Incidents</span>
        </button>
      </div>

      {incidents.length === 0 && !selectedIncident ? (
        <div
          style={{
            background: "#0f172a",
            borderRadius: 20,
            border: "1px dashed rgba(255, 255, 255, 0.15)",
          }}
          className="text-center py-20 px-4"
        >
          <ShieldAlert size={40} className="mx-auto text-slate-600 mb-3" />
          <h3 className="text-[16px] font-bold text-white m-0">No Threat Incidents Recorded</h3>
          <p className="text-[12px] text-slate-400 mt-1 max-w-sm mx-auto mb-5">
            Launch a suspect video scan in Threat Hunter to generate side-by-side forensic evidence against the reference vault.
          </p>
          <button
            onClick={onNavigateToHunter}
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[12px] font-bold inline-flex items-center gap-2"
          >
            <Search size={14} />
            <span>Launch Threat Hunter Scan</span>
          </button>
        </div>
      ) : (
        /* Investigation Workspace Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Compact Incidents List (4 cols) */}
          <div className="lg:col-span-4 space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Recorded Scans ({incidents.length})
            </h4>

            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {incidents.map((inc, i) => {
                const isSelected = selectedIncident?.incident_id === inc.incident_id;
                const statusColor =
                  inc.overall_status === "CANDIDATE_MATCH"
                    ? "#ef4444"
                    : inc.overall_status === "SUSPECT"
                    ? "#f59e0b"
                    : inc.overall_status === "NO_REFERENCE_DATA"
                    ? "#64748b"
                    : "#0d9488";

                return (
                  <div
                    key={inc.incident_id || i}
                    onClick={() => setSelectedIncident(inc)}
                    style={{
                      background: isSelected ? "#1e293b" : "#0f172a",
                      border: `1px solid ${
                        isSelected ? "rgba(249, 115, 22, 0.4)" : "rgba(255, 255, 255, 0.06)"
                      }`,
                      cursor: "pointer",
                    }}
                    className="p-3.5 rounded-xl transition-all hover:bg-slate-800"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        style={{ background: statusColor }}
                        className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase text-white tracking-wider"
                      >
                        {inc.overall_status}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {inc.scanned_at ? new Date(inc.scanned_at).toLocaleTimeString() : "Recent"}
                      </span>
                    </div>

                    <p className="text-[13px] font-bold text-white truncate m-0">
                      {inc.suspect_filename || `Suspect ${inc.submitted_asset_id?.slice(0, 8)}`}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <span>Conf: {inc.highest_confidence}%</span>
                      <span>Matches: {inc.candidate_matches_found}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Forensic Comparison Workspace (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {selectedIncident ? (
              <>
                {/* Incident Technical Header */}
                <div
                  style={{
                    background: "#0f172a",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 18,
                  }}
                  className="p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Incident Dossier
                      </span>
                      <h3 className="text-[16px] font-extrabold text-white m-0">
                        {selectedIncident.suspect_filename || selectedIncident.submitted_asset_id}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          background:
                            selectedIncident.overall_status === "CANDIDATE_MATCH"
                              ? "rgba(239, 68, 68, 0.2)"
                              : selectedIncident.overall_status === "SUSPECT"
                              ? "rgba(245, 158, 11, 0.2)"
                              : selectedIncident.overall_status === "NO_REFERENCE_DATA"
                              ? "rgba(100, 116, 139, 0.2)"
                              : "rgba(13, 148, 136, 0.2)",
                          color:
                            selectedIncident.overall_status === "CANDIDATE_MATCH"
                              ? "#f87171"
                              : selectedIncident.overall_status === "SUSPECT"
                              ? "#fbbf24"
                              : selectedIncident.overall_status === "NO_REFERENCE_DATA"
                              ? "#cbd5e1"
                              : "#2dd4bf",
                        }}
                        className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide border border-current/20"
                      >
                        {selectedIncident.overall_status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] py-2 border-y border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Total Analyzed</span>
                      <strong className="text-white">
                        {selectedIncident.total_frames_analyzed} frames
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Highest Confidence</span>
                      <strong className="text-white">{selectedIncident.highest_confidence}%</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Lowest L2 Distance</span>
                      <strong className="text-white">
                        {selectedIncident.lowest_l2_distance !== null
                          ? selectedIncident.lowest_l2_distance.toFixed(4)
                          : "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Matched References</span>
                      <strong className="text-teal-400">
                        {selectedIncident.matched_assets.length} asset(s)
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Side-by-Side Comparison Workspace */}
                <div
                  style={{
                    background: "#0f172a",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 18,
                  }}
                  className="p-5"
                >
                  <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-4">
                    Side-by-Side Visual Evidence
                  </h4>

                  {selectedFrameMatch ? (
                    <div className="space-y-4">
                      {/* Image Comparison Box */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Suspect Frame */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-amber-400 uppercase">
                              Suspect Video Frame
                            </span>
                            <span className="text-slate-400 font-mono">
                              Timestamp: {selectedFrameMatch.submitted_frame.timestamp_sec}s
                            </span>
                          </div>
                          <div
                            style={{ background: "#000000", borderRadius: 12 }}
                            className="aspect-video overflow-hidden border border-amber-500/30 flex items-center justify-center"
                          >
                            <img
                              src={`${API_BASE}/api/vault/assets/${selectedIncident.submitted_asset_id}/frames/${selectedFrameMatch.submitted_frame.filename}`}
                              alt="Suspect frame"
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono truncate">
                            {selectedFrameMatch.submitted_frame.filename}
                          </p>
                        </div>

                        {/* Matched Reference Frame */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-teal-400 uppercase">
                              Vaulted Reference Frame
                            </span>
                            <span className="text-slate-400 font-mono">
                              Timestamp:{" "}
                              {selectedFrameMatch.best_match
                                ? `${selectedFrameMatch.best_match.source_timestamp_sec}s`
                                : "No match"}
                            </span>
                          </div>
                          <div
                            style={{ background: "#000000", borderRadius: 12 }}
                            className="aspect-video overflow-hidden border border-teal-500/30 flex items-center justify-center"
                          >
                            {selectedFrameMatch.best_match?.source_asset_id ? (
                              <img
                                src={`${API_BASE}/api/vault/assets/${selectedFrameMatch.best_match.source_asset_id}/frames/${selectedFrameMatch.best_match.source_filename}`}
                                alt="Matched reference frame"
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <div className="text-slate-600 text-[12px]">
                                No reference match candidate
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono truncate">
                            {selectedFrameMatch.best_match?.source_filename || "—"}
                          </p>
                        </div>
                      </div>

                      {/* Technical Scores for this Frame */}
                      {selectedFrameMatch.best_match && (
                        <div
                          style={{ background: "#1e293b", borderRadius: 12 }}
                          className="p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]"
                        >
                          <div>
                            <span className="text-slate-400 block mb-0.5">L2 Distance</span>
                            <span className="font-mono font-bold text-white text-[13px]">
                              {selectedFrameMatch.best_match.l2_distance.toFixed(4)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">Confidence Score</span>
                            <span className="font-mono font-bold text-teal-400 text-[13px]">
                              {selectedFrameMatch.best_match.confidence_score}%
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">pHash Match</span>
                            <span className="font-mono font-bold text-amber-400 text-[13px]">
                              {selectedFrameMatch.best_match.phash_match ? "Confirmed" : "Non-identical"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">Target Asset</span>
                            <button
                              onClick={() =>
                                onNavigateToVault(selectedFrameMatch.best_match?.source_asset_id)
                              }
                              className="font-mono text-indigo-400 hover:underline truncate block"
                            >
                              {selectedFrameMatch.best_match.source_asset_id.slice(0, 8)}...
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Frame Match Selector Timeline */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                          Switch Analyzed Frame ({selectedIncident.frame_matches.length} keyframes)
                        </span>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {selectedIncident.frame_matches.map((fm, idx) => {
                            const isSelected =
                              selectedFrameMatch?.submitted_frame.filename ===
                              fm.submitted_frame.filename;
                            const isConfirmed = fm.best_match?.match_confirmed;

                            return (
                              <button
                                key={fm.submitted_frame.filename}
                                onClick={() => setSelectedFrameMatch(fm)}
                                style={{
                                  border: isSelected
                                    ? "2px solid #f97316"
                                    : `1px solid ${isConfirmed ? "#ef4444" : "#334155"}`,
                                  background: isConfirmed
                                    ? "rgba(239, 68, 68, 0.15)"
                                    : "#1e293b",
                                }}
                                className="px-3 py-1.5 rounded-lg text-left shrink-0 transition-all text-[11px] text-white"
                              >
                                <span className="font-bold">
                                  {fm.submitted_frame.timestamp_sec}s
                                </span>
                                <span className="block text-[9px] text-slate-400">
                                  {isConfirmed
                                    ? `Match (${fm.best_match?.confidence_score}%)`
                                    : "Clean"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-[12px]">
                      No frame matches available for this incident.
                    </div>
                  )}
                </div>

                {/* Legal Limitation Notice */}
                <div
                  style={{
                    background: "rgba(148, 163, 184, 0.05)",
                    border: "1px solid rgba(148, 163, 184, 0.15)",
                  }}
                  className="p-3.5 rounded-xl text-[11px] text-slate-400 leading-relaxed"
                >
                  <strong>Disclaimer & Operational Scope:</strong> {selectedIncident.disclaimer}{" "}
                  Similarity scores are generated by vector nearest neighbor search and perceptual hash distance. Review by qualified rights personnel is required before dispatching legal enforcement notices.
                </div>
              </>
            ) : (
              <div className="text-center py-24 text-slate-500 text-[13px]">
                Select an incident on the left to review side-by-side evidence.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

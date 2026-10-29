"use client";

import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base Shimmering Skeleton Loader
 */
export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden bg-[#22211E]/80 rounded ${className}`}
      {...props}
    >
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-[rgba(241,235,221,0.08)] to-transparent animate-shimmer pointer-events-none"
        style={{ willChange: "transform" }}
      />
    </div>
  );
}

/**
 * Skeleton for KPI / Operational Metric Cards (Overview & AssetVault)
 */
export function MetricCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        background: "#1B1A18",
        border: "1px solid #302E29",
        borderRadius: 14,
      }}
      className={`p-4 sm:p-5 flex flex-col justify-between shadow-sm relative overflow-hidden ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28 rounded-md bg-[#2A2824]" />
          <Skeleton className="h-8 w-20 rounded-lg bg-[#2A2824]" />
        </div>
        <Skeleton className="w-8 h-8 rounded-lg bg-[#2A2824] shrink-0" />
      </div>
      <div className="mt-4 pt-3 border-t border-[#302E29]/60">
        <Skeleton className="h-2.5 w-40 rounded bg-[#2A2824]" />
      </div>
    </div>
  );
}

/**
 * Skeleton for Subsystem Architecture Cards (Overview)
 */
export function SubsystemCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      style={{
        background: "#22211E",
        border: "1px solid #302E29",
        borderRadius: 12,
      }}
      className="p-3.5 flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="w-7 h-7 rounded-lg bg-[#2A2824]" />
          <Skeleton className="w-14 h-4 rounded-md bg-[#2A2824]" />
        </div>
        <Skeleton className="h-3.5 w-28 rounded bg-[#2A2824] mt-1" />
        <Skeleton className="h-2.5 w-20 rounded bg-[#2A2824] mt-1.5" />
      </div>
      <Skeleton className="h-2.5 w-full rounded bg-[#2A2824] mt-3" />
    </div>
  );
}

/**
 * Skeleton for Asset Vault Reference Cards (Grid/Stacks)
 */
export function AssetCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      style={{
        background: "#171615",
        border: "1px solid rgba(238, 231, 219, 0.08)",
        borderRadius: 14,
      }}
      className="p-4 flex flex-col gap-3"
    >
      {/* Thumbnail area */}
      <Skeleton className="w-full h-32 rounded-xl bg-[#22211E]" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-36 rounded bg-[#2A2824]" />
        <Skeleton className="h-4 w-16 rounded-md bg-[#2A2824]" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-20 rounded bg-[#2A2824]" />
        <Skeleton className="h-3 w-24 rounded bg-[#2A2824]" />
      </div>
    </div>
  );
}

/**
 * Skeleton for Incident and Reference Rows (Lists / Tables)
 */
export function TableRowSkeleton() {
  return (
    <div
      aria-hidden="true"
      style={{
        background: "#22211E",
        border: "1px solid #302E29",
        borderRadius: 12,
      }}
      className="flex items-center justify-between p-3"
    >
      <div className="flex items-center gap-3 w-3/4">
        <Skeleton className="w-14 h-9 rounded bg-[#2A2824] shrink-0" />
        <div className="space-y-1.5 flex-1 min-w-0">
          <Skeleton className="h-3.5 w-44 rounded bg-[#2A2824]" />
          <Skeleton className="h-2.5 w-28 rounded bg-[#2A2824]" />
        </div>
      </div>
      <Skeleton className="h-5 w-16 rounded-md bg-[#2A2824] shrink-0" />
    </div>
  );
}

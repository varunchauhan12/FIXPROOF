# FixProof Milestone 6C.6C — Persistence & UI Audit

**Document Version:** 1.0.0  
**Date:** October 27, 2026  
**Status:** COMPLETE (AUDIT & TEST BASELINE)  
**Target Milestone:** FixProof Milestone 6C.6C  
**Operating Mode:** Audit & Test Only  

---

## Executive Summary

This capability and persistence audit establishes the exact current state of FixProof's Nemotron investigation reports and frontend integration:
1. **Active Persistence Verification**: FixProof backend resolves `FIXPROOF_DB_MODE=local` (`is_cloud_mode() == False`). Reports are written directly to `backend/storage/nemotron_reports.json`.
2. **Real Reports in Storage**: 7 real investigation reports exist in local storage, including valid reports (`d61d6448-a8b1-4903-bcf9-15eeadf6b307`, `77cae07f-8d37-401c-8a11-9fa6861b2b60`, `f33c65de-ea17-46dd-b8cd-39512bfff3f3`).
3. **Endpoint Verification**: Both `GET /api/threats/{incident_id}/report` and `GET /api/threats/reports/{report_id}` return HTTP 200 with complete validated reports. Uninvestigated incidents return HTTP 404.
4. **Frontend Gap**: The frontend has no typed interfaces for `InvestigationReport`, no API client helpers for the three investigation endpoints, completely hides the incident ID in the UI, and never requests or displays Nemotron reports.

---

## 1. Actual Persistence Verification

### 1.1 Resolution of Runtime Configuration
- Variable: `FIXPROOF_DB_MODE=local` in `backend/.env`.
- Database resolution logic: `backend/app/db.py:70-92`.
- Mode enum: `DBMode.LOCAL`.
- Cloud flag: `is_cloud_mode() == False`.
- Storage file: `backend/storage/nemotron_reports.json`.

### 1.2 Read-Only Inspection of Saved Reports
A read-only inspection of `backend/storage/nemotron_reports.json` confirmed 7 persisted reports:
- Report `d61d6448-a8b1-4903-bcf9-15eeadf6b307`: Incident `c80cd868-c98d-4e28-bcd8-8599570e22a1`, Status `VALIDATED`, Action `MONITOR_ACCOUNT`, 9531 completion tokens.
- Report `f33c65de-ea17-46dd-b8cd-39512bfff3f3`: Incident `cb254bff-7d93-4cc4-9aa1-be9123b0a895`, Status `VALIDATED`, Action `ESCALATE_LEGAL_TAKEDOWN`.
- Report `77cae07f-8d37-401c-8a11-9fa6861b2b60`: Incident `05f37f36-7dfb-48b2-bfbc-f8e8006fca11`, Status `VALIDATED`, Action `FLAG_FOR_BROKER_LICENSING`.

### 1.3 Verified Retrieval Endpoints
- `GET /api/threats/c80cd868-c98d-4e28-bcd8-8599570e22a1/report` -> HTTP 200 (returns latest report).
- `GET /api/threats/reports/d61d6448-a8b1-4903-bcf9-15eeadf6b307` -> HTTP 200 (returns specific report by report_id).
- `GET /api/threats/4f946bf1-532d-4e3b-b4a9-2dfecc70fc23/report` -> HTTP 404 (clean un-investigated incident).

---

## 2. Frontend State Audit

### 2.1 Incident Navigation and Visibility
- `IncidentResponse.tsx` receives `incidents` via `getIncidentsList()` (`GET /api/incidents`).
- Each incident object has `incident_id` in memory.
- However, `incident_id` is never rendered in the left list card or in the dossier technical header.
- Users have no way to view or copy the incident ID.

### 2.2 Lack of Investigation Integration
- `frontend/lib/api.ts` does not implement `investigateIncident`, `getIncidentLatestReport`, or `getReportById`.
- `frontend/lib/types.ts` does not define `InvestigationReport`, `TimelineInterval`, `FindingItem`, or `OperationalMetadata`.
- The frontend only displays raw frame matches and L2 distance metrics.

---

## 3. UI Implementation Plan

1. **Step 1: Types & API Helpers**: Define exact types in `frontend/lib/types.ts` matching backend `evidence_models.py`. Implement typed API helpers in `frontend/lib/api.ts` reusing `API_BASE` and `fetchNoCache`.
2. **Step 2: Visible Incident IDs**: Add full incident ID pill in dossier header with copy-to-clipboard button and tooltip; display truncated incident ID in sidebar cards.
3. **Step 3: Nemotron Investigation Panel**: When an incident is selected, fetch `GET /api/threats/{incident_id}/report`. If 404, show empty state with "Generate Investigation Report" button. If loading, show skeleton. On click, call `POST /api/threats/{incident_id}/investigate`. Provide "Re-run Investigation" with `force_refresh: true`.
4. **Step 4: Report Content Rendering**: Render report ID (with copy button), summary, action badge, confidence badge, human review flag, timeline intervals, findings, contradictions, unresolved questions, limitations, and operational metrics.
5. **Step 5: Testing & Verification**: Validate TypeScript build, clipboard safety, empty state, cached retrieval on refresh, failure handling, and non-empty rendering.

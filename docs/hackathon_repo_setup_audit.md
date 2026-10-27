# FixProof — Meta Muse Hackathon Repository Setup & Baseline Audit

**Document Version:** 1.0.0  
**Date:** October 27, 2026  
**Status:** AUDIT & PLANNING COMPLETE (Zero destructive actions taken)  
**Original Repository:** `/Users/varunchauhan/projects/FIXPROOF`  
**Proposed Hackathon Repository:** `/Users/varunchauhan/projects/fixproof-muse-hackathon`  
**Target GitHub Remote:** `https://github.com/varunchauhan12/fixproof-muse-hackathon.git`  

---

## Executive Summary

This audit prepares the technical foundation for creating an independent, clean-room local working copy and GitHub repository for the **Meta Muse Hackathon**, while strictly protecting the original `FIXPROOF` repository, its commit history, and its active uncommitted changes.

### Critical Baseline Eligibility Warning
> [!IMPORTANT]
> **Organizer Constraint:** The hackathon organizers have advised that the hackathon submission repository should contain **only work done during the event**.
>
> FixProof's git history spans **16 commits**:
> - **Pre-Kickoff (October 25, 2026):** 8 commits (`9e25086` through `a77f610`) establishing the initial prototype (FastAPI skeleton, MobileNetV3 visual embeddings, FAISS index creation, and initial UI setup).
> - **Event Period (October 26–27, 2026):** 8 commits (`c673afe` through `3a806b7`) implementing the production asset vault, forensic threat hunter, Supabase cloud sync, URL screening pipeline, and Nemotron investigation engine.
>
> **Action Required:** We have formulated three distinct baseline strategies (detailed in Section 6). **You must confirm your preferred strategy before any public repository is created or pushed.**

---

## 1. Original Repository Status

A comprehensive read-only inspection of `/Users/varunchauhan/projects/FIXPROOF` confirms:

- **Active Branch:** `main` (synchronized with `origin/main` at commit `3a806b7`).
- **Remotes:**
  - `origin`: `https://github.com/varunchauhan12/FIXPROOF.git` (fetch & push).
  - No other remotes are configured.
- **HEAD Commit:** `3a806b7` — `fix(nemotron): sanitize Swagger placeholder overrides, bypass failed report cache, and expand reasoning token budget`.
- **Preceding History:**
  - `50b9716` (2026-10-27 02:27) `feat: multi-format video ingestion, frontend SSR fixes, and Nemotron investigation foundation`
  - `b5c88bc` (2026-10-26 22:44) `feat(cloud): integrate Supabase reference uploads, cache-busting, and UI refresh`
  - `c2af29a` (2026-10-26 21:02) `feat(persistence): implement cloud db foundation, schema verification, and staging index rebuild`
- **Uncommitted Working-Tree Inventory (Preserved):**
  - `M .gitignore`: Whitelisting rule `!frontend/lib/` to prevent Next.js source code from being ignored.
  - `M frontend/components/dashboard/IncidentResponse.tsx`: Milestone 6C.6C.1 complete Nemotron investigation panel, copy controls, and incident ID pills.
  - `?? frontend/lib/`: `api.ts`, `types.ts` (untracked Next.js library modules).
  - `?? frontend/tests/`: `test_investigation_integration.mjs` (7 automated frontend integration tests).
  - `?? docs/milestone_6c6c_persistence_and_ui_audit.md`
  - `?? docs/milestone_6c6c1_frontend_integration.md`

All working-tree changes remain untouched and fully preserved.

---

## 2. Application File Inventory (What Is Required to Run)

To run the full FixProof stack (FastAPI backend + Next.js frontend), the new repository requires the following files:

### 2.1 Backend (`backend/`)
- **Application Core (`backend/app/`):**
  - `main.py`: FastAPI server, CORS middleware, REST endpoints, and schema validation.
  - `evidence_models.py`: Pydantic models for FrameEvidence, TimelineInterval, and InvestigationReport.
  - `timeline.py`: Temporal clustering of frame matches into coherent timeline intervals.
  - `matcher.py`: MobileNetV3 feature extractor, vector search, and perceptual hash (pHash) analysis.
  - `vault.py`: Local vector indexing, FAISS storage, and asset metadata operations.
  - `registry.py`: Unified persistence abstractions (local JSON files and cloud Supabase tables).
  - `db.py`: Dual-mode database connection manager (`local` vs `supabase`).
  - `storage.py`: File storage and path validation helpers.
  - `url_screener.py`: URL screening, SSRF validation, and metadata extraction.
  - *(Nemotron / Muse Engine)*: `nemotron_engine.py` (which will be complemented or adapted for Meta Muse multimodal video comparison).
- **Dependencies & Migrations:**
  - `requirements.txt`: Python package requirements (`fastapi`, `uvicorn`, `torch`, `torchvision`, `faiss-cpu`, `ImageHash`, `openai`, `yt-dlp`, etc.).
  - `migrations/001_initial_schema.sql`: PostgreSQL schema definitions for cloud mode.
- **Configuration Template:**
  - `backend/.env.example`: Safe environment template with placeholder values.
- **Automated Tests:**
  - `tests/test_nemotron_engine.py`, `tests/test_url_screener.py`, `tests/test_ingest.py`, `tests/test_vault_assets.py`, `tests/test_db.py`, `tests/test_cloud_runtime.py`.

### 2.2 Frontend (`frontend/`)
- **Next.js App Core (`frontend/app/`):**
  - `layout.tsx`, `page.tsx`, `globals.css`, `dashboard/page.tsx`.
- **UI Components (`frontend/components/`):**
  - `dashboard/`: `DashboardConsole.tsx`, `AssetVault.tsx`, `ThreatHunter.tsx`, `IncidentResponse.tsx`, `Intelligence.tsx`, `Overview.tsx`, `SecondaryViews.tsx`.
  - `landing/`: `LandingPage.tsx`.
  - `layout/`: `Header.tsx`, `Sidebar.tsx`.
- **API & Type Definitions (`frontend/lib/`):**
  - `api.ts`: Typed API client helpers (`getVaultStatus`, `scanSuspectVideo`, `screenSuspectUrl`, `investigateIncident`, `getIncidentLatestReport`, etc.).
  - `types.ts`: TypeScript contracts for assets, matches, frame details, timeline intervals, and reports.
- **Dependencies & Configurations:**
  - `package.json`, `package-lock.json`: Dependencies (`next`, `react`, `lucide-react`, `framer-motion`, `cobe`, `tailwindcss`).
  - `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`.
  - `public/`: Static brand assets.
  - `frontend/.env.example`: Frontend environment template (`NEXT_PUBLIC_API_URL=http://localhost:8000`).

### 2.3 Root Files
- `.gitignore`: Rules for ignoring secrets, environments, media, and build outputs.
- `README.md`: Project documentation and architecture guide.

---

## 3. Files That Must NOT Be Copied or Published (Secrets & Data)

The following files contain private keys, local operational databases, user videos, or build caches and **must be strictly excluded**:

| File / Directory | Category | Reason for Exclusion |
|:---|:---|:---|
| `backend/.env` | **Secret / Credentials** | Contains live Nebius Token Factory API key, Supabase service role key, and Supabase connection pooler URI with plaintext password. |
| `frontend/.env.local`, `*.env` | **Secret / Config** | Local override files. Only `.env.example` templates may be included. |
| `backend/.venv/` | **Virtual Environment** | Machine-specific Python binaries (1.5+ GB). |
| `frontend/node_modules/` | **Node Dependencies** | Platform-specific installed npm packages (300+ MB). |
| `frontend/.next/` | **Build Cache** | Turbopack compilation artifacts and `.rsc` outputs. |
| `backend/storage/faiss_vault.index` | **Local Database** | Serialized FAISS binary vector index containing indexed embeddings. |
| `backend/storage/assets_metadata.json` | **Local Database** | Metadata of locally indexed reference assets. |
| `backend/storage/incidents.json` | **Local Database** | 100 historical scan incident records. |
| `backend/storage/nemotron_reports.json` | **Local Database** | 7 historical investigation report runs. |
| `backend/storage/videos/*` | **Media Storage** | Uploaded/downloaded MP4/MOV video files. |
| `backend/storage/frames/*` | **Media Storage** | Extracted video frame JPEGs. |
| `backend/storage/suspects/*` | **Media Storage** | Suspect clips and extracted suspect frames. |
| `backend/storage/thumbnails/*` | **Media Storage** | Cached public thumbnail images. |
| `sample-5s.mp4`, `sample_new.mp4`, `samples/` | **Media Storage** | Raw test video files in root directory. |
| `backend/acceptance_ref_broadcast.mp4` | **Media Storage** | Reference video clip. |
| `backend/sample_match_highlight.mp4` | **Media Storage** | Suspect video clip. |
| `backend/**/__pycache__/`, `*.pyc` | **Build Artifact** | Python bytecode. |
| `.DS_Store`, `Thumbs.db` | **OS Artifact** | macOS desktop service store metadata. |
| `.idea/`, `.vscode/` | **IDE Artifact** | Local IDE settings. |

---

## 4. Gitignore Audit

An audit of root `.gitignore` and `frontend/.gitignore` reveals:

1. **The `lib/` Ignored Directory Trap:**
   - In root `.gitignore:21`, `lib/` was written without a leading slash. In git syntax, an unanchored pattern `lib/` matches any subdirectory named `lib`, causing git to silently ignore `frontend/lib/` (`api.ts` and `types.ts`).
   - In the hackathon repository, root `.gitignore` must explicitly anchor `/lib/` or define `!frontend/lib/` to guarantee that Next.js client libraries are committed.
2. **Storage and Media Protection:**
   - Root `.gitignore` already ignores `storage/`, `backend/storage/`, and video extensions (`*.mp4`, `*.mov`, `*.avi`, `*.mkv`, `*.webm`).
   - In the hackathon repository, we should reinforce this by adding empty placeholder `.gitkeep` files in `backend/storage/videos/`, `backend/storage/frames/`, etc., so the directory structure exists on clone without committing media.
3. **Environment Variable Protection:**
   - Both `.gitignore` files ignore `.env`, `.env*.local`, `.env.development`, `*.env`. This correctly blocks secret leaks.

---

## 5. Mechanism to Create a Separate Local Copy

To create an independent working copy without altering `~/projects/FIXPROOF`:

### Method A: Local Git Clone (Preserves Git Object Integrity)
```bash
# 1. Clone from local directory into the new path
git clone /Users/varunchauhan/projects/FIXPROOF /Users/varunchauhan/projects/fixproof-muse-hackathon

# 2. Enter the new repository
cd /Users/varunchauhan/projects/fixproof-muse-hackathon

# 3. Disconnect origin from the original repository so pushes never affect FIXPROOF
git remote remove origin
```
*Benefits:* Fast (local hardlinks), clones full object database, leaves `~/projects/FIXPROOF` completely untouched.

### Method B: Clean File Export (Zero Pre-Existing Git History)
If hackathon rules require starting from commit 0:
```bash
# 1. Create target folder
mkdir -p /Users/varunchauhan/projects/fixproof-muse-hackathon

# 2. Sync source code, excluding all git metadata, secrets, videos, and virtual environments
rsync -av --exclude='.git' \
          --exclude='.env*' \
          --include='.env.example' \
          --exclude='.venv' \
          --exclude='node_modules' \
          --exclude='.next' \
          --exclude='*.mp4' \
          --exclude='*.mov' \
          --exclude='backend/storage/*' \
          --exclude='*.pyc' \
          --exclude='__pycache__' \
          --exclude='.DS_Store' \
          /Users/varunchauhan/projects/FIXPROOF/ /Users/varunchauhan/projects/fixproof-muse-hackathon/

# 3. Initialize fresh git repository
cd /Users/varunchauhan/projects/fixproof-muse-hackathon
git init -b main
```

---

## 6. Commit History Strategy & Baseline Eligibility Analysis

FixProof has a specific commit timeline that must be evaluated against the hackathon rules:

```
[October 25 - Pre-Kickoff Baseline]
9e25086 (Oct 25 15:42) first commit - setting up frontend and backend
8347bb2 (Oct 25 15:43) added backend folder
2b3493b (Oct 25 15:58) feat(backend): set up FastAPI health check and Nebius client test
72812db (Oct 25 16:34) feat(backend): FastApi diagnosis function running perfectly
4707118 (Oct 25 17:09) feat(frontend): connected the frontend to the backend
effb574 (Oct 25 18:28) feat(backend): added /api/valut/ingest
ae32860 (Oct 25 23:23) feat(backend): visual embeddings working
a77f610 (Oct 25 23:47) feat(backend): make embeddings

───────────────────────────────────────────────────────────── [Hackathon Kickoff Cutoff: Oct 26]

[October 26-27 - Hackathon Sprint Commits]
c673afe (Oct 26 16:20) feat: complete asset vault and forensic dashboard
9fa0566 (Oct 26 18:56) feat(backend): make landing page
5d79c0c (Oct 26 19:23) feat(backend): added secure threat hunter function
efca348 (Oct 26 19:30) feat(backend): added more security for the extraction process
c2af29a (Oct 26 21:02) feat(persistence): implement cloud db foundation & staging index
b5c88bc (Oct 26 22:44) feat(cloud): integrate Supabase reference uploads & UI refresh
50b9716 (Oct 27 02:27) feat: multi-format video ingestion, frontend SSR fixes, Nemotron engine
3a806b7 (Oct 27 02:58) fix(nemotron): sanitize Swagger placeholders & expand token budget
```

### Proposed History Strategies:

| Strategy | Implementation | Hackathon Compliance | Audit Trail / Attribution |
|:---|:---|:---|:---|
| **Option 1: Transparent Lineage (Recommended)** | Keep the full commit history intact. In `README.md`, add a prominent **"Hackathon Scope & Starter Disclosure"** declaring that commits prior to Oct 26 represent the pre-existing starter framework, and that all hackathon deliverables (Meta Muse agent, cloud sync, URL screening, forensic dashboard) were built Oct 26+. | Fully transparent. No falsification of dates or origin. | Cleanest audit trail. Judges can inspect individual Oct 26+ commits to verify event work. |
| **Option 2: Rebased Baseline Tag** | Squash all Oct 25 commits into a single commit: `chore: initial starter baseline (as of hackathon kickoff)`. Re-apply the Oct 26–27 commits on top with their original author dates and messages. | Strictly defines the baseline as a single starter commit. | Makes clear boundary between pre-existing starter code and hackathon commits. |
| **Option 3: Pure Clean Room (Zero Prior Code)** | Start from an empty repository or official hackathon starter kit. Build the Meta Muse agent from scratch. | 100% risk-free compliance. | Discards working dashboard and requires rebuilding UI/matcher during event. |

> [!CAUTION]
> **Decision Required Before Publishing:** Please review the hackathon's specific rules on starter code and confirm whether **Option 1**, **Option 2**, or **Option 3** is preferred.

---

## 7. Tooling & Authentication Audit (`gh`)

- **GitHub CLI (`gh`):** Checked `gh --version` and searched `/usr/local/bin`, `/opt/homebrew/bin`.
  - **Result:** `gh` is **NOT installed** on this machine (`zsh: command not found: gh`).
- **Git Authentication:**
  - `user.name`: `varunchauhan12`
  - `user.email`: `varunchauhan_mc24b06_058@dtu.ac.in`
  - Remote authentication: Successfully pushes over HTTPS to GitHub via existing macOS Keychain / Git credentials.
- **Publishing Path Without `gh`:**
  - When ready to publish, the user can either create the repository via the [GitHub New Repository UI](https://github.com/new) named `fixproof-muse-hackathon`, or install `gh` (`brew install gh`) and run `gh repo create`.

---

## 8. Proposed Repository Name & Remote Check

- **Proposed Name:** `fixproof-muse-hackathon`
- **Verification in `~/projects/`:**
  - Directory `/Users/varunchauhan/projects/fixproof-muse-hackathon` **does not exist**.
- **Verification in `git remote`:**
  - Original repository has only `origin` (`varunchauhan12/FIXPROOF.git`).
  - No remote named `fixproof-muse-hackathon` or pointing to a hackathon repo is configured.

---

## 9. Exact Next Steps (For Phase 2 Execution After Review)

Once you confirm the baseline eligibility option and authorize Phase 2, we will execute:

1. **Commit or Stash Working Tree in `FIXPROOF`:**
   - Commit the verified Milestone 6C.6C.1 frontend work (`IncidentResponse.tsx`, `api.ts`, `types.ts`, `!frontend/lib/`) in `FIXPROOF` so the working copy is clean.
2. **Create Local Working Copy:**
   - Clone or export to `/Users/varunchauhan/projects/fixproof-muse-hackathon`.
   - Remove or re-point the `origin` remote.
3. **Apply Clean Security & Template Invariants:**
   - Verify `backend/.env` is absent.
   - Verify `backend/.env.example` has placeholders.
   - Create `frontend/.env.example` (`NEXT_PUBLIC_API_URL=http://localhost:8000`).
   - Clean out local databases (`storage/*.json`, `storage/*.index`) and replace with empty directories containing `.gitkeep`.
4. **Prepare Meta Muse Architecture Scaffolding:**
   - Scaffold the Meta Muse integration layer alongside Nemotron.
   - Update `README.md` with hackathon attribution, architecture diagrams, and setup instructions.
5. **Publishing (Upon Confirmation):**
   - Connect the new remote `https://github.com/varunchauhan12/fixproof-muse-hackathon.git` and push `main`.

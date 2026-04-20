# ⟡ Eidolon v2

> **The Student Survival Kit — rebuilt from the ground up.**
> AI-powered lecture processing, transcription, and exam preparation for high-stakes academic environments.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Self--Hosted-336791?style=for-the-badge&logo=postgresql)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![BullMQ](https://img.shields.io/badge/BullMQ-Redis-red?style=for-the-badge)
![FFmpeg](https://img.shields.io/badge/FFmpeg-Media-green?style=for-the-badge&logo=ffmpeg)

![Hero — Home Dashboard](docs/images/hero.png)

---

## Overview

Eidolon v2 is a full rewrite of the original platform. Every major subsystem has been replaced or significantly upgraded — from the database layer and authentication to the AI model stack and job queue infrastructure. The result is a faster, more scalable, and more capable platform designed to support a growing user base with real payment flows and collaborative features.

---

## What's New in v2

### Breaking Changes from v1
- **Database:** MySQL (PlanetScale) → **self-hosted PostgreSQL** on Hetzner VPS
- **Authentication:** Custom JWT/bcrypt → **NextAuth with Google OAuth only**
- **Queue infrastructure:** Upstash Redis → **self-hosted Redis** (BullMQ, same Hetzner box)
- **Storage:** Local filesystem → **Cloudflare R2** for all media and slip files
- **Removed:** PDF export (Puppeteer), document generator, textbook explainer, BYOK

### New in v2
- **Exam Prep Generator** — structured practice questions from notes or transcripts, individual and group
- **Group Workspace System** — shared generation with cost splitting; membership snapshotted at generation time
- **Top-Up System** — credit-based balance with EasySlip auto-verification and LINE notify
- **Admin Dashboard** — user management, activity logs, top-up approval queue, slip viewer
- **Transcriptor** — chunked audio splitting for large files, async BullMQ processing, history and detail views
- **Audio Converter** — MP4→MP3 extraction via FFmpeg, ephemeral by design (no DB persistence)
- **Profile & Activity History** — per-user usage stats, token consumption, charge breakdown, balance history

---

## Features

### Intelligent Note Taker

Transforms raw lecture transcripts into structured, study-ready Markdown notes. Three output styles: standard prose, textbook-format, and ultra-compact exam/cheat sheet. Supports individual and group generation with tiered pricing.

![Note List — Group cards, locked state, individual rows with style/tier/cost badges](docs/images/note-list.png)

Configure the output style and source material before generation. Cost is estimated live based on input length and selected style.

![Note Create — Style picker with descriptions and cost estimates](docs/images/note-new-1.png)

![Note Create — Source and course details](docs/images/note-new-2.png)

The generated note is rendered as structured Markdown with a detail sidebar, fullscreen mode, and inline editing.

![Note Viewer — Rendered output with sidebar and edit actions](docs/images/note-viewer.png)

![Note Viewer — Fullscreen reading mode](docs/images/note-fullscreen.png)

---

### Transcriptor

Uploads audio files (chunked for large inputs), queues async transcription jobs via Groq Whisper V3 Turbo, and stores results with full history. Supports files well beyond standard serverless limits.

![Transcriptor Upload — File drop zone and language picker](docs/images/transcriptor-upload.png)

![Transcriptor Viewer — Detail sidebar and full transcript content](docs/images/transcriptor-viewer.png)

---

### Audio Converter

Stream-based MP4-to-MP3 extraction using FFmpeg. Jobs are queued via BullMQ, processed asynchronously, and cleaned up automatically. No data is persisted to the database.

![Audio Converter](docs/images/audio-converter.png)

---

### Exam Prep Generator

Generates structured practice material from existing notes or transcripts. Fully configurable question types (True/False, MCQ, Theory, Scenario, Calculation) and difficulty levels. Available for both individual users and group workspaces with shared cost splitting.

![Exam Prep Create — Note picker, question type toggles, difficulty selector](docs/images/exam-prep-new.png)

![Exam Prep List — Group and individual entries with question type badges](docs/images/exam-prep-list.png)

The viewer presents questions in a two-panel layout — filter by question type on the left, read and reveal answers on the right.

![Exam Prep Viewer — Two-panel layout with type filter sidebar and questions](docs/images/exam-prep-viewer.png)

![Exam Prep Viewer — Fullscreen mode](docs/images/exam-prep-fullscreen.png)

---

### Group Workspaces

Users can create and join groups with fixed-tier pricing (small / study / class / faculty). Costs are split across `max_members` at generation time, with the generator receiving a platform-subsidized discount. Membership is snapshotted at the time of generation.

![Groups](docs/images/groups.png)

---

### Top-Up & Billing

Credit-based system. Users upload bank transfer slips which are auto-verified via EasySlip API. Failed or unverified slips fall through to admin manual review. LINE messaging integration notifies users of approval status.

![Top-Up — Slip upload and balance view](docs/images/topup.png)

---

### Admin Dashboard

Full visibility into platform activity: user list, per-user balance and usage, pending top-up queue with slip viewer, and approve/reject controls.

![Admin Dashboard](docs/images/admin.png)

---

## Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI:** React 19, Tailwind CSS v4, Framer Motion / Motion
- **Editor:** `@uiw/react-md-editor`

### Backend
- **Runtime:** Node.js on Ubuntu 24.04 VPS
- **API:** Next.js API Routes
- **Database:** PostgreSQL (self-hosted, Hetzner CX22) via postgres.js
- **Queue:** BullMQ + self-hosted Redis
- **Storage:** Cloudflare R2 (media files, bank slips)
- **Auth:** NextAuth.js (Google OAuth)

### AI / ML
- **Notes generation:** OpenRouter
- **Exam prep generation:** OpenRouter
- **Transcription:** Groq Whisper V3 Turbo

### Infrastructure
- **VPS:** Hetzner (built-in DDoS protection, outbound-only bandwidth)
- **Web Server:** Nginx (reverse proxy, 10GB upload limit)
- **Process Manager:** PM2
- **Backups:** `pg_dump` cron → Cloudflare R2 (7-day retention)

---

## Architecture

```
Nginx (TLS termination, upload limit)
    └── Next.js App (port 3000)
            ├── API Routes (note, transcript, exam-prep, topup, admin, group)
            └── BullMQ Producers
                    ├── audio-worker          (FFmpeg conversion)
                    ├── transcriptor-worker   (Groq Whisper, chunked)
                    └── topup-worker          (EasySlip verification, LINE notify)

Self-hosted Redis  ←→  BullMQ Workers
PostgreSQL (postgres.js)
Cloudflare R2 (audio dumps, bank slips)
```

---

## Database Schema

Tables: `user`, `note`, `note_access`, `transcript`, `exam_prep`, `pending_topups`, `activity`

Key design decisions:
- `activity` tracks token consumption, model used, charge amount, and `balance_after` for a full audit trail
- `note_access` snapshots group membership at generation time — changes to group size after the fact do not affect past cost splits
- `pending_topups` stores slip R2 keys and EasySlip `transRef` for deduplication

---

## Pricing

| Feature | Tier | Price |
|---|---|---|
| Notes | < 25k tokens | ฿3 |
| Notes | 25k–50k tokens | ฿6 |
| Notes | 50k–75k tokens | ฿10 |
| Notes | 100k+ tokens | ฿13 |
| Transcription | < 1 hour | ฿2 |
| Transcription | 1–2 hours | ฿4 |
| Transcription | 2–3 hours | ฿6 |
| Transcription | 3+ hours | hours × 1.40 × 1.2 (rounded) |

---

## License

Private / Proprietary.
Built for survival.

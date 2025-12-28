# ⟡ Eidolon
> **The Student Survival Kit.**
> Automated lecture processing, transcription, and document generation for high-stakes academic environments.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![Puppeteer](https://img.shields.io/badge/Puppeteer-PDF-green?style=for-the-badge&logo=puppeteer)
![FFmpeg](https://img.shields.io/badge/FFmpeg-Media-green?style=for-the-badge&logo=ffmpeg)

---

## 📖 Overview

**Eidolon** is a comprehensive academic utility platform designed to streamline the "lecture-to-study" pipeline. It replaces manual note-taking with an automated workflow that ingests raw transcripts, video, or audio, and outputs structured, study-ready materials.

Currently deployed on a custom VPS infrastructure to support large-scale media processing (5GB+ files) and heavily used by students for open-book exam preparation.

---

## 🚀 Key Features

### 1. 📝 Intelligent Note Taker
Transforms raw, messy `.txt` lecture transcripts into structured Markdown notes.
* **Smart Tagging:** Auto-detects headings, highlights key points, and flags "To-Do" items mentioned by professors.
* **Definition Extraction:** Automatically pulls definitions into a dedicated section.
* **Auto-Summarization:** Generates a concise summary with extracted key terms.
* **Visual Themes:** Exports notes to PDF in **Academic**, **Minimal**, or **Creative** styles.

### 2. 🎙️ Media Studio (New)
* **MP4 to MP3 Converter:** High-performance, stream-based extraction of audio from lecture recordings. (Does not persist data to DB to save storage).
* **Whisper Transcription:** Integrates **Groq's Whisper V3 Turbo** for near-instant transcription of audio files into text.

### 3. 📄 Document Generator
* **Essay/Proposal Writer:** Generates long-form content for proposals or essays based on prompts.
* **Textbook Explainer:** Ingests PDF textbooks and simplifies complex concepts.

---

## 🛠️ Tech Stack

### Frontend
* **Framework:** Next.js 15 (App Router)
* **UI Library:** React 19
* **Styling:** Tailwind CSS + Framer Motion (Animations)
* **Editor:** `@uiw/react-md-editor`

### Backend
* **Runtime:** Node.js (VPS Optimized)
* **PDF Engine:** Puppeteer (Standard Linux Build)
* **Database:** MySQL (via Drizzle ORM)
* **AI/ML:** Groq SDK (Whisper V3 Turbo)
* **Media Processing:** FFmpeg (System Level)

### Infrastructure
* **Hosting:** Ubuntu 24.04 VPS
* **Web Server:** Nginx (Custom Reverse Proxy)
* **Process Manager:** PM2

---

## ⚙️ VPS & Deployment Constraints

Eidolon runs on a **custom VPS environment** rather than Vercel/Serverless due to heavy computation requirements:

1.  **Puppeteer:** Uses a full headless Chrome instance (not the limited AWS Lambda version) for high-fidelity PDF rendering.
2.  **FFmpeg:** Requires system-level access for video conversion.
3.  **Upload Limits:** Nginx is configured to bypass standard 100MB limits, allowing **up to 5GB** uploads for lecture recordings.

---

## 🔧 Installation

### Prerequisites
* Node.js 20+
* FFmpeg (`sudo apt install ffmpeg`)
* System libraries for Puppeteer (libasound2, libnss3, etc.)

### 1. Clone & Install

    git clone https://github.com/yourusername/eidolon.git
    cd eidolon
    npm install

### 2. Configure Environment (.env)
Create a `.env` file in the root:

    # App
    NEXT_PUBLIC_API_URL=https://eidolon.yourdomain.com
    NEXTAUTH_URL=https://eidolon.yourdomain.com
    NEXTAUTH_SECRET=your_generated_secret

    # AI Providers
    GROQ_API_KEY=gsk_your_groq_key_here

    # Database
    DATABASE_URL=mysql://user:pass@localhost:3306/eidolon

### 3. Build & Run

    npm run build
    pm2 start npm --name "eidolon" -- start -- -p 3002

---

## 📂 Nginx Configuration (Critical)

To support large file uploads (Video/Audio) and long AI timeouts, the Nginx block includes specific optimizations:

    server {
        # Allow 5GB uploads for video lectures
        client_max_body_size 5G;
        
        # 10-minute timeout for AI Transcription/PDF Gen
        proxy_read_timeout 600s;
        
        location / {
            # Streaming optimizations
            proxy_request_buffering off;
            proxy_pass http://localhost:3002;
        }
    }

---

## 🛡️ License
Private / Proprietary. 
Built for survival.

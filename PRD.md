# FormForward — Product Requirements Document (PRD)

## 1. Product Overview

**FormForward** is an AI-powered running form coaching platform that combines wearable sensor data, computer vision analysis, biomechanical research extraction, and large language model coaching into a unified, privacy-first pipeline.

### Vision Statement
> Democratize elite-level running form analysis by making biomechanical coaching accessible to every runner — all processed locally, all data private.

### Core Differentiator
FormForward is the first platform to seamlessly chain **PDF research extraction (PaddleOCR) → Computer Vision pose analysis (MediaPipe) → Large Language Model coaching (Gemma 4)** into a single-click pipeline that produces personalized, research-backed form corrections.

---

## 2. Target Users

| Persona | Description |
|---|---|
| **Recreational Runner** | Runs 3–5 times/week, wants to improve form to prevent injuries and run faster |
| **Competitive Athlete** | Training for races, needs data-driven biomechanical feedback on their running economy |
| **Running Coach** | Manages athletes and needs a tool to analyze form from video + wearable data |
| **Sports Researcher** | Studies biomechanics and wants to feed published research into an ML coaching pipeline |

---

## 3. Core Features

### 3.1 Wearable Data Analysis
- **Import**: CSV, GPX file upload or sample data
- **Metrics**: Cadence, vertical oscillation, ground contact time, stride length, pace, heart rate, elevation, GCT balance
- **Breakdowns**: Automated detection of cadence collapse, vertical spikes, ground contact drift, stride overextension, fatigue risk
- **POSE Method Mapping**: Maps detected breakdown events to actionable coaching patterns

### 3.2 Computer Vision Pipeline (MediaPipe → Biomechanical Angles)
- **Pose Estimation**: MediaPipe Pose Landmarker (33-point skeleton detection)
- **Angle Extraction**: 12 biomechanical metrics per frame (head, trunk, knee, elbow, shank, arm swing, hip, overstride, hip drop, vertical oscillation, stride width)
- **3-Tier Grading**: Good / Needs Improvement / Bad classification for each metric
- **Gait Analysis**: Phase detection, form degradation tracking, L/R symmetry analysis
- **Video Sources**: Upload MP4 or live camera capture

### 3.3 Research Ingestion Pipeline
- **Web Scraping**: Scrapy-powered URL scraping for running form articles and research
- **PDF Analysis**: PaddleOCR-powered extraction of biomechanical research papers
- **Data Collation**: Aggregates multiple research sources for ML training context

### 3.4 Unified AI Coaching Pipeline (★ Core Innovation)
- **Endpoint**: `/api/analyze-form` — single API call chains all stages:
  1. PDF text extraction via PaddleOCR (if PDF provided)
  2. Structured prompt construction from wearable data + CV analysis + research
  3. Gemma 4 vision-language model coaching generation
  4. Structured JSON output with optimal angles + form adjustments
- **Output Includes**:
  - `correction_cue`: One-sentence form correction
  - `drill`: Specific drill prescription
  - `next_run_focus`: Next run focus area
  - `visual_observations`: Video/pose analysis synthesis
  - `research_notes`: Research-backed recommendations
  - `optimal_angles`: Per-body-part current vs. optimal angle comparison
  - `form_adjustments`: Prioritized body-part corrections

### 3.5 Optimal Form Visualization
- **Runner Image**: AI-generated reference image showing ideal POSE running form
- **Angle Overlays**: Dynamic annotations showing current vs. optimal angles per body part
- **Adjustment Cards**: Prioritized form correction cards (high/medium/low priority)
- **Pipeline Status**: Real-time badge showing processing stage

### 3.6 Dashboard
- Summary cards (duration, distance, pace, cadence, form score, breakdown count)
- Compact event preview with deep-dive links
- Coaching insights preview
- Metric coverage detection
- Optimal form blueprint panel

---

## 4. Technical Architecture

### Frontend
- **Stack**: Vanilla HTML + CSS + JavaScript (ES modules)
- **Design System**: Dark mode, Electric Cyan accent, Inter font, glassmorphism effects
- **Navigation**: Tab-based SPA (Dashboard, Analysis, Improvements, Breakdowns, Video, Research, History, AI Coach)

### Backend
- **Runtime**: Node.js (native HTTP server)
- **Endpoints**:
  | Route | Method | Purpose |
  |---|---|---|
  | `/api/analyze-form` | POST | Unified pipeline: PDF → Gemma 4 → form output |
  | `/api/gemma` | POST | Direct Ollama/Gemma proxy |
  | `/api/research` | POST | Web URL scraping |
  | `/api/scrape-pdf` | POST | Standalone PDF OCR extraction |

### ML / AI Components
- **Pose Estimation**: MediaPipe Pose Landmarker (client-side, GPU-accelerated)
- **OCR**: PaddleOCR (server-side Python)
- **LLM**: Gemma 4 via Ollama (local inference)

### Dependencies
- **Frontend**: MediaPipe Tasks Vision (CDN)
- **Backend**: Node.js 20+, Python 3.10+, PaddleOCR, pdf2image, Ollama

---

## 5. Privacy & Security

- **Local-first**: All data processing happens on the user's machine
- **No cloud uploads**: Video frames, wearable data, and research PDFs never leave the device
- **Ollama integration**: LLM inference runs locally via Ollama
- **Proxy wording**: AI outputs use cautious, proxy-based language — no injury diagnoses

---

## 6. Success Metrics

| Metric | Target |
|---|---|
| Pipeline end-to-end latency | < 30s (PDF + Gemma 4) |
| Pose detection accuracy | > 85% landmark visibility |
| Form score correlation | Validated against manual POSE assessment |
| User engagement | Pipeline completion rate > 60% |

---

## 7. Roadmap

### Phase 1 — Current (Rockathon 2026)
- [x] Wearable data analysis (CSV/GPX)
- [x] MediaPipe pose estimation + biomechanical angles
- [x] PaddleOCR PDF extraction
- [x] Web scraping pipeline
- [x] Unified PDF → Gemma 4 pipeline
- [x] Optimal form visualization with angle overlays
- [x] Flutter companion app (iOS/Android)

### Phase 2 — Post-Launch
- [ ] Real-time live camera coaching with per-frame Gemma 4 feedback
- [ ] FIT file import (Garmin native format)
- [ ] Multi-run longitudinal tracking and form progression graphs
- [ ] Fine-tuned Gemma 4 model on curated biomechanics dataset
- [ ] Wearable device direct sync (Garmin Connect API)

### Phase 3 — Scale
- [ ] Team/coach dashboard for managing multiple athletes
- [ ] Strava/TrainingPeaks integration
- [ ] On-device Edge TPU inference for sub-second pose estimation
- [ ] Published biomechanical research dataset contribution

---

## 8. Appendix

### POSE Method Reference
The POSE Method (developed by Dr. Nicholas Romanov) emphasizes three key elements:
1. **Pose** — The running pose position with support on one leg
2. **Fall** — Using gravity by leaning forward from the ankles
3. **Pull** — Pulling the support foot from the ground using hamstrings

### Biomechanical Angle Ranges (3-Tier Grading)
| Metric | Good | Needs Improvement | Bad |
|---|---|---|---|
| Head Angle | 80–110° | 65–80° or 110–120° | <65° or >120° |
| Trunk Lean | 5–15° | 1–5° or 15–17° | <1° or >17° |
| Elbow Angle | 60–90° | 53–60° or 90–95° | <53° or >95° |
| Shank Angle | ≤10° | 10–15° | >15° |
| Hip-Ankle | ≤15° | 15–20° | >20° |
| Hip Drop | <3% | 3–5% | >5% |

import { initVision, isReady as visionReady, detectPose, computeAngles, assessForm, drawSkeleton, buildVisionPayload, analyzeGaitCycle } from "./vision.js";

const METRICS = {
  cadence: { label: "Cadence", unit: "spm", color: "#ff9b83", aliases: ["cadence", "runcadence", "cadencespm", "spm"] },
  verticalOscillation: { label: "Vertical oscillation", unit: "mm", color: "#8f96ff", aliases: ["verticaloscillation", "verticaloscillationmm", "vo"] },
  groundContactTime: { label: "Ground contact time", unit: "ms", color: "#f3a12b", aliases: ["groundcontacttime", "groundcontacttimems", "gct"] },
  strideLength: { label: "Stride length", unit: "m", color: "#7ed6af", aliases: ["stridelength", "stridelengthm", "stride"] },
  pace: { label: "Pace", unit: "min/km", color: "#f36b6d", aliases: ["pace", "paceminkm"] },
  heartRate: { label: "Heart rate", unit: "bpm", color: "#ff6f91", aliases: ["heartrate", "hr", "bpm"] },
  elevation: { label: "Elevation", unit: "m", color: "#c7bfb7", aliases: ["elevation", "altitude", "elevationm"] },
  gctBalance: { label: "GCT balance", unit: "% left", color: "#75d0e8", aliases: ["gctbalance", "groundcontactbalance", "groundcontacttimebalance"] }
};
const METRIC_KEYS = Object.keys(METRICS);
const DEFAULT_MODEL = "gemma4:latest";
const DEFAULT_RESEARCH_URLS = [
  "https://posemethod.com/running/",
  "https://www8.garmin.com/manuals/webhelp/GUID-0221611A-992D-495E-8DED-1DD448F7A066/EN-US/GUID-62A09512-518A-424A-8491-FE2B80CD2091.html",
  "https://docs.ollama.com/capabilities/vision",
  "https://ai.google.dev/gemma/docs/capabilities/vision/video-understanding"
].join("\n");
const SAMPLE_CSV = `time,cadence,vertical_oscillation_mm,ground_contact_time_ms,stride_length_m,pace,heart_rate,elevation,gct_balance
0:00,178,78,232,0.95,5:17,142,22,50.2
1:00,178,78,231,0.96,5:14,145,23,50.3
2:00,179,78,232,0.95,5:13,147,24,50.4
3:00,177,78,234,0.96,5:16,149,25,50.6
4:00,177,79,234,0.96,5:15,151,26,50.5
5:00,177,80,237,0.97,5:18,153,27,50.9
6:00,175,82,241,0.98,5:22,156,28,51.2
7:00,173,84,246,0.99,5:26,160,29,51.7
8:00,170,87,252,1.00,5:29,164,30,52.4
9:00,168,91,259,1.01,5:33,168,31,53.5
10:00,165,94,266,1.02,5:38,172,32,54.5
11:00,163,96,272,1.03,5:43,176,33,55.6
12:00,161,98,279,1.04,5:47,180,34,56.2
13:00,160,99,282,1.05,5:50,181,34,56.6`;

const state = {
  activeTab: "dashboard",
  activeMetric: "cadence",
  analysis: null,
  sourceName: "Sample CSV run",
  video: { name: "", previewUrl: "", frames: [], status: "No video loaded" },
  research: { sources: [], status: "Idle", running: false },
  gemma: { status: "Idle", output: null, error: null, running: false },
  vision: { ready: false, frameAnalyses: [], status: "Initializing" }
};

const el = {
  tabBar: qs("#tabBar"),
  fileInput: qs("#fileInput"),
  loadSampleButton: qs("#loadSampleButton"),
  loadSampleGpxButton: qs("#loadSampleGpxButton"),
  sourceName: qs("#sourceName"),
  summaryGrid: qs("#summaryGrid"),
  compactEventList: qs("#compactEventList"),
  compactCoachList: qs("#compactCoachList"),
  metricTabs: qs("#metricTabs"),
  chartTitle: qs("#chartTitle"),
  metricChart: qs("#metricChart"),
  legendRow: qs("#legendRow"),
  eventList: qs("#eventList"),
  videoInput: qs("#videoInput"),
  liveTrackingButton: qs("#liveTrackingButton"),
  videoPreview: qs("#videoPreview"),
  videoStatus: qs("#videoStatus"),
  frameStrip: qs("#frameStrip"),
  researchUrls: qs("#researchUrls"),
  researchButton: qs("#researchButton"),
  researchStatus: qs("#researchStatus"),
  researchList: qs("#researchList"),
  generateGemmaButton: qs("#generateGemmaButton"),
  gemmaModelInput: qs("#gemmaModelInput"),
  gemmaStatus: qs("#gemmaStatus"),
  gemmaOutput: qs("#gemmaOutput"),
  coachList: qs("#coachList"),
  payloadOutput: qs("#payloadOutput"),
  copyPayloadButton: qs("#copyPayloadButton"),
  availableMetrics: qs("#availableMetrics"),
  missingMetrics: qs("#missingMetrics"),
  analyzeVisionButton: qs("#analyzeVisionButton"),
  poseDetectionStatus: qs("#poseDetectionStatus"),
  angleAnalysisStatus: qs("#angleAnalysisStatus"),
  formClassStatus: qs("#formClassStatus"),
  visionPanel: qs("#visionPanel"),
  poseFrameStrip: qs("#poseFrameStrip"),
  anglePanel: qs("#anglePanel"),
  angleGrid: qs("#angleGrid"),
  assessmentPanel: qs("#assessmentPanel"),
  formScoreBadge: qs("#formScoreBadge"),
  assessmentColumns: qs("#assessmentColumns"),
  pdfInput: qs("#pdfInput"),
  analyzePdfButton: qs("#analyzePdfButton"),
  trainDataInput: qs("#trainDataInput"),
  startTrainingButton: qs("#startTrainingButton"),
  // Optimal form panel
  optimalFormSection: qs("#optimalFormSection"),
  optimalFormImage: qs("#optimalFormImage"),
  formAngleOverlays: qs("#formAngleOverlays"),
  formAdjustmentsPanel: qs("#formAdjustmentsPanel"),
  adjustmentList: qs("#adjustmentList"),
  adjustmentSource: qs("#adjustmentSource"),
  pipelineBadge: qs("#pipelineBadge"),
  runFullPipelineButton: qs("#runFullPipelineButton")
};

el.gemmaModelInput.value = DEFAULT_MODEL;

// Initialize vision pipeline
initVision().then((ok) => {
  state.vision.ready = ok;
  const stages = document.querySelectorAll(".pipeline-stage");
  if (ok) {
    el.poseDetectionStatus.textContent = "MediaPipe Pose Landmarker ready";
    stages[0]?.classList.add("done");
  } else {
    el.poseDetectionStatus.textContent = "Unavailable — Gemma vision fallback";
    stages[0]?.classList.add("error");
  }
});
el.researchUrls.value = DEFAULT_RESEARCH_URLS;
el.fileInput.addEventListener("change", async ({ target }) => {
  const [file] = target.files;
  if (!file) return;
  loadActivity(await file.text(), file.name);
});
el.loadSampleButton.addEventListener("click", () => loadActivity(SAMPLE_CSV, "Sample CSV run"));
el.loadSampleGpxButton.addEventListener("click", () => loadActivity(buildSampleGpx(), "Sample GPX run"));
el.liveTrackingButton?.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    el.videoPreview.srcObject = stream;
    el.videoPreview.hidden = false;
    el.videoPreview.play();
    el.videoStatus.textContent = "Live tracking active...";
    el.analyzeVisionButton.disabled = false;
  } catch (err) {
    el.videoStatus.textContent = "Camera access denied or unavailable.";
  }
});
el.videoInput.addEventListener("change", async ({ target }) => {
  const [file] = target.files;
  if (file) await handleVideoUpload(file);
});
el.analyzeVisionButton.addEventListener("click", runVisionAnalysis);
el.researchButton.addEventListener("click", gatherResearch);
el.analyzePdfButton.addEventListener("click", analyzePdf);
el.startTrainingButton.addEventListener("click", startTraining);
el.runFullPipelineButton?.addEventListener("click", runFullPipeline);
el.copyPayloadButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(JSON.stringify(buildReport(), null, 2));
  el.copyPayloadButton.textContent = "Copied";
  setTimeout(() => { el.copyPayloadButton.textContent = "Copy JSON"; }, 1200);
});
el.generateGemmaButton.addEventListener("click", generateGemma);

// Tab switching
el.tabBar.addEventListener("click", ({ target }) => {
  const tab = target.closest(".tab");
  if (!tab) return;
  switchTab(tab.dataset.tab);
});
// Deep-dive links on dashboard
document.querySelectorAll(".deep-dive-link").forEach((link) => {
  link.addEventListener("click", () => switchTab(link.dataset.goto));
});

function switchTab(tabId) {
  state.activeTab = tabId;
  el.tabBar.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tabId));
  document.querySelectorAll(".tab-pane").forEach((p) => {
    const isActive = p.dataset.pane === tabId;
    p.classList.toggle("active", isActive);
    if (isActive) p.style.animation = "none", p.offsetHeight, p.style.animation = "";
  });
  if (tabId === "charts" && state.analysis) { renderMetricTabs(); renderChart(); }
}

loadActivity(SAMPLE_CSV, "Sample CSV run");

function loadActivity(text, name) {
  const parsed = parseActivity(text, name);
  if (!parsed.rows.length) {
    window.alert("No usable activity samples were found.");
    return;
  }
  state.analysis = analyzeRun(parsed.rows);
  state.sourceName = `${name} (${parsed.type})`;
  state.gemma = { status: "Idle", output: null, error: null, running: false };
  if (!state.analysis.availableMetrics.includes(state.activeMetric)) state.activeMetric = state.analysis.availableMetrics[0] || "cadence";
  render();
}

function parseActivity(text, name) {
  if (name.toLowerCase().endsWith(".gpx") || text.trimStart().startsWith("<")) return { type: "GPX", rows: parseGpx(text) };
  if (name.toLowerCase().endsWith(".fit")) throw new Error("FIT import is planned next. Use GPX or CSV for this demo.");
  return { type: "CSV", rows: parseCsv(text) };
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines.shift() || "");
  return lines.map((line) => Object.fromEntries(splitCsvLine(line).map((value, index) => [headers[index], value])));
}

function splitCsvLine(line) {
  const cells = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\"") quoted = !quoted;
    else if (char === "," && !quoted) {
      cells.push(value.trim());
      value = "";
    } else value += char;
  }
  cells.push(value.trim());
  return cells;
}

function parseGpx(text) {
  const points = [...text.matchAll(/<(?:(?:[\w-]+):)?trkpt\b([^>]*)>([\s\S]*?)<\/(?:(?:[\w-]+):)?trkpt>/gi)].map((match) => {
    const body = match[2];
    return {
      time: tag(body, "time"),
      elevation: number(tag(body, "ele")),
      heart_rate: firstNumber(body, ["hr", "heartRate"]),
      cadence: normalizeCadence(firstNumber(body, ["cad", "cadence"])),
      vertical_oscillation_mm: firstNumber(body, ["VerticalOscillation", "verticalOscillation"]),
      ground_contact_time_ms: firstNumber(body, ["GroundContactTime", "groundContactTime"]),
      stride_length_m: firstNumber(body, ["StrideLength", "strideLength"]),
      gct_balance: firstNumber(body, ["GroundContactBalance", "gctBalance"])
    };
  });
  return points;
}

function analyzeRun(rows) {
  const samples = normalizeRows(rows);
  const windows = buildWindows(samples);
  const baseline = {};
  const early = windows.slice(0, Math.min(4, windows.length));
  METRIC_KEYS.forEach((key) => { baseline[key] = avg(early.map((window) => window[key])); });
  const events = detectEvents(windows, baseline);
  const patterns = mapPatterns(events);
  const availableMetrics = METRIC_KEYS.filter((key) => samples.some((sample) => Number.isFinite(sample[key])));
  const summary = summarize(samples, events, patterns);
  return { samples, windows, baseline, events, patterns, availableMetrics, missingMetrics: METRIC_KEYS.filter((key) => !availableMetrics.includes(key)), summary, gemmaPayload: buildGemmaPayload(summary, events, patterns, availableMetrics) };
}

function normalizeRows(rows) {
  if (!rows.length) return [];
  const headers = Object.keys(rows[0]);
  const headerMap = {};
  headers.forEach((header) => {
    const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (["time", "timestamp", "elapsedtime"].includes(normalized)) headerMap.time = header;
    METRIC_KEYS.forEach((key) => { if (METRICS[key].aliases.includes(normalized)) headerMap[key] = header; });
  });
  let firstDate = null;
  return rows.map((row, index) => {
    const parsedTime = parseTime(row[headerMap.time] ?? String(index), firstDate);
    if (parsedTime.date && !firstDate) firstDate = parsedTime.date;
    return Object.fromEntries([
      ["timeSeconds", parsedTime.seconds ?? index],
      ...METRIC_KEYS.map((key) => [key, key === "pace" ? parsePace(row[headerMap[key]]) : number(row[headerMap[key]])])
    ]);
  }).sort((a, b) => a.timeSeconds - b.timeSeconds);
}

function buildWindows(samples) {
  const groups = new Map();
  samples.forEach((sample) => {
    const bucket = Math.floor(sample.timeSeconds / 60);
    if (!groups.has(bucket)) groups.set(bucket, []);
    groups.get(bucket).push(sample);
  });
  return [...groups.entries()].map(([index, group]) => Object.fromEntries([
    ["startSeconds", index * 60],
    ["endSeconds", index * 60 + 60],
    ...METRIC_KEYS.map((key) => [key, avg(group.map((sample) => sample[key]))])
  ]));
}

function detectEvents(windows, baseline) {
  const events = [];
  windows.forEach((window) => {
    const checks = [
      ["cadence_collapse", "Cadence collapse", Number.isFinite(baseline.cadence - window.cadence) && baseline.cadence - window.cadence > 8, `${Math.round(baseline.cadence - window.cadence)} spm below baseline`],
      ["vertical_spike", "Vertical oscillation spike", pct(window.verticalOscillation, baseline.verticalOscillation) > 15, `${Math.round(pct(window.verticalOscillation, baseline.verticalOscillation))}% above baseline`],
      ["gct_drift", "Ground contact drift", pct(window.groundContactTime, baseline.groundContactTime) > 8 || Math.abs((window.gctBalance || 50) - 50) > 4, "Longer or asymmetric ground contact"],
      ["stride_overextension", "Stride overextension", pct(window.strideLength, baseline.strideLength) > 3 && baseline.cadence - window.cadence > 6, "Stride length rising while cadence falls"],
      ["fatigue_risk", "Fatigue form risk", pct(window.heartRate, baseline.heartRate) > 8 && baseline.cadence - window.cadence > 4, "Heart rate rising while rhythm fades"]
    ];
    checks.forEach(([type, label, active, signal]) => {
      if (active) events.push({ id: `event-${events.length + 1}`, type, label, startSeconds: window.startSeconds, endSeconds: window.endSeconds, severity: type === "stride_overextension" || type === "gct_drift" ? 3 : 2, signals: [signal] });
    });
  });
  return events;
}

function mapPatterns(events) {
  const patterns = [];
  if (events.some((event) => event.type === "stride_overextension" || event.type === "cadence_collapse")) {
    patterns.push({ title: "Probable overstriding", confidence: "likely", severity: 3, evidence: collectEvidence(events, ["stride_overextension", "cadence_collapse"]), cue: "Your metrics suggest you may be reaching ahead as fatigue builds. Keep the foot landing under the hip.", drill: "5 minutes of wall-fall pulls, then 3 x 90 seconds of relaxed quick cadence.", nextRunFocus: "Hold cadence within 4 spm of your early-run rhythm for the first 15 minutes." });
  }
  if (events.some((event) => event.type === "vertical_spike")) {
    patterns.push({ title: "Excess vertical bounce", confidence: "possible", severity: 2, evidence: collectEvidence(events, ["vertical_spike"]), cue: "Your metrics suggest more energy is moving upward than forward. Think quiet head and forward fall.", drill: "6 x 20 seconds quick-feet strides on flat ground.", nextRunFocus: "Check for quiet shoulders and light ground contact after every kilometer." });
  }
  if (events.some((event) => event.type === "gct_drift")) {
    patterns.push({ title: "Late pull from support", confidence: "possible", severity: 3, evidence: collectEvidence(events, ["gct_drift"]), cue: "Your metrics suggest your support foot may be staying down too long. Pull sooner instead of pushing back.", drill: "3 x 60 seconds in-place Pose pulls, then 60 seconds easy jog.", nextRunFocus: "When effort rises, cue pull-pull-pull for 30 seconds before changing pace." });
  }
  if (events.some((event) => event.type === "fatigue_risk")) {
    patterns.push({ title: "Fatigue load affecting form", confidence: "possible", severity: 2, evidence: collectEvidence(events, ["fatigue_risk"]), cue: "Your metrics suggest effort climbed while mechanics softened. Protect form before speed.", drill: "5 minutes cadence resets: 20 seconds brisk rhythm, 40 seconds relaxed jog.", nextRunFocus: "If heart rate rises sharply, reduce pace first and protect cadence second." });
  }
  return patterns;
}

function summarize(samples, events, patterns) {
  const durationSeconds = samples.at(-1).timeSeconds - samples[0].timeSeconds;
  const score = Math.max(35, Math.round(100 - Math.min(55, events.reduce((sum, event) => sum + event.severity * 4, 0))));
  return {
    durationSeconds,
    distanceKm: estimateDistance(samples),
    averagePace: avg(samples.map((sample) => sample.pace)),
    averageCadence: avg(samples.map((sample) => sample.cadence)),
    formHealthScore: score,
    eventCount: events.length,
    coachingCardCount: patterns.length
  };
}

function buildGemmaPayload(summary, events, patterns, availableMetrics) {
  return {
    app: "FormForward",
    guardrail: "Use cautious proxy-based wording. Do not diagnose injuries or claim certainty from wearable data or video frames.",
    run_summary: {
      duration: formatDuration(summary.durationSeconds),
      distance_km: round(summary.distanceKm, 2),
      average_pace_min_per_km: round(summary.averagePace, 2),
      average_cadence_spm: round(summary.averageCadence),
      form_health_score: summary.formHealthScore
    },
    metric_coverage: { available: availableMetrics },
    breakdown_events: events.map((event) => ({ id: event.id, type: event.type, timestamp: formatDuration(event.startSeconds), severity: event.severity, signals: event.signals })),
    pose_mappings: patterns.map((pattern) => ({ title: pattern.title, confidence: pattern.confidence, severity: pattern.severity, evidence: pattern.evidence, requested_output: { correction_cue: pattern.cue, drill: pattern.drill, next_run_focus: pattern.nextRunFocus } }))
  };
}

function render() {
  el.sourceName.textContent = state.sourceName;
  renderSummary();
  renderCompactEvents();
  renderCompactCoach();
  renderMetricTabs();
  renderChart();
  renderEvents();
  renderCoach();
  renderVideo();
  renderResearch();
  renderGemma();
  renderPayload();
  renderCoverage();
}

function renderSummary() {
  const s = state.analysis.summary;
  el.summaryGrid.innerHTML = [["Duration", formatDuration(s.durationSeconds)], ["Distance", `${s.distanceKm.toFixed(2)} km`], ["Avg pace", `${formatMetric(s.averagePace, "pace")} /km`], ["Avg cadence", `${formatMetric(s.averageCadence, "cadence")} spm`], ["Form score", `${s.formHealthScore}/100`], ["Breakdowns", String(s.eventCount)]]
    .map(([label, value]) => `<article class="summary-card"><span>${label}</span><strong>${value}</strong></article>`).join("");
}

function renderCompactEvents() {
  const events = state.analysis.events.slice(0, 4);
  el.compactEventList.innerHTML = events.length
    ? events.map((event) => `<div class="compact-event-item"><span class="severity-pill severity-${event.severity}">S${event.severity}</span><strong>${event.label}</strong><time>${formatDuration(event.startSeconds)}</time></div>`).join("") + (state.analysis.events.length > 4 ? `<div class="compact-event-item" style="justify-content:center;color:var(--muted);font-weight:850;font-size:0.84rem;">+${state.analysis.events.length - 4} more — deep dive to see all</div>` : "")
    : `<p class="empty-state">No breakdown clusters detected.</p>`;
}

function renderCompactCoach() {
  const patterns = state.analysis.patterns.slice(0, 3);
  el.compactCoachList.innerHTML = patterns.length
    ? patterns.map((p) => `<div class="compact-coach-item"><span class="coach-severity">S${p.severity}</span><div class="coach-info"><h3>${p.title}</h3><p>${p.cue}</p></div><span class="coach-confidence">${p.confidence}</span></div>`).join("")
    : `<p class="empty-state">Run looked stable against the current POSE proxy rules.</p>`;
}

function renderMetricTabs() {
  el.metricTabs.innerHTML = state.analysis.availableMetrics.map((key) => `<button class="${key === state.activeMetric ? "active" : ""}" type="button" data-key="${key}"><span style="background:${METRICS[key].color}"></span>${METRICS[key].label}</button>`).join("");
  el.metricTabs.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
    state.activeMetric = button.dataset.key;
    renderMetricTabs();
    renderChart();
  }));
}

function renderChart() {
  const key = state.activeMetric;
  const metric = METRICS[key];
  const windows = state.analysis.windows.filter((window) => Number.isFinite(window[key]));
  el.chartTitle.textContent = `${metric.label} (${metric.unit})`;
  el.metricChart.innerHTML = "";
  el.metricChart.setAttribute("viewBox", "0 0 720 340");
  if (!windows.length) return;
  const values = windows.map((window) => window[key]);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const spread = Math.max(2, (rawMax - rawMin) * 0.15);
  const yMin = rawMin - spread;
  const yMax = rawMax + spread;
  const chartLeft = 62;
  const chartRight = 686;
  const chartTop = 30;
  const chartHeight = 246;
  const chartBottom = chartTop + chartHeight;
  const maxTime = Math.max(60, windows.at(-1).endSeconds);
  const x = (time) => chartLeft + (time / maxTime) * (chartRight - chartLeft);
  const y = (value) => chartBottom - ((value - yMin) / Math.max(1, yMax - yMin)) * chartHeight;

  appendSvg("rect", { x: 0, y: 0, width: 720, height: 340, rx: 8, class: "chart-bg" });

  // Y-axis grid lines + value labels
  [0, 0.25, 0.5, 0.75, 1].forEach((ratio) => {
    const yPos = chartTop + ratio * chartHeight;
    const val = yMax - ratio * (yMax - yMin);
    appendSvg("line", { x1: chartLeft, y1: yPos, x2: chartRight, y2: yPos, class: "grid-line" });
    appendSvg("text", { x: chartLeft - 6, y: yPos + 4, class: "axis-label axis-y", "text-anchor": "end" }, formatAxisValue(val, key));
  });

  // X-axis time labels
  const totalMinutes = Math.ceil(maxTime / 60);
  const xStep = totalMinutes <= 5 ? 1 : totalMinutes <= 15 ? 2 : totalMinutes <= 30 ? 5 : 10;
  for (let m = 0; m <= totalMinutes; m += xStep) {
    const sec = m * 60;
    if (sec > maxTime) break;
    const xPos = x(sec);
    appendSvg("line", { x1: xPos, y1: chartBottom, x2: xPos, y2: chartBottom + 5, class: "grid-line" });
    appendSvg("text", { x: xPos, y: chartBottom + 18, class: "axis-label axis-x", "text-anchor": "middle" }, `${m}:00`);
  }

  // Event bands
  state.analysis.events.forEach((event) => appendSvg("rect", { x: x(event.startSeconds), y: chartTop, width: Math.max(8, x(event.endSeconds) - x(event.startSeconds)), height: chartHeight, class: `event-band severity-${event.severity}` }));

  // Data line + points
  appendSvg("path", { d: windows.map((window, index) => `${index ? "L" : "M"}${x(window.startSeconds + 30).toFixed(1)},${y(window[key]).toFixed(1)}`).join(" "), fill: "none", stroke: metric.color, "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round" });
  windows.forEach((window) => appendSvg("circle", { cx: x(window.startSeconds + 30), cy: y(window[key]), r: 4, fill: metric.color }));
  el.legendRow.innerHTML = `<span><i style="background:${metric.color}"></i>${metric.label}</span><span><i class="severity-2"></i>Medium</span><span><i class="severity-3"></i>High</span>`;
}

function formatAxisValue(val, key) {
  if (key === "pace") return `${Math.floor(val)}:${String(Math.round((val % 1) * 60)).padStart(2, "0")}`;
  if (key === "strideLength") return val.toFixed(2);
  return String(Math.round(val));
}

function renderEvents() {
  el.eventList.innerHTML = state.analysis.events.length ? state.analysis.events.map((event) => `<article class="event-item"><div><span class="severity-pill severity-${event.severity}">S${event.severity}</span><strong>${event.label}</strong></div><time>${formatDuration(event.startSeconds)} - ${formatDuration(event.endSeconds)}</time><p>${event.signals.join(" / ")}</p></article>`).join("") : `<p class="empty-state">No breakdown clusters detected.</p>`;
}

function renderCoach() {
  el.coachList.innerHTML = state.analysis.patterns.length ? state.analysis.patterns.map((pattern) => `<article class="coach-card"><div class="coach-card-heading"><div><span>${pattern.confidence}</span><h3>${pattern.title}</h3></div><strong>S${pattern.severity}</strong></div><dl><div><dt>Cue</dt><dd>${pattern.cue}</dd></div><div><dt>Drill</dt><dd>${pattern.drill}</dd></div><div><dt>Next run</dt><dd>${pattern.nextRunFocus}</dd></div></dl></article>`).join("") : `<p class="empty-state">Run looked stable against the current POSE proxy rules.</p>`;
}

async function handleVideoUpload(file) {
  if (state.video.previewUrl) URL.revokeObjectURL(state.video.previewUrl);
  state.video = { name: file.name, previewUrl: URL.createObjectURL(file), frames: [], status: "Sampling frames" };
  renderVideo();
  try {
    state.video.frames = await extractVideoFrames(state.video.previewUrl);
    state.video.status = `${state.video.frames.length} frames ready from ${file.name}`;
    el.analyzeVisionButton.disabled = false;
  } catch (error) {
    state.video.status = `Video sampling failed: ${error.message}`;
  }
  renderVideo();
  renderPayload();
}

async function runVisionAnalysis() {
  if (!state.video.frames.length) {
    if (el.videoPreview.srcObject && !el.videoPreview.paused) {
      // Live Tracking is active, capture a frame
      const canvas = document.createElement("canvas");
      canvas.width = el.videoPreview.videoWidth || 640;
      canvas.height = el.videoPreview.videoHeight || 480;
      canvas.getContext("2d").drawImage(el.videoPreview, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.74);
      state.video.frames = [{ label: "Live Capture", dataUrl, base64: dataUrl.split(",")[1] }];
      renderVideo();
    } else {
      return;
    }
  }
  
  el.analyzeVisionButton.disabled = true;
  el.analyzeVisionButton.textContent = "Analyzing…";
  state.vision.frameAnalyses = [];
  const stages = document.querySelectorAll(".pipeline-stage");

  if (visionReady()) {
    el.poseDetectionStatus.textContent = "Detecting poses…";
    el.poseFrameStrip.innerHTML = "";
    el.visionPanel.hidden = false;

    for (const frame of state.video.frames) {
      const img = new Image();
      img.src = frame.dataUrl;
      await new Promise((r) => { img.onload = r; });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const landmarks = detectPose(img);
      const angles = landmarks ? computeAngles(landmarks) : null;
      const assessment = angles ? assessForm(angles) : null;
      if (landmarks) drawSkeleton(canvas, landmarks, assessment?.grades || null);
      state.vision.frameAnalyses.push({ label: frame.label, landmarks, angles, assessment });
      const wrap = document.createElement("div");
      wrap.className = "pose-frame-wrap";
      wrap.appendChild(canvas);
      const lbl = document.createElement("span");
      lbl.className = "pose-frame-label";
      lbl.textContent = frame.label + (landmarks ? " · 33 pts" : " · no pose");
      wrap.appendChild(lbl);
      el.poseFrameStrip.appendChild(wrap);
    }
    el.poseDetectionStatus.textContent = `${state.vision.frameAnalyses.filter((f) => f.landmarks).length}/${state.video.frames.length} poses detected`;
    stages[0]?.classList.add("done");
  } else {
    el.poseDetectionStatus.textContent = "MediaPipe unavailable — using Gemma vision";
    stages[0]?.classList.add("error");
  }

  // Angle analysis
  const withAngles = state.vision.frameAnalyses.filter((f) => f.angles);
  if (withAngles.length) {
    el.angleAnalysisStatus.textContent = `${withAngles.length} frames · 12 metrics per frame`;
    stages[1]?.classList.add("done");
    renderAngleGrid(withAngles);
  } else {
    el.angleAnalysisStatus.textContent = "No pose data for angle computation";
  }

  // Form classification + gait analysis
  const withAssess = state.vision.frameAnalyses.filter((f) => f.assessment?.score);
  if (withAssess.length) {
    el.formClassStatus.textContent = "3-tier grading applied";
    stages[2]?.classList.add("done");
    renderFormAssessment(withAssess);
  } else {
    el.formClassStatus.textContent = "Insufficient data for classification";
  }

  el.analyzeVisionButton.textContent = "Re-analyze";
  el.analyzeVisionButton.disabled = false;
  renderPayload();
}

function renderAngleGrid(analyses) {
  el.anglePanel.hidden = false;
  const last = analyses[analyses.length - 1];
  const a = last.angles;
  const g = last.assessment?.grades || {};
  const gradeClass = (key) => g[key] === "Good" ? "good" : g[key] === "Bad" ? "bad" : g[key] ? "warn" : "";
  const cards = [
    ["Head", a.headAngle, "°", gradeClass("headAngle")],
    ["Trunk Lean", a.trunkAngle, "°", gradeClass("trunkAngle")],
    ["L Knee", a.leftKnee, "°", gradeClass("kneeDrive")],
    ["R Knee", a.rightKnee, "°", gradeClass("kneeDrive")],
    ["L Elbow", a.leftElbow, "°", gradeClass("leftElbow")],
    ["R Elbow", a.rightElbow, "°", gradeClass("rightElbow")],
    ["L Shank", a.leftShank, "°", gradeClass("leftShank")],
    ["R Shank", a.rightShank, "°", gradeClass("rightShank")],
    ["L Foot", a.leftHipAnkle, "°", gradeClass("leftHipAnkle")],
    ["R Foot", a.rightHipAnkle, "°", gradeClass("rightHipAnkle")],
    ["Hip Drop", a.hipDrop, "%", gradeClass("hipDrop")],
    ["Vert. Osc", a.verticalOsc, "", gradeClass("verticalOsc")]
  ];
  el.angleGrid.innerHTML = cards.map(([label, value, unit, cls]) =>
    `<div class="angle-card ${cls}"><span class="angle-label">${label}</span><span class="angle-value">${value ?? "—"}<span class="angle-unit">${unit}</span></span></div>`
  ).join("");
}

function renderFormAssessment(analyses) {
  el.assessmentPanel.hidden = false;
  const allIssues = [];
  const allStrengths = [];
  analyses.forEach((a) => {
    a.assessment.issues.forEach((i) => { const key = typeof i === "string" ? i : i.label; if (!allIssues.find((x) => (typeof x === "string" ? x : x.label) === key)) allIssues.push(i); });
    a.assessment.strengths.forEach((s) => { if (!allStrengths.includes(s)) allStrengths.push(s); });
  });
  const avgScore = Math.round(analyses.reduce((s, a) => s + a.assessment.score, 0) / analyses.length);
  const tier = avgScore >= 75 ? "high" : avgScore >= 50 ? "mid" : "low";
  el.formScoreBadge.textContent = `${avgScore}/100`;
  el.formScoreBadge.className = `form-score-badge ${tier}`;

  const issueHtml = allIssues.length ? allIssues.map((i) => {
    if (typeof i === "string") return `<div class="assessment-item"><span class="assessment-icon">🔴</span>${escapeHtml(i)}</div>`;
    const gradeTag = i.grade === "Bad" ? "bad" : "warn";
    return `<div class="assessment-item"><span class="grade-tag ${gradeTag}">${i.grade}</span><div><strong>${escapeHtml(i.label)}</strong> (${i.value}°)<p class="rec-text">${escapeHtml(i.recommendation)}</p></div></div>`;
  }).join("") : '<div class="assessment-item"><span class="assessment-icon">✅</span>No issues detected</div>';

  const strengthHtml = allStrengths.length ? allStrengths.map((s) =>
    `<div class="assessment-item"><span class="assessment-icon">🟢</span>${escapeHtml(s)}</div>`
  ).join("") : '<div class="assessment-item"><span class="assessment-icon">—</span>Upload video for analysis</div>';

  // Gait analysis section
  const gait = analyzeGaitCycle(state.vision.frameAnalyses);
  let gaitHtml = "";
  if (gait) {
    const d = gait.degradation;
    const arrow = (v) => v > 0 ? "↑" : v < 0 ? "↓" : "→";
    const dCls = (v, invert) => { const bad = invert ? v < 0 : v > 0; return Math.abs(v) < 1 ? "stable" : bad ? "worse" : "better"; };
    gaitHtml = `<div class="gait-section">
      <h3>📊 Gait Analysis</h3>
      <div class="gait-phases">${gait.phases.map((p) => `<span class="gait-phase-tag">${p.label}: ${p.phase}</span>`).join("")}</div>
      <h4>Form Degradation (early → late)</h4>
      <div class="degradation-grid">
        <span class="deg-item ${dCls(d.trunkLean, false)}">Trunk ${arrow(d.trunkLean)} ${d.trunkLean}°</span>
        <span class="deg-item ${dCls(d.kneeDrive, false)}">Knee drive ${arrow(d.kneeDrive)} ${d.kneeDrive}°</span>
        <span class="deg-item ${dCls(d.armCarry, false)}">Arm carry ${arrow(d.armCarry)} ${d.armCarry}°</span>
        <span class="deg-item ${dCls(d.hipStability, false)}">Hip drop ${arrow(d.hipStability)} ${d.hipStability}</span>
        <span class="deg-item ${dCls(d.verticalOsc, false)}">Vert. osc ${arrow(d.verticalOsc)} ${d.verticalOsc}</span>
        <span class="deg-item ${dCls(d.headControl, false)}">Head ${arrow(d.headControl)} ${d.headControl}°</span>
      </div>
      ${gait.symmetry.length ? `<h4>L/R Symmetry</h4><div class="degradation-grid">${gait.symmetry.map((s) => `<span class="deg-item ${s.kneeSymmetry > 10 ? "worse" : "stable"}">Knee Δ${s.kneeSymmetry}° (${s.label})</span><span class="deg-item ${s.elbowSymmetry > 10 ? "worse" : "stable"}">Elbow Δ${s.elbowSymmetry}° (${s.label})</span>`).join("")}</div>` : ""}
    </div>`;
  }

  el.assessmentColumns.innerHTML =
    `<div class="assessment-col issues"><h3>⚠️ Issues Detected</h3>${issueHtml}</div>` +
    `<div class="assessment-col strengths"><h3>✅ Strengths</h3>${strengthHtml}</div>` +
    gaitHtml;
}

async function extractVideoFrames(url) {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  await once(video, "loadedmetadata");
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 720 / video.videoWidth);
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const context = canvas.getContext("2d");
  const frames = [];
  for (const ratio of [0.2, 0.5, 0.8]) {
    video.currentTime = Math.min(video.duration - 0.05, Math.max(0.05, video.duration * ratio));
    await once(video, "seeked");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.74);
    frames.push({ label: `${Math.round(ratio * 100)}%`, dataUrl, base64: dataUrl.split(",")[1] });
  }
  return frames;
}

function renderVideo() {
  el.videoStatus.textContent = state.video.status;
  el.videoPreview.hidden = !state.video.previewUrl;
  if (state.video.previewUrl && el.videoPreview.src !== state.video.previewUrl) el.videoPreview.src = state.video.previewUrl;
  el.frameStrip.innerHTML = state.video.frames.map((frame) => `<figure><img src="${frame.dataUrl}" alt="Sampled video frame at ${frame.label}" /><figcaption>${frame.label}</figcaption></figure>`).join("");
}

async function gatherResearch() {
  state.research = { ...state.research, running: true, status: "Gathering web context" };
  renderResearch();
  try {
    const response = await fetch("/api/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls: el.researchUrls.value.split(/\n+/).map((url) => url.trim()).filter(Boolean) }) });
    const body = await response.json();
    state.research = { sources: body.sources || [], running: false, status: `${(body.sources || []).filter((source) => source.ok).length}/${(body.sources || []).length} sources gathered` };
  } catch (error) {
    state.research = { sources: [], running: false, status: `Research unavailable: ${error.message}` };
  }
  renderResearch();
  renderPayload();
}

async function analyzePdf() {
  const file = el.pdfInput.files[0];
  if (!file) {
    window.alert("Please select a PDF document first.");
    return;
  }
  
  state.research = { ...state.research, running: true, status: `Analyzing ${file.name} using PaddleOCR...` };
  renderResearch();
  
  try {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    await new Promise(r => reader.onload = r);
    const base64Data = reader.result.split(',')[1];

    const response = await fetch("/api/scrape-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name: file.name, base64_data: base64Data })
    });
    
    const body = await response.json();
    if (body.error) throw new Error(body.error);

    const newSource = {
      url: file.name,
      ok: true,
      title: `PDF Document: ${file.name}`,
      summary: body.text || "Extracted biomechanical form data from PDF using PaddleOCR. Text is ready for ML ingestion."
    };

    state.research = {
      sources: [...state.research.sources, newSource],
      running: false,
      status: `Collated ${state.research.sources.length + 1} sources for training.`
    };
  } catch (error) {
    state.research = { ...state.research, running: false, status: `PDF scraping failed: ${error.message}` };
  }
  
  renderResearch();
  renderPayload();
}

async function startTraining() {
  const files = el.trainDataInput.files;
  if (!files.length && !state.research.sources.length) {
    window.alert("Please upload some Garmin CSV data or collate research sources first.");
    return;
  }
  // Use the unified pipeline instead
  await runFullPipeline();
}

/**
 * Unified Pipeline: PDF → PaddleOCR → Gemma 4 → Optimal Form Output
 * Seamlessly chains the PDF analyzer straight to Gemma 4 training.
 */
async function runFullPipeline() {
  const btn = el.runFullPipelineButton;
  const badge = el.pipelineBadge;

  // Update UI to "running" state
  btn.disabled = true;
  btn.textContent = "⏳ Running pipeline…";
  btn.className = "full-pipeline-btn running";
  badge.className = "pipeline-badge running";
  badge.querySelector("span:last-child").textContent = "Processing…";

  // Gather all available context
  const pdfFile = el.pdfInput?.files?.[0];
  let pdfData = null;

  // Stage 1: Read PDF if available
  if (pdfFile) {
    badge.querySelector("span:last-child").textContent = "Extracting PDF (PaddleOCR)…";
    try {
      const reader = new FileReader();
      reader.readAsDataURL(pdfFile);
      await new Promise(r => reader.onload = r);
      pdfData = {
        file_name: pdfFile.name,
        base64_data: reader.result.split(",")[1]
      };
    } catch (err) {
      console.warn("PDF read failed:", err);
    }
  }

  badge.querySelector("span:last-child").textContent = "Building Gemma 4 prompt…";

  // Build the unified payload
  const visionData = buildVisionPayload(state.vision.frameAnalyses);
  const payload = {
    pdf_data: pdfData,
    video_frames: state.video.frames.map(f => ({ base64: f.base64 })),
    run_analysis: state.analysis?.gemmaPayload || null,
    research_sources: state.research.sources,
    cv_analysis: visionData,
    model: el.gemmaModelInput.value.trim() || DEFAULT_MODEL
  };

  badge.querySelector("span:last-child").textContent = "Querying Gemma 4…";

  try {
    const response = await fetch("/api/analyze-form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    // Success — update the form adjustments panel
    const coaching = result.coaching || {};
    renderOptimalFormOutput(coaching, result);

    // Also update the Gemma output on the AI Coach tab
    state.gemma = {
      status: `Generated by ${result.model_used || "Gemma 4"} (unified pipeline)`,
      output: normalizeGemmaOutput(JSON.stringify(coaching)),
      error: null,
      running: false
    };
    renderGemma();
    renderPayload();

    // Update pipeline badge to success
    btn.textContent = "✅ Pipeline complete — re-run anytime";
    btn.className = "full-pipeline-btn success";
    badge.className = "pipeline-badge success";
    const stageNames = (result.pipeline || []).filter(s => s.status === "success").map(s => s.stage).join(" → ");
    badge.querySelector("span:last-child").textContent = stageNames || "Complete";

  } catch (err) {
    // Error state
    btn.textContent = "❌ Pipeline failed — retry";
    btn.className = "full-pipeline-btn";
    badge.className = "pipeline-badge error";
    badge.querySelector("span:last-child").textContent = err.message;

    state.gemma = { status: "Pipeline failed", output: null, error: err.message, running: false };
    renderGemma();
  }

  btn.disabled = false;
  setTimeout(() => {
    btn.textContent = "⚡ Run Full Pipeline (PDF → Gemma 4 → Form)";
    btn.className = "full-pipeline-btn";
  }, 8000);
}

/**
 * Renders the optimal form output from the unified pipeline onto the dashboard.
 * Shows angle overlays on the runner image and populates the adjustments panel.
 */
function renderOptimalFormOutput(coaching, pipelineResult) {
  const overlays = el.formAngleOverlays;
  const listEl = el.adjustmentList;
  if (!overlays || !listEl) return;

  // Clear previous overlays
  overlays.innerHTML = "";

  // Render angle overlay tags on the runner image
  const optimalAngles = coaching.optimal_angles || {};
  const anglePositions = [
    { key: "trunk_lean", label: "Trunk", top: "30%", left: "42%" },
    { key: "knee_drive", label: "Knee", top: "62%", left: "55%" },
    { key: "elbow_angle", label: "Elbow", top: "38%", left: "22%" },
    { key: "head_angle", label: "Head", top: "12%", left: "48%" },
    { key: "hip_angle", label: "Hip", top: "48%", left: "44%" },
    { key: "shank_angle", label: "Shank", top: "75%", left: "52%" }
  ];

  anglePositions.forEach(({ key, label, top, left }, i) => {
    const angle = optimalAngles[key];
    if (!angle) return;
    const tag = document.createElement("div");
    tag.className = "angle-overlay-tag";
    tag.style.top = top;
    tag.style.left = left;
    tag.style.animationDelay = `${i * 80}ms`;

    // Determine grade
    const current = angle.current;
    const optimal = angle.optimal;
    if (current != null && optimal != null) {
      const diff = Math.abs(current - optimal);
      tag.classList.add(diff < 5 ? "good" : diff < 12 ? "warn" : "bad");
      tag.textContent = `${label}: ${current}° → ${optimal}°`;
    } else {
      tag.classList.add("good");
      tag.textContent = `${label}: ${optimal || "—"}°`;
    }
    overlays.appendChild(tag);
  });

  // Render form adjustments
  const adjustments = coaching.form_adjustments || [];
  if (adjustments.length) {
    const priorityIcons = { high: "🔴", medium: "🟡", low: "🟢" };
    listEl.innerHTML = adjustments.map(adj => {
      const priority = (adj.priority || "medium").toLowerCase();
      return `<div class="adjustment-item ${priority}">
        <div class="adj-icon">${priorityIcons[priority] || "🎯"}</div>
        <div class="adj-content">
          <strong>${escapeHtml(adj.body_part || "Form")}</strong>
          <span class="adj-angles">${escapeHtml(adj.current_issue || "")}</span>
          <p>${escapeHtml(adj.correction || "")}</p>
        </div>
      </div>`;
    }).join("");
  }

  // Update source label
  const sourceLabel = el.adjustmentSource;
  if (sourceLabel) {
    const parts = [];
    if (pipelineResult?.pdf_text_preview) parts.push("PDF research");
    if (state.video.frames.length) parts.push("video analysis");
    if (state.research.sources.length) parts.push("web research");
    sourceLabel.textContent = parts.length
      ? `Based on ${parts.join(" + ")} via ${pipelineResult?.model_used || "Gemma 4"}`
      : `Generated by ${pipelineResult?.model_used || "Gemma 4"}`;
  }
}

function renderResearch() {
  el.researchStatus.textContent = state.research.status;
  el.researchButton.disabled = state.research.running;
  el.researchButton.textContent = state.research.running ? "Gathering" : "Gather";
  el.researchList.innerHTML = state.research.sources.map((source) => `<article class="research-item ${source.ok ? "" : "muted"}"><strong>${escapeHtml(source.title || source.url)}</strong><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(compactUrl(source.url))}</a><p>${escapeHtml(source.summary || "")}</p></article>`).join("");
}

async function generateGemma() {
  state.gemma = { status: "Connecting to local Gemma", output: null, error: null, running: true };
  renderGemma();
  const report = buildReport();
  const system = "You are FormForward, a cautious POSE running coach. Use proxy-based wording. You receive wearable metrics and computer vision analysis (MediaPipe Pose Landmarker skeleton detection with biomechanical angle computation). Return only JSON with correction_cue, drill, next_run_focus, visual_observations, research_notes. For visual_observations, synthesize the CV pipeline findings with what you see in the frames.";
  const userMessage = { role: "user", content: `Create one concise coaching response from this payload:\n${JSON.stringify(report)}` };
  if (state.video.frames.length) userMessage.images = state.video.frames.map((frame) => frame.base64);
  try {
    const response = await fetch("/api/gemma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: el.gemmaModelInput.value.trim() || DEFAULT_MODEL, messages: [{ role: "system", content: system }, userMessage], stream: false, format: "json", options: { temperature: 0.2, num_predict: 420 } })
    });
    const body = await response.json();
    if (body.error) throw new Error(body.error);
    state.gemma = { status: "Generated by Gemma", output: normalizeGemmaOutput(body.message?.content || body.response || "{}"), error: null, running: false };
  } catch (error) {
    state.gemma = { status: "Local Gemma unavailable", output: null, error: error.message, running: false };
  }
  renderGemma();
}

function renderGemma() {
  el.gemmaStatus.textContent = state.gemma.status;
  el.generateGemmaButton.disabled = state.gemma.running;
  el.generateGemmaButton.textContent = state.gemma.running ? "Generating" : "Generate";
  if (state.gemma.output) {
    const output = state.gemma.output;
    el.gemmaOutput.innerHTML = `<article class="gemma-card"><dl><div><dt>Cue</dt><dd>${escapeHtml(output.correction_cue || "")}</dd></div><div><dt>Drill</dt><dd>${escapeHtml(output.drill || "")}</dd></div><div><dt>Next run</dt><dd>${escapeHtml(output.next_run_focus || "")}</dd></div><div><dt>Video</dt><dd>${escapeHtml(output.visual_observations || "")}</dd></div><div><dt>Research</dt><dd>${escapeHtml(output.research_notes || "")}</dd></div></dl></article>`;
  } else if (state.gemma.error) el.gemmaOutput.innerHTML = `<p class="gemma-error">${escapeHtml(state.gemma.error)}</p>`;
  else el.gemmaOutput.innerHTML = "";
}

function normalizeGemmaOutput(raw) {
  let parsed = {};
  try {
    const text = String(raw).trim();
    const jsonText = text.startsWith("{") ? text : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    parsed = JSON.parse(jsonText);
  } catch {
    parsed = {};
  }
  const fallback = state.analysis.patterns[0] || {};
  return {
    correction_cue: cleanGemmaField(parsed.correction_cue || parsed.cue || parsed.correction || parsed.correctionCue) || fallback.cue || "",
    drill: cleanGemmaField(parsed.drill || parsed.drill_prescription || parsed.exercise) || fallback.drill || "",
    next_run_focus: cleanGemmaField(parsed.next_run_focus || parsed.nextRunFocus || parsed.focus || parsed.next_run) || fallback.nextRunFocus || "",
    visual_observations: cleanGemmaField(parsed.visual_observations || parsed.visualObservations || parsed.video || parsed.video_observations),
    research_notes: cleanGemmaField(parsed.research_notes || parsed.researchNotes || parsed.research || parsed.source_notes)
  };
}

function cleanGemmaField(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(cleanGemmaField).filter(Boolean).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(cleanGemmaField).filter(Boolean).join(" ");
  return "";
}

function renderPayload() {
  el.payloadOutput.textContent = JSON.stringify(buildReport(), null, 2);
}

function buildReport() {
  const visionData = buildVisionPayload(state.vision.frameAnalyses);
  return { ...state.analysis.gemmaPayload, video_context: { file_name: state.video.name || null, sampled_frames: state.video.frames.length }, cv_analysis: visionData, research_context: state.research.sources.filter((source) => source.ok).map(({ title, url, summary }) => ({ title, url, summary })) };
}

function renderCoverage() {
  el.availableMetrics.innerHTML = state.analysis.availableMetrics.map((key) => `<span class="tag">${METRICS[key].label}</span>`).join("");
  el.missingMetrics.innerHTML = state.analysis.missingMetrics.length ? state.analysis.missingMetrics.map((key) => `<span class="tag">${METRICS[key].label}</span>`).join("") : `<span class="tag">None</span>`;
}

function appendSvg(tagName, attrs, textContent) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  if (textContent != null) node.textContent = textContent;
  el.metricChart.appendChild(node);
}

function buildSampleGpx() {
  return `<?xml version="1.0"?><gpx><trk><trkseg>${[178, 178, 179, 177, 176, 174, 172, 169, 166, 164, 162, 160].map((cadence, index) => `<trkpt lat="${(1.3 + index * 0.00168).toFixed(6)}" lon="103.8"><ele>${22 + index}</ele><time>${new Date(Date.UTC(2026, 4, 4, 0, index, 0)).toISOString()}</time><extensions><gpxtpx:hr>${142 + index * 3}</gpxtpx:hr><gpxtpx:cad>${Math.round(cadence / 2)}</gpxtpx:cad><ff:VerticalOscillation>${78 + index * 2}</ff:VerticalOscillation><ff:GroundContactTime>${232 + index * 5}</ff:GroundContactTime><ff:StrideLength>${(0.95 + index * 0.009).toFixed(2)}</ff:StrideLength><ff:GroundContactBalance>${(50.2 + index * 0.55).toFixed(1)}</ff:GroundContactBalance></extensions></trkpt>`).join("")}</trkseg></trk></gpx>`;
}

function tag(xml, name) {
  return xml.match(new RegExp(`<(?:(?:[\\w-]+):)?${name}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[\\w-]+):)?${name}>`, "i"))?.[1]?.replace(/<[^>]+>/g, "").trim() || "";
}
function firstNumber(xml, names) {
  for (const name of names) {
    const value = number(tag(xml, name));
    if (Number.isFinite(value)) return value;
  }
  return null;
}
function parseTime(value, firstDate) {
  if (!value) return { seconds: null };
  if (/^\d+(\.\d+)?$/.test(value)) return { seconds: Number(value) };
  if (value.includes(":")) {
    const parts = value.split(":").map(Number);
    return { seconds: parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2] };
  }
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? { seconds: null } : { seconds: firstDate ? (date - firstDate) / 1000 : 0, date };
}
function parsePace(value) {
  if (!value) return null;
  if (String(value).includes(":")) {
    const [minutes, seconds] = String(value).split(":").map(Number);
    return minutes + seconds / 60;
  }
  return number(value);
}
function number(value) {
  const match = String(value ?? "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}
function normalizeCadence(value) {
  return Number.isFinite(value) && value < 120 ? value * 2 : value;
}
function avg(values) {
  const valid = values.filter(Number.isFinite);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}
function pct(value, base) {
  return Number.isFinite(value) && Number.isFinite(base) && base ? ((value - base) / base) * 100 : null;
}
function collectEvidence(events, types) {
  return events.filter((event) => types.includes(event.type)).flatMap((event) => event.signals).slice(0, 4);
}
function estimateDistance(samples) {
  let km = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const delta = samples[index].timeSeconds - samples[index - 1].timeSeconds;
    if (Number.isFinite(samples[index].pace) && samples[index].pace > 0) km += delta / (samples[index].pace * 60);
  }
  return km;
}
function formatDuration(seconds) {
  const rounded = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}
function formatMetric(value, key) {
  if (!Number.isFinite(value)) return "n/a";
  if (key === "pace") return `${Math.floor(value)}:${String(Math.round((value % 1) * 60)).padStart(2, "0")}`;
  if (key === "strideLength") return value.toFixed(2);
  return String(Math.round(value));
}
function round(value, places = 0) {
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 10 ** places) / 10 ** places;
}
function once(target, eventName) {
  return new Promise((resolve, reject) => {
    target.addEventListener(eventName, resolve, { once: true });
    target.addEventListener("error", () => reject(new Error(`${eventName} failed`)), { once: true });
  });
}
function compactUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname === "/" ? "" : parsed.pathname}`;
  } catch {
    return url;
  }
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
}
function qs(selector) {
  return document.querySelector(selector);
}

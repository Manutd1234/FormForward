import { createServer } from "node:http";
import { access, readFile, writeFile, unlink, readdir, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const execFileAsync = promisify(execFile);

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 5173);
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".gpx": "application/gpx+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".fit": "application/octet-stream",
  ".svg": "image/svg+xml"
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === "/api/gemma" && request.method === "POST") {
      await handleGemma(request, response);
      return;
    }
    if (url.pathname === "/api/research" && request.method === "POST") {
      await handleResearch(request, response);
      return;
    }
    if (url.pathname === "/api/health" && request.method === "GET") {
      writeJson(response, { ok: true, service: "FormForward", timestamp: new Date().toISOString() });
      return;
    }
    if (url.pathname === "/api/scrape-pdf" && request.method === "POST") {
      await handlePdfScrape(request, response);
      return;
    }
    if (url.pathname === "/api/analyze-form" && request.method === "POST") {
      await handleAnalyzeForm(request, response);
      return;
    }
    if (url.pathname === "/api/fit-files" && request.method === "GET") {
      await handleListFitFiles(request, response);
      return;
    }
    if (url.pathname === "/api/whatsapp-videos" && request.method === "GET") {
      await handleListWhatsAppVideos(request, response);
      return;
    }
    if (url.pathname === "/api/upload" && request.method === "POST") {
      await handleUpload(request, response);
      return;
    }
    await serveStatic(url.pathname, response);
  } catch (error) {
    writeJson(response, { error: error.message }, 500);
  }
}).listen(port, () => {
  console.log(`FormForward running at http://localhost:${port}`);
});

async function handleGemma(request, response) {
  const payload = await readJsonBody(request, 18_000_000);
  try {
    const result = await runLocalGemma(payload);
    writeJson(response, result);
  } catch (error) {
    writeJson(
      response,
      {
        error: error.message || "Local Gemma runner unavailable."
      },
      502
    );
  }
}

async function handleResearch(request, response) {
  const { urls = [] } = await readJsonBody(request);
  const cleaned = [...new Set(urls.map((url) => String(url).trim()).filter((url) => /^https?:\/\//i.test(url)))].slice(0, 5);
  const sources = await Promise.all(cleaned.map(fetchSource));
  writeJson(response, { sources, gathered_at: new Date().toISOString() });
}

async function fetchSource(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "FormForward/0.2 (+local research scraper)",
        "Accept": "text/html,application/xhtml+xml"
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) {
      return { url, ok: false, title: url, summary: `Fetch failed with status ${response.status}` };
    }
    const html = await response.text();
    const title = extractTitle(html) || url;
    const summary = summarizeHtml(html);
    return {
      url,
      ok: !!summary,
      title,
      summary: summary || "No readable article text found.",
      source_type: "web_article"
    };
  } catch (error) {
    return { url, ok: false, title: url, summary: "Scraping failed: " + error.message };
  }
}

function extractTitle(html) {
  return decodeHtmlEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
}

function summarizeHtml(html) {
  const description = decodeHtmlEntities(
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || ""
  ).trim();

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<img[^>]*>/gi, " ")
    .replace(/<\/(p|div|section|article|li|h1|h2|h3|h4|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  const normalized = decodeHtmlEntities(text)
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 45)
    .slice(0, 8)
    .join(" ");

  const combined = [description, normalized].filter(Boolean).join(" ");
  return combined.slice(0, 1200).trim();
}

function decodeHtmlEntities(text) {
  return String(text || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

async function handlePdfScrape(request, response) {
  const { file_name, base64_data } = await readJsonBody(request, 50_000_000);
  if (!base64_data) {
    writeJson(response, { error: "No pdf data provided" }, 400);
    return;
  }
  const tempPath = join(tmpdir(), `${randomUUID()}.pdf`);
  try {
    await writeFile(tempPath, Buffer.from(base64_data, "base64"));
    const results = await extractPdfText(tempPath);
    await unlink(tempPath).catch(() => {});
    if (!results.text) {
      writeJson(response, { error: "No text could be extracted from this PDF.", diagnostics: results.diagnostics || [] }, 422);
      return;
    }
    writeJson(response, { text: results.text, preview: results.text.slice(0, 1200), engine: results.engine, diagnostics: results.diagnostics || [] });
  } catch (error) {
    await unlink(tempPath).catch(() => {});
    writeJson(response, { error: "PDF Scraping failed: " + error.message }, 500);
  }
}

/**
 * Unified pipeline: PDF → Extract → Gemma 4 → Optimal Form Output
 * Seamlessly chains the PDF analyzer straight into Gemma 4 training.
 */
async function handleAnalyzeForm(request, response) {
  const payload = await readJsonBody(request, 80_000_000);
  const {
    pdf_data,          // { file_name, base64_data } — optional PDF to analyze
    video_frames,      // [{ base64 }] — optional video frame images
    run_analysis,      // Structured run metrics from the frontend
    research_sources,  // Previously gathered research context
    cv_analysis,       // Vision pipeline results (MediaPipe angles, etc.)
    model              // Optional local model label
  } = payload;

  const modelName = model || "gemma4:latest";
  const pipelineStages = [];
  let extractedPdfText = "";

  // ──── Stage 1: PDF Text Extraction (if provided) ────
  if (pdf_data?.base64_data) {
    const tempPath = join(tmpdir(), `${randomUUID()}.pdf`);
    try {
      await writeFile(tempPath, Buffer.from(pdf_data.base64_data, "base64"));
      const results = await extractPdfText(tempPath);
      extractedPdfText = results.text || "";
      pipelineStages.push({ stage: "pdf_extraction", status: extractedPdfText ? "success" : "failed", chars: extractedPdfText.length, engine: results.engine, diagnostics: results.diagnostics || [] });
    } catch (err) {
      pipelineStages.push({ stage: "pdf_extraction", status: "failed", error: err.message });
    } finally {
      await unlink(tempPath).catch(() => {});
    }
  }

  // ──── Stage 2: Build comprehensive Gemma 4 prompt ────
  const systemPrompt = `You are FormForward, an elite AI running form coach powered by the POSE Method.
You receive:
1. Wearable sensor data (cadence, ground contact time, vertical oscillation, etc.)
2. Computer vision analysis (MediaPipe Pose Landmarker 33-point skeleton detection with biomechanical angle computation)
3. Biomechanical research papers extracted via PaddleOCR
4. Web-scraped research on optimal running form

Your task: Synthesize ALL available data into a single, authoritative coaching response.
Use proxy-based wording — never diagnose injuries or claim certainty.

CRITICAL: You MUST return valid JSON with these EXACT fields:
{
  "correction_cue": "One-sentence form correction cue",
  "drill": "Specific drill prescription with sets/reps",
  "next_run_focus": "What to focus on during the next run",
  "visual_observations": "What the video/pose analysis reveals about the runner's form",
  "research_notes": "How the biomechanical research supports these recommendations",
  "optimal_angles": {
    "trunk_lean": { "current": <number or null>, "optimal": <number>, "unit": "degrees" },
    "knee_drive": { "current": <number or null>, "optimal": <number>, "unit": "degrees" },
    "elbow_angle": { "current": <number or null>, "optimal": <number>, "unit": "degrees" },
    "head_angle": { "current": <number or null>, "optimal": <number>, "unit": "degrees" },
    "hip_angle": { "current": <number or null>, "optimal": <number>, "unit": "degrees" },
    "shank_angle": { "current": <number or null>, "optimal": <number>, "unit": "degrees" }
  },
  "form_adjustments": [
    { "body_part": "string", "current_issue": "string", "correction": "string", "priority": "high|medium|low" }
  ]
}`;

  const userParts = [];

  // Include run analysis
  if (run_analysis) {
    userParts.push(`## Wearable Run Analysis\n${JSON.stringify(run_analysis, null, 1)}`);
  }

  // Include CV analysis from MediaPipe
  if (cv_analysis) {
    userParts.push(`## Computer Vision Analysis (MediaPipe Pose Landmarker)\n${JSON.stringify(cv_analysis, null, 1)}`);
  }

  // Include extracted PDF research
  if (extractedPdfText) {
    // Truncate to 6000 chars to stay within context window
    const truncated = extractedPdfText.substring(0, 6000);
    userParts.push(`## Extracted Biomechanical Research (PaddleOCR)\n${truncated}`);
  }

  // Include web research sources
  if (research_sources?.length) {
    const summaries = research_sources
      .filter(s => s.ok)
      .map(s => `- ${s.title}: ${s.summary}`)
      .join("\n");
    userParts.push(`## Web Research Sources\n${summaries}`);
  }

  userParts.push("\nSynthesize ALL above data into a single coaching response. Return ONLY valid JSON.");

  const userContent = userParts.join("\n\n");
  const messages = [
    { role: "user", content: `${systemPrompt}\n\n${userContent}` }
  ];

  // Attach video frames if available
  if (video_frames?.length) {
    messages[0].images = video_frames.map(f => f.base64).filter(Boolean).slice(0, 4);
  }

  pipelineStages.push({ stage: "prompt_construction", status: "success", message_length: userContent.length });

  // ──── Stage 3: Send to Gemma 4 via local runtime ────
  try {
    const rawResult = await runLocalGemma({
      model: modelName,
      local_model_path: payload.local_model_path,
      messages,
      stream: false,
      format: "json",
      options: { temperature: 0.15, num_predict: 800 }
    });

    const gemmaContent = rawResult.message?.content || rawResult.response || "";

    // Extract JSON from Gemma's response
    let coaching = {};
    try {
      const jsonStr = gemmaContent.includes("{")
        ? gemmaContent.slice(gemmaContent.indexOf("{"), gemmaContent.lastIndexOf("}") + 1)
        : gemmaContent;
      coaching = JSON.parse(jsonStr);
    } catch {
      coaching = { raw: gemmaContent };
    }

    pipelineStages.push({ stage: "gemma_generation", status: "success", model: modelName });

    writeJson(response, {
      pipeline: pipelineStages,
      coaching,
      pdf_text_preview: extractedPdfText.substring(0, 500) || null,
      model_used: modelName,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    pipelineStages.push({ stage: "gemma_generation", status: "failed", error: err.message });
    writeJson(response, {
      pipeline: pipelineStages,
      error: err.message || "Local Gemma runtime unavailable.",
      pdf_text_preview: extractedPdfText.substring(0, 500) || null
    }, 502);
  }
}

async function extractPdfText(pdfPath) {
  const diagnostics = [];
  const pythonBin = await resolvePythonForLocalTools();

  try {
    const command = shouldForceArm64(pythonBin) ? "/usr/bin/arch" : pythonBin;
    const args = shouldForceArm64(pythonBin)
      ? ["-arm64", pythonBin, join(rootDir, "scripts", "scrapers", "pdf_scraper.py"), pdfPath]
      : [join(rootDir, "scripts", "scrapers", "pdf_scraper.py"), pdfPath];
    const { stdout } = await execFileAsync(command, args, { cwd: rootDir, timeout: 120000, maxBuffer: 16_000_000 });
    const parsed = JSON.parse(stdout || "{}");
    if (parsed.error) diagnostics.push(`PaddleOCR: ${parsed.error}`);
    if (parsed.text) return { text: parsed.text, engine: "PaddleOCR", diagnostics };
  } catch (error) {
    diagnostics.push(`PaddleOCR: ${error.message}`);
  }

  try {
    const { stdout } = await execFileAsync("mdls", ["-raw", "-name", "kMDItemTextContent", pdfPath], { timeout: 15000 });
    const text = String(stdout || "").trim();
    if (text && text !== "(null)") return { text, engine: "Spotlight metadata", diagnostics };
    diagnostics.push("Spotlight metadata: no text content found");
  } catch (error) {
    diagnostics.push(`Spotlight metadata: ${error.message}`);
  }

  try {
    const { stdout } = await execFileAsync("strings", ["-n", "8", pdfPath], { timeout: 15000 });
    const lines = String(stdout || "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /[A-Za-z]{3,}/.test(line))
      .slice(0, 400);
    if (lines.length) return { text: lines.join("\n"), engine: "strings fallback", diagnostics };
    diagnostics.push("strings fallback: no readable text found");
  } catch (error) {
    diagnostics.push(`strings fallback: ${error.message}`);
  }

  return { text: "", engine: "none", diagnostics };
}

async function runLocalGemma(payload) {
  const runtime = await resolveLocalGemmaRuntime(payload.local_model_path);
  const { stdout } = await execFileAsync(
    runtime.command,
    [...runtime.args, join(rootDir, "scripts", "local_gemma_runner.py"), JSON.stringify({ ...payload, local_model_path: runtime.modelPath })],
    { cwd: rootDir, timeout: 120000, maxBuffer: 16_000_000 }
  );
  const parsed = JSON.parse(stdout || "{}");
  if (parsed.error) throw new Error(parsed.error);
  return parsed;
}

async function resolveLocalGemmaRuntime(requestedModelPath = "") {
  const modelCandidates = [
    requestedModelPath,
    join(rootDir, "local-models", "gemma4"),
    "local-models/gemma4"
  ].filter(Boolean);
  let resolvedModelPath = "";
  for (const candidate of modelCandidates) {
    const absoluteCandidate = candidate.startsWith("/") ? candidate : join(rootDir, candidate);
    if (await fileExists(absoluteCandidate)) {
      resolvedModelPath = absoluteCandidate;
      break;
    }
  }
  if (!resolvedModelPath) {
    throw new Error("Local Gemma model not found. Expected a repo-local model at /local-models/gemma4.");
  }

  const pythonCandidates = [
    join(rootDir, ".venv", "bin", "python"),
    join(rootDir, ".venv", "bin", "python3"),
    "python3"
  ];
  for (const candidate of pythonCandidates) {
    if (candidate === "python3" || await fileExists(candidate)) {
      return {
        command: shouldForceArm64(candidate) ? "/usr/bin/arch" : candidate,
        args: shouldForceArm64(candidate) ? ["-arm64", candidate] : [],
        pythonPath: candidate,
        modelPath: resolvedModelPath
      };
    }
  }
  throw new Error("No Python runtime found for the local Gemma runner. Create .venv and install the transformer dependencies.");
}

function shouldForceArm64(pythonPath) {
  return process.platform === "darwin" && pythonPath !== "python3";
}

async function resolvePythonForLocalTools() {
  const candidates = [
    join(rootDir, ".venv", "bin", "python"),
    join(rootDir, ".venv", "bin", "python3"),
    "python3"
  ];
  for (const candidate of candidates) {
    if (candidate === "python3" || await fileExists(candidate)) {
      return candidate;
    }
  }
  throw new Error("No Python runtime found for local OCR tools.");
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function parseModelResponse(text) {
  let combined = "";
  for (const line of String(text).split("\n").filter(Boolean)) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.message?.content) combined += parsed.message.content;
      else if (parsed.response) combined += parsed.response;
    } catch {
      combined += line;
    }
  }
  return { message: { content: combined || String(text).trim() } };
}

function readJsonBody(request, maxBytes = 1_000_000) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        request.destroy();
        reject(new Error("Request body is too large."));
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });
    request.on("error", reject);
  });
}

async function serveStatic(pathname, response) {
  const safePath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const absolutePath = normalize(join(rootDir, safePath));
  if (!absolutePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  try {
    const file = await readFile(absolutePath);
    response.writeHead(200, { "Content-Type": mimeTypes[extname(absolutePath)] || "application/octet-stream" });
    response.end(file);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

function writeJson(response, body, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function handleListFitFiles(_request, response) {
  const fitDir = join(rootDir, "data", "fit");
  try {
    const files = await readdir(fitDir);
    const fitFiles = files.filter(f => f.endsWith(".fit") || f.endsWith(".FIT"));
    const details = await Promise.all(fitFiles.map(async (name) => {
      const fileStat = await stat(join(fitDir, name));
      return {
        name,
        path: `/data/fit/${name}`,
        sizeKB: Math.round(fileStat.size / 1024),
        modified: fileStat.mtime.toISOString()
      };
    }));
    writeJson(response, { files: details, count: details.length });
  } catch (err) {
    writeJson(response, { files: [], count: 0, error: err.message });
  }
}

async function handleListWhatsAppVideos(_request, response) {
  const videoDir = join(rootDir, "data", "videos");
  try {
    const files = await readdir(videoDir);
    const videoFiles = files.filter(f => /\.(mp4|mov|3gp|webm)$/i.test(f));
    const details = await Promise.all(videoFiles.map(async (name) => {
      const fileStat = await stat(join(videoDir, name));
      return {
        name,
        path: `/data/videos/${name}`,
        sizeMB: Math.round(fileStat.size / 1024 / 1024 * 10) / 10,
        modified: fileStat.mtime.toISOString()
      };
    }));
    writeJson(response, { videos: details, count: details.length });
  } catch (err) {
    writeJson(response, { videos: [], count: 0, error: err.message });
  }
}

async function handleUpload(request, response) {
  try {
    const { filename, base64_data, type } = await readJsonBody(request, 100_000_000); // up to 100MB
    if (!filename || !base64_data || !type) {
      writeJson(response, { error: "Missing required fields: filename, base64_data, type" }, 400);
      return;
    }
    
    let destDir = "";
    if (type === "fit" || type === "csv") {
      destDir = join(rootDir, "data", "fit");
    } else if (type === "video") {
      destDir = join(rootDir, "data", "videos");
    } else {
      writeJson(response, { error: "Invalid file type: " + type }, 400);
      return;
    }

    const safeName = filename.replace(/[^a-z0-9_.-]/gi, "_");
    const destPath = join(destDir, safeName);
    
    await writeFile(destPath, Buffer.from(base64_data, "base64"));
    
    writeJson(response, { 
      ok: true, 
      message: "Saved to backend", 
      filename: safeName, 
      path: `/data/${type === "video" ? "videos" : "fit"}/${safeName}` 
    });
  } catch (error) {
    writeJson(response, { error: "Upload failed: " + error.message }, 500);
  }
}

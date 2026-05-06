import { createServer } from "node:http";
import { readFile, writeFile, unlink } from "node:fs/promises";
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
  ".webp": "image/webp"
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
    if (url.pathname === "/api/scrape-pdf" && request.method === "POST") {
      await handlePdfScrape(request, response);
      return;
    }
    if (url.pathname === "/api/analyze-form" && request.method === "POST") {
      await handleAnalyzeForm(request, response);
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    const ollamaResponse = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);
    const text = await ollamaResponse.text();
    response.writeHead(ollamaResponse.ok ? 200 : 502, { "Content-Type": "application/json; charset=utf-8" });
    response.end(ollamaResponse.ok ? text : JSON.stringify({ error: `Ollama returned ${ollamaResponse.status}. Check that ${payload.model} is installed and running.` }));
  } catch {
    writeJson(response, { error: `Ollama unavailable. Install Ollama, then run: ollama run ${payload.model || "gemma4"}` });
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
    const { stdout } = await execFileAsync("python3", [join(rootDir, "scripts", "scrapers", "web_scraper.py"), url], { timeout: 30000 });
    const results = JSON.parse(stdout);
    if (results && results.length > 0) {
      return results[0];
    }
    return { url, ok: false, title: url, summary: "No data scraped" };
  } catch (error) {
    return { url, ok: false, title: url, summary: "Scraping failed: " + error.message };
  }
}

// extractTitle and extractSummary removed

async function handlePdfScrape(request, response) {
  const { file_name, base64_data } = await readJsonBody(request, 50_000_000);
  if (!base64_data) {
    writeJson(response, { error: "No pdf data provided" }, 400);
    return;
  }
  const tempPath = join(tmpdir(), `${randomUUID()}.pdf`);
  try {
    await writeFile(tempPath, Buffer.from(base64_data, "base64"));
    const { stdout } = await execFileAsync("python3", [join(rootDir, "scripts", "scrapers", "pdf_scraper.py"), tempPath], { timeout: 120000 });
    const results = JSON.parse(stdout);
    await unlink(tempPath).catch(() => {});
    writeJson(response, { text: results.text });
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
    model              // Ollama model name
  } = payload;

  const modelName = model || "gemma4:latest";
  const pipelineStages = [];
  let extractedPdfText = "";

  // ──── Stage 1: PDF Text Extraction (if provided) ────
  if (pdf_data?.base64_data) {
    const tempPath = join(tmpdir(), `${randomUUID()}.pdf`);
    try {
      await writeFile(tempPath, Buffer.from(pdf_data.base64_data, "base64"));
      const { stdout } = await execFileAsync("python3", [
        join(rootDir, "scripts", "scrapers", "pdf_scraper.py"), tempPath
      ], { timeout: 120000 });
      const results = JSON.parse(stdout);
      extractedPdfText = results.text || "";
      pipelineStages.push({ stage: "pdf_extraction", status: "success", chars: extractedPdfText.length });
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
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent }
  ];

  // Attach video frames if available
  if (video_frames?.length) {
    messages[1].images = video_frames.map(f => f.base64).filter(Boolean).slice(0, 4);
  }

  pipelineStages.push({ stage: "prompt_construction", status: "success", message_length: userContent.length });

  // ──── Stage 3: Send to Gemma 4 via Ollama ────
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    const ollamaResponse = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        messages,
        stream: false,
        format: "json",
        options: { temperature: 0.15, num_predict: 800 }
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    const text = await ollamaResponse.text();
    if (!ollamaResponse.ok) {
      pipelineStages.push({ stage: "gemma_generation", status: "failed", error: `Ollama ${ollamaResponse.status}` });
      writeJson(response, { pipeline: pipelineStages, error: `Ollama returned ${ollamaResponse.status}` }, 502);
      return;
    }

    // Parse the Ollama response (NDJSON format)
    let gemmaContent = "";
    for (const line of text.split("\n").filter(Boolean)) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.message?.content) gemmaContent += parsed.message.content;
        else if (parsed.response) gemmaContent += parsed.response;
      } catch { /* skip malformed lines */ }
    }

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
      error: `Gemma unavailable. Run: ollama run ${modelName}`,
      pdf_text_preview: extractedPdfText.substring(0, 500) || null
    }, 502);
  }
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

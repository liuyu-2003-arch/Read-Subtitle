import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import iconv from "iconv-lite";
import jschardet from "jschardet";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("subtitles.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS subtitles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    content TEXT NOT NULL,
    parsed_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const app = express();
const PORT = 3000;

app.use(express.json());

// Configure Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper: Simple SRT/VTT Parser
function parseSubtitles(content: string, extension: string) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const result: { start: string; end: string; text: string }[] = [];
  
  if (extension === '.srt' || extension === '.vtt') {
    let current: any = {};
    const timeRegex = /(\d{2}:\d{2}:\d{2}[,.]\d{3}) --> (\d{2}:\d{2}:\d{2}[,.]\d{3})/;
    
    lines.forEach(line => {
      const timeMatch = line.match(timeRegex);
      if (timeMatch) {
        current.start = timeMatch[1].replace(',', '.');
        current.end = timeMatch[2].replace(',', '.');
        current.text = "";
      } else if (line.trim() === "" && current.start) {
        result.push(current);
        current = {};
      } else if (current.start) {
        current.text += (current.text ? " " : "") + line.trim();
      }
    });
    if (current.start) result.push(current);
  } else if (extension === '.ass') {
    // Basic ASS parser for Dialogue lines
    lines.forEach(line => {
      if (line.startsWith('Dialogue:')) {
        const parts = line.split(',');
        if (parts.length >= 10) {
          const start = parts[1];
          const end = parts[2];
          const text = parts.slice(9).join(',').replace(/\{.*?\}/g, '').trim();
          result.push({ start, end, text });
        }
      }
    });
  }
  
  return result;
}

// API: Upload Subtitle
app.post("/api/subtitles/upload", upload.single("file"), (req, res, next) => {
  try {
    if (!req.file) {
      console.error("Upload failed: No file in request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Fix Multer filename encoding (often parsed as latin1)
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalName).toLowerCase();
    
    // Detect and decode content encoding (handles GBK, UTF-8 with BOM, etc.)
    const detected = jschardet.detect(req.file.buffer);
    const encoding = detected.encoding || "utf-8";
    const content = iconv.decode(req.file.buffer, encoding);
    
    console.log(`Processing upload: ${originalName} (Detected: ${encoding})`);

    // Generate English-friendly filename (slug)
    const filename = originalName
      .replace(ext, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const parsed = parseSubtitles(content, ext);
    
    const stmt = db.prepare(`
      INSERT INTO subtitles (filename, original_name, content, parsed_json)
      VALUES (?, ?, ?, ?)
    `);
    
    const info = stmt.run(filename, originalName, content, JSON.stringify(parsed));
    
    console.log(`Successfully saved subtitle: ${filename} (ID: ${info.lastInsertRowid})`);
    res.json({ id: info.lastInsertRowid, filename });
  } catch (err) {
    console.error("Error in /api/subtitles/upload:", err);
    res.status(500).json({ error: "Internal server error during upload" });
  }
});

// API: Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API: List Subtitles
app.get("/api/subtitles", (req, res) => {
  try {
    const rows = db.prepare("SELECT id, filename, original_name, created_at FROM subtitles ORDER BY created_at DESC").all();
    res.json(rows);
  } catch (err) {
    console.error("Error in /api/subtitles:", err);
    res.status(500).json({ error: "Failed to fetch subtitles" });
  }
});

// API: Get Subtitle Details
app.get("/api/subtitles/:filename", (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM subtitles WHERE filename = ?").get(req.params.filename) as any;
    if (!row) return res.status(404).json({ error: "Not found" });
    
    res.json({
      ...row,
      parsed_json: JSON.parse(row.parsed_json)
    });
  } catch (err) {
    console.error("Error in /api/subtitles/:filename:", err);
    res.status(500).json({ error: "Failed to fetch subtitle details" });
  }
});

// API: Download Original
app.get("/api/subtitles/:filename/download", (req, res) => {
  try {
    const row = db.prepare("SELECT content, original_name FROM subtitles WHERE filename = ?").get(req.params.filename) as any;
    if (!row) return res.status(404).json({ error: "Not found" });
    
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(row.original_name)}"`);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(row.content);
  } catch (err) {
    console.error("Error in /api/subtitles/:filename/download:", err);
    res.status(500).json({ error: "Download failed" });
  }
});

// Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

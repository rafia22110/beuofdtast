import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SHEET_CSV_PATH = path.resolve(
  __dirname,
  'public/assets/aistudio/________________-_Beuofdbak_____97fcb897'
);
const BACKUP_CSV_PATH = path.resolve(__dirname, 'public/alpha_calibration_sheet.csv');
const JSON_LOG_PATH = path.resolve(__dirname, 'alpha_submissions.json');

interface AlphaSubmissionPayload {
  test_id: string;
  timestamp: string;
  tester: string;
  profile: {
    eye_color: string;
    lighting: string;
    glasses: string;
  };
  device: {
    user_agent: string;
    screen: string;
    video_res: string;
    estimated_fps: number;
  };
  metrics: {
    baseline: { mean: number; sd: number; count: number };
    cognitive_stress: { mean: number; sd: number; count: number };
    light_reflex: { mean: number; sd: number; count: number };
    stress_delta_pct: number;
    light_delta_pct: number;
  };
}

function escapeCsvCell(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

/**
 * Builds the exact 46-row column array matching the user's attached Beuofdbak Alpha Sheet
 */
function buildFortySixRowColumn(data: AlphaSubmissionPayload): string[] {
  return [
    '', // Row 1
    '*דוח בדיקת אלפא - Beuofdbak* 👁️', // Row 2
    `נבדק: ${data.tester} (${data.test_id})`, // Row 3
    `צבע עין: ${data.profile.eye_color} | תאורה: ${data.profile.lighting}`, // Row 4
    `קצב מצלמה: ${data.device.estimated_fps} FPS`, // Row 5
    '---', // Row 6
    `• מנוחה: ${data.metrics.baseline.mean} (SD: ${data.metrics.baseline.sd})`, // Row 7
    `• מאמץ קוגניטיבי: ${data.metrics.cognitive_stress.mean} (${data.metrics.stress_delta_pct}%)`, // Row 8
    `• רפלקס אור: ${data.metrics.light_reflex.mean} (${data.metrics.light_delta_pct}%)`, // Row 9
    '---', // Row 10
    'JSON:', // Row 11
    '{', // Row 12
    `"test_id": "${data.test_id}",`, // Row 13
    `"timestamp": "${data.timestamp}",`, // Row 14
    `"tester": "${data.tester}",`, // Row 15
    'profile: {', // Row 16
    `"eye_color": "${data.profile.eye_color}",`, // Row 17
    `"lighting": "${data.profile.lighting}",`, // Row 18
    `"glasses": "${data.profile.glasses}"`, // Row 19
    '},', // Row 20
    'device: {', // Row 21
    `"user_agent": "${data.device.user_agent}",`, // Row 22
    `"screen": "${data.device.screen}",`, // Row 23
    `"video_res": "${data.device.video_res}",`, // Row 24
    `estimated_fps: ${data.device.estimated_fps}`, // Row 25
    '},', // Row 26
    'metrics: {', // Row 27
    'baseline: {', // Row 28
    `mean: ${data.metrics.baseline.mean},`, // Row 29
    `sd: ${data.metrics.baseline.sd},`, // Row 30
    `count: ${data.metrics.baseline.count}`, // Row 31
    '},', // Row 32
    'cognitive_stress: {', // Row 33
    `mean: ${data.metrics.cognitive_stress.mean},`, // Row 34
    `sd: ${data.metrics.cognitive_stress.sd},`, // Row 35
    `count: ${data.metrics.cognitive_stress.count}`, // Row 36
    '},', // Row 37
    'light_reflex: {', // Row 38
    `mean: ${data.metrics.light_reflex.mean},`, // Row 39
    `sd: ${data.metrics.light_reflex.sd},`, // Row 40
    `count: ${data.metrics.light_reflex.count}`, // Row 41
    '},', // Row 42
    `stress_delta_pct: ${data.metrics.stress_delta_pct},`, // Row 43
    `light_delta_pct: ${data.metrics.light_delta_pct}`, // Row 44
    '}', // Row 45
    '}', // Row 46
  ];
}

function appendColumnToSheetCsv(payload: AlphaSubmissionPayload): number {
  const newColCells = buildFortySixRowColumn(payload).map(escapeCsvCell);

  let existingLines: string[] = [];
  if (fs.existsSync(SHEET_CSV_PATH)) {
    const raw = fs.readFileSync(SHEET_CSV_PATH, 'utf-8');
    existingLines = raw.split(/\r?\n/);
  }

  // Ensure we have at least 46 lines
  while (existingLines.length < 46) {
    existingLines.push(',,,,');
  }

  const updatedLines = existingLines.slice(0, 46).map((line, idx) => {
    const cleanLine = line.replace(/\r$/, '');
    const cellToAdd = newColCells[idx] ?? '';
    return `${cleanLine},${cellToAdd}`;
  });

  const finalCsv = updatedLines.join('\r\n');
  fs.writeFileSync(SHEET_CSV_PATH, finalCsv, 'utf-8');
  fs.writeFileSync(BACKUP_CSV_PATH, '\uFEFF' + finalCsv, 'utf-8');

  // Count how many columns exist in Row 2
  const row2 = updatedLines[1] || '';
  const colCount = (row2.match(/Beuofdbak/g) || []).length;
  return colCount;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  // POST /api/alpha-sheet/submit — Appends the test result column directly to the spreadsheet
  app.post('/api/alpha-sheet/submit', async (req, res) => {
    try {
      const body = req.body as AlphaSubmissionPayload;
      if (!body || !body.test_id) {
        res.status(400).json({ ok: false, error: 'Invalid payload' });
        return;
      }

      const totalColumns = appendColumnToSheetCsv(body);

      // Also keep a structured JSON log internally
      let list: AlphaSubmissionPayload[] = [];
      if (fs.existsSync(JSON_LOG_PATH)) {
        try {
          list = JSON.parse(fs.readFileSync(JSON_LOG_PATH, 'utf-8'));
        } catch {
          list = [];
        }
      }
      list.push(body);
      fs.writeFileSync(JSON_LOG_PATH, JSON.stringify(list, null, 2), 'utf-8');

      // Optional forward to Google Sheets Webhook if set in environment
      const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
      if (webhookUrl) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }).catch(() => {});
      }

      res.json({
        ok: true,
        test_id: body.test_id,
        columnNumber: totalColumns,
        timestamp: body.timestamp,
      });
    } catch (err) {
      console.error('Error appending to Alpha sheet:', err);
      res.status(500).json({ ok: false, error: 'Failed to write to sheet' });
    }
  });

  // GET /api/alpha-sheet/download — Returns the live updated 46-row CSV file
  app.get('/api/alpha-sheet/download', (_req, res) => {
    try {
      const targetPath = fs.existsSync(SHEET_CSV_PATH) ? SHEET_CSV_PATH : BACKUP_CSV_PATH;
      if (!fs.existsSync(targetPath)) {
        res.status(404).send('Sheet not found');
        return;
      }
      const csvContent = fs.readFileSync(targetPath, 'utf-8');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="Beuofdbak_Alpha_Calibration_Sheet.csv"'
      );
      res.send('\uFEFF' + csvContent);
    } catch (err) {
      console.error('Error downloading Alpha sheet:', err);
      res.status(500).send('Failed to download sheet');
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OculoFlow / Beuofdbak server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

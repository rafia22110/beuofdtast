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
const WEBHOOK_CONFIG_PATH = path.resolve(__dirname, 'alpha_webhook_config.json');

export interface AlphaSubmissionPayload {
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
 * Parses a single CSV line into cells, respecting double-quoted strings and escaped quotes ("")
 */
function parseCsvRow(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        cells.push(current);
        current = '';
      } else if (ch !== '\r') {
        current += ch;
      }
    }
  }
  cells.push(current);
  return cells;
}

function extractStringVal(cell: string): string {
  const m = cell.match(/:\s*"([^"]*)"/);
  return m ? m[1] : cell.split(':')[1]?.replace(/[",]/g, '').trim() || '';
}

function extractNumberVal(cell: string): number {
  const m = cell.match(/:\s*(-?\d+(\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

/**
 * Reads all 46 rows of the Beuofdbak sheet and reconstructs each column into a structured record
 */
function readSheetColumnsAndMatrix(): {
  records: (AlphaSubmissionPayload & { columnNumber: number })[];
  matrix: string[][];
} {
  if (!fs.existsSync(SHEET_CSV_PATH)) {
    return { records: [], matrix: [] };
  }

  const raw = fs.readFileSync(SHEET_CSV_PATH, 'utf-8');
  const lines = raw.split(/\r?\n/).slice(0, 46);
  const matrix = lines.map(parseCsvRow);

  const numCols = Math.max(...matrix.map((r) => r.length), 0);
  const records: (AlphaSubmissionPayload & { columnNumber: number })[] = [];

  for (let col = 0; col < numCols; col++) {
    const getCell = (row1Indexed: number) => matrix[row1Indexed - 1]?.[col] ?? '';
    const testId = extractStringVal(getCell(13));
    if (!testId) continue;

    records.push({
      columnNumber: col + 1,
      test_id: testId,
      timestamp: extractStringVal(getCell(14)),
      tester: extractStringVal(getCell(15)),
      profile: {
        eye_color: extractStringVal(getCell(17)) || 'brown_dark',
        lighting: extractStringVal(getCell(18)) || 'indoor_normal',
        glasses: extractStringVal(getCell(19)) || 'none',
      },
      device: {
        user_agent: extractStringVal(getCell(22)),
        screen: extractStringVal(getCell(23)),
        video_res: extractStringVal(getCell(24)),
        estimated_fps: extractNumberVal(getCell(25)),
      },
      metrics: {
        baseline: {
          mean: extractNumberVal(getCell(29)),
          sd: extractNumberVal(getCell(30)),
          count: extractNumberVal(getCell(31)),
        },
        cognitive_stress: {
          mean: extractNumberVal(getCell(34)),
          sd: extractNumberVal(getCell(35)),
          count: extractNumberVal(getCell(36)),
        },
        light_reflex: {
          mean: extractNumberVal(getCell(39)),
          sd: extractNumberVal(getCell(40)),
          count: extractNumberVal(getCell(41)),
        },
        stress_delta_pct: extractNumberVal(getCell(43)),
        light_delta_pct: extractNumberVal(getCell(44)),
      },
    });
  }

  return { records, matrix };
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
    `test_id: "${data.test_id}",`, // Row 13
    `timestamp: "${data.timestamp}",`, // Row 14
    `tester: "${data.tester}",`, // Row 15
    'profile: {', // Row 16
    `eye_color: "${data.profile.eye_color}",`, // Row 17
    `lighting: "${data.profile.lighting}",`, // Row 18
    `glasses: "${data.profile.glasses}"`, // Row 19
    '},', // Row 20
    'device: {', // Row 21
    `user_agent: "${data.device.user_agent}",`, // Row 22
    `screen: "${data.device.screen}",`, // Row 23
    `video_res: "${data.device.video_res}",`, // Row 24
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

  const row2 = updatedLines[1] || '';
  const colCount = (row2.match(/Beuofdbak/g) || []).length;
  return colCount;
}

function getConfiguredWebhookUrl(): string {
  if (process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
    return process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  }
  if (fs.existsSync(WEBHOOK_CONFIG_PATH)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(WEBHOOK_CONFIG_PATH, 'utf-8'));
      return cfg.webhookUrl || '';
    } catch {
      return '';
    }
  }
  return '';
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

      // Forward to Google Sheets Webhook if configured
      const webhookUrl = getConfiguredWebhookUrl();
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

  // GET /api/alpha-sheet/records — For the Developer R&D Console (returns all columns + raw 46-row matrix)
  app.get('/api/alpha-sheet/records', (_req, res) => {
    try {
      const { records, matrix } = readSheetColumnsAndMatrix();
      res.json({
        ok: true,
        totalColumns: records.length,
        records,
        matrix,
        webhookUrl: getConfiguredWebhookUrl(),
      });
    } catch (err) {
      console.error('Error reading Alpha sheet records:', err);
      res.status(500).json({ ok: false, error: 'Failed to read sheet records' });
    }
  });

  // POST /api/alpha-sheet/webhook — Save a Google Sheets Apps Script Webhook URL
  app.post('/api/alpha-sheet/webhook', (req, res) => {
    try {
      const { webhookUrl } = req.body as { webhookUrl?: string };
      fs.writeFileSync(
        WEBHOOK_CONFIG_PATH,
        JSON.stringify({ webhookUrl: (webhookUrl || '').trim() }, null, 2),
        'utf-8'
      );
      res.json({ ok: true, webhookUrl: (webhookUrl || '').trim() });
    } catch (err) {
      console.error('Error saving webhook URL:', err);
      res.status(500).json({ ok: false, error: 'Failed to save webhook URL' });
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
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
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

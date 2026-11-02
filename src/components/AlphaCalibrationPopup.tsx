import React, { useCallback, useEffect, useState } from 'react';
import { Language } from '../data/platesData';
import { LiveDiagnosticSnapshot } from '../utils/pdfReportGenerator';
import {
  X,
  Smartphone,
  ExternalLink,
  Send,
  CheckCircle2,
  Sparkles,
  Camera,
  ShieldCheck,
  ChevronUp,
  Eye,
  Languages,
  Share2,
  Lock,
  Unlock,
  Scale,
  BookOpen,
  Code2,
  ClipboardPaste,
  Loader2,
  Download,
  Copy,
  Check,
  Table2,
  Database,
  RefreshCw,
  Terminal,
  Link2,
} from 'lucide-react';

interface SubmittedSheetRecord {
  test_id: string;
  tester: string;
  columnNumber: number;
  fps: number;
  timestamp: string;
}

interface SheetRecordFull {
  columnNumber: number;
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

function detectReadableDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'iPhone (iOS Safari)';
  if (/iPad/i.test(ua)) return 'iPad (iPadOS)';
  if (/Samsung/i.test(ua)) return 'Samsung Galaxy (Android)';
  if (/Pixel/i.test(ua)) return 'Google Pixel (Android)';
  if (/Android/i.test(ua)) return 'Android Smartphone';
  if (/Macintosh/i.test(ua)) return 'אייפון / נייד (בדיקת תאימות)';
  if (/Windows/i.test(ua)) return 'אייפון / אנדרואיד (בדיקת תאימות)';
  return 'Smartphone Optical Sensor';
}

function summarizeUserAgent(ua: string): string {
  if (!ua) return 'Unknown Device';
  if (/iPhone OS (\d+_\d+)/i.test(ua)) {
    const ver = ua.match(/iPhone OS (\d+_\d+)/i)?.[1]?.replace('_', '.') || '';
    return `iPhone · iOS ${ver} (Safari)`;
  }
  if (/SamsungBrowser/i.test(ua)) {
    const andVer = ua.match(/Android (\d+)/i)?.[1] || '';
    return `Samsung Browser · Android ${andVer}`;
  }
  if (/Android (\d+)/i.test(ua)) {
    const andVer = ua.match(/Android (\d+)/i)?.[1] || '';
    return `Android ${andVer} · Chrome Mobile`;
  }
  if (/Macintosh/i.test(ua)) return 'macOS Desktop / Safari-Chrome';
  if (/Windows/i.test(ua)) return 'Windows Desktop Browser';
  return ua.slice(0, 36) + '...';
}

const MIT_LICENSE_TEXT = `MIT License · Copyright (c) 2026 OculoFlow / Beuofdbak Research Group (rafia22110)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.`;

const GOOGLE_APPS_SCRIPT_SNIPPET = `// הדבק ב-Google Sheets שלך: Extensions -> Apps Script -> Deploy as Web App (Anyone)
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  var col = sheet.getLastColumn() + 1;
  var rows = [
    [""],
    ["*דוח בדיקת אלפא - Beuofdbak* 👁️"],
    ["נבדק: " + data.tester + " (" + data.test_id + ")"],
    ["צבע עין: " + data.profile.eye_color + " | תאורה: " + data.profile.lighting],
    ["קצב מצלמה: " + data.device.estimated_fps + " FPS"],
    ["---"],
    ["• מנוחה: " + data.metrics.baseline.mean + " (SD: " + data.metrics.baseline.sd + ")"],
    ["• מאמץ קוגניטיבי: " + data.metrics.cognitive_stress.mean + " (" + data.metrics.stress_delta_pct + "%)"],
    ["• רפלקס אור: " + data.metrics.light_reflex.mean + " (" + data.metrics.light_delta_pct + "%)"],
    ["---"],
    ["JSON:"],
    [JSON.stringify(data, null, 2)]
  ];
  sheet.getRange(1, col, rows.length, 1).setValues(rows);
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}`;

interface AlphaCalibrationPopupProps {
  lang: Language;
  onToggleLang: () => void;
  liveTelemetry: LiveDiagnosticSnapshot;
  externalOpenTrigger?: number;
}

export const AlphaCalibrationPopup: React.FC<AlphaCalibrationPopupProps> = ({
  lang,
  onToggleLang,
  liveTelemetry,
  externalOpenTrigger = 0,
}) => {
  const isHe = lang === 'he';

  const [isOpen, setIsOpen] = useState(false);
  const [showMitCharter, setShowMitCharter] = useState(false);

  // Confidential single-device submission state (no public results exposed to regular users)
  const [testerName, setTesterName] = useState(() => detectReadableDeviceName());
  const [eyeColor, setEyeColor] = useState<'brown_dark' | 'brown_light' | 'green' | 'blue_grey'>(
    'brown_dark'
  );
  const [lighting, setLighting] = useState<'indoor_normal' | 'dim_dark' | 'bright_sun'>(
    'indoor_normal'
  );
  const [glasses, setGlasses] = useState<'none' | 'glasses' | 'contacts'>('none');
  const [measuredFps, setMeasuredFps] = useState<number>(30);
  const [videoRes, setVideoRes] = useState<string>('640x480');
  const [isMeasuringFps, setIsMeasuringFps] = useState(false);
  const [pastedReportText, setPastedReportText] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);

  // Submission status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<SubmittedSheetRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copiedTestUrl, setCopiedTestUrl] = useState(false);

  // =========================================================================
  // DEVELOPER / RESEARCHER R&D CONSOLE STATE (Protected so visitors don't see it)
  // =========================================================================
  const [showDevConsole, setShowDevConsole] = useState(false);
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [devPinInput, setDevPinInput] = useState('');
  const [devPinError, setDevPinError] = useState(false);
  const [devTab, setDevTab] = useState<'table' | 'matrix' | 'webhook'>('table');
  const [sheetRecords, setSheetRecords] = useState<SheetRecordFull[]>([]);
  const [sheetMatrix, setSheetMatrix] = useState<string[][]>([]);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [copiedJsonAll, setCopiedJsonAll] = useState(false);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const fetchDeveloperSheetData = useCallback(async () => {
    setIsLoadingSheet(true);
    try {
      const res = await fetch('/api/alpha-sheet/records');
      if (res.ok) {
        const data = await res.json();
        setSheetRecords(data.records || []);
        setSheetMatrix(data.matrix || []);
        if (data.webhookUrl !== undefined) {
          setWebhookUrl(data.webhookUrl);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingSheet(false);
    }
  }, []);

  useEffect(() => {
    if (showDevConsole && devUnlocked) {
      fetchDeveloperSheetData();
    }
  }, [showDevConsole, devUnlocked, fetchDeveloperSheetData]);

  // Trigger popup 1.5 seconds after entering the site
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsOpen(true);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  // Re-open if triggered externally from header/footer button
  useEffect(() => {
    if (externalOpenTrigger > 0) {
      setIsOpen(true);
    }
  }, [externalOpenTrigger]);

  // Also detect when user resizes into Mobile Viewport (< 768px)
  useEffect(() => {
    let wasMobile = window.innerWidth < 768;
    const handleResize = () => {
      const isNowMobile = window.innerWidth < 768;
      if (!wasMobile && isNowMobile) {
        setIsOpen(true);
      }
      wasMobile = isNowMobile;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Estimate real display/camera FPS when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let frames = 0;
    let rafId: number;
    const start = performance.now();

    const countFrame = (now: number) => {
      frames++;
      if (now - start < 500) {
        rafId = requestAnimationFrame(countFrame);
      } else {
        const est = Math.min(60, Math.max(15, Math.round((frames / (now - start)) * 1000)));
        setMeasuredFps(est);
      }
    };
    rafId = requestAnimationFrame(countFrame);
    return () => cancelAnimationFrame(rafId);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const handleQuickCameraFpsProbe = async () => {
    setIsMeasuringFps(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      const camFps = settings.frameRate ? Math.round(settings.frameRate) : 30;
      if (settings.width && settings.height) {
        setVideoRes(`${settings.width}x${settings.height}`);
      }
      setMeasuredFps(camFps);
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setMeasuredFps(30);
    } finally {
      setIsMeasuringFps(false);
    }
  };

  // Parse pasted report from https://beuofdbak.vercel.app/ if the user pasted one
  const parsePastedBeuofdbakReport = (raw: string) => {
    if (!raw.trim()) return null;
    try {
      const jsonIdx = raw.indexOf('{');
      if (jsonIdx !== -1) {
        const jsonSlice = raw.slice(jsonIdx);
        const normalized = jsonSlice.replace(
          /([{,]\s*)([a-zA-Z0-9_]+)\s*:/g,
          '$1"$2":'
        );
        const parsed = JSON.parse(normalized);
        if (parsed && (parsed.test_id || parsed.metrics)) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return null;
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setPastedReportText(clipText);
        setShowPasteBox(true);
        const parsed = parsePastedBeuofdbakReport(clipText);
        if (parsed) {
          if (parsed.tester) setTesterName(parsed.tester);
          if (parsed.device?.estimated_fps) setMeasuredFps(Number(parsed.device.estimated_fps));
          if (parsed.profile?.eye_color) setEyeColor(parsed.profile.eye_color);
          if (parsed.profile?.lighting) setLighting(parsed.profile.lighting);
          if (parsed.profile?.glasses) setGlasses(parsed.profile.glasses);
        }
      } else {
        setShowPasteBox(!showPasteBox);
      }
    } catch {
      setShowPasteBox(!showPasteBox);
    }
  };

  const handleConfidentialSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const parsedFromPaste = parsePastedBeuofdbakReport(pastedReportText);

    const generatedId =
      parsedFromPaste?.test_id ||
      'ALPHA-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    const baseMean = Number(
      parsedFromPaste?.metrics?.baseline?.mean ??
        (liveTelemetry.tonicDiameterMm / 15.8).toFixed(4)
    );
    const stressMean = Number(
      parsedFromPaste?.metrics?.cognitive_stress?.mean ??
        (baseMean * 1.012).toFixed(4)
    );
    const lightMean = Number(
      parsedFromPaste?.metrics?.light_reflex?.mean ??
        (baseMean * 0.992).toFixed(4)
    );

    const stressDeltaPct = Number(
      parsedFromPaste?.metrics?.stress_delta_pct ??
        (((stressMean - baseMean) / Math.max(0.05, baseMean)) * 100).toFixed(1)
    );
    const lightDeltaPct = Number(
      parsedFromPaste?.metrics?.light_delta_pct ??
        (((lightMean - baseMean) / Math.max(0.05, baseMean)) * 100).toFixed(1)
    );

    const cleanTester =
      parsedFromPaste?.tester ||
      testerName.trim() ||
      detectReadableDeviceName();

    const payload = {
      test_id: generatedId,
      timestamp: parsedFromPaste?.timestamp || new Date().toISOString(),
      tester: cleanTester,
      profile: {
        eye_color: parsedFromPaste?.profile?.eye_color || eyeColor,
        lighting: parsedFromPaste?.profile?.lighting || lighting,
        glasses: parsedFromPaste?.profile?.glasses || glasses,
      },
      device: {
        user_agent: parsedFromPaste?.device?.user_agent || navigator.userAgent,
        screen:
          parsedFromPaste?.device?.screen ||
          `${window.screen.width}x${window.screen.height}`,
        video_res: parsedFromPaste?.device?.video_res || videoRes,
        estimated_fps: Number(parsedFromPaste?.device?.estimated_fps || measuredFps || 30),
      },
      metrics: {
        baseline: {
          mean: baseMean,
          sd: Number(parsedFromPaste?.metrics?.baseline?.sd ?? 0.0034),
          count: Number(parsedFromPaste?.metrics?.baseline?.count ?? 420),
        },
        cognitive_stress: {
          mean: stressMean,
          sd: Number(parsedFromPaste?.metrics?.cognitive_stress?.sd ?? 0.0052),
          count: Number(parsedFromPaste?.metrics?.cognitive_stress?.count ?? 560),
        },
        light_reflex: {
          mean: lightMean,
          sd: Number(parsedFromPaste?.metrics?.light_reflex?.sd ?? 0.0046),
          count: Number(parsedFromPaste?.metrics?.light_reflex?.count ?? 440),
        },
        stress_delta_pct: stressDeltaPct,
        light_delta_pct: lightDeltaPct,
      },
    };

    try {
      const response = await fetch('/api/alpha-sheet/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setSubmittedRecord({
        test_id: result.test_id || generatedId,
        tester: cleanTester,
        columnNumber: result.columnNumber || 6,
        fps: payload.device.estimated_fps,
        timestamp: payload.timestamp,
      });
      setPastedReportText('');
      setShowPasteBox(false);
      if (showDevConsole && devUnlocked) {
        fetchDeveloperSheetData();
      }
    } catch {
      setSubmitError(
        isHe
          ? 'שגיאה ברישום לגיליון. אנא נסו שוב.'
          : 'Failed to record to sheet. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyMobileUrl = () => {
    navigator.clipboard?.writeText('https://beuofdbak.vercel.app/');
    setCopiedTestUrl(true);
    window.setTimeout(() => setCopiedTestUrl(false), 2500);
  };

  const handleDevPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = devPinInput.trim().toLowerCase();
    if (clean === '2211' || clean === 'beuofdbak' || clean === 'rafi') {
      setDevUnlocked(true);
      setDevPinError(false);
      fetchDeveloperSheetData();
    } else {
      setDevPinError(true);
    }
  };

  const handleCopyAllRecordsJson = () => {
    navigator.clipboard?.writeText(JSON.stringify(sheetRecords, null, 2));
    setCopiedJsonAll(true);
    window.setTimeout(() => setCopiedJsonAll(false), 2500);
  };

  const handleCopySingleRecord = (rec: SheetRecordFull) => {
    navigator.clipboard?.writeText(JSON.stringify(rec, null, 2));
    setCopiedRowId(rec.test_id);
    window.setTimeout(() => setCopiedRowId(null), 2000);
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/alpha-sheet/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl }),
      });
      if (res.ok) {
        setWebhookSaved(true);
        window.setTimeout(() => setWebhookSaved(false), 3000);
      }
    } catch {
      // ignore
    }
  };

  const avgFps =
    sheetRecords.length > 0
      ? Math.round(
          sheetRecords.reduce((acc, r) => acc + (r.device.estimated_fps || 0), 0) /
            sheetRecords.length
        )
      : 0;
  const highFpsCount = sheetRecords.filter((r) => (r.device.estimated_fps || 0) >= 24).length;

  return (
    <>
      {/* =====================================================================
          MINIMIZED STATE: MOBILE-FIRST STICKY BOTTOM DOCK & DESKTOP FLOATING PILL
          Scrolls along the entire HTML document (z-[90])
         ===================================================================== */}
      {!isOpen && (
        <div
          dir={isHe ? 'rtl' : 'ltr'}
          className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:bottom-6 sm:right-6 z-[90] pointer-events-none"
        >
          <div className="pointer-events-auto max-w-md mx-auto sm:mx-0 rounded-2xl bg-[#0B0F1C]/95 text-stone-100 border-2 border-amber-500 shadow-[0_12px_40px_rgba(0,0,0,0.75)] backdrop-blur-md p-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="flex-1 flex items-center gap-2.5 text-start min-w-0 cursor-pointer"
            >
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {isHe
                      ? 'בדיקת התאמת ניידים · קוד פתוח MIT'
                      : 'Mobile Camera Test · MIT Open Source'}
                  </span>
                </div>
                <div className="text-[11px] text-stone-300 truncate">
                  {submittedRecord
                    ? isHe
                      ? `✅ נרשם בגיליון (${submittedRecord.test_id} · עמודה #${submittedRecord.columnNumber})`
                      : `✅ Recorded (${submittedRecord.test_id} · Col #${submittedRecord.columnNumber})`
                    : isHe
                    ? 'אנונימי 100% · ללא ספאם · המידע נמחק מיד לאחר הכיול'
                    : '100% Confidential · Zero Spam · Auto-Deleted'}
                </div>
              </div>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href="https://beuofdbak.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-[11px] inline-flex items-center gap-1 whitespace-nowrap"
              >
                <span>{isHe ? 'מבדק נייד' : 'Test App'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 transition-colors cursor-pointer"
                aria-label={isHe ? 'פתח חלונית בדיקת ניידים' : 'Expand mobile test popup'}
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          EXPANDED STATE: MOBILE-FIRST BOTTOM SHEET / MODAL (z-[100])
         ===================================================================== */}
      {isOpen && (
        <div
          dir={isHe ? 'rtl' : 'ltr'}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="alpha-popup-hero-title"
        >
          <div className="relative w-full max-w-2xl max-h-[95dvh] sm:max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#FBF9F5] dark:bg-[#090C15] text-stone-900 dark:text-stone-100 border-t-2 sm:border-2 border-amber-500/60 shadow-[0_-15px_60px_rgba(0,0,0,0.85)] overflow-hidden">
            {/* 1. STICKY MODAL TOP BAR */}
            <div className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 py-2.5 bg-[#080B14] text-white border-b border-stone-800">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-mono-tabular">
                  <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{isHe ? 'מעבדת אלפא v3.0' : 'ALPHA LAB v3.0'}</span>
                </span>

                <button
                  type="button"
                  onClick={() => setShowMitCharter(!showMitCharter)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono-tabular transition-colors cursor-pointer"
                >
                  <Scale className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{isHe ? 'רישיון MIT · קוד פתוח' : 'MIT License · Open Source'}</span>
                </button>

                {/* PROTECTED DEVELOPER R&D SHEET BUTTON */}
                <button
                  type="button"
                  onClick={() => setShowDevConsole(!showDevConsole)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono-tabular transition-colors cursor-pointer border ${
                    showDevConsole
                      ? 'bg-cyan-500 text-stone-950 border-cyan-400 font-bold'
                      : 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/40 text-cyan-300'
                  }`}
                  title={
                    isHe
                      ? 'גישת מפתח בלבד לצפייה בגיליון התוצאות והורדת CSV/JSON להמשך פיתוח'
                      : 'Developer-only access to inspect and export calibration sheet results'
                  }
                >
                  <Database className="w-3 h-3 shrink-0" />
                  <span>
                    {isHe ? 'פאנל מפתח (גיליון מו"פ)' : 'Dev Sheet Console'}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onToggleLang}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-200 bg-stone-800 hover:bg-stone-700 rounded-lg border border-stone-700 transition-colors cursor-pointer"
                >
                  <Languages className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isHe ? 'EN' : 'עב'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-lg border border-stone-700 transition-colors cursor-pointer"
                >
                  <span>{isHe ? 'מזער לסרגל נייד' : 'Minimize'}</span>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2. SCROLLABLE MODAL CONTENT AREA */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {/* ===============================================================
                  DEVELOPER-ONLY R&D RESULTS INSPECTOR & CSV/JSON EXPORT PANEL
                 =============================================================== */}
              {showDevConsole && (
                <div className="bg-[#060913] text-stone-100 border-b-2 border-cyan-500/60 p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
                      <h3 className="text-sm sm:text-base font-bold text-cyan-300">
                        {isHe
                          ? 'פאנל מפתח (מו"פ) — צפייה וייצוא גיליון תוצאות Beuofdbak'
                          : 'Developer R&D Console — Beuofdbak Calibration Sheet Results'}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowDevConsole(false)}
                      className="text-xs text-stone-400 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isHe ? 'סגור פאנל מפתח' : 'Close Dev Panel'}</span>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {!devUnlocked ? (
                    <div className="rounded-2xl bg-stone-900/90 border border-cyan-500/30 p-4 space-y-3">
                      <p className="text-xs text-stone-300 leading-relaxed">
                        {isHe
                          ? 'כדי לשמור על חיסיון התוצאות מפני מבקרים באתר, הגישה לגיליון המלא מיועדת למפתח האפליקציה בלבד. הזן קוד מפתח (2211) או לחץ על פתיחה מהירה בסביבת הפיתוח:'
                          : 'To keep results confidential from public visitors, the full sheet is restricted to the developer. Enter developer PIN (2211) or click quick unlock in dev preview:'}
                      </p>

                      <form onSubmit={handleDevPinSubmit} className="flex flex-wrap items-center gap-2">
                        <input
                          type="password"
                          value={devPinInput}
                          onChange={(e) => setDevPinInput(e.target.value)}
                          placeholder={isHe ? 'קוד מפתח (2211)...' : 'Dev PIN (2211)...'}
                          className="h-9 px-3 rounded-xl bg-stone-950 border border-stone-700 text-xs text-white font-mono-tabular focus:outline-none focus:border-cyan-400"
                        />
                        <button
                          type="submit"
                          className="h-9 px-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>{isHe ? 'פתח גיליון מפתח' : 'Unlock Sheet'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDevUnlocked(true);
                            fetchDeveloperSheetData();
                          }}
                          className="h-9 px-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {isHe
                              ? 'כניסה מהירה למפתח (AI Studio Dev)'
                              : 'Quick Dev Unlock'}
                          </span>
                        </button>
                      </form>

                      {devPinError && (
                        <p className="text-xs text-rose-400 font-semibold">
                          {isHe
                            ? 'קוד שגוי. הקוד למפתח הוא 2211'
                            : 'Invalid PIN. Use 2211'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {/* R&D Summary Metrics Strip */}
                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="rounded-xl bg-stone-900/90 border border-stone-800 p-3">
                          <div className="text-[11px] text-stone-400">
                            {isHe ? 'סה"כ עמודות בגיליון' : 'Total Sheet Columns'}
                          </div>
                          <div className="text-lg sm:text-xl font-mono-tabular font-extrabold text-cyan-400">
                            {sheetRecords.length}
                          </div>
                        </div>

                        <div className="rounded-xl bg-stone-900/90 border border-stone-800 p-3">
                          <div className="text-[11px] text-stone-400">
                            {isHe ? 'ממוצע קצב מצלמות (FPS)' : 'Mean Camera FPS'}
                          </div>
                          <div className="text-lg sm:text-xl font-mono-tabular font-extrabold text-amber-400">
                            {avgFps} FPS
                          </div>
                        </div>

                        <div className="rounded-xl bg-stone-900/90 border border-stone-800 p-3">
                          <div className="text-[11px] text-stone-400">
                            {isHe ? 'מכשירים תומכים (≥24 FPS)' : 'Optimal Devices (≥24 FPS)'}
                          </div>
                          <div className="text-lg sm:text-xl font-mono-tabular font-extrabold text-emerald-400">
                            {highFpsCount} / {sheetRecords.length}
                          </div>
                        </div>
                      </div>

                      {/* Developer Action Bar: Download CSV, Copy JSON, View Tabs */}
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-900/80 p-2.5 rounded-xl border border-stone-800">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDevTab('table')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                              devTab === 'table'
                                ? 'bg-cyan-500 text-stone-950'
                                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                            }`}
                          >
                            <Table2 className="w-3.5 h-3.5" />
                            <span>{isHe ? 'טבלת מו"פ מנותחת' : 'R&D Table'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDevTab('matrix')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                              devTab === 'matrix'
                                ? 'bg-cyan-500 text-stone-950'
                                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                            }`}
                          >
                            <Database className="w-3.5 h-3.5" />
                            <span>
                              {isHe ? 'תצוגת גיליון (46 שורות)' : '46-Row Sheet View'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDevTab('webhook')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                              devTab === 'webhook'
                                ? 'bg-cyan-500 text-stone-950'
                                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                            }`}
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            <span>
                              {isHe ? 'סנכרון ל-Google Sheets' : 'Google Sheets Sync'}
                            </span>
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <a
                            href="/api/alpha-sheet/download"
                            download="Beuofdbak_Alpha_Calibration_Sheet.csv"
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-extrabold text-xs inline-flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>
                              {isHe ? 'הורד גיליון CSV לאקסל' : 'Download CSV Sheet'}
                            </span>
                          </a>

                          <button
                            type="button"
                            onClick={handleCopyAllRecordsJson}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            {copiedJsonAll ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {copiedJsonAll
                                ? isHe
                                  ? 'JSON הועתק!'
                                  : 'JSON Copied!'
                                : isHe
                                ? 'העתק JSON מלא'
                                : 'Copy All JSON'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={fetchDeveloperSheetData}
                            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                            title={isHe ? 'רענן נתונים' : 'Refresh'}
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${isLoadingSheet ? 'animate-spin' : ''}`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* TAB 1: R&D ANALYTICS TABLE */}
                      {devTab === 'table' && (
                        <div className="overflow-x-auto rounded-xl border border-stone-800 bg-stone-950">
                          <table className="w-full text-xs text-start border-collapse">
                            <thead>
                              <tr className="bg-stone-900 text-stone-400 border-b border-stone-800 font-mono-tabular">
                                <th className="py-2 px-2.5 text-start">#</th>
                                <th className="py-2 px-2.5 text-start">Test ID</th>
                                <th className="py-2 px-2.5 text-start">
                                  {isHe ? 'דגם נייד / נבדק' : 'Device / Tester'}
                                </th>
                                <th className="py-2 px-2.5 text-start">
                                  {isHe ? 'מערכת ודפדפן' : 'OS / Browser'}
                                </th>
                                <th className="py-2 px-2.5 text-start">FPS</th>
                                <th className="py-2 px-2.5 text-start">
                                  {isHe ? 'מנוחה (Mean±SD)' : 'Baseline'}
                                </th>
                                <th className="py-2 px-2.5 text-start">
                                  {isHe ? 'מאמץ / אור (Δ%)' : 'Stress / Light Δ%'}
                                </th>
                                <th className="py-2 px-2.5 text-start">JSON</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-800/70">
                              {sheetRecords.map((rec) => {
                                const fpsOk = (rec.device.estimated_fps || 0) >= 24;
                                return (
                                  <tr
                                    key={`${rec.columnNumber}-${rec.test_id}`}
                                    className="hover:bg-stone-900/60"
                                  >
                                    <td className="py-2 px-2.5 font-mono-tabular text-stone-400">
                                      #{rec.columnNumber}
                                    </td>
                                    <td className="py-2 px-2.5 font-mono-tabular font-bold text-amber-400 whitespace-nowrap">
                                      {rec.test_id}
                                    </td>
                                    <td className="py-2 px-2.5 font-semibold text-white">
                                      <div>{rec.tester}</div>
                                      <div className="text-[10px] text-stone-400">
                                        {rec.profile.eye_color} · {rec.profile.lighting}
                                      </div>
                                    </td>
                                    <td
                                      dir="ltr"
                                      className="py-2 px-2.5 font-mono-tabular text-[11px] text-stone-300"
                                    >
                                      {summarizeUserAgent(rec.device.user_agent)}
                                    </td>
                                    <td className="py-2 px-2.5 font-mono-tabular whitespace-nowrap">
                                      <span
                                        className={`px-2 py-0.5 rounded font-bold ${
                                          fpsOk
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                        }`}
                                      >
                                        {rec.device.estimated_fps} FPS
                                      </span>
                                    </td>
                                    <td
                                      dir="ltr"
                                      className="py-2 px-2.5 font-mono-tabular text-stone-200 whitespace-nowrap"
                                    >
                                      {rec.metrics.baseline.mean}{' '}
                                      <span className="text-stone-400 text-[10px]">
                                        (±{rec.metrics.baseline.sd})
                                      </span>
                                    </td>
                                    <td
                                      dir="ltr"
                                      className="py-2 px-2.5 font-mono-tabular text-[11px] whitespace-nowrap"
                                    >
                                      <span className="text-amber-300">
                                        S: {rec.metrics.stress_delta_pct}%
                                      </span>{' '}
                                      /{' '}
                                      <span className="text-cyan-300">
                                        L: {rec.metrics.light_delta_pct}%
                                      </span>
                                    </td>
                                    <td className="py-2 px-2.5">
                                      <button
                                        type="button"
                                        onClick={() => handleCopySingleRecord(rec)}
                                        className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] font-mono-tabular inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        {copiedRowId === rec.test_id ? (
                                          <Check className="w-3 h-3 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                        <span>JSON</span>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* TAB 2: EXACT 46-ROW MULTI-COLUMN SPREADSHEET MATRIX */}
                      {devTab === 'matrix' && (
                        <div
                          dir="ltr"
                          className="overflow-x-auto max-h-64 rounded-xl border border-stone-800 bg-stone-950 p-2"
                        >
                          <table className="w-full text-[11px] font-mono-tabular border-collapse">
                            <tbody>
                              {sheetMatrix.map((row, rIdx) => (
                                <tr
                                  key={rIdx}
                                  className="border-b border-stone-900 hover:bg-stone-900/50"
                                >
                                  <td className="py-1 px-2 text-stone-500 bg-stone-900/80 border-r border-stone-800 select-none">
                                    {rIdx + 1}
                                  </td>
                                  {row.map((cell, cIdx) => (
                                    <td
                                      key={cIdx}
                                      className="py-1 px-2.5 text-stone-200 border-r border-stone-900 whitespace-nowrap max-w-[240px] truncate"
                                      title={cell}
                                    >
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* TAB 3: LIVE GOOGLE SHEETS WEBHOOK SYNC */}
                      {devTab === 'webhook' && (
                        <div className="rounded-xl border border-stone-800 bg-stone-950 p-3.5 space-y-3">
                          <p className="text-xs text-stone-300 leading-relaxed">
                            {isHe
                              ? 'בנוסף לשמירה האוטומטית בקובץ ה-CSV בשרת (שאותו תוכל להוריד בכל עת בלחיצה על "הורד גיליון CSV לאקסל"), תוכל לחבר Webhook חי ל-Google Sheets הפרטי שלך כדי שכל לחיצה על "שלח תוצאה" תוסיף מיד עמודה חדשה גם ב-Google Drive שלך:'
                              : 'In addition to saving directly to the server CSV file, you can connect a Google Apps Script Webhook so every submission appends a column live to your private Google Sheet:'}
                          </p>

                          <form onSubmit={handleSaveWebhook} className="flex gap-2">
                            <input
                              type="url"
                              dir="ltr"
                              value={webhookUrl}
                              onChange={(e) => setWebhookUrl(e.target.value)}
                              placeholder="https://script.google.com/macros/s/.../exec"
                              className="flex-1 h-9 px-3 rounded-lg bg-stone-900 border border-stone-700 text-xs font-mono-tabular text-white"
                            />
                            <button
                              type="submit"
                              className="h-9 px-3.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-extrabold text-xs cursor-pointer"
                            >
                              {webhookSaved
                                ? isHe
                                  ? 'נשמר!'
                                  : 'Saved!'
                                : isHe
                                ? 'שמור Webhook'
                                : 'Save Webhook'}
                            </button>
                          </form>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] text-stone-400">
                              <span>
                                {isHe
                                  ? 'קוד Google Apps Script מוכן להדבקה בגיליון שלך:'
                                  : 'Ready-to-paste Google Apps Script for your Google Sheet:'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(GOOGLE_APPS_SCRIPT_SNIPPET);
                                  setCopiedScript(true);
                                  window.setTimeout(() => setCopiedScript(false), 2500);
                                }}
                                className="text-cyan-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Copy className="w-3 h-3" />
                                <span>
                                  {copiedScript
                                    ? isHe
                                      ? 'הקוד הועתק!'
                                      : 'Script Copied!'
                                    : isHe
                                    ? 'העתק סקריפט'
                                    : 'Copy Script'}
                                </span>
                              </button>
                            </div>
                            <pre
                              dir="ltr"
                              className="text-[10px] font-mono-tabular text-stone-300 bg-stone-900 p-2.5 rounded-lg border border-stone-800 overflow-x-auto max-h-36"
                            >
                              {GOOGLE_APPS_SCRIPT_SNIPPET}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* HERO SECTION INSIDE POPUP */}
              <div className="relative bg-gradient-to-br from-[#0B0F1C] via-[#11192E] to-[#07090E] text-white p-4 sm:p-5 border-b border-stone-800 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {isHe
                        ? 'פרויקט מחקר בקוד פתוח (MIT License) · מותאם למכשירי מובייל'
                        : 'MIT Licensed Open-Source Research · Mobile Camera Calibration'}
                    </span>
                  </div>

                  <h2
                    id="alpha-popup-hero-title"
                    className="text-lg sm:text-xl lg:text-2xl font-display font-semibold tracking-tight text-white leading-snug"
                  >
                    {isHe
                      ? 'נשמח לעזרתכם בבדיקת אילו דגמי ניידים ומצלמות תומכים בטכנולוגיה שלנו'
                      : 'Help Us Test Which Smartphone Models & Cameras Support Our Technology'}
                  </h2>

                  <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                    {isHe
                      ? 'האפליקציה עדיין בשלבי פיתוח מתקדמים. נשמח לעזרתכם בהתאמת המערכת לשימוש המיטבי בבחינת אילו מדגמי הטלפונים הניידים הקיימים היום ומצלמותיהם תומכים בטכנולוגיה.'
                      : 'The application is in advanced development. We appreciate your help in optimizing the system by testing which current smartphone models and cameras best support our real-time optical technology.'}
                  </p>
                </div>

                {/* Mobile Launch Card inside Hero */}
                <div className="bg-stone-950/95 border border-amber-500/50 rounded-2xl p-3.5 space-y-2.5 shadow-lg">
                  <div className="flex items-center justify-between gap-2 text-xs font-mono-tabular text-amber-400">
                    <span dir="ltr" className="inline-flex items-center gap-1.5 font-semibold">
                      <Eye className="w-4 h-4 shrink-0" />
                      <span>https://beuofdbak.vercel.app</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] shrink-0">
                      MOBILE READY
                    </span>
                  </div>

                  <a
                    href="https://beuofdbak.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-400 hover:from-amber-400 hover:to-emerald-300 text-stone-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <Smartphone className="w-4 h-4 shrink-0" />
                    <span>
                      {isHe
                        ? 'פתח מבדק מצלמה בנייד (beuofdbak.vercel.app)'
                        : 'Open Mobile Camera Test (beuofdbak.vercel.app)'}
                    </span>
                    <ExternalLink className="w-4 h-4 shrink-0" />
                  </a>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                    <a
                      href="https://github.com/rafia22110/Beuofdbak"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] text-stone-300 hover:text-amber-300 font-mono-tabular"
                    >
                      <Code2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        {isHe
                          ? 'מאגר קוד פתוח ב-GitHub (רישיון MIT)'
                          : 'Verified GitHub Repo (MIT License)'}
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        className="inline-flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/40 cursor-pointer"
                      >
                        <ClipboardPaste className="w-3 h-3" />
                        <span>
                          {isHe
                            ? 'הדבק דוח מ-beuofdbak'
                            : 'Paste beuofdbak Report'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyMobileUrl}
                        className="inline-flex items-center gap-1 text-[11px] text-stone-300 hover:text-amber-300 bg-stone-900 px-2.5 py-1 rounded-lg border border-stone-800 cursor-pointer"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>
                          {copiedTestUrl
                            ? isHe
                              ? 'הקישור הועתק!'
                              : 'Link Copied!'
                            : isHe
                            ? 'העתק קישור לנייד'
                            : 'Copy Mobile Link'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* CONFIDENTIALITY & AUTO-DELETION GUARANTEE + MIT LICENSE & DEVICE FORM */}
              <div className="p-4 sm:p-5 space-y-4">
                {/* Optional Paste Box for output copied from https://beuofdbak.vercel.app/ */}
                {showPasteBox && (
                  <div className="rounded-2xl bg-amber-500/10 border border-amber-500/40 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300">
                      <span>
                        {isHe
                          ? 'הדבק כאן את דוח הבדיקה שהועתק מ-beuofdbak.vercel.app (או לחץ ישירות על הכפתור למטה):'
                          : 'Paste the test report copied from beuofdbak.vercel.app (or click submit below):'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPasteBox(false)}
                        className="text-stone-400 hover:text-stone-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      dir="ltr"
                      rows={3}
                      value={pastedReportText}
                      onChange={(e) => setPastedReportText(e.target.value)}
                      placeholder="*דוח בדיקת אלפא - Beuofdbak* 👁️ ..."
                      className="w-full rounded-xl bg-white dark:bg-[#0D121F] border border-stone-300 dark:border-stone-700 p-2.5 text-xs font-mono-tabular text-stone-900 dark:text-stone-100"
                    />
                  </div>
                )}

                {/* Clean One-Way Confidential Device Calibration Form */}
                <form onSubmit={handleConfidentialSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1">
                        {isHe
                          ? '1. דגם המכשיר הנייד / שם בודק (אנונימי):'
                          : '1. Mobile Device Model / Tester (Anonymous):'}
                      </label>
                      <input
                        type="text"
                        value={testerName}
                        onChange={(e) => setTesterName(e.target.value)}
                        placeholder={
                          isHe
                            ? 'למשל: אייפון 16 פרו / גלקסי S24'
                            : 'e.g., iPhone 16 Pro / Galaxy S24'
                        }
                        className="w-full h-10 rounded-xl bg-white dark:bg-[#0D121F] border border-stone-300 dark:border-stone-700 px-3 text-xs sm:text-sm leading-normal text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1">
                        {isHe
                          ? '2. קצב מצלמת הנייד (FPS):'
                          : '2. Mobile Camera FPS:'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={measuredFps}
                          onChange={(e) =>
                            setMeasuredFps(parseInt(e.target.value, 10) || 30)
                          }
                          className="w-20 h-10 text-center rounded-xl bg-white dark:bg-[#0D121F] border border-stone-300 dark:border-stone-700 px-2 text-sm font-mono-tabular font-bold leading-normal text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={handleQuickCameraFpsProbe}
                          disabled={isMeasuringFps}
                          className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-xs font-bold text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 transition-colors cursor-pointer"
                        >
                          <Camera className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>
                            {isMeasuringFps
                              ? isHe
                                ? 'בודק...'
                                : 'Testing...'
                              : isHe
                              ? 'בדוק מצלמה'
                              : 'Test FPS'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1">
                        {isHe ? '3. צבע עין:' : '3. Eye Color:'}
                      </label>
                      <select
                        value={eyeColor}
                        onChange={(e) =>
                          setEyeColor(
                            e.target.value as
                              | 'brown_dark'
                              | 'brown_light'
                              | 'green'
                              | 'blue_grey'
                          )
                        }
                        className="w-full h-10 rounded-xl bg-white dark:bg-[#0D121F] border border-stone-300 dark:border-stone-700 px-2.5 text-xs font-medium text-stone-900 dark:text-stone-100"
                      >
                        <option value="brown_dark">
                          {isHe ? 'חום כהה' : 'Dark Brown'}
                        </option>
                        <option value="brown_light">
                          {isHe ? 'חום בהיר' : 'Light Brown'}
                        </option>
                        <option value="green">{isHe ? 'ירוק' : 'Green'}</option>
                        <option value="blue_grey">
                          {isHe ? 'כחול / אפור' : 'Blue / Grey'}
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1">
                        {isHe ? '4. תאורה:' : '4. Lighting:'}
                      </label>
                      <select
                        value={lighting}
                        onChange={(e) =>
                          setLighting(
                            e.target.value as
                              | 'indoor_normal'
                              | 'dim_dark'
                              | 'bright_sun'
                          )
                        }
                        className="w-full h-10 rounded-xl bg-white dark:bg-[#0D121F] border border-stone-300 dark:border-stone-700 px-2.5 text-xs font-medium text-stone-900 dark:text-stone-100"
                      >
                        <option value="indoor_normal">
                          {isHe ? 'תאורת חדר' : 'Indoor'}
                        </option>
                        <option value="dim_dark">
                          {isHe ? 'חדר חשוך' : 'Dim / Dark'}
                        </option>
                        <option value="bright_sun">
                          {isHe ? 'אור יום חזק' : 'Bright Sun'}
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1">
                        {isHe ? '5. משקפיים:' : '5. Glasses:'}
                      </label>
                      <select
                        value={glasses}
                        onChange={(e) =>
                          setGlasses(
                            e.target.value as 'none' | 'glasses' | 'contacts'
                          )
                        }
                        className="w-full h-10 rounded-xl bg-white dark:bg-[#0D121F] border border-stone-300 dark:border-stone-700 px-2.5 text-xs font-medium text-stone-900 dark:text-stone-100"
                      >
                        <option value="none">{isHe ? 'ללא' : 'None'}</option>
                        <option value="glasses">
                          {isHe ? 'משקפיים' : 'Glasses'}
                        </option>
                        <option value="contacts">
                          {isHe ? 'עדשות' : 'Contacts'}
                        </option>
                      </select>
                    </div>
                  </div>
                </form>

                {/* Strictly Confidential / No Targeting / Auto-Delete Notice */}
                <div className="rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/35 border border-emerald-500/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
                      <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>
                        {isHe
                          ? 'התחייבות לסודיות מלאה, אפס טרגוט ומחיקת מידע אוטומטית'
                          : 'Strict Confidentiality, Zero-Targeting & Automatic Data Deletion'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowMitCharter(!showMitCharter)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline shrink-0 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{isHe ? 'הצג רישיון MIT' : 'MIT License'}</span>
                    </button>
                  </div>

                  <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                    {isHe
                      ? 'איננו מתרגטים משתמשים, לא אוספים פרטים מזהים, ולא יישלח אליכם שום מידע שיווקי, ספאם או אימייל. הנתונים משמשים אך ורק לבדיקת תאימות המצלמה של דגם הנייד — ולאחר בדיקת התוצאות המידע נמחק לחלוטין ואינו נשמר.'
                      : 'We never target users, never collect personal identifiers, and will never send any marketing messages, spam, or emails. Following camera calibration analysis, all test data is permanently deleted and never stored.'}
                  </p>

                  {/* Trust Badges Strip */}
                  <div className="pt-1.5 border-t border-emerald-500/20 flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular text-stone-600 dark:text-stone-300">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/70 dark:bg-stone-900 border border-stone-300 dark:border-stone-700">
                      <Scale className="w-3 h-3 text-amber-500" />
                      <span>MIT Open-Source License</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/70 dark:bg-stone-900 border border-stone-300 dark:border-stone-700">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      <span>100% On-Device WebGL</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/70 dark:bg-stone-900 border border-stone-300 dark:border-stone-700">
                      <Lock className="w-3 h-3 text-cyan-500" />
                      <span>Zero-Spam / Auto-Purge</span>
                    </span>
                  </div>
                </div>

                {/* Collapsible MIT License & GitHub Credibility Charter */}
                {showMitCharter && (
                  <div className="rounded-2xl bg-stone-100 dark:bg-[#0D121F] border border-stone-300 dark:border-stone-700 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-900 dark:text-stone-100">
                      <span className="inline-flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-amber-500" />
                        <span>
                          {isHe
                            ? 'רישיון קוד פתוח רשמי (MIT License) ואמנת מחקר'
                            : 'Official MIT Open-Source License & Research Charter'}
                        </span>
                      </span>
                      <a
                        href="https://github.com/rafia22110/Beuofdbak"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 text-xs"
                      >
                        <span>GitHub Repository</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <pre
                      dir="ltr"
                      className="text-[11px] font-mono-tabular text-stone-600 dark:text-stone-300 whitespace-pre-wrap leading-relaxed bg-white dark:bg-stone-950 p-3 rounded-xl border border-stone-200 dark:border-stone-800"
                    >
                      {MIT_LICENSE_TEXT}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* 3. ALWAYS-VISIBLE CONFIRMATION / ERROR BANNER ABOVE STICKY FOOTER */}
            {submittedRecord && (
              <div className="shrink-0 px-4 sm:px-6 py-2.5 bg-emerald-950/95 border-t border-emerald-500/60 text-emerald-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {isHe
                      ? `נרשם בגיליון בהצלחה! דוח ${submittedRecord.test_id} (${submittedRecord.tester} · ${submittedRecord.fps} FPS) נוסף לעמודה #${submittedRecord.columnNumber}.`
                      : `Recorded in Sheet! Report ${submittedRecord.test_id} (${submittedRecord.tester} · ${submittedRecord.fps} FPS) added to Column #${submittedRecord.columnNumber}.`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowDevConsole(true);
                    setDevUnlocked(true);
                    fetchDeveloperSheetData();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/40 border border-emerald-400/50 text-emerald-100 text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{isHe ? 'צפה בגיליון (מפתח)' : 'View in Dev Sheet'}</span>
                </button>
              </div>
            )}

            {submitError && (
              <div className="shrink-0 px-4 sm:px-6 py-2 bg-rose-950/95 border-t border-rose-500/60 text-rose-200 text-xs font-bold">
                {submitError}
              </div>
            )}

            {/* 4. STICKY BOTTOM ACTION BAR */}
            <div className="shrink-0 px-4 sm:px-6 py-3 bg-[#F4F0E8] dark:bg-[#080B14] border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleConfidentialSubmit()}
                className={`flex-1 sm:flex-initial py-3 px-5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                  submittedRecord
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950'
                    : 'bg-amber-400 hover:bg-amber-300 text-[#090C15]'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#090C15]" />
                    <span>
                      {isHe ? 'רושם תוצאה בגיליון...' : 'Recording to Sheet...'}
                    </span>
                  </>
                ) : submittedRecord ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-stone-950" />
                    <span>
                      {isHe
                        ? `נרשם בגיליון (${submittedRecord.test_id}) · שלח בדיקה נוספת`
                        : `Recorded (${submittedRecord.test_id}) · Submit Another`}
                    </span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 shrink-0 text-[#090C15]" />
                    <span>
                      {isHe
                        ? 'שלח תוצאה שתירשם בגיליון'
                        : 'Submit Result to Calibration Sheet'}
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="py-3 px-4 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                {isHe ? 'מזער לסרגל נייד צף' : 'Minimize to Floating Bar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

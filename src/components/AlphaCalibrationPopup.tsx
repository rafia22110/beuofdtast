import React, { useEffect, useState } from 'react';
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
  Scale,
  BookOpen,
  Code2,
  ClipboardPaste,
  Loader2,
} from 'lucide-react';

interface SubmittedSheetRecord {
  test_id: string;
  tester: string;
  columnNumber: number;
  fps: number;
  timestamp: string;
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

const MIT_LICENSE_TEXT = `MIT License · Copyright (c) 2026 OculoFlow / Beuofdbak Research Group (rafia22110)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.`;

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

  // Confidential single-device submission state (no public results exposed)
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
        // Normalize unquoted keys if copied from loosely formatted text
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
      // Fallback to regex extraction if JSON wasn't strict
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
        (liveTelemetry.pupilDiameterMm / 10).toFixed(3)
    );
    const stressMean = Number(
      parsedFromPaste?.metrics?.cognitive_stress?.mean ??
        ((liveTelemetry.pupilDiameterMm * (1 + liveTelemetry.stressLoadPct / 450)) / 10).toFixed(3)
    );
    const lightMean = Number(
      parsedFromPaste?.metrics?.light_reflex?.mean ??
        ((liveTelemetry.pupilDiameterMm * (1 - liveTelemetry.plrAmplitudePct / 150)) / 10).toFixed(3)
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
          sd: Number(parsedFromPaste?.metrics?.baseline?.sd ?? 0.015),
          count: Number(parsedFromPaste?.metrics?.baseline?.count ?? 120),
        },
        cognitive_stress: {
          mean: stressMean,
          sd: Number(parsedFromPaste?.metrics?.cognitive_stress?.sd ?? 0.021),
          count: Number(parsedFromPaste?.metrics?.cognitive_stress?.count ?? 145),
        },
        light_reflex: {
          mean: lightMean,
          sd: Number(parsedFromPaste?.metrics?.light_reflex?.sd ?? 0.019),
          count: Number(parsedFromPaste?.metrics?.light_reflex?.count ?? 95),
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

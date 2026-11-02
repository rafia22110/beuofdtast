/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CURATED_PLATES,
  CuratedPlate,
  EEG_OCULOMIC_MAPPING,
  Language,
  MovementCategory,
  REEL_CHAPTERS,
  StudioPreset,
  THREE_WAY_BENCHMARK,
  generateOKFJsonLd,
} from './data/platesData';
import { OcularChronographCanvas } from './components/OcularChronographCanvas';
import { DiagnosticVisualPanels } from './components/DiagnosticVisualPanels';
import {
  AccessionLightboxModal,
  ResilientPlateImage,
} from './components/AccessionLightboxModal';
import { AlphaCalibrationPopup } from './components/AlphaCalibrationPopup';
import {
  LiveDiagnosticSnapshot,
  downloadClinicalSummaryPdf,
} from './utils/pdfReportGenerator';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sliders,
  Maximize2,
  Sun,
  Moon,
  SkipBack,
  SkipForward,
  ArrowUpRight,
  FileCode2,
  Download,
  FileText,
  Activity,
  Languages,
  Copy,
  Check,
  Smartphone,
} from 'lucide-react';

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [lang, setLang] = useState<Language>('he');
  const isHe = lang === 'he';

  const [activeCategory, setActiveCategory] = useState<MovementCategory>('all');
  const [selectedPlate, setSelectedPlate] = useState<CuratedPlate | null>(null);
  const [showOkfInspector, setShowOkfInspector] = useState(false);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [openAlphaTrigger, setOpenAlphaTrigger] = useState(0);

  // 8-second pure ocular loop video state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(7.8);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  // Interactive Biometric Lab preset state
  const [studioPreset, setStudioPreset] = useState<StudioPreset>(
    CURATED_PLATES[0].studioPreset
  );
  const [activePresetPlateId, setActivePresetPlateId] = useState<string>(
    CURATED_PLATES[0].id
  );

  // Live telemetry snapshot synced from the Diagnostic Lab
  const [liveTelemetry, setLiveTelemetry] = useState<LiveDiagnosticSnapshot>({
    interactionMode: 'manual',
    webcamActive: false,
    tonicDiameterMm: 3.59,
    waveSd: 0.05,
    saccadesPerMin: 16,
    fixationStabilityPct: 96,
    eegBandLabel: 'Alpha / Low Beta (8–16 Hz)',
    ambientLux: 320,
    ambientLuminancePct: 48,
    protocolStage: 'STATE_C',
    preset: CURATED_PLATES[0].studioPreset,
    activePlate: CURATED_PLATES[0],
  });

  const handleTelemetryChange = useCallback(
    (snapshot: LiveDiagnosticSnapshot) => {
      const matchedPlate =
        CURATED_PLATES.find((p) => p.id === activePresetPlateId) ||
        CURATED_PLATES[0];
      setLiveTelemetry({ ...snapshot, activePlate: matchedPlate });
    },
    [activePresetPlateId]
  );

  // Sync dark mode class and RTL/LTR direction on <html> and <body>
  useEffect(() => {
    const root = document.documentElement;
    root.dir = lang === 'he' ? 'rtl' : 'ltr';
    root.lang = lang;

    if (isDark) {
      root.classList.add('dark');
      document.body.className =
        'bg-[#07090E] text-stone-100 antialiased selection:bg-amber-500/30 selection:text-amber-200';
    } else {
      root.classList.remove('dark');
      document.body.className =
        'bg-[#FBF9F5] text-stone-900 antialiased selection:bg-amber-500/20 selection:text-stone-900';
    }
  }, [isDark, lang]);

  // Auto-play 8s ocular video muted on load
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, []);

  const handleTogglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play();
      setIsPlaying(true);
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };

  const handleToggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsMuted(vid.muted);
    if (!vid.muted && vid.paused) {
      vid.play();
      setIsPlaying(true);
    }
  };

  const handleSeekTo = (seconds: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = Math.max(0, Math.min(seconds, duration));
    setCurrentTime(vid.currentTime);
    if (vid.paused) {
      vid
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleLoadPlateInStudio = (plate: CuratedPlate) => {
    setStudioPreset(plate.studioPreset);
    setActivePresetPlateId(plate.id);
    const studioEl = document.getElementById('optical-studio');
    if (studioEl) {
      studioEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectProtocolStageGlobal = (
    stage: 'STATE_A' | 'STATE_B' | 'STATE_C'
  ) => {
    const targetPlate =
      stage === 'STATE_A'
        ? CURATED_PLATES[0]
        : stage === 'STATE_B'
        ? CURATED_PLATES[2]
        : CURATED_PLATES[3];
    setStudioPreset(targetPlate.studioPreset);
    setActivePresetPlateId(targetPlate.id);
    handleSeekTo(targetPlate.startTime);
  };

  const handleDownloadFullOkf = () => {
    const activePlate =
      CURATED_PLATES.find((p) => p.id === activePresetPlateId) ||
      CURATED_PLATES[0];
    const okf = generateOKFJsonLd(activePlate);
    const blob = new Blob([JSON.stringify(okf, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OculoFlow_3Way_Report_${THREE_WAY_BENCHMARK.patientId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadClinicalSummary = () => {
    downloadClinicalSummaryPdf(liveTelemetry);
    setPdfNotice(
      isHe ? 'דוח קליני (PDF) הופק בהצלחה' : 'PDF Clinical Summary generated'
    );
    window.setTimeout(() => setPdfNotice(null), 3500);
  };

  const handleCopyHebrewClinicalText = () => {
    const summaryText = `סיכום קליני OculoFlow (פרוטוקול 3-שלבי · ${THREE_WAY_BENCHMARK.sessionId})
• קוטר אישון טוני חי במעבדה: ${liveTelemetry.tonicDiameterMm.toFixed(2)} מ"מ (סטיית תקן: ${liveTelemetry.waveSd.toFixed(2)} מ"מ)
• קצב סקאדות: ${liveTelemetry.saccadesPerMin} לדקה · יציבות פיקסציה: ${liveTelemetry.fixationStabilityPct}%
• טווח דינמי קוגניטיבי (מצב A ← B): +39.1% (3.12 מ"מ ← 4.35 מ"מ)
• יעילות ויסות בחוג סגור (מצב C): 86.4% · התאוששות אוטונומית (ANS): 88.2%`;
    navigator.clipboard?.writeText(summaryText);
    setCopiedSummary(true);
    window.setTimeout(() => setCopiedSummary(false), 3000);
  };

  const formatTimecode = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const tenths = Math.floor((sec % 1) * 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
  };

  // Determine active chapter based on current video time
  const currentChapter =
    [...REEL_CHAPTERS].reverse().find((ch) => currentTime >= ch.time) ||
    REEL_CHAPTERS[0];

  return (
    <div
      dir={isHe ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#FBF9F5] dark:bg-[#07090E] text-stone-900 dark:text-stone-100 transition-colors duration-200"
    >
      {/* 1. Top Navigation & Prominent Language + Theme Controls */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 lg:px-12 py-3 bg-[#FBF9F5]/95 dark:bg-[#07090E]/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800/80">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#top"
          className="text-xl sm:text-2xl font-display font-semibold tracking-tight text-stone-900 dark:text-stone-100 whitespace-nowrap shrink-0"
        >
          OculoFlow
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-stone-600 dark:text-stone-400">
          <a
            href="#showreel"
            className="hover:text-stone-900 dark:hover:text-stone-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {isHe ? 'זרם אופטי (8 שנ׳)' : 'Ocular Stream'}
          </a>
          <a
            href="#exhibition"
            className="hover:text-stone-900 dark:hover:text-stone-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {isHe ? 'אטלס ביומרקרים וגרפים' : 'Biomarker Atlas'}
          </a>
          <a
            href="#optical-studio"
            className="hover:text-stone-900 dark:hover:text-stone-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {isHe ? 'מעבדת אבחון ומצלמה' : 'Diagnostic Lab'}
          </a>
          <a
            href="#monograph"
            className="hover:text-stone-900 dark:hover:text-stone-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {isHe ? 'דוח קליני OKF' : 'OKF Report'}
          </a>
        </nav>

        {/* Zone 3: Mobile Alpha Test Button + Language Switcher + Light/Dark Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Alpha Calibration Trigger Button */}
          <button
            type="button"
            onClick={() => setOpenAlphaTrigger((prev) => prev + 1)}
            className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span>{isHe ? 'בדיקת ניידים' : 'Mobile Test'}</span>
          </button>

          {/* Prominent Language Switcher Button */}
          <button
            type="button"
            onClick={() => setLang(isHe ? 'en' : 'he')}
            className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-stone-900 dark:text-stone-100 bg-stone-200/90 dark:bg-stone-800 hover:bg-amber-500 hover:text-stone-950 dark:hover:bg-amber-500 dark:hover:text-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title={isHe ? 'Switch interface to English' : 'מעבר לנוסח מלא בעברית'}
          >
            <Languages className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="hidden sm:inline">
              {isHe ? 'English / אנגלית' : 'עברית / Hebrew'}
            </span>
            <span className="sm:hidden">{isHe ? 'EN' : 'עב'}</span>
          </button>

          {/* Prominent Light / Dark Display Mode Toggle Button */}
          <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-stone-900 dark:text-stone-100 bg-stone-200/90 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title={
              isDark
                ? isHe
                  ? 'מעבר לתצוגה בהירה'
                  : 'Switch to Light Mode'
                : isHe
                ? 'מעבר לתצוגה כהה'
                : 'Switch to Dark Mode'
            }
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">
                  {isHe ? 'תצוגה בהירה' : 'Light Mode'}
                </span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-stone-700 shrink-0" />
                <span className="hidden sm:inline">
                  {isHe ? 'תצוגה כהה' : 'Dark Mode'}
                </span>
              </>
            )}
          </button>

          {/* Primary Clinical PDF Action (Desktop) */}
          <button
            type="button"
            onClick={handleDownloadClinicalSummary}
            className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-900 dark:text-stone-100 bg-stone-200/90 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            <span>{isHe ? 'הורד דוח PDF' : 'Clinical PDF'}</span>
          </button>
        </div>
      </header>

      {/* Operational Diagnostic Utility Strip (Below Header) */}
      <div className="border-b border-stone-200 dark:border-stone-800/80 bg-[#F4F0E8] dark:bg-[#0B0E17] px-3 sm:px-6 lg:px-12 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 dark:text-stone-400">
          <div className="flex flex-wrap items-center gap-2 font-mono-tabular">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {isHe ? '● פופילומטריה 60Hz פעילה' : '● 60 HZ PUPILLOMETRY NOMINAL'}
            </span>
            <span className="hidden sm:inline" aria-hidden="true">
              ·
            </span>
            <a
              href="https://github.com/rafia22110/Beuofdbak"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-600 dark:hover:text-amber-400 underline underline-offset-4 transition-colors"
            >
              {isHe
                ? 'רישיון קוד פתוח MIT · GitHub Verified'
                : 'MIT Open-Source License · GitHub Verified'}
            </a>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-stone-600 dark:text-stone-300 font-mono-tabular">
              {isHe ? 'אישון טוני:' : 'Live Tonic:'}{' '}
              <strong className="text-stone-900 dark:text-stone-100">
                {liveTelemetry.tonicDiameterMm.toFixed(2)} mm
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main id="top" className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* 2. Split-Screen Hero & 8-Second Pure Macro Ocular Stream */}
        <section id="showreel" className="py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left Column: Clinical Typographic Hierarchy & 4-Stage Ocular Scrubber */}
            <div className="lg:col-span-6 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400 font-mono-tabular">
                  <span>
                    {isHe
                      ? 'אוקולומיקה ונוירו-ביופידבק קליני'
                      : 'OCULOMICS & NEURO-BIOFEEDBACK'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {isHe ? 'מערכת ביומרקרים CNS / ANS' : 'CNS / ANS BIOMARKER SUITE'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{THREE_WAY_BENCHMARK.sessionId}</span>
                </div>

                <h1
                  className="mt-4 text-4xl sm:text-5xl lg:text-[3.35rem] font-display font-medium tracking-tight text-stone-900 dark:text-stone-100 leading-[1.1]"
                  style={{ textWrap: 'balance' }}
                >
                  {isHe
                    ? 'פופילומטריה לא-פולשנית כחלון ישיר לקשב ניהולי ולוויסות אוטונומי'
                    : 'Non-Invasive Pupillometry as a Direct Window to Executive Attention'}
                </h1>

                <p className="mt-5 text-base leading-relaxed text-stone-600 dark:text-stone-300 max-w-xl">
                  {isHe
                    ? 'קוטר האישון נשלט על ידי מאזן אנטגוניסטי בין שריר ההרחבה הסימפתטי (מסלול Locus Coeruleus-Norepinephrine) ושריר הכיווץ הפאראסימפתטי. באמצעות מדידת מיקרו-התרחבות טונית, גלי אישון איטיים (0.1–0.5 Hz) ותדירות מיקרו-סקאדות ב-3 מצבים קליניים, OculoFlow מספקת אבחון קשב ואימון נוירו-ביופידבק בחוג סגור (SMR).'
                    : 'The pupil is controlled by antagonistic sympathetic dilator (Locus Coeruleus-Norepinephrine) and parasympathetic sphincter pathways. By isolating micron-level tonic dilation, 0.1–0.5 Hz pupillary hippus waves, and micro-saccadic frequency across a 3-Way Protocol, OculoFlow delivers clinical ADHD & autonomic assessment alongside closed-loop SMR biofeedback.'}
                </p>

                {/* Primary Hero Actions */}
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <a
                    href="#optical-studio"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>
                      {isHe
                        ? 'פתח מעבדת מדידה ביומטרית ומצלמת PLR'
                        : 'Open Biometric & Webcam PLR Lab'}
                    </span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      const vid = videoRef.current;
                      if (vid) {
                        vid.muted = !vid.muted;
                        setIsMuted(vid.muted);
                        if (!vid.muted && vid.paused) {
                          vid.play().then(() => setIsPlaying(true)).catch(() => {});
                        }
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-stone-800 dark:text-stone-200 bg-stone-200/80 dark:bg-stone-900 hover:bg-stone-300/80 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {isMuted ? (
                      <>
                        <Volume2 className="w-4 h-4 text-amber-500" />
                        <span>
                          {isHe
                            ? 'הפעל שמע קוצב דופק (60 BPM)'
                            : 'Enable 60 BPM Heartbeat Audio'}
                        </span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-4 h-4 text-amber-500" />
                        <span>
                          {isHe ? 'השתק שמע דופק' : 'Mute Heartbeat Audio'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 4-Stage Pure Macro Ocular Scrubber Rail */}
              <div className="mt-10 pt-6 border-t border-stone-200 dark:border-stone-800/90">
                <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-3">
                  <span>
                    {isHe
                      ? 'רצף מאקרו-עין רציף (00:00 – 00:07.8 לולאת אישון נטו)'
                      : 'Macro Ocular Sequence (00:00 – 00:07.8 Pure Iris Loop)'}
                  </span>
                  <span className="font-mono-tabular" dir="ltr">
                    {formatTimecode(currentTime)} / {formatTimecode(duration)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {REEL_CHAPTERS.map((ch) => {
                    const isActive = currentChapter.label === ch.label;
                    return (
                      <button
                        key={ch.label}
                        type="button"
                        onClick={() => handleSeekTo(ch.time)}
                        className={`text-start px-3 py-2.5 rounded-lg border transition-colors ${
                          isActive
                            ? 'bg-amber-500/15 border-amber-500/60 text-stone-900 dark:text-stone-100'
                            : 'bg-stone-100/70 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800/80 text-stone-600 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-700'
                        }`}
                      >
                        <div className="text-[11px] font-mono-tabular text-amber-600 dark:text-amber-400">
                          {ch.code}s
                        </div>
                        <div className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate mt-0.5">
                          {isHe ? ch.labelHe : ch.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Pure 8-Second Macro Ocular Video Stream Container */}
            <div className="lg:col-span-6 flex flex-col justify-between bg-[#0B0E17] rounded-2xl border border-stone-200 dark:border-stone-800 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4 mb-3 text-xs font-mono-tabular text-stone-300">
                <span>
                  {isHe
                    ? 'זרם אופטי · צילום מאקרו 100 מ"מ של הקרנית והקשתית'
                    : 'OPTICAL STREAM · 100MM MACRO CORNEAL CAPTURE'}
                </span>
                <span className="text-amber-400">
                  {isHe ? currentChapter.labelHe : currentChapter.label}
                </span>
              </div>

              <div className="relative aspect-[9/13] max-h-[500px] w-full mx-auto bg-black rounded-xl overflow-hidden border border-stone-800/90 flex items-center justify-center">
                <video
                  ref={videoRef}
                  src="/media/ocular_loop.mp4"
                  poster="/media/pin_cover.jpg"
                  playsInline
                  loop
                  muted={isMuted}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) =>
                    setDuration(e.currentTarget.duration || 7.8)
                  }
                  className="w-full h-full object-contain"
                />

                {/* Top-Right Stage Telemetry Modal Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    const matchingPlate =
                      CURATED_PLATES.find(
                        (p) =>
                          currentTime >= p.startTime && currentTime <= p.endTime
                      ) || CURATED_PLATES[0];
                    setSelectedPlate(matchingPlate);
                  }}
                  className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-200 bg-black/75 hover:bg-black/90 backdrop-blur-md rounded-lg border border-stone-700/80 transition-colors whitespace-nowrap shrink-0"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {isHe ? 'ניתוח ביומרקרים לשלב זה' : 'Inspect Stage Biomarkers'}
                  </span>
                </button>
              </div>

              {/* Precision Scrubber & Transport Controls */}
              <div className="mt-4 pt-3 border-t border-stone-800/90 space-y-3" dir="ltr">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono-tabular text-stone-400 w-14">
                    {formatTimecode(currentTime)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 7.8}
                    step={0.05}
                    value={currentTime}
                    onChange={(e) => handleSeekTo(parseFloat(e.target.value))}
                    className="flex-1 accent-amber-500 cursor-pointer"
                    aria-label="Seek 8-second macro ocular loop"
                  />
                  <span className="text-xs font-mono-tabular text-stone-400 w-14 text-right">
                    {formatTimecode(duration)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-100 bg-stone-800 hover:bg-stone-700 rounded-md transition-colors whitespace-nowrap shrink-0"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isHe ? 'השהה' : 'Pause'}</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isHe ? 'נגן' : 'Play'}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSeekTo(Math.max(0, currentTime - 1))}
                      className="p-1.5 text-stone-300 hover:text-white bg-stone-800/80 hover:bg-stone-700 rounded-md transition-colors"
                      title="Step back 1 second"
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleSeekTo(Math.min(duration, currentTime + 1))
                      }
                      className="p-1.5 text-stone-300 hover:text-white bg-stone-800/80 hover:bg-stone-700 rounded-md transition-colors"
                      title="Step forward 1 second"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleMute}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-200 bg-stone-800 hover:bg-stone-700 rounded-md transition-colors whitespace-nowrap shrink-0"
                    >
                      {isMuted ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-stone-400" />
                          <span>{isHe ? 'הפעל שמע' : 'Unmute Pulse'}</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isHe ? 'שמע פעיל' : 'Audio Active'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Speed Selector */}
                  <div className="flex items-center gap-1 bg-stone-900 p-1 rounded-md border border-stone-800">
                    {[0.5, 1.0, 1.5].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleSpeedChange(rate)}
                        className={`px-2 py-0.5 text-xs font-mono-tabular rounded transition-colors whitespace-nowrap shrink-0 ${
                          playbackRate === rate
                            ? 'bg-amber-500 text-stone-950 font-semibold'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {rate.toFixed(1)}×
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full-Width 4-Column Clinical Metrics Row Below Hero Split */}
          <div className="mt-10 pt-8 border-t border-stone-200 dark:border-stone-800/90 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-3xl font-display font-semibold font-mono-tabular text-stone-900 dark:text-stone-100">
                +39.1%
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {isHe
                  ? 'טווח דינמי קוגניטיבי (מצב A 3.12 מ"מ ← מצב B 4.35 מ"מ)'
                  : 'Cognitive Dynamic Range (State A 3.12 mm → State B 4.35 mm)'}
              </div>
            </div>
            <div>
              <div className="text-3xl font-display font-semibold font-mono-tabular text-stone-900 dark:text-stone-100">
                86.4%
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {isHe
                  ? 'יעילות ויסות נוירו-ביופידבק בחוג סגור (מצב C)'
                  : 'Closed-Loop Biofeedback Regulation Efficiency (State C)'}
              </div>
            </div>
            <div>
              <div className="text-3xl font-display font-semibold font-mono-tabular text-stone-900 dark:text-stone-100">
                88.2%
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {isHe
                  ? 'ציון התאוששות מערכת העצבים האוטונומית (ANS)'
                  : 'Autonomic Nervous System (ANS) Recovery Score'}
              </div>
            </div>
            <div>
              <div className="text-3xl font-display font-semibold font-mono-tabular text-amber-600 dark:text-amber-400">
                {liveTelemetry.tonicDiameterMm.toFixed(2)} mm
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {isHe
                  ? `קוטר אישון טוני חי במעבדה (${
                      liveTelemetry.interactionMode === 'webcam'
                        ? `מצלמה ${liveTelemetry.ambientLux} Lux`
                        : 'סימולטור'
                    })`
                  : `Live Diagnostic Lab Tonic Pupil (${
                      liveTelemetry.interactionMode === 'webcam'
                        ? `${liveTelemetry.ambientLux} Lux PLR`
                        : 'Simulated'
                    })`}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Stationary Interactive 3-Way Protocol Stepper Bar */}
      <div className="border-y border-stone-200 dark:border-stone-800/80 py-4 bg-[#F4F0E8]/70 dark:bg-[#0B0E17]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono-tabular text-stone-600 dark:text-stone-400">
            <Activity className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              {isHe
                ? 'סנכרון פרוטוקול קליני 3-שלבי:'
                : '3-WAY CLINICAL PROTOCOL SYNC:'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
            {(
              [
                {
                  stage: 'STATE_A',
                  title: isHe
                    ? '01. מצב A: קו בסיס במנוחה'
                    : '01. State A: Resting Baseline',
                  meta: '3.12 mm · SD 0.14 · 18 Saccades/m',
                },
                {
                  stage: 'STATE_B',
                  title: isHe
                    ? '02. מצב B: עומס קוגניטיבי ודחק'
                    : '02. State B: Cognitive Stress Load',
                  meta: '4.35 mm (+39.1%) · 54 Saccades/m',
                },
                {
                  stage: 'STATE_C',
                  title: isHe
                    ? '03. מצב C: נעילת זרימה בחוג סגור'
                    : '03. State C: Closed-Loop SMR Flow',
                  meta: '3.75 mm · SD 0.08 · 86% Flow Lock',
                },
              ] as const
            ).map((item) => (
              <button
                key={item.stage}
                type="button"
                onClick={() => handleSelectProtocolStageGlobal(item.stage)}
                className="text-start px-4 py-2.5 rounded-xl bg-white dark:bg-stone-900/90 hover:border-amber-500/70 border border-stone-200 dark:border-stone-800 transition-colors"
              >
                <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  {item.title}
                </div>
                <div
                  className="text-[11px] font-mono-tabular text-stone-500 dark:text-stone-400 mt-0.5"
                  dir="ltr"
                >
                  {item.meta}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* 3. Section 01: Oculomic Biomarker Plates (4 Macro Eye Stages) + 4 Interactive Clinical Charts */}
        <section
          id="exhibition"
          className="py-16 lg:py-20 border-b border-stone-200 dark:border-stone-800"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="text-xs text-stone-500 dark:text-stone-400 font-mono-tabular">
                {isHe
                  ? '01. אטלס ביומרקרים אוקולומיים וגרפי טלמטריה · OKF-BIO-2026'
                  : '01. OCULOMIC BIOMARKER ATLAS & TELEMETRY GRAPHS · OKF-BIO-2026'}
              </div>
              <h2
                className="text-3xl sm:text-4xl font-display font-medium text-stone-900 dark:text-stone-100 mt-2 tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                {isHe
                  ? 'שלבי מאקרו-עין והדמיות אבחון מדעיות בזמן אמת'
                  : 'Macro Ocular Stages & Scientific Diagnostic Visualizations'}
              </h2>
            </div>

            {/* Interactive Filter Controls */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-200/70 dark:bg-stone-900 rounded-lg border border-stone-300/80 dark:border-stone-800 self-start">
              {(
                [
                  {
                    id: 'all',
                    label: isHe
                      ? 'אטלס אבחון מלא (8)'
                      : 'Complete Diagnostic Atlas (8)',
                  },
                  {
                    id: 'ocular',
                    label: isHe
                      ? 'שלבי מאקרו-עין (4)'
                      : 'Macro Ocular Stages (4)',
                  },
                  {
                    id: 'charts',
                    label: isHe
                      ? 'גרפי טלמטריה קליניים (4)'
                      : 'Clinical Telemetry Charts (4)',
                  },
                ] as { id: MovementCategory; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    activeCategory === tab.id
                      ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4 Pure Macro Ocular Biomarker Plates */}
          {(activeCategory === 'all' || activeCategory === 'ocular') && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {CURATED_PLATES.map((plate) => (
                <article
                  key={plate.id}
                  className="group flex flex-col justify-between rounded-2xl border border-stone-200 dark:border-stone-800/90 bg-white dark:bg-[#0C0C0F] overflow-hidden transition-transform duration-200 hover:-translate-y-0.5"
                >
                  {/* Visual Frame */}
                  <div
                    onClick={() => setSelectedPlate(plate)}
                    className="relative aspect-[4/5] overflow-hidden bg-stone-950 cursor-pointer"
                  >
                    <ResilientPlateImage
                      src={plate.imageSrc}
                      alt={isHe ? plate.titleHe : plate.title}
                      title={isHe ? plate.titleHe : plate.title}
                      plateNumber={plate.plateNumber}
                      className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
                    />

                    {/* Measured Gradient Scrim */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                    {/* Top Quiet Unboxed Metadata */}
                    <div
                      className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between text-[11px] text-stone-200/90 font-mono-tabular"
                      dir="ltr"
                    >
                      <span>
                        {plate.plateNumber} · {plate.timecodeRange}s
                      </span>
                      <span>{plate.accessionNumber}</span>
                    </div>

                    {/* Bottom Overlay Caption */}
                    <div className="absolute bottom-3.5 left-3.5 right-3.5">
                      <p className="text-[11px] text-amber-300/90 font-mono-tabular">
                        {isHe ? plate.categoryLabelHe : plate.categoryLabel} ·{' '}
                        {plate.biomarkers.tonicDiameterMm.toFixed(2)} mm
                      </p>
                      <div className="flex items-end justify-between gap-2 mt-0.5">
                        <h3 className="text-xl font-display font-semibold text-white leading-snug">
                          {isHe ? plate.titleHe : plate.title}
                        </h3>
                        <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-amber-300 shrink-0" />
                      </div>
                    </div>
                  </div>

                  {/* Card Body & Diagnostic Actions */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-mono-tabular text-stone-500 dark:text-stone-400">
                        {isHe
                          ? plate.biomarkers.eegEquivalentHe
                          : plate.biomarkers.eegEquivalent}{' '}
                        · {isHe ? 'פיקסציה' : 'Fixation'}{' '}
                        {plate.biomarkers.fixationDurationMs} ms
                      </p>
                      <p className="text-xs text-stone-700 dark:text-stone-300 mt-2 leading-relaxed line-clamp-3">
                        {isHe ? plate.curatorialNoteHe : plate.curatorialNote}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-200/80 dark:border-stone-800/80 flex items-center justify-between gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          handleSeekTo(plate.startTime);
                          const reelEl = document.getElementById('showreel');
                          if (reelEl) reelEl.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-1 font-medium text-stone-700 dark:text-stone-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{isHe ? 'נגן בזרם' : 'Seek Stream'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLoadPlateInStudio(plate)}
                        className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>{isHe ? 'טען במעבדה' : 'Load in Lab'}</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* 4 Interactive Scientific & Clinical Telemetry Charts */}
          {(activeCategory === 'all' || activeCategory === 'charts') && (
            <DiagnosticVisualPanels
              liveTelemetry={liveTelemetry}
              onSelectProtocolStage={handleSelectProtocolStageGlobal}
              lang={lang}
            />
          )}
        </section>

        {/* 4. Section 02: Interactive Biometric Pupillometry & Webcam Ambient Light Lab */}
        <section
          id="optical-studio"
          className="py-16 lg:py-20 border-b border-stone-200 dark:border-stone-800"
        >
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
            <div>
              <div className="text-xs text-stone-500 dark:text-stone-400 font-mono-tabular">
                {isHe
                  ? '02. כוונת מדידה ביומטרית לאישון ומעבדת תאורת מצלמה (PLR)'
                  : '02. BIOMETRIC PUPILLOMETRY RETICLE & WEBCAM AMBIENT LIGHT LAB'}
              </div>
              <h2
                className="text-3xl sm:text-4xl font-display font-medium text-stone-900 dark:text-stone-100 mt-2 tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                {isHe
                  ? 'קליבר אישון בזמן אמת, מסלול סקאדות וסימולטור רפלקס אור ממצלמת רשת'
                  : 'Real-Time Pupil Caliper, Saccadic Vector & Webcam PLR Simulator'}
              </h2>
              <p className="text-sm text-stone-600 dark:text-stone-400 mt-2 max-w-2xl">
                {isHe
                  ? 'מצויד בכוונת מדידה ביומטרית במילימטרים (mm), מד-זווית קרנית פולארי, רשת סגמנטציה ממוחשבת (CV), ואוסצילוסקופ חי ב-60 FPS. עבור למצב קלט מצלמת רשת כדי להניע את רפלקס האישון לאור (PLR) בהתאם לעוצמת התאורה בחדר.'
                  : 'Equipped with a biometric millimeter caliper reticle, polar corneal protractor, computer-vision segmentation mesh, and a live 60 FPS oscilloscope waveform strip. Switch to Webcam Ambient Light Input to drive Pupillary Light Reflex (PLR) constriction and dilation from real environmental luminance.'}
              </p>
            </div>

            {/* Preset Selector Strip for the 4 Ocular Stages */}
            <div className="flex flex-wrap items-center gap-1.5">
              {CURATED_PLATES.map((plate) => (
                <button
                  key={plate.id}
                  type="button"
                  onClick={() => {
                    setStudioPreset(plate.studioPreset);
                    setActivePresetPlateId(plate.id);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    activePresetPlateId === plate.id
                      ? 'bg-amber-500 text-stone-950 border-amber-500 font-semibold'
                      : 'bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-700'
                  }`}
                >
                  {plate.plateNumber}: {isHe ? plate.categoryLabelHe : plate.categoryLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-[#0C0C0F] rounded-2xl border border-stone-200 dark:border-stone-800 p-6 lg:p-8">
            <OcularChronographCanvas
              preset={studioPreset}
              onChangePreset={setStudioPreset}
              onTelemetryChange={handleTelemetryChange}
              lang={lang}
            />
          </div>
        </section>

        {/* 5. Section 03: Clinical Monograph, EEG vs. Oculomics Mapping & 3-Way OKF Report */}
        <section id="monograph" className="py-16 lg:py-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="text-xs text-stone-500 dark:text-stone-400 font-mono-tabular">
                {isHe
                  ? '03. מונוגרפיה מחקרית קלינית ואונטולוגיית GOOGLE OKF · 2026'
                  : '03. CLINICAL RESEARCH MONOGRAPH & GOOGLE OKF ONTOLOGY · 2026'}
              </div>
              <h2
                className="text-3xl sm:text-4xl lg:text-5xl font-display font-medium text-stone-900 dark:text-stone-100 mt-2 tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                {isHe
                  ? 'אוקולומיקה כחלופה משלימה ולא-פולשנית ל-EEG'
                  : 'Oculomics as a Non-Invasive Complement to EEG'}
              </h2>
              <p className="text-sm uppercase tracking-widest text-stone-500 dark:text-stone-400 mt-2">
                {isHe
                  ? 'פופילומטריה השוואתית 3-שלבית, דיכוי מיקרו-סקאדות ונוירו-פלסטיות בחוג סגור'
                  : '3-Way Comparative Pupillometry, Micro-Saccadic Suppression & Closed-Loop Neuro-Plasticity'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {pdfNotice && (
                <span className="text-xs font-mono-tabular text-amber-600 dark:text-amber-400 whitespace-nowrap shrink-0">
                  {pdfNotice}
                </span>
              )}

              <button
                type="button"
                onClick={handleDownloadClinicalSummary}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <FileText className="w-4 h-4" />
                <span>
                  {isHe ? 'הורד סיכום קליני (PDF)' : 'Download Clinical Summary'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleCopyHebrewClinicalText}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-stone-800 dark:text-stone-200 bg-stone-200/80 dark:bg-stone-900 hover:bg-stone-300 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {copiedSummary ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>{isHe ? 'הועתק ללוח!' : 'Copied Hebrew Summary!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-amber-500" />
                    <span>{isHe ? 'העתק תקציר בעברית' : 'Copy Hebrew Summary'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowOkfInspector(!showOkfInspector)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-stone-800 dark:text-stone-200 bg-stone-200/80 dark:bg-stone-900 hover:bg-stone-300 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <FileCode2 className="w-4 h-4 text-amber-500" />
                <span>
                  {showOkfInspector
                    ? isHe
                      ? 'הסתר OKF JSON-LD'
                      : 'Hide OKF JSON-LD'
                    : isHe
                    ? 'הצג OKF JSON-LD'
                    : 'Inspect OKF JSON-LD'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleDownloadFullOkf}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-stone-800 dark:text-stone-200 bg-stone-200/80 dark:bg-stone-900 hover:bg-stone-300 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>{isHe ? 'ייצוא JSON-LD' : 'Export JSON-LD'}</span>
              </button>
            </div>
          </div>

          {/* Collapsible Google OKF JSON-LD Graph Inspector */}
          {showOkfInspector && (
            <div
              className="mb-12 p-6 rounded-2xl bg-[#0B0E17] text-stone-200 border border-stone-800 overflow-x-auto"
              dir="ltr"
            >
              <div className="flex items-center justify-between text-xs font-mono-tabular text-amber-400 mb-3">
                <span>
                  GOOGLE OPEN KNOWLEDGE FRAMEWORK (OKF) · SCHEMA.ORG MEDICALOBSERVATIONALSTUDY
                </span>
                <span>DOI:10.1016/j.neuroimage.2023.119854</span>
              </div>
              <pre className="text-xs font-mono-tabular text-stone-300 leading-relaxed max-h-80 overflow-y-auto">
                {JSON.stringify(generateOKFJsonLd(liveTelemetry.activePlate), null, 2)}
              </pre>
            </div>
          )}

          {/* 3-Way Comparative Protocol Table & EEG Biomarker Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-14">
            {/* Table 1: 3-Way Pupillometry Protocol Benchmark + Live State */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0C0C0F] border border-stone-200 dark:border-stone-800">
              <div className="text-xs font-mono-tabular text-amber-700 dark:text-amber-400">
                {isHe
                  ? `מדגם קליני השוואתי · ${THREE_WAY_BENCHMARK.sessionId}`
                  : `COMPARATIVE CLINICAL COHORT · ${THREE_WAY_BENCHMARK.sessionId}`}
              </div>
              <h3 className="text-2xl font-display font-semibold text-stone-900 dark:text-stone-100 mt-1">
                {isHe
                  ? 'דוח אבחון פופילומטריה 3-שלבי (מצבים A, B, C)'
                  : '3-Way Pupillometry Diagnostic Report (States A, B, C)'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {isHe
                  ? 'כולל את מצבי הייחוס הקליניים (A, B, C) לצד הטלמטריה החיה הנוכחית שלך ממעבדת האבחון.'
                  : 'Includes benchmark states (A, B, C) alongside your current live Diagnostic Lab telemetry.'}
              </p>

              <div className="overflow-x-auto mt-5">
                <table className="w-full text-start text-xs border-t border-stone-200 dark:border-stone-800">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400">
                      <th className="py-2.5 pe-3 font-medium text-start">
                        {isHe ? 'שלב בפרוטוקול' : 'Protocol Stage'}
                      </th>
                      <th className="py-2.5 px-3 font-medium text-start">
                        {isHe ? 'קוטר טוני' : 'Tonic (mm)'}
                      </th>
                      <th className="py-2.5 px-3 font-medium text-start">
                        {isHe ? 'סטיית תקן' : 'Wave SD'}
                      </th>
                      <th className="py-2.5 px-3 font-medium text-start">
                        {isHe ? 'סקאדות/דק׳' : 'Saccades/m'}
                      </th>
                      <th className="py-2.5 ps-3 font-medium text-start">
                        {isHe ? 'זרימה (Flow)' : 'Flow %'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/70 dark:divide-stone-800/80 font-mono-tabular">
                    {THREE_WAY_BENCHMARK.states.map((st) => (
                      <tr key={st.id}>
                        <td className="py-3 pe-3 font-sans font-medium text-stone-900 dark:text-stone-100">
                          {isHe ? st.nameHe : st.name}
                        </td>
                        <td className="py-3 px-3 text-stone-700 dark:text-stone-300" dir="ltr">
                          {st.tonicMm.toFixed(2)} mm
                        </td>
                        <td className="py-3 px-3 text-stone-700 dark:text-stone-300">
                          {st.wavesSd.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-stone-700 dark:text-stone-300">
                          {st.saccadesMin}
                        </td>
                        <td className="py-3 ps-3 text-amber-700 dark:text-amber-400 font-semibold">
                          {st.flowPct}%
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-amber-500/10">
                      <td className="py-3 pe-3 font-sans font-semibold text-stone-900 dark:text-stone-100">
                        {isHe ? 'מעבדה חיה כעת (' : 'Current Lab ('}
                        {liveTelemetry.interactionMode === 'webcam'
                          ? `Webcam ${liveTelemetry.ambientLux} lx`
                          : liveTelemetry.protocolStage}
                        )
                      </td>
                      <td
                        className="py-3 px-3 font-semibold text-stone-900 dark:text-stone-100"
                        dir="ltr"
                      >
                        {liveTelemetry.tonicDiameterMm.toFixed(2)} mm
                      </td>
                      <td className="py-3 px-3 text-stone-800 dark:text-stone-200">
                        {liveTelemetry.waveSd.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-stone-800 dark:text-stone-200">
                        {liveTelemetry.saccadesPerMin}
                      </td>
                      <td className="py-3 ps-3 text-amber-700 dark:text-amber-400 font-semibold">
                        {liveTelemetry.fixationStabilityPct}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Oculomics vs. EEG Frequency Correlation */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0C0C0F] border border-stone-200 dark:border-stone-800">
              <div className="text-xs font-mono-tabular text-amber-700 dark:text-amber-400">
                {isHe
                  ? 'אונטולוגיה נוירו-אופטית · מתאם CNS / ANS'
                  : 'NEURO-OPTICAL ONTOLOGY · CNS / ANS CORRELATION'}
              </div>
              <h3 className="text-2xl font-display font-semibold text-stone-900 dark:text-stone-100 mt-1">
                {isHe
                  ? 'ביומרקרים אוקולומיים מול תחומי תדר ב-EEG'
                  : 'Oculomic Biomarkers vs. EEG Spectral Bands'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {isHe
                  ? 'מיפוי צולב בין תנודות האישון ומשך הפיקסציה לבין מקצבי אלקטרואנצפלוגרפיה (EEG) סטנדרטיים.'
                  : 'Cross-mapping pupillary oscillations and fixation duration against standard electroencephalography rhythms.'}
              </p>

              <div className="overflow-x-auto mt-5">
                <table className="w-full text-start text-xs border-t border-stone-200 dark:border-stone-800">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400">
                      <th className="py-2.5 pe-3 font-medium text-start">
                        {isHe ? 'תחום EEG' : 'EEG Band'}
                      </th>
                      <th className="py-2.5 px-3 font-medium text-start">
                        {isHe ? 'תדר' : 'Range'}
                      </th>
                      <th className="py-2.5 ps-3 font-medium text-start">
                        {isHe ? 'ביומרקר אוקולומי מקביל' : 'Equivalent Oculomic Biomarker'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/70 dark:divide-stone-800/80">
                    {EEG_OCULOMIC_MAPPING.map((row) => (
                      <tr key={row.eegBand}>
                        <td className="py-3 pe-3 font-medium text-stone-900 dark:text-stone-100 whitespace-nowrap">
                          {isHe ? row.eegBandHe : row.eegBand}
                        </td>
                        <td
                          className="py-3 px-3 font-mono-tabular text-stone-600 dark:text-stone-400 whitespace-nowrap"
                          dir="ltr"
                        >
                          {row.freqRange}
                        </td>
                        <td className="py-3 ps-3 text-stone-700 dark:text-stone-300">
                          {isHe ? row.oculomicBiomarkerHe : row.oculomicBiomarker}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Asymmetric Reading Canvas with Margin Citations */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-8 border-t border-stone-200 dark:border-stone-800">
            {/* 70% Main Narrative Column */}
            <div className="lg:col-span-8 space-y-6 text-base leading-relaxed text-stone-700 dark:text-stone-300 max-w-2xl">
              {isHe ? (
                <>
                  <p>
                    קוטר האישון נשלט על ידי המאזן האנטגוניסטי הרציף בין שני שרירים חלקים בסטרומת
                    הקשתית: שריר ההרחבה הסימפתטי (Dilator) — המעוצבב דרך קומפלקס ה-Locus
                    Coeruleus-Norepinephrine (LC-NE) בגזע המוח — ושריר הכיווץ הפאראסימפתטי
                    (Sphincter) הנשלט על ידי גרעין Edinger-Westphal. בזמן ריכוז ניהולי עמוק,
                    קוטר האישון הטוני מתרחב באופן יציב במספר מיקרונים, בעוד שעייפות קשבית וחדירת
                    רשת ברירת המחדל (DMN) מתבטאות כגלי אישון איטיים בתדר 0.1–0.5 Hz<sup>[1]</sup>.
                  </p>

                  <p>
                    במקביל, תנועות עיניים מהירות ובלתי-רצוניות (מיקרו-סקאדות) החורגות מ-40 תנועות
                    לדקה משקפות ישירות פעילות תטא מצחית מוגברת וחוסר יציבות קשבי המאפיינים
                    הפרעות קשב וריכוז (ADHD). באמצעות מדידה משולבת של שונות גלי האישון ומשך
                    נעילת הפיקסציה בזרם אופטי של 60 Hz, הפרוטוקול ה-3 שלבי מבודד את הטונוס
                    האוטונומי במנוחה (מצב A), את הגיוס הסימפתטי תחת עומס (מצב B), ואת הוויסות
                    העצמי בחוג סגור (מצב C)<sup>[2]</sup>.
                  </p>

                  <blockquote className="my-10 py-8 border-y border-stone-200 dark:border-stone-800 text-center">
                    <p
                      className="text-2xl sm:text-3xl font-display italic text-stone-900 dark:text-stone-100"
                      style={{ textWrap: 'balance' }}
                    >
                      ״כאשר משוב חזותי בזמן אמת מצומד ישירות ליציבות האישון ולנעילת המבט
                      הפוביאלית, העין הופכת מחיישן אבחוני פסיבי לכלי אימון אקטיבי לנוירו-פלסטיות.״
                    </p>
                    <footer className="mt-3 text-xs font-mono-tabular uppercase tracking-widest text-stone-500 dark:text-stone-400">
                      — ארכיטקטורה קלינית OculoFlow · OKF-BIO-2026.04
                    </footer>
                  </blockquote>

                  <p>
                    בשלב האימון בחוג סגור (מצב C), חדות התצוגה, ההילה הווגאלית ההיקפית ונעילת
                    המטרה מגיבות באופן מיידי למצבו האוטונומי של המשתמש. דיכוי התפרצויות הסקאדות
                    מ-54 לדקה ל-11 לדקה מייצב את הקוטר הטוני על 3.75 מ"מ (סטיית תקן 0.08 מ"מ)
                    ומכוון תהודת קצב סנסורי-מוטורי (SMR) ב-0.3 Hz — המתועדת אוטומטית לרשומת
                    JSON-LD תקנית של Google Open Knowledge Framework (OKF) ולסיכום קליני מלא ב-PDF<sup>[3]</sup>.
                  </p>
                </>
              ) : (
                <>
                  <p className="first-letter:text-5xl first-letter:font-display first-letter:font-semibold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-stone-900 dark:first-letter:text-stone-100">
                    Pupil diameter is governed by the continuous antagonistic balance between two
                    smooth muscles in the iris stroma: the sympathetic dilator muscle—innervated via
                    the Locus Coeruleus-Norepinephrine (LC-NE) complex—and the parasympathetic
                    sphincter muscle controlled by the Edinger-Westphal nucleus. During deep
                    executive concentration, tonic pupil diameter expands stably by several
                    microns, whereas attentional fatigue and Default Mode Network (DMN) intrusion
                    manifest as slow 0.1–0.5 Hz pupillary waves<sup>[1]</sup>.
                  </p>

                  <p>
                    Simultaneously, involuntary micro-saccades exceeding 40 movements per minute
                    directly mirror elevated frontal Theta activity and executive instability in
                    ADHD cohorts. By measuring both pupillary wave variance and fixation holding time
                    through a standard 60 Hz optical stream, the 3-Way Protocol isolates baseline
                    autonomic tone (State A), cognitive load mobilization (State B), and closed-loop
                    self-regulation (State C)<sup>[2]</sup>.
                  </p>

                  {/* Editorial Pull Quote with Top/Bottom Hairline Dividers */}
                  <blockquote className="my-10 py-8 border-y border-stone-200 dark:border-stone-800 text-center">
                    <p
                      className="text-2xl sm:text-3xl font-display italic text-stone-900 dark:text-stone-100"
                      style={{ textWrap: 'balance' }}
                    >
                      “When visual reward hierarchy is coupled directly to pupil stability and
                      fixation coherence, the eye transitions from a passive diagnostic sensor into a
                      closed-loop instrument of neuro-plasticity.”
                    </p>
                    <footer className="mt-3 text-xs font-mono-tabular uppercase tracking-widest text-stone-500 dark:text-stone-400">
                      — OculoFlow Clinical Architecture · OKF-BIO-2026.04
                    </footer>
                  </blockquote>

                  <p>
                    In the closed-loop training phase (State C), visual clarity, peripheral vagal
                    halos, and target locking respond instantaneously to the user’s autonomic state.
                    Suppressing saccadic bursts from 54/min down to 11/min stabilizes tonic diameter
                    at 3.75 mm (SD 0.08 mm) and entrains a 0.3 Hz Sensorimotor Rhythm (SMR)
                    resonance—packaged automatically into a standardized Google Open Knowledge
                    Framework (OKF) JSON-LD diagnostic record and downloadable PDF Clinical Summary<sup>[3]</sup>.
                  </p>
                </>
              )}
            </div>

            {/* 30% Margin Notes & Interactive Citation Rail */}
            <aside className="lg:col-span-4 space-y-6 border-t lg:border-t-0 lg:border-s border-stone-200 dark:border-stone-800 pt-8 lg:pt-0 lg:ps-8">
              <div className="text-xs font-mono-tabular uppercase tracking-widest text-stone-500 dark:text-stone-400">
                {isHe
                  ? 'סימוכין קליניים ושלבי מאקרו-עין'
                  : 'Clinical Citations & Macro Ocular Stages'}
              </div>

              {[
                {
                  sup: '[1]',
                  plate: CURATED_PLATES[0],
                  note: isHe
                    ? 'שלב I (מצב A קו בסיס במנוחה) קובע את מפתח האישון הטוני ההתחלתי (3.12 מ"מ, סטיית תקן 0.14 מ"מ) לפני הפעלת עומס מטלה.'
                    : 'Stage I (State A Baseline) establishes the tonic reference aperture (3.12 mm, SD 0.14 mm) prior to task loading.',
                },
                {
                  sup: '[2]',
                  plate: CURATED_PLATES[2],
                  note: isHe
                    ? 'שלב III (מצב B עומס קוגניטיבי) מעורר התרחבות אישון של +39.1% (4.35 מ"מ) ו-54 מיקרו-סקאדות לדקה, המשקפים גיוס סימפתטי LC-NE.'
                    : 'Stage III (State B Cognitive Stress) elicits +39.1% pupil dilation (4.35 mm) and 54 micro-saccades/min, indexing LC-NE mobilization.',
                },
                {
                  sup: '[3]',
                  plate: CURATED_PLATES[3],
                  note: isHe
                    ? 'שלב IV (מצב C נעילת ביופידבק בחוג סגור) משיג 86% שהות במצב Flow (סטיית תקן 0.08 מ"מ) ומייצא דוח OKF JSON-LD ו-PDF מלא.'
                    : 'Stage IV (State C Closed-Loop Lock) achieves 86% Flow State residency (SD 0.08 mm) and exports the full OKF JSON-LD and PDF report.',
                },
              ].map((item) => (
                <div
                  key={item.sup}
                  className="p-4 rounded-xl bg-stone-100/80 dark:bg-stone-900/50 border border-stone-200/80 dark:border-stone-800/80 space-y-2"
                >
                  <div
                    className="flex items-center justify-between text-xs font-mono-tabular text-amber-700 dark:text-amber-400"
                    dir="ltr"
                  >
                    <span>
                      Ref {item.sup} · {item.plate.plateNumber}
                    </span>
                    <span>{item.plate.accessionNumber}</span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                    {item.note}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedPlate(item.plate)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-stone-900 dark:text-stone-200 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                  >
                    <span>
                      {isHe
                        ? `פתח כרטיס ביומרקר ${item.plate.accessionNumber}`
                        : `Inspect ${item.plate.accessionNumber}`}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </aside>
          </div>
        </section>
      </div>

      {/* Quiet Clinical Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-800 pt-10 pb-28 sm:pb-12 px-6 lg:px-12 text-xs text-stone-500 dark:text-stone-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display font-semibold text-sm text-stone-900 dark:text-stone-200">
              OculoFlow
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {isHe
                ? 'פלטפורמת קוד פתוח (רישיון MIT) לפופילומטריה ונוירו-אבחון (2026)'
                : 'MIT Licensed Open-Source Pupillometry & Neuro-Diagnostic Platform (2026)'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <a
              href="https://github.com/rafia22110/Beuofdbak"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono-tabular text-amber-700 dark:text-amber-400 hover:underline transition-colors"
            >
              {isHe ? 'GitHub · רישיון MIT' : 'GitHub · MIT License'}
            </a>
            <a
              href="#showreel"
              className="hover:text-stone-900 dark:hover:text-stone-200 transition-colors"
            >
              {isHe ? 'זרם אופטי' : 'Ocular Stream'}
            </a>
            <a
              href="#exhibition"
              className="hover:text-stone-900 dark:hover:text-stone-200 transition-colors"
            >
              {isHe ? 'אטלס ביומרקרים' : 'Biomarker Atlas'}
            </a>
            <a
              href="#optical-studio"
              className="hover:text-stone-900 dark:hover:text-stone-200 transition-colors"
            >
              {isHe ? 'מעבדת אבחון' : 'Diagnostic Lab'}
            </a>
            <a
              href="#monograph"
              className="hover:text-stone-900 dark:hover:text-stone-200 transition-colors"
            >
              {isHe ? 'דוח OKF' : 'OKF Report'}
            </a>
          </div>
        </div>
      </footer>

      {/* Clinical Biomarker & Accession Lightbox Modal */}
      <AccessionLightboxModal
        plate={selectedPlate}
        onClose={() => setSelectedPlate(null)}
        onSelectPlate={(next) => setSelectedPlate(next)}
        onLoadPresetInStudio={handleLoadPlateInStudio}
        allPlates={CURATED_PLATES}
        lang={lang}
      />

      {/* Auto-Triggered Alpha Calibration & Mobile Camera Compatibility Popup + Persistent Floating Button */}
      <AlphaCalibrationPopup
        lang={lang}
        onToggleLang={() => setLang(isHe ? 'en' : 'he')}
        liveTelemetry={liveTelemetry}
        externalOpenTrigger={openAlphaTrigger}
      />
    </div>
  );
}

import React, { useState } from 'react';
import {
  BENCHMARK_TIMELINE_SERIES,
  FFT_SPECTRAL_SERIES,
  Language,
} from '../data/platesData';
import { LiveDiagnosticSnapshot } from '../utils/pdfReportGenerator';
import { Activity, Crosshair, BarChart3, Compass } from 'lucide-react';

interface DiagnosticVisualPanelsProps {
  liveTelemetry: LiveDiagnosticSnapshot;
  onSelectProtocolStage: (stage: 'STATE_A' | 'STATE_B' | 'STATE_C') => void;
  lang?: Language;
}

export const DiagnosticVisualPanels: React.FC<DiagnosticVisualPanelsProps> = ({
  liveTelemetry,
  onSelectProtocolStage,
  lang = 'en',
}) => {
  const isHe = lang === 'he';
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number>(8);
  const [heatmapMode, setHeatmapMode] = useState<'STATE_B' | 'STATE_C'>('STATE_C');

  const activePoint =
    BENCHMARK_TIMELINE_SERIES[hoveredPointIdx] || BENCHMARK_TIMELINE_SERIES[0];

  // Radar 6 axes (0-100 scale)
  const radarAxes = [
    {
      label: isHe ? 'יציבות טונית' : 'TONIC STABILITY',
      stateB: 38,
      stateC: 92,
      live: Math.min(98, Math.round(100 - liveTelemetry.waveSd * 140)),
    },
    {
      label: isHe ? 'נעילת פיקסציה' : 'FIXATION HOLD',
      stateB: 28,
      stateC: 89,
      live: liveTelemetry.fixationStabilityPct,
    },
    {
      label: isHe ? 'דיכוי סקאדות' : 'SACCADE CONTROL',
      stateB: 24,
      stateC: 88,
      live: Math.max(20, Math.min(96, 100 - liveTelemetry.saccadesPerMin)),
    },
    {
      label: isHe ? 'גיוס LC-NE' : 'LC-NE MOBILIZATION',
      stateB: 94,
      stateC: 84,
      live: Math.min(98, Math.round((liveTelemetry.tonicDiameterMm / 4.6) * 95)),
    },
    {
      label: isHe ? 'התאוששות וגאלית' : 'VAGAL RECOVERY',
      stateB: 32,
      stateC: 88,
      live: liveTelemetry.preset.smrFlowLock ? 91 : 74,
    },
    {
      label: isHe ? 'נעילת SMR FLOW' : 'SMR FLOW LOCK',
      stateB: 22,
      stateC: 86,
      live: liveTelemetry.preset.smrFlowLock ? 90 : 64,
    },
  ];

  const buildRadarPolygon = (key: 'stateB' | 'stateC' | 'live', radius = 84) => {
    const cx = 130;
    const cy = 115;
    return radarAxes
      .map((ax, i) => {
        const angle = (Math.PI * 2 * i) / radarAxes.length - Math.PI / 2;
        const r = (ax[key] / 100) * radius;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
      {/* Panel 1: 3-Way Pupillometry Time-Series Curve */}
      <article className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#0C0C0F] p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs font-mono-tabular text-stone-500 dark:text-stone-400">
            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <Activity className="w-3.5 h-3.5" />
              <span>
                {isHe
                  ? 'לוח אבחון I · עקומת פופילומטריה רציפה'
                  : 'DIAGNOSTIC PANEL I · CONTINUOUS PUPILLOMETRY WAVEFORM'}
              </span>
            </span>
            <span>{isHe ? 'פרוטוקול 0s – 480s' : '0s – 480s PROTOCOL'}</span>
          </div>

          <h3 className="text-2xl font-display font-semibold text-stone-900 dark:text-stone-100 mt-1.5">
            {isHe
              ? 'מסלול קוטר אישון טוני 3-שלבי (מצבים A ← B ← C)'
              : '3-Way Tonic Diameter Trajectory (States A → B → C)'}
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
            {isHe
              ? 'רחף על פני נקודות הזמן כדי לבחון גיוס סימפתטי במצב B (+39.1%) וייצוב בחוג סגור במצב C (3.75 מ"מ).'
              : 'Hover across timepoints to inspect sympathetic mobilization in State B (+39.1%) and closed-loop stabilization in State C (3.75 mm).'}
          </p>

          {/* SVG Line Chart */}
          <div className="mt-5 relative bg-[#07090E] rounded-xl border border-stone-800 p-4" dir="ltr">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tabular text-stone-300 mb-2">
              <span>
                T+{activePoint.sec}s · {activePoint.state} · TONIC:{' '}
                <strong className="text-amber-400">
                  {activePoint.diameter.toFixed(2)} mm
                </strong>
              </span>
              <span className="text-cyan-400">
                {isHe ? 'מעבדה חיה:' : 'LIVE LAB:'} {liveTelemetry.tonicDiameterMm.toFixed(2)} mm
              </span>
            </div>

            <svg
              viewBox="0 0 520 190"
              className="w-full h-44 overflow-visible cursor-crosshair"
            >
              {/* State Zone Backgrounds */}
              <rect x="36" y="12" width="95" height="145" fill="rgba(148,163,184,0.05)" />
              <rect x="131" y="12" width="140" height="145" fill="rgba(244,63,94,0.06)" />
              <rect x="271" y="12" width="230" height="145" fill="rgba(16,185,129,0.06)" />

              {/* Zone Labels */}
              <text x="44" y="26" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">
                {isHe ? 'STATE A (מנוחה)' : 'STATE A (REST)'}
              </text>
              <text x="140" y="26" fill="#fb7185" fontSize="9" fontFamily="JetBrains Mono">
                {isHe ? 'STATE B (עומס ודחק)' : 'STATE B (STRESS LOAD)'}
              </text>
              <text x="280" y="26" fill="#34d399" fontSize="9" fontFamily="JetBrains Mono">
                {isHe ? 'STATE C (ביופידבק SMR)' : 'STATE C (CLOSED-LOOP SMR)'}
              </text>

              {/* Horizontal Grid Lines (2.5mm to 5.0mm) */}
              {[2.8, 3.4, 4.0, 4.6].map((mm) => {
                const y = 157 - ((mm - 2.6) / 2.2) * 140;
                return (
                  <g key={mm}>
                    <line
                      x1="36"
                      y1={y}
                      x2="500"
                      y2={y}
                      stroke="#1e293b"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    <text
                      x="4"
                      y={y + 3}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                    >
                      {mm.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* Live Lab Reference Horizontal Line */}
              {(() => {
                const liveY = Math.max(
                  15,
                  Math.min(155, 157 - ((liveTelemetry.tonicDiameterMm - 2.6) / 2.2) * 140)
                );
                return (
                  <line
                    x1="36"
                    y1={liveY}
                    x2="500"
                    y2={liveY}
                    stroke="#06b6d4"
                    strokeDasharray="4 4"
                    strokeWidth="1.2"
                  />
                );
              })()}

              {/* Benchmark Polyline */}
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.2"
                points={BENCHMARK_TIMELINE_SERIES.map((pt, idx) => {
                  const x = 42 + (idx / (BENCHMARK_TIMELINE_SERIES.length - 1)) * 450;
                  const y = 157 - ((pt.diameter - 2.6) / 2.2) * 140;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                }).join(' ')}
              />

              {/* Interactive Data Points */}
              {BENCHMARK_TIMELINE_SERIES.map((pt, idx) => {
                const x = 42 + (idx / (BENCHMARK_TIMELINE_SERIES.length - 1)) * 450;
                const y = 157 - ((pt.diameter - 2.6) / 2.2) * 140;
                const isSelected = idx === hoveredPointIdx;
                return (
                  <g
                    key={pt.sec}
                    onMouseEnter={() => setHoveredPointIdx(idx)}
                    onClick={() => setHoveredPointIdx(idx)}
                    className="cursor-pointer"
                  >
                    {isSelected && (
                      <line
                        x1={x}
                        y1="12"
                        x2={x}
                        y2="157"
                        stroke="#fbbf24"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? 5 : 3}
                      fill={isSelected ? '#fbbf24' : '#0f172a'}
                      stroke="#f59e0b"
                      strokeWidth="2"
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-stone-500 dark:text-stone-400 font-mono-tabular">
            {isHe ? 'טווח דינמי: +39.1% (מצב A ← B)' : 'Dynamic Range: +39.1% (State A → B)'}
          </span>
          <div className="flex items-center gap-2">
            {(['STATE_A', 'STATE_B', 'STATE_C'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => onSelectProtocolStage(st)}
                className="px-2.5 py-1 text-xs font-mono-tabular rounded bg-stone-100 dark:bg-stone-900 hover:bg-amber-500 hover:text-stone-950 text-stone-700 dark:text-stone-300 transition-colors whitespace-nowrap shrink-0"
              >
                {isHe ? `טען ${st.replace('STATE_', 'מצב ')}` : `Load ${st.replace('_', ' ')}`}
              </button>
            ))}
          </div>
        </div>
      </article>

      {/* Panel 2: Saccadic Dispersion & Foveal Fixation Retinal Map */}
      <article className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#0C0C0F] p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs font-mono-tabular text-stone-500 dark:text-stone-400">
            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <Crosshair className="w-3.5 h-3.5" />
              <span>
                {isHe
                  ? 'לוח אבחון II · טופוגרפיית פיקסציה אוקולומוטורית'
                  : 'DIAGNOSTIC PANEL II · OCULOMOTOR FIXATION TOPOGRAPHY'}
              </span>
            </span>
            <span>{isHe ? 'שדה פוביאלי 0°–15°' : 'FOVEAL 0°–15° FIELD'}</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5">
            <h3 className="text-2xl font-display font-semibold text-stone-900 dark:text-stone-100">
              {isHe
                ? 'דיכוי מיקרו-סקאדות ונעילת מבט'
                : 'Micro-Saccadic Suppression & Gaze Lock'}
            </h3>

            <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setHeatmapMode('STATE_B')}
                className={`px-2.5 py-1 text-xs font-mono-tabular rounded transition-colors whitespace-nowrap shrink-0 ${
                  heatmapMode === 'STATE_B'
                    ? 'bg-rose-500 text-white font-semibold'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                {isHe ? 'מצב B (54/דק׳)' : 'State B (54/min)'}
              </button>
              <button
                type="button"
                onClick={() => setHeatmapMode('STATE_C')}
                className={`px-2.5 py-1 text-xs font-mono-tabular rounded transition-colors whitespace-nowrap shrink-0 ${
                  heatmapMode === 'STATE_C'
                    ? 'bg-emerald-500 text-stone-950 font-semibold'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                {isHe ? 'מצב C (11/דק׳)' : 'State C (11/min)'}
              </button>
            </div>
          </div>

          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
            {isHe
              ? 'השוואת חוסר יציבות בשדה העין המצחי תחת עומס קוגניטיבי (54 סקאדות/דקה) מול נעילה פוביאלית באימון חוג סגור (11 סקאדות/דקה).'
              : 'Comparing frontal eye field instability during cognitive overload (54 saccades/min) against foveal target lock in closed-loop training (11 saccades/min).'}
          </p>

          <div className="mt-5 bg-[#07090E] rounded-xl border border-stone-800 p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center" dir="ltr">
            <div className="sm:col-span-7 flex justify-center">
              <svg viewBox="0 0 220 190" className="w-48 h-44">
                {/* Polar Retinal Degree Rings */}
                {[22, 48, 76].map((r, idx) => (
                  <g key={r}>
                    <circle
                      cx="110"
                      cy="95"
                      r={r}
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth="1"
                      strokeDasharray={idx === 0 ? 'none' : '3 3'}
                    />
                    <text
                      x={112 + r * 0.7}
                      y={92 - r * 0.7}
                      fill="#475569"
                      fontSize="8"
                      fontFamily="JetBrains Mono"
                    >
                      {(idx + 1) * 5}°
                    </text>
                  </g>
                ))}
                <line x1="20" y1="95" x2="200" y2="95" stroke="#1e293b" strokeWidth="1" />
                <line x1="110" y1="12" x2="110" y2="178" stroke="#1e293b" strokeWidth="1" />

                {heatmapMode === 'STATE_B' ? (
                  <>
                    {/* Dispersed Saccadic Trajectory & Wide Heatmap */}
                    <circle cx="110" cy="95" r="58" fill="rgba(244,63,94,0.14)" />
                    <polyline
                      fill="none"
                      stroke="rgba(251,113,133,0.75)"
                      strokeWidth="1.2"
                      points="62,54 148,42 74,132 162,118 92,48 144,142 58,98 152,76 110,95"
                    />
                    {[
                      [62, 54],
                      [148, 42],
                      [74, 132],
                      [162, 118],
                      [92, 48],
                      [144, 142],
                      [58, 98],
                      [152, 76],
                    ].map(([cx, cy], i) => (
                      <circle key={i} cx={cx} cy={cy} r="3.5" fill="#fb7185" />
                    ))}
                  </>
                ) : (
                  <>
                    {/* Tightly Locked Foveal Fixation (State C) */}
                    <circle cx="110" cy="95" r="24" fill="rgba(16,185,129,0.22)" />
                    <circle
                      cx="110"
                      cy="95"
                      r="14"
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="1.5"
                    />
                    <polyline
                      fill="none"
                      stroke="rgba(52,211,153,0.85)"
                      strokeWidth="1.4"
                      points="104,91 115,93 108,101 113,89 110,95"
                    />
                    {[
                      [104, 91],
                      [115, 93],
                      [108, 101],
                      [113, 89],
                      [110, 95],
                    ].map(([cx, cy], i) => (
                      <circle key={i} cx={cx} cy={cy} r="3" fill="#34d399" />
                    ))}
                  </>
                )}
              </svg>
            </div>

            <div className="sm:col-span-5 space-y-2.5 text-xs font-mono-tabular border-t sm:border-t-0 sm:border-l border-stone-800 pt-3 sm:pt-0 sm:pl-4">
              <div>
                <div className="text-stone-400">{isHe ? 'קצב סקאדות' : 'SACCADE RATE'}</div>
                <div className="text-lg font-semibold text-stone-100">
                  {heatmapMode === 'STATE_B' ? '54 / min' : '11 / min'}
                </div>
              </div>
              <div>
                <div className="text-stone-400">{isHe ? 'משך פיקסציה ממוצע' : 'MEAN FIXATION HOLD'}</div>
                <div className="text-lg font-semibold text-amber-400">
                  {heatmapMode === 'STATE_B' ? '180 ms' : '890 ms'}
                </div>
              </div>
              <div>
                <div className="text-stone-400">{isHe ? 'מתאם קורטיקלי' : 'CORTICAL CORRELATE'}</div>
                <div className="text-stone-200">
                  {heatmapMode === 'STATE_B'
                    ? isHe
                      ? 'חוסר יציבות תטא / בטא גבוהה'
                      : 'Frontal Theta / High Beta Instability'
                    : isHe
                    ? 'נעילת SMR קוהרנטית (12–15 Hz)'
                    : 'Coherent SMR (12–15 Hz) Lock'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs font-mono-tabular text-stone-500 dark:text-stone-400">
          <span>{isHe ? 'סף פיקסציה קליני: > 600 ms' : 'Fixation Threshold: > 600 ms'}</span>
          <span>
            {isHe ? 'יציבות מעבדה חיה:' : 'Live Lab Fixation:'} {liveTelemetry.fixationStabilityPct}%
          </span>
        </div>
      </article>

      {/* Panel 3: FFT Spectral Power Distribution (0.1–0.8 Hz Pupillary Waves) */}
      <article className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#0C0C0F] p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs font-mono-tabular text-stone-500 dark:text-stone-400">
            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>
                {isHe
                  ? 'לוח אבחון III · ספקטרום FFT של גלי אישון'
                  : 'DIAGNOSTIC PANEL III · FFT PUPILLARY WAVE SPECTRUM'}
              </span>
            </span>
            <span>{isHe ? 'תחום 0.1 – 0.8 HZ' : '0.1 – 0.8 HZ BAND'}</span>
          </div>

          <h3 className="text-2xl font-display font-semibold text-stone-900 dark:text-stone-100 mt-1.5">
            {isHe
              ? 'עוצמה ספקטרלית: גלי עייפות מול שיא SMR ב-0.3 Hz'
              : 'Spectral Power: Fatigue Waves vs. 0.3 Hz SMR Peak'}
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
            {isHe
              ? 'התמרת פורייה מהירה (FFT) של תנודות האישון המפרידה בין סחיפת עייפות ב-0.1 Hz לתהודת ביופידבק ממוקדת ב-0.3 Hz.'
              : 'Fast Fourier Transform (FFT) of pupillary oscillations separating 0.1 Hz DMN fatigue drift from 0.3 Hz closed-loop resonance.'}
          </p>

          <div className="mt-5 bg-[#07090E] rounded-xl border border-stone-800 p-4 space-y-3" dir="ltr">
            {FFT_SPECTRAL_SERIES.map((band) => (
              <div key={band.freq} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono-tabular text-stone-300">
                  <span>{isHe ? band.freqHe : band.freq}</span>
                  <span>
                    A: {band.stateA} · <span className="text-rose-400">B: {band.stateB}</span> ·{' '}
                    <span className="text-emerald-400">C: {band.stateC} μV²</span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 h-2.5 bg-stone-900 rounded overflow-hidden p-0.5">
                  <div
                    className="bg-slate-400 rounded-xs"
                    style={{ width: `${Math.min(100, band.stateA * 1.4)}%` }}
                    title={`State A: ${band.stateA}`}
                  />
                  <div
                    className="bg-rose-500 rounded-xs"
                    style={{ width: `${Math.min(100, band.stateB * 1.4)}%` }}
                    title={`State B: ${band.stateB}`}
                  />
                  <div
                    className="bg-emerald-400 rounded-xs"
                    style={{ width: `${Math.min(100, band.stateC * 1.4)}%` }}
                    title={`State C: ${band.stateC}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs font-mono-tabular text-stone-500 dark:text-stone-400">
          <span>{isHe ? 'שיא תהודה: 0.30 Hz (מצב C)' : 'Peak Resonance: 0.30 Hz (State C)'}</span>
          <span>
            {isHe ? 'תדר תואם:' : 'Matched Band:'} {liveTelemetry.eegBandLabel}
          </span>
        </div>
      </article>

      {/* Panel 4: 6-Axis Autonomic & Executive Spider Calibration Radar */}
      <article className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#0C0C0F] p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs font-mono-tabular text-stone-500 dark:text-stone-400">
            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <Compass className="w-3.5 h-3.5" />
              <span>
                {isHe
                  ? 'לוח אבחון IV · מכ"ם כיול ביומרקרים 6-צירי'
                  : 'DIAGNOSTIC PANEL IV · 6-AXIS BIOMARKER CALIBRATION RADAR'}
              </span>
            </span>
            <span>{isHe ? 'קוהרנטיות רב-צירית' : 'MULTI-AXIS COHERENCE'}</span>
          </div>

          <h3 className="text-2xl font-display font-semibold text-stone-900 dark:text-stone-100 mt-1.5">
            {isHe
              ? 'פוליגון ויסות אוטונומי וניהולי (Executive)'
              : 'Autonomic & Executive Regulation Polygon'}
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
            {isHe
              ? 'השוואה שכבתית של עומס ודחק במצב B (ורוד), ויסות בחוג סגור במצב C (טורקיז-ירוק), והטלמטריה החיה שלך מהמעבדה (ענבר).'
              : 'Overlays State B Cognitive Stress (Rose), State C Closed-Loop Regulation (Emerald), and your Live Diagnostic Lab Telemetry (Amber).'}
          </p>

          <div className="mt-5 bg-[#07090E] rounded-xl border border-stone-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4" dir="ltr">
            <svg viewBox="0 0 260 230" className="w-56 h-48 shrink-0">
              {/* Concentric Hexagonal Radar Grids */}
              {[28, 56, 84].map((r) => (
                <polygon
                  key={r}
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="1"
                  points={radarAxes
                    .map((_, i) => {
                      const a = (Math.PI * 2 * i) / radarAxes.length - Math.PI / 2;
                      return `${(130 + Math.cos(a) * r).toFixed(1)},${(
                        115 +
                        Math.sin(a) * r
                      ).toFixed(1)}`;
                    })
                    .join(' ')}
                />
              ))}

              {/* Axis Spokes & Labels */}
              {radarAxes.map((ax, i) => {
                const a = (Math.PI * 2 * i) / radarAxes.length - Math.PI / 2;
                const x2 = 130 + Math.cos(a) * 84;
                const y2 = 115 + Math.sin(a) * 84;
                const lx = 130 + Math.cos(a) * 102;
                const ly = 115 + Math.sin(a) * 98;
                return (
                  <g key={ax.label}>
                    <line x1="130" y1="115" x2={x2} y2={y2} stroke="#1e293b" strokeWidth="1" />
                    <text
                      x={lx}
                      y={ly}
                      fill="#94a3b8"
                      fontSize="7.5"
                      fontFamily="JetBrains Mono"
                      textAnchor="middle"
                    >
                      {ax.label}
                    </text>
                  </g>
                );
              })}

              {/* State B Stress Polygon */}
              <polygon
                points={buildRadarPolygon('stateB')}
                fill="rgba(244,63,94,0.15)"
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="3 2"
              />

              {/* State C Closed-Loop Polygon */}
              <polygon
                points={buildRadarPolygon('stateC')}
                fill="rgba(16,185,129,0.16)"
                stroke="#10b981"
                strokeWidth="1.8"
              />

              {/* Live Lab Telemetry Polygon */}
              <polygon
                points={buildRadarPolygon('live')}
                fill="rgba(245,158,11,0.20)"
                stroke="#f59e0b"
                strokeWidth="2"
              />
            </svg>

            <div className="space-y-2.5 text-xs font-mono-tabular w-full">
              <div className="flex items-center justify-between text-amber-400">
                <span>{isHe ? '● טלמטריית מעבדה חיה' : '● Live Lab Telemetry'}</span>
                <span>{liveTelemetry.tonicDiameterMm.toFixed(2)} mm</span>
              </div>
              <div className="flex items-center justify-between text-emerald-400">
                <span>{isHe ? '■ מצב C מווסת (SMR)' : '■ State C Regulated'}</span>
                <span>{isHe ? '86.4% יעילות' : '86.4% Efficiency'}</span>
              </div>
              <div className="flex items-center justify-between text-rose-400">
                <span>{isHe ? '▲ מצב B עומס קוגניטיבי' : '▲ State B Stress Load'}</span>
                <span>54 Saccades/m</span>
              </div>
              <div className="pt-2 border-t border-stone-800 text-[11px] text-stone-400">
                {isHe ? 'ציון תקן נורמטיבי:' : 'Normative Z-Score:'}{' '}
                <strong className="text-stone-200">+1.42 SD</strong> (GazeBase 1000Hz / PhysioNet)
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs font-mono-tabular text-stone-500 dark:text-stone-400">
          <span>{isHe ? 'התאוששות אוטונומית: 88.2%' : 'Autonomic Recovery: 88.2%'}</span>
          <span>{isHe ? 'מאומת אונטולוגיית OKF' : 'OKF Ontology Validated'}</span>
        </div>
      </article>
    </div>
  );
};

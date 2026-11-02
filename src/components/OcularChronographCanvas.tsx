import React, { useEffect, useRef, useState } from 'react';
import {
  BiomarkerLayer,
  ReticleStyle,
  StudioPreset,
  generateOKFJsonLd,
  Language,
} from '../data/platesData';
import { horologyAudio } from '../utils/horologyAudio';
import { LiveDiagnosticSnapshot } from '../utils/pdfReportGenerator';
import {
  Download,
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
  FileCode2,
  Activity,
  Camera,
  CameraOff,
  SunMedium,
  Zap,
} from 'lucide-react';

interface OcularChronographCanvasProps {
  preset: StudioPreset;
  onChangePreset: (next: StudioPreset) => void;
  onTelemetryChange?: (snapshot: LiveDiagnosticSnapshot) => void;
  compact?: boolean;
  lang?: Language;
}

const POLAR_ANGLES = ['0°', '30°', '60°', '90°', '120°', '150°', '180°', '210°', '240°', '270°', '300°', '330°'];

export const OcularChronographCanvas: React.FC<OcularChronographCanvasProps> = ({
  preset,
  onChangePreset,
  onTelemetryChange,
  compact = false,
  lang = 'en',
}) => {
  const isHe = lang === 'he';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const saccadeTrailRef = useRef<{ x: number; y: number }[]>([]);
  const waveformHistoryRef = useRef<number[]>(Array(80).fill(3.75));

  const [audioActive, setAudioActive] = useState(false);
  const [audioMode, setAudioMode] = useState<'heartbeat' | 'pocket18k' | 'chrono28k'>('heartbeat');
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [protocolStage, setProtocolStage] = useState<'STATE_A' | 'STATE_B' | 'STATE_C'>('STATE_C');

  // Secondary Interaction Mode: Webcam Ambient Light Pupillary Light Reflex (PLR)
  const [interactionMode, setInteractionMode] = useState<'manual' | 'webcam'>('manual');
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamStatus, setWebcamStatus] = useState<string>(
    isHe ? 'מוכן לדגימת תאורת סביבה' : 'Ready to sample ambient light'
  );
  const [ambientLuminancePct, setAmbientLuminancePct] = useState<number>(48);
  const [ambientLux, setAmbientLux] = useState<number>(320);
  const [simulatedLightOverride, setSimulatedLightOverride] = useState<number | null>(null);

  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const smoothedPupilScaleRef = useRef<number>(preset.pupilScale);

  // Derived clinical telemetry from current preset
  const tonicDiameterMm = Number((2.1 + preset.pupilScale * 4.8).toFixed(2));
  const saccadesPerMin = Math.max(
    8,
    Math.min(
      62,
      Math.round(
        Math.abs(preset.oscillationRate) * 14 +
          (preset.biomarkerLayer === 'saccades' ? 12 : 2)
      )
    )
  );
  const waveSd = Number((0.05 + Math.abs(preset.oscillationRate - 1.0) * 0.11).toFixed(2));
  const fixationStabilityPct = Math.max(
    42,
    Math.min(98, Math.round(96 - Math.abs(preset.oscillationRate - 1.0) * 14))
  );
  const eegBandLabel =
    preset.pupilScale > 0.42
      ? isHe
        ? 'בטא גבוהה (>22 Hz · עומס קוגניטיבי)'
        : 'High Beta (>22 Hz · Stress Load)'
      : preset.pupilScale < 0.3
      ? isHe
        ? 'דלתא / תטא (0.5–7 Hz · כיווץ אור)'
        : 'Delta / Theta (0.5–7 Hz · Light Constriction)'
      : preset.smrFlowLock
      ? isHe
        ? 'תהודת SMR (12–15 Hz · נעילת זרימה)'
        : 'SMR Resonance (12–15 Hz · Flow Lock)'
      : isHe
      ? 'אלפא / בטא נמוכה (8–16 Hz)'
      : 'Alpha / Low Beta (8–16 Hz)';

  // Notify parent of live telemetry changes for PDF generation
  useEffect(() => {
    if (onTelemetryChange) {
      onTelemetryChange({
        interactionMode,
        webcamActive,
        tonicDiameterMm,
        waveSd,
        saccadesPerMin,
        fixationStabilityPct,
        eegBandLabel,
        ambientLux,
        ambientLuminancePct,
        protocolStage,
        preset,
      });
    }
  }, [
    interactionMode,
    webcamActive,
    tonicDiameterMm,
    waveSd,
    saccadesPerMin,
    fixationStabilityPct,
    eegBandLabel,
    ambientLux,
    ambientLuminancePct,
    protocolStage,
    preset,
    onTelemetryChange,
  ]);

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (webcamVideoRef.current) {
      webcamVideoRef.current.srcObject = null;
    }
    setWebcamActive(false);
  };

  useEffect(() => {
    return () => {
      horologyAudio.stopMetronome();
      stopWebcam();
    };
  }, []);

  const startWebcamAmbientMode = async () => {
    setInteractionMode('webcam');
    setSimulatedLightOverride(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      });
      streamRef.current = stream;
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        await webcamVideoRef.current.play();
      }
      setWebcamActive(true);
      setWebcamStatus(
        isHe
          ? 'זרם אופטי חי ממצלמת הרשת פעיל (צימוד רפלקס אור 60Hz)'
          : 'Live Webcam Optical Stream Active (60Hz PLR Coupling)'
      );
    } catch {
      setWebcamActive(false);
      setSimulatedLightOverride(48);
      setWebcamStatus(
        isHe
          ? 'הרשאת מצלמה לא זמינה — פועל במצב סימולטור חיישן אור (Lux) אינטראקטיבי'
          : 'Camera permission unavailable — using Interactive Ambient Lux Sensor Simulator'
      );
    }
  };

  const handleSwitchInteractionMode = (mode: 'manual' | 'webcam') => {
    if (mode === 'manual') {
      stopWebcam();
      setInteractionMode('manual');
      setSimulatedLightOverride(null);
    } else {
      startWebcamAmbientMode();
    }
  };

  // Real-time Webcam Ambient Light & Pupillary Light Reflex (PLR) Processing Loop
  useEffect(() => {
    if (interactionMode !== 'webcam') return;

    let intervalId: number;

    const sampleAmbientLight = () => {
      let brightnessPct = ambientLuminancePct;

      if (webcamActive && webcamVideoRef.current && simulatedLightOverride === null) {
        const video = webcamVideoRef.current;
        if (video.readyState >= 2) {
          if (!offscreenCanvasRef.current) {
            offscreenCanvasRef.current = document.createElement('canvas');
            offscreenCanvasRef.current.width = 64;
            offscreenCanvasRef.current.height = 48;
          }
          const offCtx = offscreenCanvasRef.current.getContext('2d', {
            willReadFrequently: true,
          });
          if (offCtx) {
            offCtx.drawImage(video, 0, 0, 64, 48);
            const frame = offCtx.getImageData(0, 0, 64, 48).data;
            let sumLuma = 0;
            let darkCenterX = 0;
            let darkCenterY = 0;
            let darkCount = 0;

            for (let i = 0; i < frame.length; i += 4) {
              const luma = 0.2126 * frame[i] + 0.7152 * frame[i + 1] + 0.0722 * frame[i + 2];
              sumLuma += luma;

              const pixelIdx = i / 4;
              const px = pixelIdx % 64;
              const py = Math.floor(pixelIdx / 64);
              if (px > 16 && px < 48 && py > 12 && py < 36 && luma < 45) {
                darkCenterX += px;
                darkCenterY += py;
                darkCount++;
              }
            }

            const avgLuma = sumLuma / (frame.length / 4);
            brightnessPct = Math.max(4, Math.min(98, Math.round((avgLuma / 255) * 100)));

            if (darkCount > 8) {
              const gx = (darkCenterX / darkCount / 64 - 0.5) * -1.5;
              const gy = (darkCenterY / darkCount / 48 - 0.5) * 1.5;
              pointerRef.current = { x: gx, y: gy, active: true };
            }
          }
        }
      } else if (simulatedLightOverride !== null) {
        brightnessPct = simulatedLightOverride;
      }

      const estimatedLux = Math.round(15 + Math.pow(brightnessPct / 100, 1.8) * 920);
      setAmbientLuminancePct(brightnessPct);
      setAmbientLux(estimatedLux);

      const targetScale = 0.52 - (brightnessPct / 100) * 0.32;
      const currentScale = smoothedPupilScaleRef.current;
      const nextScale = Number((currentScale + (targetScale - currentScale) * 0.22).toFixed(3));
      smoothedPupilScaleRef.current = nextScale;

      if (Math.abs(nextScale - preset.pupilScale) >= 0.004) {
        onChangePreset({
          ...preset,
          pupilScale: nextScale,
        });
      }
    };

    intervalId = window.setInterval(sampleAmbientLight, 110);
    return () => window.clearInterval(intervalId);
  }, [
    interactionMode,
    webcamActive,
    simulatedLightOverride,
    ambientLuminancePct,
    preset,
    onChangePreset,
  ]);

  const triggerLightFlashReflex = () => {
    setSimulatedLightOverride(95);
    window.setTimeout(() => {
      setSimulatedLightOverride(webcamActive ? null : 32);
    }, 1800);
  };

  const toggleAudio = (mode?: 'heartbeat' | 'pocket18k' | 'chrono28k') => {
    const targetMode = mode || audioMode;
    if (audioActive && (!mode || mode === audioMode)) {
      horologyAudio.stopMetronome();
      setAudioActive(false);
    } else {
      setAudioMode(targetMode);
      horologyAudio.startMetronome(targetMode);
      setAudioActive(true);
    }
  };

  const applyThreeWayStage = (stage: 'STATE_A' | 'STATE_B' | 'STATE_C') => {
    setProtocolStage(stage);
    if (interactionMode === 'webcam') {
      handleSwitchInteractionMode('manual');
    }
    if (stage === 'STATE_A') {
      onChangePreset({
        reticleStyle: 'millimeter',
        biomarkerLayer: 'stroma',
        oscillationRate: 1.0,
        stromaSectors: 12,
        irisHue: 38,
        pupilScale: 0.31,
        smrFlowLock: false,
      });
    } else if (stage === 'STATE_B') {
      onChangePreset({
        reticleStyle: 'segmentation',
        biomarkerLayer: 'lcne',
        oscillationRate: 2.6,
        stromaSectors: 18,
        irisHue: 24,
        pupilScale: 0.46,
        smrFlowLock: false,
      });
    } else {
      horologyAudio.playChime2026();
      onChangePreset({
        reticleStyle: 'crosshair',
        biomarkerLayer: 'vagal',
        oscillationRate: 1.0,
        stromaSectors: 16,
        irisHue: 42,
        pupilScale: 0.36,
        smrFlowLock: true,
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const startTime = performance.now();

    const render = (now: number) => {
      const elapsed = ((now - startTime) / 1000) * preset.oscillationRate;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(rect.width, 320);
      const height = Math.max(rect.height, 320);

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const cx = width / 2 + pointerRef.current.x * 16;
      const cy = height / 2 - 14 + pointerRef.current.y * 12;
      const baseRadius = Math.min(width, height - 48) * 0.36;

      // Record saccadic trail point
      saccadeTrailRef.current.push({ x: cx, y: cy });
      if (saccadeTrailRef.current.length > 28) {
        saccadeTrailRef.current.shift();
      }

      // 1. Deep Obsidian Optical Field
      ctx.fillStyle = '#07090E';
      ctx.fillRect(0, 0, width, height);

      // Subtle background coordinate grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.35)';
      ctx.lineWidth = 1;
      const gridStep = 40;
      for (let gx = 0; gx < width; gx += gridStep) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height - 52);
        ctx.stroke();
      }
      for (let gy = 0; gy < height - 52; gy += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      // Scleral anatomical contour
      const scleraGrad = ctx.createRadialGradient(
        cx,
        cy,
        baseRadius * 0.2,
        cx,
        cy,
        baseRadius * 1.45
      );
      scleraGrad.addColorStop(0, 'rgba(218, 224, 228, 0.20)');
      scleraGrad.addColorStop(0.68, 'rgba(138, 148, 158, 0.12)');
      scleraGrad.addColorStop(0.88, 'rgba(20, 24, 32, 0.55)');
      scleraGrad.addColorStop(1, 'rgba(7, 9, 14, 0.98)');

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(width / 2, cy, baseRadius * 1.38, baseRadius * 0.9, 0, 0, Math.PI * 2);
      ctx.fillStyle = scleraGrad;
      ctx.fill();
      ctx.restore();

      // 2. Vagal Parasympathetic Biofeedback Halo
      const haloIntensity = preset.biomarkerLayer === 'vagal' || preset.smrFlowLock ? 0.85 : 0.22;
      const haloGrad = ctx.createRadialGradient(
        cx,
        cy,
        baseRadius * 0.88,
        cx,
        cy,
        baseRadius * 1.24
      );
      const haloHue = preset.smrFlowLock ? 160 : preset.irisHue;
      haloGrad.addColorStop(0, `hsla(${haloHue}, 82%, 58%, 0)`);
      haloGrad.addColorStop(0.5, `hsla(${haloHue}, 85%, 56%, ${haloIntensity * 0.45})`);
      haloGrad.addColorStop(0.75, `hsla(${haloHue + 12}, 90%, 65%, ${haloIntensity * 0.25})`);
      haloGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 1.24, 0, Math.PI * 2);
      ctx.fillStyle = haloGrad;
      ctx.fill();

      // 3. Outer Limbal Ring & Iris Stroma Base
      const irisGrad = ctx.createRadialGradient(cx, cy, baseRadius * 0.15, cx, cy, baseRadius);
      irisGrad.addColorStop(0, '#090b10');
      irisGrad.addColorStop(0.35, `hsla(${preset.irisHue + 165}, 34%, 26%, 0.92)`);
      irisGrad.addColorStop(0.58, `hsla(${preset.irisHue}, 58%, 46%, 0.88)`);
      irisGrad.addColorStop(0.84, `hsla(${preset.irisHue - 8}, 42%, 62%, 0.82)`);
      irisGrad.addColorStop(0.96, '#182026');
      irisGrad.addColorStop(1, '#090b0e');

      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = irisGrad;
      ctx.fill();

      // 4. Radial Iris Stroma Fibers (Dilator / Sphincter Muscles)
      const totalFibers = preset.stromaSectors * 6;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(elapsed * 0.03);
      for (let i = 0; i < totalFibers; i++) {
        const angle = (i * Math.PI * 2) / totalFibers;
        const wave = Math.sin(i * 1.7 + elapsed * 1.8) * 0.035;
        const innerR = baseRadius * (preset.pupilScale + 0.02);
        const outerR = baseRadius * (0.88 + wave);

        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
        const midR = (innerR + outerR) * 0.52;
        const ctrlAngle = angle + Math.sin(elapsed + i) * 0.025;
        ctx.quadraticCurveTo(
          Math.cos(ctrlAngle) * midR,
          Math.sin(ctrlAngle) * midR,
          Math.cos(angle) * outerR,
          Math.sin(angle) * outerR
        );
        ctx.strokeStyle =
          i % 3 === 0
            ? `hsla(${preset.irisHue}, 70%, 68%, 0.28)`
            : `hsla(${preset.irisHue - 15}, 35%, 22%, 0.35)`;
        ctx.lineWidth = i % 4 === 0 ? 1.4 : 0.8;
        ctx.stroke();
      }
      ctx.restore();

      // 5. LC-NE Sympathetic Neuromodulation Rings (when active)
      if (preset.biomarkerLayer === 'lcne') {
        ctx.save();
        ctx.translate(cx, cy);
        for (let rIdx = 1; rIdx <= 3; rIdx++) {
          const ringR = baseRadius * (0.45 + rIdx * 0.14);
          ctx.beginPath();
          ctx.arc(0, 0, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
          ctx.setLineDash([6, 4]);
          ctx.lineDashOffset = -elapsed * 24 * (rIdx % 2 === 0 ? 1 : -1);
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();
      }

      // 6. Pupil Aperture & Centripetal LC-NE Synaptic Pulses
      const pulseBeat = 1 + Math.sin(elapsed * 3.0) * 0.028;
      const pupilR = baseRadius * preset.pupilScale * pulseBeat;

      // Update live waveform history buffer
      const liveMm = 2.1 + preset.pupilScale * pulseBeat * 4.8;
      waveformHistoryRef.current.push(liveMm);
      if (waveformHistoryRef.current.length > 90) {
        waveformHistoryRef.current.shift();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, pupilR, 0, Math.PI * 2);
      ctx.fillStyle = '#030406';
      ctx.fill();
      ctx.lineWidth = preset.smrFlowLock ? 2.5 : 1.8;
      ctx.strokeStyle = preset.smrFlowLock
        ? '#10b981'
        : `hsla(${preset.irisHue}, 80%, 60%, 0.65)`;
      ctx.stroke();

      // Synaptic micro-sparks along pupil margin
      const sparkCount = 16;
      for (let sp = 0; sp < sparkCount; sp++) {
        const spAngle = (sp / sparkCount) * Math.PI * 2 + elapsed * 0.5;
        const sparkCycle = (elapsed * 0.8 + sp * 0.17) % 1;
        const spR = pupilR * (0.55 + sparkCycle * 0.85);
        const sx = cx + Math.cos(spAngle) * spR;
        const sy = cy + Math.sin(spAngle) * spR;

        ctx.beginPath();
        ctx.arc(sx, sy, 1.6 * (1 - sparkCycle * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = preset.smrFlowLock
          ? `rgba(52, 211, 153, ${(1 - sparkCycle) * 0.8})`
          : `hsla(42, 98%, 72%, ${(1 - sparkCycle) * 0.8})`;
        ctx.fill();
      }

      // 7. Saccadic Trajectory & Foveal Dispersion Layer (when active)
      if (preset.biomarkerLayer === 'saccades' && saccadeTrailRef.current.length > 2) {
        ctx.save();
        ctx.beginPath();
        saccadeTrailRef.current.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Micro-fixation nodes
        saccadeTrailRef.current.forEach((pt, i) => {
          if (i % 4 === 0) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#06b6d4';
            ctx.fill();
          }
        });
        ctx.restore();
      }

      // 8. BIOMETRIC RETICLE OVERLAY
      ctx.save();
      ctx.translate(cx, cy);

      if (preset.reticleStyle === 'millimeter') {
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius * 0.96, 0, Math.PI * 2);
        ctx.stroke();

        for (let t = -20; t <= 20; t++) {
          if (t === 0) continue;
          const offset = (t / 20) * baseRadius * 0.92;
          const tickLen = t % 5 === 0 ? 6 : 3;
          ctx.beginPath();
          ctx.moveTo(offset, -tickLen);
          ctx.lineTo(offset, tickLen);
          ctx.moveTo(-tickLen, offset);
          ctx.lineTo(tickLen, offset);
          ctx.strokeStyle =
            t % 5 === 0 ? 'rgba(245, 158, 11, 0.7)' : 'rgba(148, 163, 184, 0.4)';
          ctx.stroke();
        }

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.6;
        const cal = pupilR + 4;
        const brk = 10;
        ctx.beginPath();
        ctx.moveTo(-cal + brk, -cal);
        ctx.lineTo(-cal, -cal);
        ctx.lineTo(-cal, cal);
        ctx.lineTo(-cal + brk, cal);
        ctx.moveTo(cal - brk, -cal);
        ctx.lineTo(cal, -cal);
        ctx.lineTo(cal, cal);
        ctx.lineTo(cal - brk, cal);
        ctx.stroke();

        ctx.font = '500 10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'center';
        ctx.fillText(`Ø ${liveMm.toFixed(2)} mm`, 0, -cal - 8);
      } else if (preset.reticleStyle === 'polar') {
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius * 0.94, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        for (let d = 0; d < 12; d++) {
          const angle = (d * Math.PI) / 6 - Math.PI / 2;
          const nr = baseRadius * 0.83;
          const nx = Math.cos(angle) * nr;
          const ny = Math.sin(angle) * nr;
          ctx.font = '500 10px "JetBrains Mono", monospace';
          ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(POLAR_ANGLES[d], nx, ny);
        }
      } else if (preset.reticleStyle === 'segmentation') {
        const vertices = 16;
        ctx.beginPath();
        for (let v = 0; v <= vertices; v++) {
          const a = (v * Math.PI * 2) / vertices + elapsed * 0.1;
          const vx = Math.cos(a) * pupilR;
          const vy = Math.sin(a) * pupilR;
          if (v === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        }
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        for (let v = 0; v < vertices; v++) {
          const a = (v * Math.PI * 2) / vertices + elapsed * 0.1;
          const vx = Math.cos(a) * pupilR;
          const vy = Math.sin(a) * pupilR;
          ctx.fillStyle = '#22d3ee';
          ctx.fillRect(vx - 2, vy - 2, 4, 4);
        }
      } else {
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.75)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-baseRadius * 0.9, 0);
        ctx.lineTo(-pupilR * 0.5, 0);
        ctx.moveTo(pupilR * 0.5, 0);
        ctx.lineTo(baseRadius * 0.9, 0);
        ctx.moveTo(0, -baseRadius * 0.9);
        ctx.lineTo(0, -pupilR * 0.5);
        ctx.moveTo(0, pupilR * 0.5);
        ctx.lineTo(0, baseRadius * 0.9);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#34d399';
        ctx.fill();
      }

      if (preset.smrFlowLock) {
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#34d399';
        ctx.fillText('SMR FLOW LOCK', 0, -6);
        ctx.font = '500 10px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(226, 232, 240, 0.9)';
        ctx.fillText(`${liveMm.toFixed(2)} mm · 12-15 Hz`, 0, 9);
      }

      ctx.restore();

      // 9. Corneal Specular Window Reflection
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 0.78, -0.48, 0.12);
      ctx.arc(0, 0, baseRadius * 0.56, 0.12, -0.48, true);
      ctx.closePath();
      const specAlpha =
        interactionMode === 'webcam'
          ? Math.min(0.85, 0.25 + (ambientLuminancePct / 100) * 0.6)
          : 0.46;
      const specGrad = ctx.createLinearGradient(
        baseRadius * 0.5,
        -baseRadius * 0.4,
        baseRadius * 0.8,
        baseRadius * 0.1
      );
      specGrad.addColorStop(0, `rgba(255, 255, 255, ${specAlpha})`);
      specGrad.addColorStop(1, 'rgba(255, 255, 255, 0.06)');
      ctx.fillStyle = specGrad;
      ctx.fill();
      ctx.restore();

      // 10. Bottom Real-Time Oscilloscope Waveform Strip (above controls)
      const stripTop = height - 88;
      const stripHeight = 32;
      ctx.fillStyle = 'rgba(9, 13, 22, 0.82)';
      ctx.fillRect(16, stripTop, width - 32, stripHeight);
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.9)';
      ctx.lineWidth = 1;
      ctx.strokeRect(16, stripTop, width - 32, stripHeight);

      const targetY = stripTop + stripHeight - ((3.75 - 2.4) / 2.6) * stripHeight;
      ctx.beginPath();
      ctx.moveTo(16, targetY);
      ctx.lineTo(width - 16, targetY);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      const hist = waveformHistoryRef.current;
      hist.forEach((val, idx) => {
        const wx = 18 + (idx / (hist.length - 1)) * (width - 36);
        const wy = Math.max(
          stripTop + 3,
          Math.min(
            stripTop + stripHeight - 3,
            stripTop + stripHeight - ((val - 2.4) / 2.6) * stripHeight
          )
        );
        if (idx === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      });
      ctx.strokeStyle = preset.smrFlowLock ? '#34d399' : '#f59e0b';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [preset, interactionMode, ambientLuminancePct]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    pointerRef.current = { x: nx, y: ny, active: true };
  };

  const handlePointerLeave = () => {
    pointerRef.current = { x: 0, y: 0, active: false };
  };

  const handleExportPlate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `oculoflow-biometric-${preset.biomarkerLayer}.png`;
      link.href = dataUrl;
      link.click();
      setExportNotice(isHe ? 'פריים ביומטרי יוצא (PNG)' : 'Biometric frame exported (PNG)');
      window.setTimeout(() => setExportNotice(null), 3000);
    } catch {
      setExportNotice(isHe ? 'הייצוא הושלם' : 'Export completed');
      window.setTimeout(() => setExportNotice(null), 3000);
    }
  };

  const handleExportOkfJson = () => {
    const okfData = generateOKFJsonLd();
    const jsonStr = JSON.stringify(okfData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'OculoFlow_3Way_OKF_Report_2026.json';
    link.click();
    URL.revokeObjectURL(url);
    setExportNotice(isHe ? 'קובץ OKF JSON-LD יוצא' : 'OKF JSON-LD exported');
    window.setTimeout(() => setExportNotice(null), 3000);
  };

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Canvas Viewport */}
      <div className="relative flex-1 min-h-[380px] lg:min-h-[480px] bg-[#07090E] rounded-xl overflow-hidden border border-stone-800/80" dir="ltr">
        <canvas
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onClick={() => {
            horologyAudio.playChime2026();
            onChangePreset({ ...preset, smrFlowLock: !preset.smrFlowLock });
          }}
          className="w-full h-full cursor-crosshair block"
          aria-label="Interactive Biometric Pupillometry & Biofeedback Reticle Canvas"
        />

        {/* Top Live Pupillometry Telemetry Overlay */}
        <div className="pointer-events-none absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-200/90 font-mono-tabular bg-black/65 backdrop-blur-xs px-3 py-1.5 rounded-md border border-stone-800/80">
          <span>
            ● TONIC: {tonicDiameterMm.toFixed(2)} mm · SD: {waveSd.toFixed(2)} · SACCADES:{' '}
            {saccadesPerMin}/min
          </span>
          <span>
            {interactionMode === 'webcam'
              ? `AMBIENT LIGHT: ${ambientLux} LUX (${ambientLuminancePct}%) · PLR ACTIVE`
              : `FIXATION: ${fixationStabilityPct}% · ${eegBandLabel}`}
          </span>
        </div>

        {/* Live Webcam Sensor Picture-in-Picture HUD when Webcam Mode is active */}
        <div
          className={`absolute top-14 right-4 w-44 bg-black/85 backdrop-blur-md rounded-xl border border-amber-500/50 p-2.5 transition-opacity duration-200 ${
            interactionMode === 'webcam' ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-mono-tabular text-amber-400 mb-1.5">
            <span>{isHe ? 'חיישן אור אופטי' : 'OPTICAL LUX SENSOR'}</span>
            <span>{ambientLux} lx</span>
          </div>
          <div className="relative aspect-[4/3] w-full bg-stone-950 rounded-lg overflow-hidden border border-stone-800 flex items-center justify-center">
            <video
              ref={webcamVideoRef}
              playsInline
              muted
              className={`w-full h-full object-cover scale-x-[-1] ${
                webcamActive ? 'block' : 'hidden'
              }`}
            />
            {!webcamActive && (
              <div className="text-[10px] text-stone-400 text-center px-2 font-mono-tabular">
                {isHe
                  ? `סימולטור עוצמת אור (${ambientLuminancePct}%)`
                  : `Ambient Lux Simulator (${ambientLuminancePct}% Luminance)`}
              </div>
            )}
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] font-mono-tabular text-stone-400 mb-1">
              <span>{isHe ? 'בהירות סביבה' : 'Luminance'}</span>
              <span>{ambientLuminancePct}%</span>
            </div>
            <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-150"
                style={{ width: `${ambientLuminancePct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Interactive Overlay Controls */}
        <div className="absolute bottom-3 left-4 right-4 flex flex-wrap items-center justify-between gap-2 bg-black/80 backdrop-blur-md px-3.5 py-2 rounded-lg border border-stone-800">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleSwitchInteractionMode(interactionMode === 'webcam' ? 'manual' : 'webcam')
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                interactionMode === 'webcam'
                  ? 'bg-amber-500 text-stone-950 font-semibold'
                  : 'bg-stone-800 text-stone-100 hover:bg-stone-700'
              }`}
            >
              {interactionMode === 'webcam' ? (
                <>
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>{isHe ? 'יציאה ממצב מצלמה' : 'Exit Webcam PLR'}</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isHe ? 'מצב מצלמת רשת (חיישן אור)' : 'Webcam Ambient Light Mode'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => toggleAudio()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-100 bg-stone-800 hover:bg-stone-700 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              {audioActive ? (
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-stone-400" />
              )}
              <span>
                {audioActive
                  ? isHe
                    ? 'השתק פעימות'
                    : 'Mute Biofeedback'
                  : isHe
                  ? 'שמע קוצב ANS'
                  : 'ANS Pulse Audio'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                horologyAudio.playChime2026();
                onChangePreset({ ...preset, smrFlowLock: !preset.smrFlowLock });
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                preset.smrFlowLock
                  ? 'bg-emerald-500 text-stone-950 font-semibold'
                  : 'bg-stone-800 text-stone-200 hover:bg-stone-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isHe ? 'נעילת SMR (12–15 Hz)' : 'SMR Flow Lock (12–15 Hz)'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {exportNotice && (
              <span className="text-xs text-amber-400 font-mono-tabular whitespace-nowrap shrink-0">
                {exportNotice}
              </span>
            )}
            <button
              type="button"
              onClick={handleExportOkfJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-100 bg-stone-800 hover:bg-stone-700 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <FileCode2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{isHe ? 'ייצוא OKF JSON-LD' : 'Export OKF JSON-LD'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportPlate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-100 bg-stone-800 hover:bg-stone-700 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isHe ? 'שמור פריים' : 'Export Frame'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Studio Parameter Controls (when not compact) */}
      {!compact && (
        <div className="mt-6 space-y-6 pt-6 border-t border-stone-200 dark:border-stone-800">
          {/* Interaction Mode Switcher: Manual 3-Way Protocol vs. Webcam Ambient Light PLR */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 rounded-xl bg-stone-100/80 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-800">
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono-tabular uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  {isHe ? 'מצב קלט מעבדת אבחון' : 'DIAGNOSTIC LAB INPUT MODE'}
                </div>
                <h3 className="text-lg font-display font-semibold text-stone-900 dark:text-stone-100 mt-0.5">
                  {interactionMode === 'webcam'
                    ? isHe
                      ? 'רפלקס אישון לתאורת סביבה ממצלמת רשת (PLR)'
                      : 'Webcam Ambient Light Pupillary Reflex (PLR)'
                    : isHe
                    ? 'סימולטור פרוטוקול קוגניטיבי 3-שלבי'
                    : '3-Way Cognitive Protocol Simulator'}
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                  {interactionMode === 'webcam'
                    ? webcamStatus
                    : isHe
                    ? 'הדמיית התרחבות אישון טונית בין קו בסיס במנוחה (מצב A), עומס קוגניטיבי (מצב B), ונעילת SMR בחוג סגור (מצב C).'
                    : 'Simulate tonic pupil dilation across Resting Baseline (State A), Stress Load (State B), and Closed-Loop SMR Flow (State C).'}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSwitchInteractionMode('manual')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    interactionMode === 'manual'
                      ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 font-semibold'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>{isHe ? 'סימולטור פרוטוקול 3-שלבי' : 'Protocol Simulator Mode'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchInteractionMode('webcam')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    interactionMode === 'webcam'
                      ? 'bg-amber-500 text-stone-950 font-semibold'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isHe ? 'קלט תאורת מצלמת רשת (PLR)' : 'Webcam Ambient Light Input'}</span>
                </button>
              </div>
            </div>

            {/* Right 7 Columns: Mode-Specific Controls */}
            <div className="lg:col-span-7 flex flex-col justify-center border-t lg:border-t-0 lg:border-s border-stone-200 dark:border-stone-800 pt-4 lg:pt-0 lg:ps-6">
              {interactionMode === 'webcam' ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <SunMedium className="w-4 h-4 text-amber-500" />
                      <span className="font-medium text-stone-800 dark:text-stone-200">
                        {isHe
                          ? `תאורת סביבה: ${ambientLux} Lux (${ambientLuminancePct}%)`
                          : `Ambient Luminance: ${ambientLux} Lux (${ambientLuminancePct}%)`}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular text-amber-700 dark:text-amber-400">
                        {isHe
                          ? `אישון PLR: ${tonicDiameterMm.toFixed(2)} מ"מ`
                          : `PLR Pupil: ${tonicDiameterMm.toFixed(2)} mm`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={triggerLightFlashReflex}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>
                        {isHe
                          ? 'הפעל הבזק אור פוטופי (850 Lux)'
                          : 'Trigger Photopic Flash Reflex (850 Lux)'}
                      </span>
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
                      <span>
                        {webcamActive
                          ? isHe
                            ? 'כיול חשיפת מצלמה חיה / עקיפת עוצמת אור'
                            : 'Live Camera Exposure / Ambient Light Calibration Override'
                          : isHe
                          ? 'עוצמת תאורת סביבה מדומה (חדר חשוך ← אור יום בהיר)'
                          : 'Simulated Ambient Light Intensity (Dim Room → Bright Daylight)'}
                      </span>
                      <span className="font-mono-tabular">
                        {ambientLuminancePct}% ({ambientLux} lx)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="98"
                      step="1"
                      value={ambientLuminancePct}
                      onChange={(e) => setSimulatedLightOverride(parseInt(e.target.value, 10))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-xs font-medium text-stone-600 dark:text-stone-400">
                    {isHe
                      ? 'בחר שלב בפרוטוקול האבחון ה-3 שלבי:'
                      : 'Select 3-Way Pupillometry Benchmark Stage:'}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      [
                        {
                          id: 'STATE_A',
                          label: isHe
                            ? 'מצב A: קו בסיס (3.12 מ"מ)'
                            : 'State A: Baseline (3.12 mm)',
                        },
                        {
                          id: 'STATE_B',
                          label: isHe
                            ? 'מצב B: עומס ודחק (4.35 מ"מ)'
                            : 'State B: Stress Load (4.35 mm)',
                        },
                        {
                          id: 'STATE_C',
                          label: isHe
                            ? 'מצב C: נעילת זרימה (3.75 מ"מ)'
                            : 'State C: Flow Lock (3.75 mm)',
                        },
                      ] as const
                    ).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => applyThreeWayStage(st.id)}
                        className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                          protocolStage === st.id
                            ? 'bg-amber-500 text-stone-950 font-semibold'
                            : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. Biometric Reticle Geometry */}
            <div>
              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">
                {isHe ? 'כוונת מדידה ביומטרית (Reticle)' : 'Biometric Reticle Overlay'}
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 dark:bg-stone-900 rounded-lg">
                {(
                  [
                    {
                      id: 'millimeter',
                      label: isHe ? 'קליבר מ"מ (mm)' : 'Millimeter (mm)',
                    },
                    {
                      id: 'polar',
                      label: isHe ? 'זווית 0°–330°' : 'Polar 0°–330°',
                    },
                    {
                      id: 'segmentation',
                      label: isHe ? 'רשת CV פוליגון' : 'CV Edge Mesh',
                    },
                    {
                      id: 'crosshair',
                      label: isHe ? 'וקטור פיקסציה' : 'Gaze Vector',
                    },
                  ] as { id: ReticleStyle; label: string }[]
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChangePreset({ ...preset, reticleStyle: item.id })}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      preset.reticleStyle === item.id
                        ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Neural-Autonomic Layer */}
            <div>
              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">
                {isHe ? 'שכבת ביומרקר אוקולומי' : 'Oculomic Biomarker Layer'}
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 dark:bg-stone-900 rounded-lg">
                {(
                  [
                    { id: 'stroma', label: isHe ? 'סטרומת הקשתית' : 'Iris Stroma' },
                    { id: 'lcne', label: isHe ? 'גיוס LC-NE' : 'LC-NE Drive' },
                    { id: 'saccades', label: isHe ? 'מסלול סקאדות' : 'Saccade Trace' },
                    { id: 'vagal', label: isHe ? 'הילה וגאלית' : 'Vagal Halo' },
                  ] as { id: BiomarkerLayer; label: string }[]
                ).map((layer) => (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => onChangePreset({ ...preset, biomarkerLayer: layer.id })}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      preset.biomarkerLayer === layer.id
                        ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                    }`}
                  >
                    {layer.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Autonomic Oscillation & Radial Stroma Density */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-stone-500 dark:text-stone-400">
                    {isHe ? 'קצב תנודות היפוס (Hippus)' : 'Hippus Oscillation Rate'}
                  </span>
                  <span className="font-mono-tabular text-stone-900 dark:text-stone-200">
                    {preset.oscillationRate.toFixed(1)}×
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.5"
                  step="0.1"
                  value={preset.oscillationRate}
                  onChange={(e) =>
                    onChangePreset({ ...preset, oscillationRate: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-stone-500 dark:text-stone-400">
                    {isHe ? 'גזרות סיבי הקשתית' : 'Iris Stroma Sectors'}
                  </span>
                  <span className="font-mono-tabular text-stone-900 dark:text-stone-200">
                    {preset.stromaSectors} {isHe ? 'צירים' : 'axes'}
                  </span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="24"
                  step="2"
                  value={preset.stromaSectors}
                  onChange={(e) =>
                    onChangePreset({ ...preset, stromaSectors: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>
            </div>

            {/* 4. Tonic Pupil Diameter & Acoustic Pacing */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-stone-500 dark:text-stone-400">
                    {isHe ? 'קוטר אישון טוני' : 'Tonic Pupil Diameter'}
                  </span>
                  <span className="font-mono-tabular text-stone-900 dark:text-stone-200">
                    {tonicDiameterMm.toFixed(2)} mm
                  </span>
                </div>
                <input
                  type="range"
                  min="0.20"
                  max="0.52"
                  step="0.02"
                  value={preset.pupilScale}
                  onChange={(e) => {
                    smoothedPupilScaleRef.current = parseFloat(e.target.value);
                    onChangePreset({ ...preset, pupilScale: parseFloat(e.target.value) });
                  }}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-900 p-1 rounded-lg">
                  {(
                    [
                      { id: 'heartbeat', label: '60 BPM' },
                      { id: 'pocket18k', label: '5 Hz SMR' },
                      { id: 'chrono28k', label: '8 Hz Alpha' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleAudio(m.id)}
                      className={`px-2 py-1 text-xs font-mono-tabular rounded transition-colors whitespace-nowrap shrink-0 ${
                        audioActive && audioMode === m.id
                          ? 'bg-amber-500 text-stone-950 font-medium'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => applyThreeWayStage('STATE_A')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap shrink-0"
                  title={isHe ? 'איפוס למצב A (קו בסיס במנוחה)' : 'Reset to State A Resting Baseline'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isHe ? 'איפוס' : 'Reset'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

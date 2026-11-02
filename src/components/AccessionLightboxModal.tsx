import React, { useEffect, useRef, useState } from 'react';
import { CuratedPlate, generateOKFJsonLd, Language } from '../data/platesData';
import {
  X,
  Play,
  Pause,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  FileCode2,
} from 'lucide-react';

interface PlateMediaProps {
  src: string;
  alt: string;
  title: string;
  plateNumber: string;
  className?: string;
}

export const ResilientPlateImage: React.FC<PlateMediaProps> = ({
  src,
  alt,
  title,
  plateNumber,
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-stone-900 via-stone-950 to-black text-stone-300 p-6 text-center ${className}`}
      >
        <svg
          className="w-14 h-14 text-amber-500/70 mb-3"
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <ellipse cx="32" cy="32" rx="28" ry="18" />
          <circle cx="32" cy="32" r="12" />
          <circle cx="32" cy="32" r="4" />
          <line x1="32" y1="32" x2="32" y2="22" />
          <line x1="32" y1="32" x2="40" y2="32" />
        </svg>
        <span className="text-xs font-mono-tabular text-amber-400/90">{plateNumber}</span>
        <span className="text-sm font-display italic text-stone-200 mt-1">{title}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};

interface AccessionLightboxModalProps {
  plate: CuratedPlate | null;
  onClose: () => void;
  onSelectPlate: (plate: CuratedPlate) => void;
  onLoadPresetInStudio: (plate: CuratedPlate) => void;
  allPlates: CuratedPlate[];
  lang?: Language;
}

export const AccessionLightboxModal: React.FC<AccessionLightboxModalProps> = ({
  plate,
  onClose,
  onSelectPlate,
  onLoadPresetInStudio,
  allPlates,
  lang = 'en',
}) => {
  const isHe = lang === 'he';
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [viewMode, setViewMode] = useState<'motion' | 'still'>('motion');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!plate || viewMode !== 'motion') return;
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = plate.startTime;
    vid
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        vid.muted = true;
        setIsMuted(true);
        vid
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      });
  }, [plate, viewMode]);

  if (!plate) return null;

  const currentIndex = allPlates.findIndex((p) => p.id === plate.id);
  const prevPlate = allPlates[(currentIndex - 1 + allPlates.length) % allPlates.length];
  const nextPlate = allPlates[(currentIndex + 1) % allPlates.length];

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.currentTime >= plate.endTime || vid.currentTime < plate.startTime - 0.5) {
      vid.currentTime = plate.startTime;
    }
  };

  const togglePlay = () => {
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

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsMuted(vid.muted);
  };

  const handleDownloadPlateOkf = () => {
    const okf = generateOKFJsonLd(plate);
    const blob = new Blob([JSON.stringify(okf, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${plate.accessionNumber}_OKF_Biomarker.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 md:p-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-plate-title"
    >
      <div className="relative w-full max-w-6xl bg-[#FBF9F5] dark:bg-[#0D0D0F] text-stone-900 dark:text-stone-100 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-2xl my-auto">
        {/* Top Modal Utility Bar */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 font-mono-tabular">
            <span>{plate.accessionNumber}</span>
            <span aria-hidden="true">·</span>
            <span>{plate.plateNumber}</span>
            <span aria-hidden="true">·</span>
            <span>{plate.timecodeRange}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectPlate(prevPlate)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-stone-800 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>{isHe ? 'שלב קודם' : 'Previous Stage'}</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectPlate(nextPlate)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-stone-800 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <span>{isHe ? 'שלב הבא' : 'Next Stage'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
              aria-label="Close diagnostic viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main 2-Column Oculomic Diagnostic View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Left: High-Res Media / Looping Chapter Reel */}
          <div className="lg:col-span-6 bg-[#060607] flex flex-col justify-between p-6 border-b lg:border-b-0 lg:border-r border-stone-200 dark:border-stone-800">
            <div className="relative aspect-[9/14] max-h-[540px] mx-auto w-full rounded-xl overflow-hidden bg-black border border-stone-800/80 flex items-center justify-center">
              {viewMode === 'motion' ? (
                <video
                  ref={videoRef}
                  src="/media/ocular_loop.mp4"
                  poster={plate.imageSrc}
                  playsInline
                  muted={isMuted}
                  onTimeUpdate={handleTimeUpdate}
                  className="w-full h-full object-contain"
                />
              ) : (
                <ResilientPlateImage
                  src={plate.imageSrc}
                  alt={isHe ? plate.titleHe : plate.title}
                  title={isHe ? plate.titleHe : plate.title}
                  plateNumber={plate.plateNumber}
                  className="w-full h-full object-contain"
                />
              )}

              {/* Media Controls Overlay */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 bg-black/75 backdrop-blur-md px-3 py-2 rounded-lg border border-stone-800">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('motion')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      viewMode === 'motion'
                        ? 'bg-amber-500 text-stone-950'
                        : 'text-stone-300 hover:text-white'
                    }`}
                  >
                    {isHe ? `לולאת וידאו (${plate.timecodeRange})` : `Motion Loop (${plate.timecodeRange})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('still')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      viewMode === 'still'
                        ? 'bg-amber-500 text-stone-950'
                        : 'text-stone-300 hover:text-white'
                    }`}
                  >
                    {isHe ? 'פריים אבחון סטטי' : 'Diagnostic Frame'}
                  </button>
                </div>

                {viewMode === 'motion' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="p-1.5 text-stone-200 hover:text-white bg-stone-800 rounded"
                      aria-label={isPlaying ? 'Pause loop' : 'Play loop'}
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="p-1.5 text-stone-200 hover:text-white bg-stone-800 rounded"
                      aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs font-display italic text-stone-400 text-center mt-4">
              {isHe ? plate.figureLabelHe : plate.figureLabel}
            </p>
          </div>

          {/* Right: Structured Clinical & Oculomic Biomarker Record */}
          <div className="lg:col-span-6 p-6 md:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                <span>{isHe ? plate.categoryLabelHe : plate.categoryLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{plate.plateNumber}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {isHe ? 'שהות בזרימה (Flow):' : 'Flow Residency:'} {plate.biomarkers.flowStatePct}%
                </span>
              </div>

              <h2
                id="modal-plate-title"
                className="text-3xl md:text-4xl font-display font-semibold text-stone-900 dark:text-stone-100 mt-2 tracking-tight"
              >
                {isHe ? plate.titleHe : plate.title}
              </h2>
              <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                {isHe ? plate.subtitleHe : plate.subtitle}
              </p>

              <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300 mt-5">
                {isHe ? plate.curatorialNoteHe : plate.curatorialNote}
              </p>

              {/* Clinical Biomarker Definition List */}
              <dl className="mt-6 divide-y divide-stone-200 dark:divide-stone-800 border-t border-b border-stone-200 dark:border-stone-800 text-xs">
                <div className="py-3 grid grid-cols-3 gap-4">
                  <dt className="text-stone-500 dark:text-stone-400">
                    {isHe ? 'מזהה ביומרקר OKF' : 'OKF Biomarker ID'}
                  </dt>
                  <dd className="col-span-2 font-mono-tabular text-stone-900 dark:text-stone-200">
                    {plate.accessionNumber}
                  </dd>
                </div>
                <div className="py-3 grid grid-cols-3 gap-4">
                  <dt className="text-stone-500 dark:text-stone-400">
                    {isHe ? 'קוטר טוני וסטיית תקן' : 'Tonic Diameter & SD'}
                  </dt>
                  <dd className="col-span-2 font-mono-tabular text-stone-900 dark:text-stone-200">
                    {plate.biomarkers.tonicDiameterMm.toFixed(2)} mm · Wave SD:{' '}
                    {plate.biomarkers.pupillaryWavesSD.toFixed(2)} mm
                  </dd>
                </div>
                <div className="py-3 grid grid-cols-3 gap-4">
                  <dt className="text-stone-500 dark:text-stone-400">
                    {isHe ? 'התאמת תדר EEG' : 'EEG Frequency Match'}
                  </dt>
                  <dd className="col-span-2 font-mono-tabular text-amber-700 dark:text-amber-400">
                    {isHe ? plate.biomarkers.eegEquivalentHe : plate.biomarkers.eegEquivalent}
                  </dd>
                </div>
                <div className="py-3 grid grid-cols-3 gap-4">
                  <dt className="text-stone-500 dark:text-stone-400">
                    {isHe ? 'סקאדות ופיקסציה' : 'Saccades & Fixation'}
                  </dt>
                  <dd className="col-span-2 font-mono-tabular text-stone-900 dark:text-stone-200">
                    {plate.biomarkers.saccadesPerMin} {isHe ? 'סקאדות/דק׳' : 'saccades/min'} ·{' '}
                    {isHe ? 'פיקסציה ממוצעת:' : 'Mean Fixation:'} {plate.biomarkers.fixationDurationMs} ms
                  </dd>
                </div>
                <div className="py-3 grid grid-cols-3 gap-4">
                  <dt className="text-stone-500 dark:text-stone-400">
                    {isHe ? 'מנגנון עצבי' : 'Neural Mechanism'}
                  </dt>
                  <dd className="col-span-2 text-stone-900 dark:text-stone-200">
                    {isHe ? plate.opticalPrincipleHe : plate.opticalPrinciple}
                  </dd>
                </div>
                <div className="py-3 grid grid-cols-3 gap-4">
                  <dt className="text-stone-500 dark:text-stone-400">
                    {isHe ? 'מצב אוטונומי' : 'Autonomic State'}
                  </dt>
                  <dd className="col-span-2 text-stone-900 dark:text-stone-200">
                    {isHe ? plate.biomarkers.autonomicBalanceHe : plate.biomarkers.autonomicBalance}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onLoadPresetInStudio(plate);
                    onClose();
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Sliders className="w-4 h-4" />
                  <span>{isHe ? 'הדמיית ביומרקר במעבדה' : 'Simulate Biomarker in Studio'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPlateOkf}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium text-stone-800 dark:text-stone-200 bg-stone-200/80 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <FileCode2 className="w-4 h-4 text-amber-500" />
                  <span>{isHe ? 'ייצוא OKF JSON-LD' : 'Export OKF JSON-LD'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap shrink-0"
              >
                {isHe ? 'סגור' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

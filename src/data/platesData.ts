export type Language = 'en' | 'he';
export type MovementCategory = 'all' | 'ocular' | 'charts';

export type ReticleStyle = 'millimeter' | 'polar' | 'segmentation' | 'crosshair';
export type BiomarkerLayer = 'stroma' | 'lcne' | 'saccades' | 'vagal';

export interface StudioPreset {
  reticleStyle: ReticleStyle;
  biomarkerLayer: BiomarkerLayer;
  oscillationRate: number;
  stromaSectors: number;
  irisHue: number;
  pupilScale: number;
  smrFlowLock: boolean;
}

export interface OculomicBiomarkers {
  tonicDiameterMm: number;
  pupillaryWavesSD: number;
  saccadesPerMin: number;
  fixationDurationMs: number;
  flowStatePct: number;
  eegEquivalent: string;
  eegEquivalentHe: string;
  autonomicBalance: string;
  autonomicBalanceHe: string;
}

export interface CuratedPlate {
  id: string;
  plateNumber: string;
  plateNumberHe: string;
  figureLabel: string;
  figureLabelHe: string;
  title: string;
  titleHe: string;
  subtitle: string;
  subtitleHe: string;
  category: 'ocular';
  categoryLabel: string;
  categoryLabelHe: string;
  accessionNumber: string;
  imageSrc: string;
  startTime: number;
  endTime: number;
  timecodeRange: string;
  medium: string;
  mediumHe: string;
  dimensions: string;
  opticalPrinciple: string;
  opticalPrincipleHe: string;
  exifMetadata: string;
  curatorialNote: string;
  curatorialNoteHe: string;
  provenance: string;
  studioPreset: StudioPreset;
  biomarkers: OculomicBiomarkers;
}

export const CURATED_PLATES: CuratedPlate[] = [
  {
    id: 'plate-ocular-baseline',
    plateNumber: 'Stage I',
    plateNumberHe: 'שלב I',
    figureLabel: 'Fig. 1 — State A Resting Baseline & Sphincter-Dilator Equilibrium',
    figureLabelHe: 'איור 1 — מצב A: קו בסיס במנוחה ואיזון שרירי הספינקטר-דילטור',
    title: 'Tonic Baseline & Corneal Calibration',
    titleHe: 'קו בסיס טוני וכיול קרנית (State A)',
    subtitle: '60 Hz computer-vision segmentation of resting tonic aperture and limbal boundary',
    subtitleHe: 'סגמנטציית ראייה ממוחשבת ב-60Hz של מפתח האישון במנוחה וגבול הקשתית',
    category: 'ocular',
    categoryLabel: 'State A · Baseline',
    categoryLabelHe: 'מצב A · מנוחה',
    accessionNumber: 'OKF-BIO-2026.01',
    imageSrc: '/media/pin_cover.jpg',
    startTime: 0,
    endTime: 2.5,
    timecodeRange: '00:00 – 00:02.5',
    medium: '60 Hz Optical Pupillometry & Limbal Ring Vector Tracking',
    mediumHe: 'פופילומטריה אופטית 60Hz ומעקב וקטורי אחר טבעת הלימבוס',
    dimensions: 'Tonic Diameter: 3.12 mm · Wave SD: 0.14 mm (State A Resting)',
    opticalPrinciple: 'Antagonistic parasympathetic sphincter vs. sympathetic dilator baseline tone',
    opticalPrincipleHe: 'טונוס בסיס מאוזן בין השריר המכווץ (פאראסימפתטי) לשריר המרחיב (סימפתטי)',
    exifMetadata: 'EEG Match: Alpha (8–12 Hz) · 18 Saccades/min · Fixation 420 ms',
    curatorialNote:
      'In State A (Resting Baseline), the eye serves as a calibrated optical transducer of Central and Autonomic Nervous System equilibrium. Radial iris fibers maintain a steady 3.12 mm tonic diameter with minimal low-frequency hippus variance.',
    curatorialNoteHe:
      'במצב A (מנוחה), העין משמשת כחיישן אופטי ישיר של מערכת העצבים המרכזית והאוטונומית (CNS/ANS). סיבי הקשתית שומרים על קוטר אישון טוני יציב של 3.12 מ"מ עם סטיית תקן נמוכה (0.14 מ"מ), המהווה נקודת ייחוס לפני הפעלת עומס קוגניטיבי.',
    provenance: 'OculoFlow Clinical Archive · State A Baseline Protocol (2026)',
    studioPreset: {
      reticleStyle: 'millimeter',
      biomarkerLayer: 'stroma',
      oscillationRate: 1.0,
      stromaSectors: 12,
      irisHue: 38,
      pupilScale: 0.31,
      smrFlowLock: false,
    },
    biomarkers: {
      tonicDiameterMm: 3.12,
      pupillaryWavesSD: 0.14,
      saccadesPerMin: 18,
      fixationDurationMs: 420,
      flowStatePct: 45,
      eegEquivalent: 'Alpha Band (8–12 Hz)',
      eegEquivalentHe: 'גלי אלפא (8–12 Hz)',
      autonomicBalance: 'Parasympathetic Baseline Equilibrium',
      autonomicBalanceHe: 'איזון פאראסימפתטי במנוחה',
    },
  },
  {
    id: 'plate-stroma-fixation',
    plateNumber: 'Stage II',
    plateNumberHe: 'שלב II',
    figureLabel: 'Fig. 2 — Foveal Fixation Stabilization & Radial Stroma Contraction',
    figureLabelHe: 'איור 2 — ייצוב קיבוע מבט פוביאלי והתארגנות סיבי הקשתית',
    title: 'Radial Iris Stroma & Gaze Coherence',
    titleHe: 'רקמת הקשתית ויציבות קיבוע המבט',
    subtitle: 'Micron-level tracking of iris crypt architecture during sustained visual fixation',
    subtitleHe: 'מעקב ברמת המיקרון אחר מבנה הקשתית וצמצום מיקרו-סקאדות בזמן מיקוד',
    category: 'ocular',
    categoryLabel: 'Ocular Biomechanics',
    categoryLabelHe: 'ביומכניקה עינית',
    accessionNumber: 'OKF-BIO-2026.02',
    imageSrc: '/media/frame_iris_pure.jpg',
    startTime: 2.5,
    endTime: 3.8,
    timecodeRange: '00:02.5 – 00:03.8',
    medium: 'High-Contrast Iris Stroma Profiling & Micro-Saccadic Filtering',
    mediumHe: 'מיפוי קשתית בניגודיות גבוהה וסינון מיקרו-סקאדות',
    dimensions: 'Tonic Diameter: 3.48 mm · Wave SD: 0.11 mm · Fixation 640 ms',
    opticalPrinciple: 'Suppression of involuntary ocular drift during executive target engagement',
    opticalPrincipleHe: 'דיכוי תנועות עיניים לא-רצוניות בעת מיקוד קשב ניהולי במטרה',
    exifMetadata: 'EEG Match: Upper Alpha / Low Beta (10–15 Hz) · 14 Saccades/min',
    curatorialNote:
      'As visual attention locks onto the target reticle, involuntary micro-saccades subside below 15 movements per minute. The radial iris stroma exhibits high structural coherence, isolating true cognitive dilation from luminance artifacts.',
    curatorialNoteHe:
      'כאשר הקשב החזותי ננעל על כוונת המטרה, תדירות המיקרו-סקאדות יורדת מתחת ל-15 בדקה ומשך הקיבוע עולה ל-640 מילי-שניות. סיבי הקשתית מציגים קוהרנטיות מבנית שמאפשרת לבודד התרחבות קוגניטיבית אמיתית מהשפעות תאורה.',
    provenance: 'OculoFlow Clinical Archive · Ocular Biomechanics Study (2026)',
    studioPreset: {
      reticleStyle: 'polar',
      biomarkerLayer: 'saccades',
      oscillationRate: 0.9,
      stromaSectors: 16,
      irisHue: 40,
      pupilScale: 0.34,
      smrFlowLock: false,
    },
    biomarkers: {
      tonicDiameterMm: 3.48,
      pupillaryWavesSD: 0.11,
      saccadesPerMin: 14,
      fixationDurationMs: 640,
      flowStatePct: 74,
      eegEquivalent: 'Upper Alpha / SMR (10–15 Hz)',
      eegEquivalentHe: 'אלפא גבוה / SMR (10–15 Hz)',
      autonomicBalance: 'Coherent Oculomotor Fixation',
      autonomicBalanceHe: 'לכידות אוקולומוטורית וקיבוע יציב',
    },
  },
  {
    id: 'plate-lcne-mobilization',
    plateNumber: 'Stage III',
    plateNumberHe: 'שלב III',
    figureLabel: 'Fig. 3 — Locus Coeruleus-Norepinephrine (LC-NE) Sympathetic Drive (State B)',
    figureLabelHe: 'איור 3 — גיוס סימפתטי של גרעין ה-Locus Coeruleus תחת עומס (State B)',
    title: 'State B: LC-NE Cognitive Mobilization',
    titleHe: 'מצב B: גיוס קוגניטיבי ועומס דחק (LC-NE)',
    subtitle: 'Sympathetic pupil dilation (+39.1%) and phasic neuromuscular coupling under load',
    subtitleHe: 'התרחבות אישון סימפתטית (+39.1%) וזינוק במיקרו-סקאדות תחת אתגר קוגניטיבי',
    category: 'ocular',
    categoryLabel: 'State B · Stress Load',
    categoryLabelHe: 'מצב B · עומס ודחק',
    accessionNumber: 'OKF-BIO-2026.03',
    imageSrc: '/media/frame_gears.jpg',
    startTime: 3.8,
    endTime: 5.0,
    timecodeRange: '00:03.8 – 00:05.0',
    medium: 'Phasic LC-NE Sympathetic Mobilization & Executive Load Challenge',
    mediumHe: 'גיוס סימפתטי פאזי במערכת ה-LC-NE ומבדק עומס ניהולי',
    dimensions: 'Tonic Diameter: 4.35 mm (+39.1% vs. State A) · Wave SD: 0.48 mm',
    opticalPrinciple: 'Brainstem Locus Coeruleus firing rate linearly coupled to pupil dilator tone',
    opticalPrincipleHe: 'קצב הירי של גרעין ה-Locus Coeruleus בגזע המוח משתקף ישירות בהתרחבות האישון',
    exifMetadata: 'EEG Match: High Beta (>22 Hz) · 54 Saccades/min · Fixation 180 ms',
    curatorialNote:
      'During State B (Cognitive Stress Challenge), brainstem Locus Coeruleus neurons fire phasic bursts of norepinephrine. Pupil diameter expands to 4.35 mm (+39.1% dynamic mobilization) while micro-saccades surge to 54/min under executive strain.',
    curatorialNoteHe:
      'במצב B (מבדק עומס קוגניטיבי ודחק), גרעין ה-Locus Coeruleus מפריש נוראדרנלין לקורטקס הפרונטלי. קוטר האישון מתרחב ל-4.35 מ"מ (גיוס דינמי של +39.1%) וקצב המיקרו-סקאדות מזנק ל-54 בדקה — סמן מובהק לעומס קשבי ב-ADHD.',
    provenance: 'OculoFlow Clinical Archive · State B Cognitive Load Protocol (2026)',
    studioPreset: {
      reticleStyle: 'segmentation',
      biomarkerLayer: 'lcne',
      oscillationRate: 2.4,
      stromaSectors: 18,
      irisHue: 44,
      pupilScale: 0.46,
      smrFlowLock: false,
    },
    biomarkers: {
      tonicDiameterMm: 4.35,
      pupillaryWavesSD: 0.48,
      saccadesPerMin: 54,
      fixationDurationMs: 180,
      flowStatePct: 22,
      eegEquivalent: 'High Beta Stress (>22 Hz)',
      eegEquivalentHe: 'גלי בטא גבוהים / דחק (>22 Hz)',
      autonomicBalance: 'Sympathetic Hyper-Mobilization (State B)',
      autonomicBalanceHe: 'עוררות-יתר סימפתטית (מצב B)',
    },
  },
  {
    id: 'plate-closed-loop-flow',
    plateNumber: 'Stage IV',
    plateNumberHe: 'שלב IV',
    figureLabel: 'Fig. 4 — State C Closed-Loop SMR Biofeedback Convergence & Flow Lock',
    figureLabelHe: 'איור 4 — מצב C: התכנסות ביופידבק בלופ סגור ונעילת SMR Flow',
    title: 'State C: Closed-Loop SMR Flow Lock',
    titleHe: 'מצב C: וויסות בלופ סגור ונעילת Flow',
    subtitle: 'Centripetal phasic convergence and 0.3 Hz Sensorimotor Rhythm stabilization',
    subtitleHe: 'ייצוב האישון (SD 0.08mm) וסנכרון קצב סנסורי-מוטורי (SMR 12–15Hz)',
    category: 'ocular',
    categoryLabel: 'State C · Flow Lock',
    categoryLabelHe: 'מצב C · נעילת פלואו',
    accessionNumber: 'OKF-BIO-2026.04',
    imageSrc: '/media/frame_sparks.jpg',
    startTime: 5.0,
    endTime: 7.8,
    timecodeRange: '00:05.0 – 00:07.8',
    medium: 'Closed-Loop Visual Reward Conditioning & Vagal-Prefrontal Coupling',
    mediumHe: 'התניה אופרנטית חזותית בלופ סגור וצימוד וגאלי-פרונטלי',
    dimensions: 'Tonic Diameter: 3.75 mm · Wave SD: 0.08 mm · Flow Residency: 86%',
    opticalPrinciple: 'Real-time visual feedback loop entraining 12–15 Hz SMR cortical stability',
    opticalPrincipleHe: 'משוב חזותי בזמן אמת המאמן יציבות קורטיקלית בתדר SMR (12–15Hz)',
    exifMetadata: 'EEG Match: SMR Resonance (12–15 Hz) · 11 Saccades/min · Fixation 890 ms',
    curatorialNote:
      'In State C (Closed-Loop Biofeedback), visual reward cues respond instantaneously to pupil stability. Micro-saccades drop from 54/min to 11/min, wave variance stabilizes to 0.08 mm, and the subject locks into sustained Flow State (86% residency).',
    curatorialNoteHe:
      'במצב C (אימון ביופידבק בלופ סגור), מנגנון התגמול החזותי מגיב מיידית ליציבות האישון. תדירות המיקרו-סקאדות צונחת מ-54 ל-11 בדקה, סטיית התקן מתייצבת על 0.08 מ"מ, והמתאמן שוהה במצב Flow ב-86% ממשך הסשן.',
    provenance: 'OculoFlow Clinical Archive · State C Closed-Loop Protocol (2026)',
    studioPreset: {
      reticleStyle: 'crosshair',
      biomarkerLayer: 'vagal',
      oscillationRate: 1.0,
      stromaSectors: 16,
      irisHue: 42,
      pupilScale: 0.36,
      smrFlowLock: true,
    },
    biomarkers: {
      tonicDiameterMm: 3.75,
      pupillaryWavesSD: 0.08,
      saccadesPerMin: 11,
      fixationDurationMs: 890,
      flowStatePct: 86,
      eegEquivalent: 'SMR Resonance (12–15 Hz)',
      eegEquivalentHe: 'תהודת SMR ממוקדת (12–15 Hz)',
      autonomicBalance: '86.4% Closed-Loop Regulation Efficiency',
      autonomicBalanceHe: '86.4% יעילות וויסות בלופ סגור',
    },
  },
];

export const REEL_CHAPTERS = [
  {
    label: 'I. Tonic Baseline (3.12 mm)',
    labelHe: 'I. בסיס במנוחה (3.12 מ"מ)',
    time: 0,
    code: '00:00',
  },
  {
    label: 'II. Stroma Fixation (3.48 mm)',
    labelHe: 'II. קיבוע קשתית (3.48 מ"מ)',
    time: 2.5,
    code: '00:02.5',
  },
  {
    label: 'III. LC-NE Stress Load (4.35 mm)',
    labelHe: 'III. עומס דחק (4.35 מ"מ)',
    time: 3.8,
    code: '00:03.8',
  },
  {
    label: 'IV. SMR Flow Lock (3.75 mm)',
    labelHe: 'IV. נעילת פלואו (3.75 מ"מ)',
    time: 5.2,
    code: '00:05.2',
  },
];

export const EEG_OCULOMIC_MAPPING = [
  {
    eegBand: 'Delta / Slow Theta',
    eegBandHe: 'דלתא / תטא איטי',
    freqRange: '0.5 – 7 Hz',
    oculomicBiomarker: 'Slow Pupillary Hippus Waves (0.1 – 0.5 Hz)',
    oculomicBiomarkerHe: 'גלי תנודת אישון איטיים (Pupillary Waves 0.1–0.5 Hz)',
    clinicalSignificance: 'Cognitive fatigue, attentional drift, Default Mode Network (DMN) intrusion',
    clinicalSignificanceHe: 'עייפות קוגניטיבית, פיזור קשב ושיטוט מחשבות (DMN)',
  },
  {
    eegBand: 'Alpha Rhythm',
    eegBandHe: 'גלי אלפא (Alpha)',
    freqRange: '8 – 12 Hz',
    oculomicBiomarker: 'High Fixation Stability (> 600 ms) & Calm Tonic Aperture',
    oculomicBiomarkerHe: 'יציבות קיבוע גבוהה (> 600 ms) ומפתח אישון טוני רגוע',
    clinicalSignificance: 'Alert relaxation, vagal parasympathetic balance, reduced anxiety',
    clinicalSignificanceHe: 'רגיעה ערנית, איזון פאראסימפתטי וגאלי והפחתת חרדה',
  },
  {
    eegBand: 'SMR / Focused Beta',
    eegBandHe: 'SMR / בטא ממוקד',
    freqRange: '12 – 20 Hz',
    oculomicBiomarker: 'Stable Tonic Dilation (3.6–3.9 mm, SD < 0.10) & Saccades < 15/min',
    oculomicBiomarkerHe: 'התרחבות טונית יציבה (3.6–3.9 מ"מ, SD < 0.10) וסקאדות < 15/דקה',
    clinicalSignificance: 'Optimal executive focus, Locus Coeruleus-NE coherence, sustained Flow State',
    clinicalSignificanceHe: 'מיקוד קשב אופטימלי, לכידות LC-NE ושהייה מתמשכת ב-Flow State',
  },
  {
    eegBand: 'High Beta / Gamma Burst',
    eegBandHe: 'בטא גבוה / עומס דחק',
    freqRange: '> 22 Hz',
    oculomicBiomarker: 'Sympathetic Hyper-Dilation (> 4.3 mm) & Micro-Saccades > 45/min',
    oculomicBiomarkerHe: 'התרחבות-יתר סימפתטית (> 4.3 מ"מ) ומיקרו-סקאדות > 45/דקה',
    clinicalSignificance: 'Cognitive overload, hyper-arousal, impulsive frontal eye field instability',
    clinicalSignificanceHe: 'עומס קוגניטיבי, עוררות-יתר ואי-יציבות אימפולסיבית של שדה העין הפרונטלי',
  },
];

export const THREE_WAY_BENCHMARK = {
  sessionId: 'SESS-2026-OKF-894',
  patientId: 'P-10294',
  condition: 'ADHD & Executive Attention Assessment',
  conditionHe: 'הערכת קשב ניהולי (ADHD) וויסות אוטונומי',
  protocol: 'Standard 3-Way Pupillometry Protocol',
  cognitiveDynamicRangePct: 39.1,
  trainingEfficiencyPct: 86.4,
  autonomicRecoveryPct: 88.2,
  states: [
    {
      id: 'State A',
      name: 'State A: Resting Baseline',
      nameHe: 'מצב A: מנוחה (Resting Baseline)',
      duration: '60s',
      tonicMm: 3.12,
      wavesSd: 0.14,
      saccadesMin: 18,
      fixationMs: 420,
      flowPct: 15,
    },
    {
      id: 'State B',
      name: 'State B: Cognitive Load & Stress',
      nameHe: 'מצב B: עומס קוגניטיבי ודחק',
      duration: '120s',
      tonicMm: 4.35,
      wavesSd: 0.48,
      saccadesMin: 54,
      fixationMs: 180,
      flowPct: 22,
    },
    {
      id: 'State C',
      name: 'State C: Closed-Loop Regulation',
      nameHe: 'מצב C: אימון וויסות בלופ סגור',
      duration: '300s',
      tonicMm: 3.75,
      wavesSd: 0.08,
      saccadesMin: 11,
      fixationMs: 890,
      flowPct: 86,
    },
  ],
};

// Time-series benchmark points across States A (0-60s), B (60-180s), and C (180-480s)
export const BENCHMARK_TIMELINE_SERIES = [
  { sec: 0, state: 'State A', diameter: 3.1, focus: 44 },
  { sec: 20, state: 'State A', diameter: 3.14, focus: 48 },
  { sec: 40, state: 'State A', diameter: 3.09, focus: 42 },
  { sec: 60, state: 'State A', diameter: 3.12, focus: 45 },
  { sec: 80, state: 'State B', diameter: 4.18, focus: 34 },
  { sec: 100, state: 'State B', diameter: 4.46, focus: 21 },
  { sec: 120, state: 'State B', diameter: 4.32, focus: 26 },
  { sec: 150, state: 'State B', diameter: 4.49, focus: 19 },
  { sec: 180, state: 'State B', diameter: 4.35, focus: 22 },
  { sec: 220, state: 'State C', diameter: 3.92, focus: 68 },
  { sec: 260, state: 'State C', diameter: 3.78, focus: 82 },
  { sec: 320, state: 'State C', diameter: 3.74, focus: 88 },
  { sec: 400, state: 'State C', diameter: 3.76, focus: 91 },
  { sec: 480, state: 'State C', diameter: 3.75, focus: 89 },
];

export const FFT_SPECTRAL_SERIES = [
  { freq: '0.1 Hz (Fatigue)', freqHe: '0.1 Hz (עייפות/DMN)', stateA: 18, stateB: 58, stateC: 11 },
  { freq: '0.2 Hz (ANS Tone)', freqHe: '0.2 Hz (טונוס ANS)', stateA: 14, stateB: 44, stateC: 15 },
  { freq: '0.3 Hz (SMR Sync)', freqHe: '0.3 Hz (סנכרון SMR)', stateA: 9, stateB: 26, stateC: 68 },
  { freq: '0.5 Hz (Phasic)', freqHe: '0.5 Hz (תגובה פאזית)', stateA: 6, stateB: 19, stateC: 21 },
  { freq: '0.8 Hz (Saccadic)', freqHe: '0.8 Hz (סקאדות)', stateA: 4, stateB: 34, stateC: 5 },
];

export function generateOKFJsonLd(activePlate?: CuratedPlate) {
  return {
    '@context': ['https://schema.org', 'https://openknowledge.google.com/okf/v1'],
    '@type': 'MedicalObservationalStudy',
    '@id': `urn:oculoflow:session:${THREE_WAY_BENCHMARK.sessionId}`,
    name: 'Chrono·Oculus / OculoFlow 3-Way Pupillometry & Closed-Loop Neuro-Diagnostic Report',
    dateCreated: new Date().toISOString(),
    studySubject: {
      '@type': 'Patient',
      identifier: THREE_WAY_BENCHMARK.patientId,
      medicalSpecialty: 'Neurodevelopmental & Autonomic Oculomic Assessment',
      healthCondition: THREE_WAY_BENCHMARK.condition,
    },
    deviceUsed: {
      '@type': 'MedicalDevice',
      name: 'OculoFlow 60Hz Computer Vision Pupillometer & Optical Biofeedback Engine',
      samplingRateHz: 60,
      protocol: THREE_WAY_BENCHMARK.protocol,
    },
    activeBiomarkerPlate: activePlate
      ? {
          accessionId: activePlate.accessionNumber,
          title: activePlate.title,
          biomarkers: activePlate.biomarkers,
        }
      : undefined,
    comparativeStates: THREE_WAY_BENCHMARK.states.map((s) => ({
      '@type': 'Observation',
      stateId: s.id,
      name: s.name,
      duration: s.duration,
      biomarkers: {
        tonicPupilDiameterMm: s.tonicMm,
        pupillaryWavesSD: s.wavesSd,
        saccadesPerMinute: s.saccadesMin,
        avgFixationDurationMs: s.fixationMs,
        flowStateResidencyPct: s.flowPct,
      },
    })),
    derivedClinicalIndices: {
      cognitiveDynamicRangePct: THREE_WAY_BENCHMARK.cognitiveDynamicRangePct,
      trainingRegulationEfficiencyPct: THREE_WAY_BENCHMARK.trainingEfficiencyPct,
      autonomicRecoveryScorePct: THREE_WAY_BENCHMARK.autonomicRecoveryPct,
      clinicalInterpretation:
        'Subject demonstrated intact Locus Coeruleus-NE mobilization from State A to State B (+39.1% pupil dilation). Closed-loop visual biofeedback in State C suppressed micro-saccadic bursts from 54/min to 11/min (SD 0.08 mm), achieving 86% Flow State residency.',
    },
    crossReferenceWithScientificOntology: {
      '@type': 'MedicalScholarlyArticle',
      citationIndex: 'DOI:10.1016/j.neuroimage.2023.119854',
      datasetBenchmark: 'GazeBase 1000Hz Normative Cohort / PhysioNet Pupillometry',
      normativeZScore: '+1.42 SD within ADHD-Combined response curve',
    },
  };
}

# OculoFlow (`Beuofdbak`) · Non-Invasive Pupillometry & Closed-Loop Neuro-Biofeedback

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](./LICENSE)
[![Release: Alpha v3.0](https://img.shields.io/badge/Release-Alpha%20v3.0-10b981.svg)](https://beuofdbak.vercel.app/)
[![Privacy: 100% On-Device](https://img.shields.io/badge/Privacy-100%25%20On--Device%20%7C%20Zero--Retention-06b6d4.svg)](./SECURITY.md)
[![Ontology: Google OKF Schema.org](https://img.shields.io/badge/Ontology-Google%20OKF%20JSON--LD-3b82f6.svg)](https://github.com/rafia22110/Beuofdbak)

> **Live Mobile Camera Compatibility Field Test (60s):** **[https://beuofdbak.vercel.app/](https://beuofdbak.vercel.app/)**  
> **GitHub Repository:** **[https://github.com/rafia22110/Beuofdbak](https://github.com/rafia22110/Beuofdbak)**

---

## 🔬 Overview (English)

**OculoFlow (`Beuofdbak`)** is an open-source (**MIT Licensed**) oculomic diagnostic and closed-loop neuro-biofeedback platform. By transforming a standard 60 Hz smartphone or desktop optical sensor into a sub-millimeter pupillometer, OculoFlow measures the continuous antagonistic balance between:
- **Sympathetic Dilator Pathway**: Driven by the **Locus Coeruleus-Norepinephrine (LC-NE)** complex, indexing executive arousal, cognitive load, and attentional effort.
- **Parasympathetic Sphincter Pathway**: Driven by the **Edinger-Westphal Nucleus** and vagal tone, indexing autonomic recovery and photopic Pupillary Light Reflex (PLR).

### The 3-Way Clinical Benchmark Protocol
| Protocol Stage | Physiological Target | Normative Benchmark | Cortical EEG Correlate |
| :--- | :--- | :--- | :--- |
| **01. State A: Resting Baseline** | Autonomic Tonic Reference | `3.12 mm` (SD `0.14 mm`) · `18 saccades/min` | Alpha / Low Beta (`8–15 Hz`) |
| **02. State B: Cognitive Stress Load** | Sympathetic LC-NE Mobilization | `4.35 mm` (`+39.1%`) · `54 saccades/min` | High Beta (`>22 Hz`) & Frontal Theta |
| **03. State C: Closed-Loop SMR Flow** | Biofeedback Gaze & Pupil Lock | `3.75 mm` (SD `0.08 mm`) · `11 saccades/min` | Coherent SMR Resonance (`12–15 Hz`) |

---

## 🇮🇱 סקירה כללית (עברית)

**OculoFlow (`Beuofdbak`)** היא פלטפורמת קוד פתוח (**ברישיון MIT**) לאבחון אוקולומי ונוירו-ביופידבק בחוג סגור. המערכת הופכת מצלמת סמארטפון או מחשב סטנדרטית (60Hz) לכלי מדידה ביומטרי המנטר בזמן אמת שינויים זעירים בקוטר האישון, תנודות היפוס (`0.1–0.5 Hz`) ותדירות מיקרו-סקאדות כחלופה משלימה ולא-פולשנית ל-EEG.

### 📱 השתתפות במבדק התאמת הניידים (Alpha v3.0)
האפליקציה נמצאת בשלבי מחקר ופיתוח מתקדמים. אנו מזמינים אתכם לבדוק אילו מדגמי הטלפונים הניידים הקיימים היום ומצלמותיהם תומכים בטכנולוגיה:
- **למבדק החי בנייד (60 שניות):** [https://beuofdbak.vercel.app/](https://beuofdbak.vercel.app/)
- **🔒 התחייבות לסודיות מלאה ואפס טרגוט (`SECURITY.md`):**
  - 100% עיבוד מקומי על המכשיר (On-Device) — שום תמונה או וידאו אינם נשמרים או נשלחים לשרת.
  - איננו מתרגטים משתמשים, לא אוספים פרטים מזהים, ולא יישלח שום מידע שיווקי, ספאם או אימייל.
  - לאחר בדיקת תאימות המצלמה, המידע נמחק אוטומטית ואינו נשמר.

---

## 🛠️ Quick Start & Development

```bash
# 1. Clone the repository
git clone https://github.com/rafia22110/Beuofdbak.git
cd Beuofdbak

# 2. Install dependencies
npm install

# 3. Start development server on port 3000
npm run dev

# 4. Build production bundle
npm run build
```

## 📄 License & Academic Citation
Released under the **[MIT License](./LICENSE)**. See [`CITATION.cff`](./CITATION.cff) for academic citation metadata and [`SECURITY.md`](./SECURITY.md) for our Zero-Retention Privacy Charter.

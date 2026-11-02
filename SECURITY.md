# Security, On-Device Privacy & Ephemeral Data Charter (`SECURITY.md`)

## 🔒 1. 100% On-Device Optical Processing (Zero Video/Image Upload)
All pupillary landmark detection, iris-to-sclera ratio normalization, and ambient luminance calculations run **100% locally inside the user's browser (`WebGL / Canvas / MediaStream`)**.
- **No camera frames, photos, or video streams are ever recorded, uploaded, or transmitted to any external server.**

## 🛡️ 2. Zero-Targeting & Zero-Spam Guarantee
- **No User Tracking or Ad-Targeting**: We do not use tracking pixels, advertising cookies, or behavioral profiling.
- **No Emails or Spam**: We never request email addresses, phone numbers, or personal identifiers, and we will never send marketing messages or spam.

## 🗑️ 3. Ephemeral Alpha Calibration Lifecycle (Auto-Deletion)
During the **Alpha v3.0 Mobile Hardware Compatibility Study** (`https://beuofdbak.vercel.app/`):
- Only anonymous mathematical aggregates (e.g., camera FPS, normalized pupil-to-iris ratio mean/SD, and general lighting category) are evaluated to determine which smartphone camera sensors support sub-millimeter pupillometry.
- **Automatic Data Deletion**: Immediately after hardware compatibility verification, calibration test records are purged and are never retained as personal profiles.

---

# אמנת פרטיות, סודיות ומחיקת מידע אוטומטית (עברית)

1. **עיבוד מקומי מלא (On-Device 100%)**: כל ניתוח התמונה מהמצלמה מתבצע מקומית בדפדפן שלך בלבד. שום תמונה או וידאו אינם נשמרים או נשלחים לשרת.
2. **אפס טרגוט ואפס ספאם**: איננו מתרגטים משתמשים, איננו אוספים מידע אישי מזהה, ולא יישלח אליכם שום דיוור, מייל או ספאם.
3. **מחיקת מידע אוטומטית**: הנתונים המתמטיים משמשים אך ורק לבדיקת תאימות דגם המצלמה בנייד — ולאחר בדיקת התוצאות המידע נמחק לחלוטין ואינו נשמר.

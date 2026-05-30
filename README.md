# 🎬 Subtitle Translator with Google Gemini AI (SRT / YouTube)
### فارق‌العاده شکیل، منعطف و فوق‌العاده دقیق با مهندسی امیرعلی دانا

[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Engine](https://img.shields.io/badge/API-Google%20Gemini%20AI-orange?style=for-the-badge&logo=google-gemini)](https://ai.google.dev/)
[![Server](https://img.shields.io/badge/Backend-Node%2FExpress%20v5-green?style=for-the-badge&logo=express)](https://expressjs.com)
[![Styling](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)

یک ابزار ابری پیشرفته، مینیمال و کاملاً پایدار برای ترجمه خودکار و هوشمند فایل‌های زیرنویس (`.srt`) و یوتیوب. این پروژه با بهره‌گیری از **SDK رسمی و نوین هوش مصنوعی گوگل جمینای** روی سرور مستقل امن پیاده‌سازی شده تا تمامی درخواست‌ها بدون فاش شدن کلیدهای دسترسی پردازش شده و بهترین لحن طبیعی گفتار را خروجی دهد.

This is a comprehensive, production-grade translation workstation for SRT subtitle documents and direct YouTube English video captions. Fully engineered with React, Express, and Google Gemini 3.5 models. It employs an intelligent context-aware batching algorithm to deliver natural, human-sounding translation outputs rather than robotic word-for-word substitutions.

---

## 🗺️ منوی دسترسی سریع / Quick Navigation
* [ویژگی‌های متمایز پروژه‌ (Persian)](#-ویژگیهای-متمایز-پروژه)
* [راهنمای جامع کاربری (Persian)](#-راهنمای-کاربری-گامبهگام)
* [دستورات راه‌اندازی و استفاده اختصاصی (Persian)](#-راهنمای-راهاندازی-توسعه-دهندگان)
* [Key Architecture Highlights (English)](#-key-features)
* [Developer Setup & Instructions (English)](#-installation--local-developer-setup)

---

## 🌟 ویژگی‌های متمایز پروژه

### ۱. بخش‌بندی هوشمند کانتکسباف (Intelligent Subtitle Batching)
ترجمه خط به خط زیرنویس‌ها باعث از بین رفتن لحن و اشتباهات فاحش دستوری می‌شود. این موتور زیرنویس‌ها را به شکل دسته‌های هوشمند مستقلِ ۲۰تایی تقسیم کرده و با ارسال متن‌های همجوار به عنوان کانتکستِ معنایی به جمینای، انسجام داستانی گفتگوها را کاملاً حفظ می‌کند.

### ۲. دریافت‌کننده خودکار کپشن یوتیوب (YouTube Captions Downloader)
تنها با وارد کردن لینک ویدیو یوتیوب، کپشن‌های اصلی استخراج، پارس و در قالب استاندارد SRT به سیستم تزریق می‌شوند تا بدون بارگذاری دستی فایل، عملیات ترجمه آغاز شود.

### ۳. کارگاه ترجمه دو ستونه زنده (Aesthetic Workstation Grid)
پس از آغاز ترجمه، پنل وورک‌اسپیس به صورت دو ستونه (متن اصلی در کنار متن ترجمه‌شده) ردیف‌ها را تطبیق می‌دهد. شما می‌توانید با دابل کلیک روی هر خط، ترجمه را به دلخواه بهبود داده یا ویرایش کنید.

### ۴. سازگاری صددرصدی با استانداردهای SRT
موتور پارسر پروژه تمامی کدهای زمانی فریم‌ها (شامل میلی‌ثانیه‌ها مثل `00:01:23,450`) و توالی اندیس‌ها را به صورت بی نقص خروجی داده و در فایل نهایی محافظت می‌کند.

---

## 💡 راهنمای کاربری گام‌به‌گام

1. **بارگذاری مستندات**: فایل زیرنویس `.srt` خود را در پنل بکشید و رها کنید، یا به صورت مستقیم متن پاراگراف‌ها را کپی نمایید. همچنین می‌توانید لینک مستقیم یوتیوب را وارد کنید تا متن انگلیسی دریافت شود.
2. **انتخاب زبان مقصد**: زبان نهایی (مثلاً فارسی) را تنظیم کنید.
3. **تنظیم دستورالعمل سفارشی (Custom Instructions)**: می‌توانید به هوش مصنوعی لحن بدهید. به عنوان مثال: *"فقط از اصطلاحات عامیانه و صمیمی استفاده کن"* یا *"لحن ترجمه بسیار رسمی و کتابی باشد"*.
4. **انتخاب مدل مناسب**: مدل فوق‌العاده پرسرعت و بهینه‌ی **Gemini 3.5 Flash** به صورت پیش‌فرض برای دستیابی به بهترین خروجیِ باکیفیت و سریع قرار گرفته است.
5. **شروع ترجمه و خروجی**: دکمه ترجمه را بزنید، پیشروی کار کارگاه را ببینید و در پایان روی دکمه **"دانلود فایل ترجمه‌شده"** کلیک کنید تا زیرنویس نهایی دانلود شود.

---

## 🛠️ راهنمای راه‌اندازی توسعه دهندگان
اگر می‌خواهید این سیستم را روی کدهای اختصاصی یا لوکال اجرای خود بالا بیاورید، مراحل زیر را کپی نمایید.

### پیش نیازها
* نسخه پایدار `Node.js` (ترجیحاً ۱۸ به بالا)

### ۱. شبیه‌سازی گیت هاب
```bash
git clone https://github.com/amirali-mini-hunter/Subtitle-translator-with-artificial-intelligence.git
cd Subtitle-translator-with-artificial-intelligence
```

### ۲. نصب بسته‌ها
```bash
npm install
```

### ۳. ثبت کلید دسترسی گوگل جمینای
یک فایل متنی به نام `.env` در ریشه‌ی پروژه بسازید و کلید دریافتی خود را درون آن ثبت کنید:
```env
# .env
GEMINI_API_KEY=AIzaSyYourSecretAPIKeyFromGoogleAIStudio
```

### ۴. اجرای زنده در بستر محلی
```bash
npm run dev
```
سپس مرورگر خود را باز کرده و وارد آدرس `http://localhost:3000` شوید. پروژه کاملاً پایدار و آماده به سرویس‌دهی است!

---

## 🇬🇧 KEY FEATURES & CAPABILITIES

* **Context-Driven Translation**: Avoids simple keyword replacement. Subtitles are parsed, grouped with adjacent lines for contextual continuity, and translated as fluid conversations.
* **Direct YouTube Scraping Integration**: Simply provide a YouTube video Link, and our pipeline directly retrieves, standardizes, and populates subtitles.
* **Dual-Pane Interactive Grid**: View original tracks aligned perfectly with translations. Allows you to double-click and make micro-edits instantly before saving.
* **SRT Metadata Preservation**: Strictly structures timestamps and index sequences, retaining accurate millisecond synchronization with video frames.
* **Secure Enterprise Architecture**: All client API queries go through a secure Express proxied server route inside `server.ts` to fully isolate and shield your developer secret `GEMINI_API_KEY` from unauthorized browser inspection.

---

## 🛠️ INSTALLATION & LOCAL DEVELOPER SETUP

Follow these precise sequential commands to test and service this web application locally on your workstation:

### 1. Clone the repository:
```bash
git clone https://github.com/amirali-mini-hunter/Subtitle-translator-with-artificial-intelligence.git
cd Subtitle-translator-with-artificial-intelligence
```

### 2. Configure dependencies:
```bash
npm install
```

### 3. Register your API credentials:
Create a `.env` file in the root environment and set your unique Google token:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Boot up development server:
```bash
npm run dev
```

Your workstation dashboard is now active! Direct your local browser to:
`http://localhost:3000`

---

## 📦 Build & Production Bundle Compilation
To build the application for deployment or optimal container storage run:
```bash
npm run build
npm start
```
This triggers a native production bundling sequence: Vite compiles public-facing static assets, and `esbuild` constructs a robust server block within the `/dist` directory.

---
⚡ **Engineered with architectural perfection and care by [Amirali](https://github.com/amirali-mini-hunter)**. Star this repository if you love this implementation!

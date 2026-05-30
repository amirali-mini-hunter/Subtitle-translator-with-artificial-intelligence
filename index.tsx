
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import clsx from 'clsx';
import { translateTextBatch } from './services/geminiService';

// Note: JSZip is imported in index.html via esm.sh, so it's available globally if needed.

// ============== From types.ts ==============
interface SubtitleEntry {
  id: string;
  originalId?: string;
  startTime: string;
  endTime: string;
  text: string;
}

interface Language {
  code: string;
  name:string;
}

type Theme = 'light' | 'dark';
type UILanguage = 'en' | 'fa';

interface AppTextDefinition {
  [key: string]: string | ((...args: any[]) => string) | AppTextDefinition;
}

// ============== From constants.ts ==============
const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'fa', name: 'فارسی (Persian)' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español (Spanish)' },
  { code: 'fr', name: 'Français (French)' },
  { code: 'de', name: 'Deutsch (German)' },
  { code: 'it', name: 'Italiano (Italian)' },
  { code: 'pt', name: 'Português (Portuguese)' },
  { code: 'ja', name: '日本語 (Japanese)' },
  { code: 'ko', name: '한국어 (Korean)' },
  { code: 'zh-CN', name: '简体中文 (Chinese, Simplified)' },
  { code: 'zh-TW', name: '繁體中文 (Chinese, Traditional)' },
  { code: 'ar', name: 'العربية (Arabic)' },
  { code: 'hi', name: 'हिन्दी (Hindi)' },
  { code: 'ru', name: 'Русский (Russian)' },
  { code: 'tr', name: 'Türkçe (Turkish)' },
  { code: 'nl', name: 'Nederlands (Dutch)' },
  { code: 'sv', name: 'Svenska (Swedish)' },
  { code: 'pl', name: 'Polski (Polish)' },
];

const DEFAULT_TARGET_LANGUAGE_CODE = 'fa';
const RECOMMENDED_TEMPERATURE = 0.4;
const RECOMMENDED_BATCH_SIZE = 20;
const RECOMMENDED_IS_FLUENT = true;


const UI_LANGUAGES: { code: UILanguage, name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'fa', name: 'فارسی' },
];

const AppTexts: Record<UILanguage, AppTextDefinition> = {
  en: {
    appName: "Amirali AI Subtitle Translator",
    header: {
      title: "Amirali AI Subtitle Translator",
      searchPlaceholder: "Search subtitles...",
      profileAlt: "Profile",
      profileText: "Amirali",
      toggleTheme: "Toggle Theme",
      toggleLanguage: "Toggle Language",
    },
    controlPanel: {
      fileInputGroup: "File Input",
      uploadSrt: "Upload SRT File",
      selectedFile: (name: string) => `Selected: ${name}`,
      removeFile: "Remove File",
      dropOrClick: "Drag & drop .SRT file or click to select",
      srtFilesOnly: "SRT files only",
      textInputGroup: "Text Input",
      pasteSrt: "Paste SRT Content",
      srtPlaceholder: "Paste your SRT content here...",
      youtubeInputGroup: "YouTube Input",
      youtubeUrl: "YouTube Video URL",
      youtubePlaceholder: "https://www.youtube.com/watch?v=...",
      fetchYoutube: "Fetch Subtitles",
      inputMethod: "Input Method",
      methodFile: "File",
      methodText: "Text",
      methodYoutube: "YouTube",
      settingsGroup: "Translation Settings",
      geminiModelLabel: "Gemini AI Model:",
      modelFlash: "Gemini 3.5 Flash (General & Balanced)",
      modelLite: "Gemini 3.1 Flash Lite (Fastest & Cheaper)",
      modelPro: "Gemini 3.1 Pro Preview (Best Translation / Paid)",
      targetLanguage: "Translate to:",
      temperature: "Creativity (Temperature):",
      batchSize: "Batch Size (lines per request):",
      customPrompt: "Custom Prompt (Optional):",
      customPromptPlaceholder: "e.g., Translate in a formal tone.",
      fluentTranslation: "Fluent & Natural Translation",
      actionsGroup: "Actions",
      translate: "Translate",
      stop: "Stop",
      download: "Download Translated File",
      progress: "Progress",
      applyRecommendedSettings: "Apply Recommended Settings",
      recommendedSettingsNote: "Recommended: Temp 0.4, Batch 20, Fluent On. Good for general use.",
      recommendedSettingsApplied: "Recommended settings applied!",
      startFromLine: "Start Translation From Line:",
      resetStartLine: "Reset to Start (Line 1)",
      resumeTranslate: "Resume Translation",
      translateFromLine: (count: number) => `Translate (from line ${count})`,
      resumeFromLine: (count: number) => `Resume (from line ${count})`,
      tooltips: {
        temperature: "Controls creativity. Lower values (e.g., 0.2) are more literal and precise, higher values (e.g., 0.8) are more imaginative. Recommended: 0.4 for balanced translation.",
        batchSize: "Number of subtitle lines processed in each API request. Smaller batches (e.g., 5) can be slower but might offer better context for very short/isolated lines. Larger batches (e.g., 20-30) are faster. Recommended: 20.",
        customPrompt: "Provide specific instructions to the AI to override the default translation behavior. For example, you can specify tone, style, or how to handle certain terms.",
        fluentTranslation: "Enables a translation mode focused on natural flow and readability in the target language. It might rephrase sentences more freely than the default mode to sound more human-like. Recommended: On.",
        startFromLine: "Specify the line number in the original subtitles from which to begin or resume translation. Resets to 1 when a new file is loaded.",
        geminiModel: "Select which Google Gemini model to use for translating. Flash is fast and high quality; Flash Lite is lightweight and low-latency; Pro is highly precise for complex texts, but requires a paid API key.",
      }
    },
    editorPanel: {
      title: "Subtitle Editor",
      originalSubtitles: "Original Subtitles",
      translatedSubtitles: "Translated Subtitles",
      emptyState: "Load an SRT file or paste content to see subtitles here. Translated subtitles will appear after processing.",
      searchNoResults: "No results found for your search query.",
      id: "ID",
      time: "Time",
      text: "Text",
      textEmpty: "(text empty)",
      editText: "Edit text"
    },
    footer: {
      copyright: (year: number) => `© ${year} Amirali. All rights reserved. Version 1.2.0`,
      apiKeyNote: "Translation powered by Google Gemini AI.",
    },
    readingFile: "Reading file...",
    parsingSRT: "Parsing SRT content...",
    errorFileEmpty: "File content is empty.",
    errorNoSubtitlesFound: "No subtitles found in the file or invalid SRT format.",
    errorNoSubtitlesFoundInText: "No subtitles found in the pasted text or invalid SRT format.",
    errorProcessingFile: "Failed to process file.",
    errorReadingFile: "Failed to read file.",
    errorParsingSRTText: "Failed to parse SRT text.",
    parseSuccess: (count: number) => `Successfully parsed ${count} subtitle entries.`,
    fileRemoved: "File removed.",
    youtubeProvideUrl: "Please provide a YouTube URL.",
    youtubeFetching: "Fetching YouTube subtitles...",
    youtubeInvalidUrl: "Invalid YouTube URL.",
    youtubeSrtFormatFetchFailed: (status: number | string) => `Failed to fetch subtitles. The service responded with status ${status}. The video might not have English SRT subtitles, or the service is temporarily down.`,
    youtubeNetworkError: "Could not fetch YouTube subtitles due to a network issue or browser security restrictions (CORS). Client-side fetching can be unreliable. Please try again or use a different input method.",
    youtubeFetchFailedGeneric: "An error occurred while fetching YouTube subtitles. This feature can be unreliable.",
    youtubeNoSubtitlesFound: "No English subtitles in SRT format were found for this video via the external service.",
    youtubeSubtitlesFetched: "YouTube subtitles fetched and loaded.",
    errorNoSubtitlesToTranslate: "No subtitles to translate. Please upload or paste a valid SRT file.",
    errorInvalidTargetLanguage: "Invalid target language selected.",
    translatingBatch: (current: number, total: number, start: number, end: number) => `Translating batch ${current} of ${total} (lines ${start}-${end})...`,
    translationStopped: "Translation stopped by user.",
    translationComplete: "Translation complete!",
    errorTranslationFailed: "An unknown error occurred during translation.",
    errorWebhookFailed: "The webhook request failed. Please check your n8n service and URL.",
    errorWebhookUrlInvalid: "Please enter a valid n8n webhook URL.",
    stoppingTranslation: "Stopping translation...",
    errorNoTranslatedSubtitles: "No translated subtitles to download.",
    translatedFileDefaultName: "subtitles",
    translatedSuffix: "translated",
    translatedFileDownloaded: "Translated file downloaded.",
    errorDownloadFailed: "Failed to prepare translated file for download.",
    defaultTranslationPrompt: "You are a highly skilled and friendly professional subtitle translator. Your mission is to translate the provided subtitle text accurately and naturally into the target language, adopting a professional yet approachable tone. It's crucial to maintain the original meaning, nuance, and context of the dialogue. Each translated line must be concise and perfectly suited for on-screen display. Please provide ONLY the translated lines, corresponding to each original line, without any extra comments, explanations, numbering, or markdown formatting.",
    fluentTranslationPrompt: "You are an expert subtitle translator specializing in fluent, natural-sounding translations for video content. Translate the given subtitle text into the target language, prioritizing readability and natural flow over literal accuracy if necessary. Ensure the translation captures the essence, emotion, and style of the original dialogue. Each line must be concise and display well on screen. Do not add any extra comments, explanations, or markdown."
  },
  fa: {
    appName: "مترجم زیرنویس امیرعلی",
    header: {
      title: "مترجم زیرنویس امیرعلی",
      searchPlaceholder: "جستجو در زیرنویس‌ها...",
      profileAlt: "پروفایل",
      profileText: "امیرعلی",
      toggleTheme: "تغییر پوسته",
      toggleLanguage: "تغییر زبان",
    },
    controlPanel: {
      fileInputGroup: "ورودی فایل",
      uploadSrt: "بارگذاری فایل SRT",
      selectedFile: (name: string) => `انتخاب شده: ${name}`,
      removeFile: "حذف فایل",
      dropOrClick: "فایل SRT را اینجا بکشید یا برای انتخاب کلیک کنید",
      srtFilesOnly: "فقط فایل‌های SRT",
      textInputGroup: "ورودی متن",
      pasteSrt: "چسباندن محتوای SRT",
      srtPlaceholder: "محتوای SRT خود را اینجا بچسبانید...",
      youtubeInputGroup: "ورودی یوتیوب",
      youtubeUrl: "آدرس ویدیوی یوتیوب:",
      youtubePlaceholder: "https://www.youtube.com/watch?v=...",
      fetchYoutube: "دریافت زیرنویس",
      inputMethod: "روش ورودی:",
      methodFile: "فایل",
      methodText: "متن",
      methodYoutube: "یوتیوب",
      settingsGroup: "تنظیمات ترجمه",
      geminiModelLabel: "مدل هوش مصنوعی گوگل جمینای:",
      modelFlash: "جمینای ۳.۵ فلاش (پیش‌فرض پیشنهادی)",
      modelLite: "جمینای ۳.۱ فلاش لایت (فوق‌سریع و اقتصادی)",
      modelPro: "جمینای ۳.۱ پرو پیش‌نمایش (ترجمه فوق پیشرفته / تجاری)",
      targetLanguage: "ترجمه به:",
      temperature: "خلاقیت (دما):",
      batchSize: "حجم هر بخش (خط در هر درخواست):",
      customPrompt: "دستورالعمل سفارشی (اختیاری):",
      customPromptPlaceholder: "مثال: با لحنی رسمی ترجمه کن.",
      fluentTranslation: "ترجمه روان و طبیعی",
      actionsGroup: "عملیات",
      translate: "ترجمه",
      stop: "توقف",
      download: "دانلود فایل ترجمه‌شده",
      progress: "پیشرفت",
      applyRecommendedSettings: "اعمال تنظیمات پیشنهادی",
      recommendedSettingsNote: "پیشنهادی: خلاقیت ۰.۴، حجم بخش ۲۰، ترجمه روان فعال. مناسب برای استفاده عمومی.",
      recommendedSettingsApplied: "تنظیمات پیشنهادی اعمال شد!",
      startFromLine: "شروع ترجمه از خط:",
      resetStartLine: "بازنشانی به شروع (خط ۱)",
      resumeTranslate: "ادامه ترجمه",
      translateFromLine: (count: number) => `ترجمه (از خط ${count})`,
      resumeFromLine: (count: number) => `ادامه (از خط ${count})`,
      tooltips: {
        temperature: "میزان خلاقیت در ترجمه را کنترل می‌کند. مقادیر کمتر (مثلاً ۰.۲) ترجمه‌ای دقیق‌تر و تحت‌اللفظی‌تر ارائه می‌دهند، در حالی که مقادیر بالاتر (مثلاً ۰.۸) منجر به ترجمه‌ای خلاقانه‌تر و با تغییرات بیشتر می‌شوند. مقدار پیشنهادی: ۰.۴ برای تعادل مناسب.",
        batchSize: "تعداد خطوط زیرنویس که در هر درخواست به سرویس ترجمه ارسال می‌شود. بخش‌های کوچک‌تر (مثلاً ۵ خط) ممکن است کندتر باشند اما برای خطوط بسیار کوتاه یا جدا از هم، زمینه بهتری فراهم کنند. بخش‌های بزرگ‌تر (مثلاً ۲۰-۳۰ خط) سریع‌تر هستند. مقدار پیشنهادی: ۲۰.",
        customPrompt: "می‌توانید دستورالعمل‌های خاص خود را برای هوش مصنوعی بنویسید تا رفتار پیش‌فرض ترجمه را تغییر دهد. مثلاً می‌توانید لحن، سبک، یا نحوه برخورد با اصطلاحات خاصی را مشخص کنید.",
        fluentTranslation: "این گزینه حالتی از ترجمه را فعال می‌کند که بر روانی و طبیعی بودن کلام در زبان مقصد تمرکز دارد. ممکن است جملات را آزادانه‌تر بازنویسی کند تا به گفتار انسانی شبیه‌تر شود. پیشنهاد می‌شود این گزینه فعال باشد.",
        startFromLine: "شماره خط در زیرنویس اصلی که ترجمه از آن شروع یا ادامه یابد را مشخص کنید. با بارگذاری فایل جدید، به ۱ بازنشانی می‌شود.",
        geminiModel: "مدل هوش مصنوعی گوگل جمینای را برای ترجمه انتخاب کنید. مدل فلاش سریع و باکیفیت است، فلاش لایت فوق‌سریع و سبک است و پرو برای ترجمه‌های دقیق و جملات تخصصی مناسب‌ترین گزینه است.",
      }
    },
    editorPanel: {
      title: "ویرایشگر زیرنویس",
      originalSubtitles: "زیرنویس اصلی",
      translatedSubtitles: "زیرنویس ترجمه‌شده",
      emptyState: "یک فایل SRT بارگذاری کنید یا محتوا را بچسبانید تا زیرنویس‌ها اینجا نمایش داده شوند. زیرنویس‌های ترجمه‌شده پس از پردازش ظاهر می‌شوند.",
      searchNoResults: "نتیجه‌ای برای جستجوی شما یافت نشد.",
      id: "شناسه",
      time: "زمان",
      text: "متن",
      textEmpty: "(متن خالی)",
      editText: "ویرایش متن"
    },
    footer: {
      copyright: (year: number) => `© ${year} امیرعلی. تمام حقوق محفوظ است. نسخه ۱.۲.۰`,
      apiKeyNote: "ترجمه توسط هوش مصنوعی گوگل جمینای انجام می‌شود.",
    },
    readingFile: "در حال خواندن فایل...",
    parsingSRT: "در حال تجزیه محتوای SRT...",
    errorFileEmpty: "محتوای فایل خالی است.",
    errorNoSubtitlesFound: "هیچ زیرنویسی در فایل یافت نشد یا فرمت SRT نامعتبر است.",
    errorNoSubtitlesFoundInText: "هیچ زیرنویسی در متن چسبانده شده یافت نشد یا فرمت SRT نامعتبر است.",
    errorProcessingFile: "خطا در پردازش فایل.",
    errorReadingFile: "خطا در خواندن فایل.",
    errorParsingSRTText: "خطا در تجزیه متن SRT.",
    parseSuccess: (count: number) => `با موفقیت ${count} ورودی زیرنویس تجزیه شد.`,
    fileRemoved: "فایل حذف شد.",
    youtubeProvideUrl: "لطفاً آدرس یوتیوب را وارد کنید.",
    youtubeFetching: "در حال دریافت زیرنویس از یوتیوب...",
    youtubeInvalidUrl: "آدرس یوتیوب نامعتبر است.",
    youtubeSrtFormatFetchFailed: (status: number | string) => `دریافت زیرنویس ناموفق بود. سرویس با وضعیت ${status} پاسخ داد. ممکن است ویدیو زیرنویس انگلیسی با فرمت SRT نداشته باشد یا سرویس موقتاً در دسترس نباشد.`,
    youtubeNetworkError: "به دلیل مشکل شبکه یا محدودیت‌های امنیتی مرورگر (CORS)، امکان دریافت زیرنویس یوتیوب وجود ندارد. دریافت از سمت کاربر می‌تواند ناپایدار باشد. لطفاً دوباره تلاش کنید یا از روش ورودی دیگری استفاده نمایید.",
    youtubeFetchFailedGeneric: "خطایی هنگام دریافت زیرنویس یوتیوب رخ داد. این قابلیت ممکن است ناپایدار باشد.",
    youtubeNoSubtitlesFound: "زیرنویس انگلیسی با فرمت SRT برای این ویدیو از طریق سرویس خارجی یافت نشد.",
    youtubeSubtitlesFetched: "زیرنویس یوتیوب دریافت و بارگذاری شد.",
    errorNoSubtitlesToTranslate: "زیرنویسی برای ترجمه وجود ندارد. لطفاً یک فایل SRT معتبر بارگذاری یا بچسبانید.",
    errorInvalidTargetLanguage: "زبان مقصد انتخاب‌شده نامعتبر است.",
    translatingBatch: (current: number, total: number, start: number, end: number) => `در حال ترجمه بخش ${current} از ${total} (خطوط ${start}-${end})...`,
    translationStopped: "ترجمه توسط کاربر متوقف شد.",
    translationComplete: "ترجمه کامل شد!",
    errorTranslationFailed: "خطای ناشناخته‌ای در حین ترجمه رخ داد.",
    errorWebhookFailed: "درخواست وبهوک ناموفق بود. لطفاً سرویس n8n و آدرس خود را بررسی کنید.",
    errorWebhookUrlInvalid: "لطفاً یک آدرس وبهوک n8n معتبر وارد کنید.",
    stoppingTranslation: "در حال توقف ترجمه...",
    errorNoTranslatedSubtitles: "زیرنویس ترجمه‌شده‌ای برای دانلود وجود ندارد.",
    translatedFileDefaultName: "زیرنویس",
    translatedSuffix: "ترجمه‌شده",
    translatedFileDownloaded: "فایل ترجمه‌شده دانلود شد.",
    errorDownloadFailed: "خطا در آماده‌سازی فایل ترجمه‌شده برای دانلود.",
    defaultTranslationPrompt: "شما یک مترجم زیرنویس بسیار ماهر، خونگرم و حرفه‌ای هستید. وظیفه شما این است که متن زیرنویس ارائه‌شده را با لحنی صمیمی، روان و کاملاً حرفه‌ای به زبان فارسی ترجمه کنید. ترجمه باید به گونه‌ای باشد که انگار یک انسان آن را نوشته، نه یک ربات. بسیار مهم است که معنای اصلی، ظرافت‌ها، لحن و زمینه گفتگو حفظ شود. هر خط ترجمه‌شده باید کوتاه، واضح و کاملاً مناسب برای نمایش روی صفحه باشد.\n\nدر مورد کلمات انگلیسی:\n1.  برای اصطلاحات فنی بسیار رایج و شناخته‌شده در جامعه فارسی‌زبان که کاربران با شکل انگلیسی آن‌ها آشناتر هستند (مانند `API`، `URL`، `AI`، `SDK`، `OS`، و دستورات رایج خط فرمان مانند `sudo`، `git`، `docker`)، لطفاً از **شکل اصلی انگلیسی** آن‌ها استفاده کنید. این اصطلاحات باید به طور طبیعی و با رعایت کامل ساختار دستوری زبان فارسی در جمله گنجانده شوند.\n2.  برای سایر کلمات انگلیسی (مانند نام‌های تجاری عمومی‌تر که معادل فارسی رایجی ندارند، نام شخصیت‌ها، یا مفاهیمی که به خط فارسی رایج شده‌اند)، آن‌ها را به خط فارسی بنویسید (مثلاً Google به گوگل، Apple به اپل).\n\nدر هر دو حالت، اطمینان حاصل کنید که جمله کاملاً ساختار فارسی خود را حفظ کرده و به طور طبیعی (راست به چپ) خوانده شود. از ایجاد ساختارهای جمله‌ای که حس «فینگلیش» یا ترجمه تحت‌اللفظی از انگلیسی را القا می‌کنند، پرهیز کنید. هدف، یک ترجمه فارسی روان، طبیعی و حرفه‌ای است. لطفاً فقط خطوط ترجمه‌شده را، متناظر با هر خط اصلی، بدون هیچ‌گونه توضیحات اضافی، شماره‌گذاری یا قالب‌بندی مارک‌داون ارائه دهید.",
    fluentTranslationPrompt: "شما یک مترجم زیرنویس خبره هستید که در ارائه ترجمه‌های بسیار روان، طبیعی و خودمانی برای محتوای ویدیویی تخصص دارید. متن زیرنویس داده‌شده را به زبان فارسی ترجمه کنید، به طوری که انگار یک فارسی‌زبان بومی آن را بیان می‌کند – کاملاً طبیعی و دور از هرگونه حالت ماشینی یا رباتیک. در صورت لزوم، خوانایی، حس و حال واقعی گفتگو و جریان طبیعی کلام را بر دقت تحت‌اللفظی اولویت دهید. اطمینان حاصل کنید که ترجمه، جوهره، احساسات و سبک گفتگوی اصلی را به بهترین شکل منتقل می‌کند. هر خط باید مختصر بوده و به خوبی روی صفحه نمایش داده شود.\n\nدر مورد کلمات انگلیسی:\n1.  برای اصطلاحات فنی بسیار رایج و شناخته‌شده که در جامعه فارسی‌زبان با شکل انگلیسی‌شان مصطلح هستند (مانند `API`، `URL`، `AI`، `SDK`، `OS`، `sudo`، `git`)، **شکل اصلی انگلیسی** را حفظ کنید، اما آن‌ها را در یک جمله با ساختار کاملاً فارسی و روان به کار ببرید.\n2.  برای سایر کلمات انگلیسی (نام‌های تجاری که به فارسی نوشته می‌شوند، یا مفاهیمی که معادل فارسی جاافتاده ندارند)، آن‌ها را به خط فارسی بنویسید (مثلاً Google به گوگل).\n\nدر همه حال، جمله باید کاملاً روان، با ساختار صحیح فارسی (راست به چپ) و طبیعی باشد. از به‌کارگیری ساختارهای انگلیسی‌مآبانه که به فارسی طبیعی نیستند، جداً خودداری کنید. هیچ نظر، توضیح یا علامت اضافی اضافه نکنید."
  },
};

// ============== From utils/subtitleParser.ts ==============
const parseSrt = (srtContent: string): SubtitleEntry[] => {
  const entries: SubtitleEntry[] = [];
  const blocks = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    let id: string;
    let timeLine: string;
    let textLines: string[];
    let originalIdCandidate: string | undefined = undefined;

    if (/^\d+$/.test(lines[0].trim()) && lines.length >=3 && /^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(lines[1].trim())) {
      originalIdCandidate = lines[0].trim();
      id = (entries.length + 1).toString(); // Internal consistent ID
      timeLine = lines[1].trim();
      textLines = lines.slice(2).map(line => line.trim());
    }
    else if (/^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(lines[0].trim()) && lines.length >=2) {
      id = (entries.length + 1).toString(); // Internal consistent ID
      timeLine = lines[0].trim();
      textLines = lines.slice(1).map(line => line.trim());
    }
    else {
      continue;
    }

    // if (textLines.join('').trim() === '') continue; // Allow empty text lines to preserve numbering

    const timeMatch = timeLine.match(/^(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
    if (timeMatch) {
      entries.push({
        id,
        originalId: originalIdCandidate,
        startTime: timeMatch[1].replace('.',','),
        endTime: timeMatch[2].replace('.',','),
        text: textLines.join('\n'),
      });
    }
  }
  return entries;
};

const stringifySrt = (subtitles: SubtitleEntry[]): string => {
  return subtitles
    .map((entry, index) => {
      const outputId = (index + 1).toString();
      return `${outputId}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}\n\n`;
    })
    .join('')
    .trim();
};

// ============== From services/geminiService.ts ============== (Content handled by separate file change)

// ============== From components/IconComponents.tsx ==============
interface IconProps {
  className?: string;
  strokeWidth?: number;
}

const DownloadIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const TranslateIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
  </svg>
);

const UploadCloudIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
  </svg>
);

const FileTextIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const LanguageIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21L5.25-9M10.5 21H3M10.5 3L12 3m0 0l1.5 9M10.5 3v9.75m-3.75 8.25h15M16.5 3.75h3.75M16.5 3.75h-3.75M16.5 3.75L15 3m1.5.75v3.75m0 0L13.5 12m2.25-8.25L12 12m0 0L9.75 12M12 12 9 3.75M12 12l3 9m-3-9-3 9" />
  </svg>
);

const InfoIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
  </svg>
);

const AlertTriangleIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const CheckCircleIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PlayIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
  </svg>
);

const StopIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
  </svg>
);

const CogIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.414 1.414M6.096 7.523l1.414-1.414M16.5 3.077l1.414 1.414m0 9.18l-1.414 1.414M12 6.375v3.375m0 3.375v3.375m0-3.375H9.375m3.375 0h3.375M12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
  </svg>
);

const ChevronDownIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const ChevronUpIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
  </svg>
);

const ThemeIcon: React.FC<IconProps & {isDark: boolean}> = ({ className, strokeWidth = 1.5, isDark }) => (
 isDark ? (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  )
);

const GithubIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={`w-5 h-5 ${className}`}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 16.4179 4.86538 20.1651 8.83984 21.4883C9.34 21.5801 9.52 21.2721 9.52 21.0022C9.52 20.7623 9.51031 19.98 9.51031 19.1396C7.00031 19.6196 6.35031 18.4996 6.15031 17.9396C6.04031 17.6596 5.56031 16.7796 5.14031 16.5396C4.79031 16.3496 4.29031 15.8896 5.13031 15.8796C5.93031 15.8696 6.50031 16.6096 6.69031 16.9096C7.60031 18.4496 9.06031 18.0096 9.64031 17.7496C9.73031 17.0896 10.0003 16.6396 10.3003 16.3796C8.04031 16.1196 5.68031 15.2396 5.68031 11.3396C5.68031 10.2296 6.07031 9.31962 6.72031 8.60962C6.62031 8.34962 6.27031 7.30962 6.82031 5.90962C6.82031 5.90962 7.67031 5.63962 9.61031 6.94962C10.4203 6.72962 11.2803 6.61962 12.1403 6.61962C13.0003 6.61962 13.8603 6.72962 14.6703 6.94962C16.6103 5.62962 17.4603 5.90962 17.4603 5.90962C18.0103 7.30962 17.6603 8.34962 17.5603 8.60962C18.2103 9.31962 18.6003 10.2196 18.6003 11.3396C18.6003 15.2496 16.2303 16.1196 13.9703 16.3696C14.3403 16.6896 14.6603 17.3096 14.6603 18.2696C14.6603 19.6396 14.6503 20.7423 14.6503 21.0822C14.6503 21.3521 14.8303 21.6701 15.3403 21.5683C19.3031 20.2451 22.0003 16.4879 22.0003 12.0003C22.0003 6.47715 17.5228 2 12 2Z" />
  </svg>
);

const GitBranchIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l3-3m-3 3l-3-3m4.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
);

const StarIcon: React.FC<IconProps & { filled?: boolean }> = ({ className, strokeWidth = 1.5, filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className} ${filled ? 'text-yellow-500' : ''}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.195-.39.757-.39.952 0l2.25 4.562 5.038.732c.433.063.606.596.293.904l-3.646 3.553.86 5.016c.074.433-.381.764-.764.559L12 16.142l-4.516 2.378c-.383.205-.838-.13-.764-.559l.861-5.016-3.647-3.553c-.31-.308-.138-.84.293-.904l5.039-.732 2.25-4.562z" />
  </svg>
);

const GitForkIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM16.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM12 12.75V15m0 0h-.008v-.008H12v.008zm0-7.5V6.75m0 0V3m0 3.75h.008v-.008H12v.008zm-4.5 9h9" />
  </svg>
);

const FolderIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className} text-blue-400`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-19.5 0A2.25 2.25 0 004.5 15h15a2.25 2.25 0 002.25-2.25m-19.5 0v.25A2.25 2.25 0 004.5 17.5h15a2.25 2.25 0 002.25-2.25V14M2.25 9.75V8.25A2.25 2.25 0 014.5 6h2.25a2.25 2.25 0 011.664.733l1.536 1.767A2.25 2.25 0 0011.614 9h7.886A2.25 2.25 0 0121.75 11.25V12" />
  </svg>
);

const FileCodeIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className} text-gray-400`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12h5.25m-5.25 3h5.25m-1.875-10.5h.008v.008h-.008V6.75zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
  </svg>
);

const ClipboardIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0A2.25 2.25 0 0113.5 5.25h-3a2.25 2.25 0 01-2.167-1.362M15.666 3.888V18a2.25 2.25 0 01-2.25 2.25h-6A2.25 2.25 0 015.25 18V3.888m13.5 0a2.25 2.25 0 012.25 2.25v13.5a2.25 2.25 0 01-2.25 2.25h-1.5" />
  </svg>
);

const CheckIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const CodeIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
  </svg>
);

const IssueIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const GitPullRequestIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l3-3m-3 3l-3-3m4.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
);

const SearchIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const XCircleIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const FilmIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3.75V12M10.5 12V4.5m3 7.5V4.5m4.5 7.5V4.5M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5M3 3.75h18a1.5 1.5 0 011.5 1.5v13.5a1.5 1.5 0 01-1.5 1.5H3a1.5 1.5 0 01-1.5-1.5V5.25A1.5 1.5 0 013 3.75z" />
  </svg>
);

const PencilSquareIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const SparklesIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 7.5L17.437 4.654a4.5 4.5 0 00-3.09-3.09L11.5 1.5l-.813 2.846a4.5 4.5 0 00-3.09 3.09L4.75 7.5l2.846.813a4.5 4.5 0 003.09 3.09L11.5 14.25l.813-2.846a4.5 4.5 0 003.09-3.09L18.25 7.5z" />
  </svg>
);

const ArrowPathIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);


// ============== From components/ProgressBar.tsx ==============
interface ProgressBarProps {
  progress: number;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, className = '' }) => {
  const safeProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={clsx(`w-full bg-[var(--theme-input-bg)] rounded-full h-2.5 overflow-hidden`, className)}>
      <div
        className="bg-[var(--theme-accent-primary)] h-2.5 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${safeProgress}%` }}
        role="progressbar"
        aria-valuenow={safeProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      ></div>
    </div>
  );
};

// ============== From components/AlertMessage.tsx ==============
interface AlertMessageData {
  id: string;
  type: 'error' | 'info' | 'success' | 'warning';
  message: string;
}

interface AlertMessageProps extends AlertMessageData {
  onClose?: (id: string) => void;
}

const AlertMessage: React.FC<AlertMessageProps> = ({ id, type, message, onClose }) => {
  const baseClasses = "p-4 rounded-md flex items-start text-sm shadow-lg backdrop-blur-sm border";
  let typeClasses = "";
  let IconComponent;

  switch (type) {
    case 'error':
      typeClasses = "bg-[rgba(var(--theme-danger-rgb),0.2)] text-[var(--theme-danger)] border-[var(--theme-danger)]";
      IconComponent = AlertTriangleIcon;
      break;
    case 'success':
      typeClasses = "bg-[rgba(var(--theme-success-rgb),0.2)] text-[var(--theme-success)] border-[var(--theme-success)]";
      IconComponent = CheckCircleIcon;
      break;
    case 'warning':
      typeClasses = "bg-[rgba(var(--theme-warning-rgb),0.2)] text-[var(--theme-warning)] border-[var(--theme-warning)]";
      IconComponent = AlertTriangleIcon;
      break;
    case 'info':
    default:
      typeClasses = "bg-[rgba(var(--theme-info-rgb),0.2)] text-[var(--theme-accent-primary)] border-[var(--theme-accent-primary)]";
      IconComponent = InfoIcon;
      break;
  }

  if (!message) return null;

  return (
    <div className={`${baseClasses} ${typeClasses}`} role="alert">
      <IconComponent className="w-5 h-5 mr-3 rtl:ml-0 rtl:mr-3 flex-shrink-0" />
      <div className="flex-grow">{message}</div>
      {onClose && (
        <button
            onClick={() => onClose(id)}
            className="ml-4 rtl:mr-4 rtl:ml-0 p-1 -m-1 rounded-md hover:bg-[rgba(var(--theme-text-primary-rgb,255,255,255),0.1)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--theme-text-primary-rgb,255,255,255),0.2)] transition-colors"
            aria-label="Close"
        >
          <XIcon className="w-5 h-5" />
          <span className="sr-only">Close</span>
        </button>
      )}
    </div>
  );
};

// ============== From components/LoadingSpinner.tsx ==============
const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center">
      <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-[var(--theme-accent-primary)]"></div>
    </div>
  );
};

// ============== From components/ActionButton.tsx ==============
interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  className,
  variant = 'primary',
  icon,
  isLoading = false,
  disabled,
  ...props
}) => {
  const baseClasses = `flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-md
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-deep)]
                       transition-all duration-150 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none`;

  const variantClasses = {
    primary: 'bg-[var(--theme-accent-primary)] hover:bg-[var(--theme-accent-primary-hover)] text-white border-transparent focus:ring-[var(--theme-accent-primary)] shadow-[var(--theme-glow)] hover:shadow-lg hover:shadow-[var(--theme-accent-primary)]/50 disabled:bg-opacity-50 disabled:shadow-none',
    secondary: 'bg-transparent border-[var(--theme-border)] hover:bg-[var(--theme-accent-primary)] hover:text-white text-[var(--theme-text-primary)] focus:ring-[var(--theme-accent-primary)] hover:border-[var(--theme-accent-primary)] disabled:border-[var(--theme-border)] disabled:text-[var(--theme-text-secondary)] disabled:bg-transparent',
    danger: 'bg-[var(--theme-danger)] hover:opacity-80 text-white border-transparent focus:ring-[var(--theme-danger)] shadow-md shadow-[var(--theme-danger)]/40 hover:shadow-lg hover:shadow-[var(--theme-danger)]/60 disabled:bg-opacity-50 disabled:shadow-none',
  };


  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={clsx(baseClasses, variantClasses[variant], className)}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        icon && <span className={children ? "mr-2 rtl:ml-2 rtl:mr-0 -ml-1" : ""}>{icon}</span>
      )}
      {children}
    </button>
  );
};

// ============== From components/LanguageSelector.tsx ==============
interface LanguageSelectorProps {
  id?: string;
  languages: Language[];
  selectedLanguage: string;
  onLanguageChange: (langCode: string) => void;
  disabled?: boolean;
  className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  id,
  languages,
  selectedLanguage,
  onLanguageChange,
  disabled,
  className = "",
}) => {
  return (
    <select
      id={id}
      value={selectedLanguage}
      onChange={(e) => onLanguageChange(e.target.value)}
      disabled={disabled}
      className={clsx(`w-full p-2.5 border border-[var(--theme-border)] bg-[var(--theme-input-bg)] text-[var(--theme-text-primary)] rounded-md shadow-sm
                 focus:ring-2 focus:ring-[var(--theme-accent-primary)] focus:border-[var(--theme-accent-primary)]
                 transition-colors duration-200 ease-in-out
                 disabled:opacity-60 disabled:cursor-not-allowed`,
                 className)}
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code} className="bg-[var(--theme-input-bg)] text-[var(--theme-text-primary)]">
          {lang.name}
        </option>
      ))}
    </select>
  );
};

// ============== From components/FileUpload.tsx ==============
interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
  selectedFile: File | null;
  texts: AppTextDefinition;
  uiLang: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled, selectedFile, texts, uiLang }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    event.target.value = '';
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (event: React.MouseEvent) => {
    event.stopPropagation();
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.srt')) {
      onFileSelect(file);
    } else {
      console.warn("Invalid file type dropped. Only .srt files are accepted.");
    }
  }, [onFileSelect, disabled]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };


  if (selectedFile) {
    return (
      <div className="p-3 border border-[var(--theme-accent-primary)] bg-[rgba(var(--theme-info-rgb),0.1)] rounded-lg text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 rtl:space-x-0 rtl:space-x-reverse min-w-0">
            <FileTextIcon className="w-5 h-5 text-[var(--theme-accent-primary)] flex-shrink-0" />
            <span className="font-medium truncate text-[var(--theme-text-primary)]" dir={uiLang === 'fa' ? 'ltr' : 'rtl'}>{selectedFile.name}</span>
          </div>
          <button
            onClick={handleRemoveFile}
            className="text-[var(--theme-danger)] hover:opacity-80 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--theme-danger)] flex-shrink-0"
            aria-label={texts.removeFile as string}
            disabled={disabled}
          >
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={!disabled ? handleClick : undefined}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={clsx(`w-full p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all duration-200 ease-in-out`,
                  disabled
                    ? 'opacity-50 cursor-not-allowed border-[var(--theme-border)]'
                    : `bg-[rgba(var(--theme-input-bg-rgb),0.3)] hover:bg-[rgba(var(--theme-input-bg-rgb),0.5)] ${isDragging ? 'border-[var(--theme-accent-primary)] scale-105' : 'border-[var(--theme-border)] hover:border-[var(--theme-accent-primary)]'}`
                )}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={texts.dropOrClick as string}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".srt"
        className="hidden"
        disabled={disabled}
        id="file-upload-input"
      />
      <UploadCloudIcon className={clsx("w-10 h-10 mx-auto text-[var(--theme-text-secondary)] mb-3 transition-transform duration-200", isDragging && "scale-110")} />
      <p className="text-sm text-[var(--theme-text-secondary)]">
        <span className="font-semibold text-[var(--theme-accent-primary)]">{texts.dropOrClick as string}</span>
      </p>
      <p className="text-xs text-[var(--theme-text-secondary)]/70">{texts.srtFilesOnly as string}</p>
    </div>
  );
};

// ============== From components/Accordion.tsx ==============
interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ title, children, icon, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[var(--theme-border)] last:border-b-0">
      <h3>
        <button
          type="button"
          className="flex items-center justify-between w-full p-3 sm:p-4 font-medium text-left text-[var(--theme-accent-primary)] hover:bg-[rgba(var(--theme-accent-primary-rgb),0.1)] focus:outline-none focus-visible:ring focus-visible:ring-[var(--theme-accent-primary)] focus-visible:ring-opacity-75 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={`accordion-content-${title.replace(/\s+/g, '-')}`}
        >
          <span className="flex items-center">
            {icon && <span className="mr-2 rtl:ml-2 rtl:mr-0">{icon}</span>}
            {title}
          </span>
          {isOpen ? <ChevronUpIcon className="w-5 h-5 text-[var(--theme-text-secondary)]" /> : <ChevronDownIcon className="w-5 h-5 text-[var(--theme-text-secondary)]" />}
        </button>
      </h3>
      {isOpen && (
        <div id={`accordion-content-${title.replace(/\s+/g, '-')}`} className="p-3 sm:p-4 bg-[rgba(var(--theme-input-bg-rgb),0.1)]">
          {children}
        </div>
      )}
    </div>
  );
};

interface AccordionProps {
  children: React.ReactNode | React.ReactNode[];
  className?: string;
}

const Accordion: React.FC<AccordionProps> = ({ children, className }) => {
  return (
    <div className={clsx("rounded-lg shadow-md overflow-hidden border border-[var(--theme-border)]", className)}>
      {children}
    </div>
  );
};

// ============== From components/Header.tsx ==============
interface HeaderProps {
  uiLang: UILanguage;
  onToggleLang: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  texts: AppTextDefinition;
  activeTab: 'translator' | 'github';
  onToggleTab: (tab: 'translator' | 'github') => void;
}

const Header: React.FC<HeaderProps> = ({
  uiLang,
  onToggleLang,
  theme,
  onToggleTheme,
  searchQuery,
  onSearchChange,
  texts,
  activeTab,
  onToggleTab
}) => {
  const [isProfileIconActive, setIsProfileIconActive] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const appTitleText = texts.title as string || "AI Subtitle Translator";
  const searchPlaceholderText = texts.searchPlaceholder as string || "Search subtitles...";
  const profileAltText = texts.profileAlt as string || "Profile";
  const profileNameText = texts.profileText as string || "Amirali";
  const toggleThemeText = texts.toggleTheme as string || "Toggle Theme";
  const toggleLanguageText = texts.toggleLanguage as string || "Toggle Language";

  return (
    <header className={clsx(
      "py-3 sm:py-4 px-3 sm:px-4 md:px-6 shadow-xl sticky top-0 z-40 transition-colors duration-300",
      "bg-[var(--theme-bg-panel-opaque)] border-b border-[var(--theme-border)]"
    )}>
      <div className="container mx-auto flex items-center justify-between max-w-full">
        <div className="flex items-center flex-shrink-0">
          <div
            className="profile-icon-wrapper mr-2 sm:mr-3 rtl:ml-2 sm:rtl:ml-3 rtl:mr-0"
            onMouseEnter={() => setIsProfileIconActive(true)}
            onMouseLeave={() => setIsProfileIconActive(false)}
            onClick={() => setIsProfileIconActive(prev => !prev)}
            title={profileAltText}
            role="button"
            tabIndex={0}
            aria-label={profileAltText}
          >
            <div
              className={clsx("profile-icon-img flex items-center justify-center text-xl font-bold")}
            >
              A
            </div>
            <span className="profile-icon-text">{profileNameText}</span>
          </div>
          <h1 className={clsx("text-lg sm:text-xl md:text-2xl font-bold text-[var(--theme-accent-primary)] cursor-pointer")} onClick={() => onToggleTab('translator')}>
            {appTitleText}
          </h1>
        </div>

        <div className="flex-grow min-w-0 mx-2 sm:mx-4">
          <div className="relative max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3">
              <SearchIcon className={clsx("w-4 h-4 sm:w-5 sm:h-5 text-[var(--theme-text-secondary)]")} />
            </div>
            <input
              type="search"
              name="search"
              id="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={clsx(
                "block w-full pl-9 sm:pl-10 pr-3 py-2 rounded-md leading-5 transition-colors duration-300 focus:outline-none focus:ring-2 rtl:pl-3 rtl:pr-9 sm:rtl:pr-10 text-sm sm:text-base",
                "bg-[var(--theme-input-bg)] text-[var(--theme-text-primary)] border border-[var(--theme-border)] placeholder-[var(--theme-text-secondary)] focus:ring-[var(--theme-accent-primary)] focus:border-[var(--theme-accent-primary)]"
              )}
              placeholder={searchPlaceholderText}
            />
          </div>
        </div>

        <div className="flex items-center space-x-1-5 sm:space-x-3 rtl:space-x-reverse flex-shrink-0">
          {isMounted && (
            <>
            {/* Elegant Mode/Guide Toggles */}
            <button
              onClick={() => onToggleTab(activeTab === 'translator' ? 'github' : 'translator')}
              className={clsx(
                "px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-xs font-semibold tracking-wider transition-all duration-300 flex items-center gap-1.5 border border-[var(--theme-border)]",
                activeTab === 'github'
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg border-transparent scale-105"
                  : "bg-[var(--theme-input-bg)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:border-[var(--theme-accent-primary)]"
              )}
              title={uiLang === 'en' ? "GitHub Open-Source Hub & Detailed Guide" : "مخزن گیت‌هاب و راهنمای کدهای پروژه"}
            >
              <GithubIcon className={clsx("w-4 h-4", activeTab === 'github' ? "text-white animate-pulse" : "text-[var(--theme-text-secondary)]")} />
              <span className="hidden sm:inline font-bold">
                {uiLang === 'en' ? "GitHub Hub" : "راهنمای گیت‌هاب"}
              </span>
            </button>

            <button
              onClick={onToggleTheme}
              className={clsx("p-2 rounded-full transition-colors duration-300 text-[var(--theme-text-secondary)] hover:bg-[rgba(var(--theme-accent-primary-rgb),0.1)] hover:text-[var(--theme-accent-primary)]")}
              aria-label={toggleThemeText}
              title={toggleThemeText}
            >
              <ThemeIcon className="w-5 h-5" isDark={theme === 'dark'} />
            </button>
            
            <button
              onClick={onToggleLang}
              className={clsx("p-2 rounded-full transition-colors duration-300 flex items-center text-[var(--theme-text-secondary)] hover:bg-[rgba(var(--theme-accent-primary-rgb),0.1)] hover:text-[var(--theme-accent-primary)]")}
              aria-label={toggleLanguageText}
              title={toggleLanguageText}
            >
              <LanguageIcon className="w-5 h-5" />
               <span className="ml-1 rtl:mr-1 rtl:ml-0 text-xs font-medium hidden sm:inline">{uiLang === 'en' ? 'FA' : 'EN'}</span>
            </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

// ============== BookIcon for GitHub Documentation Panel ==============
const BookIcon: React.FC<IconProps> = ({ className, strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-16.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-16.25v14.25" />
  </svg>
);

// ============== GitHub Guide Replica Panel ==============
interface GitHubGuidePanelProps {
  uiLang: UILanguage;
}

const GitHubGuidePanel: React.FC<GitHubGuidePanelProps> = ({ uiLang }) => {
  const [starred, setStarred] = useState(false);
  const [starCount, setStarCount] = useState(243);
  const [forked, setForked] = useState(false);
  const [forkCount, setForkCount] = useState(14);
  const [selectedFile, setSelectedFile] = useState<string>('README.md');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [activeSubTab, setActiveSubTab] = useState<'code' | 'issues' | 'prs'>('code');
  const [guideLang, setGuideLang] = useState<UILanguage>(uiLang);

  // Sync with global UI lang when it changes
  useEffect(() => {
    setGuideLang(uiLang);
  }, [uiLang]);

  const handleStarToggle = () => {
    if (starred) {
      setStarred(false);
      setStarCount(prev => prev - 1);
    } else {
      setStarred(true);
      setStarCount(prev => prev + 1);
    }
  };

  const handleForkToggle = () => {
    if (!forked) {
      setForked(true);
      setForkCount(prev => prev + 1);
    }
  };

  const handleCopy = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedText(id);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error("Clipboard write error:", err);
    }
  };

  const fileContents: Record<string, string> = {
    'README.md': guideLang === 'fa' ? `
# 🎬 مترجم زیرنویس هوش مصنوعی امیرعلی (SRT)

یک ابزار ابری فوق‌العاده شکیل، مینیمال و قدرتمند با معماری فول‌استک برای ترجمه خودکار فایل‌های زیرنویس SRT. این پروژه با استفاده از جدیدترین نسخه **SDK مدل‌های هوش مصنوعی گوگل جمینای (Gemini 3.5)** توسعه یافته و با تقسیم هوشمند متن به بخش‌های مستقل، معنی و لحن گفتمان طبیعی ویدیو را به طور بی‌نظیری حفظ می‌کند.

> **طراحی و پیاده‌سازی گام‌به‌گام توسط امیرعلی** ⚡

---

## 🌟 ویژگی‌های کلیدی پروژه

1. **مدیریت هوشمند بسته‌ها (Smart Batching)**
   - برای ترجمه دقیق، فرستادن کل متن به هوش مصنوعی کارساز نیست. این برنامه خطوط زیرنویس را به بسته‌های ۲۰تایی بخش‌بندی کرده و برای هر بستار کانتکست داستانی فراهم می‌کند.
   
2. **پلاگین قدرتمند دریافت از یوتیوب (YouTube Captions Downloader)**
   - قابلیت دانلود خودکار و وارد کردن مستقیم کپشن‌ها و فایل‌های زیرنویس انگلیسی ویدیوهای یوتیوب تنها با قرار دادن لینک ویدیو.

3. **ویرایشگر آنی و دو ستونه (Interactive Correction Grid)**
   - پنل فوق پیشرفته که زیرنویس اصلی و ترجمه‌شده را متناظر با هم نشان داده و به شما اجازه می‌دهد هر زمان که خواستید، تک‌تک بخش‌ها را به صورت دستی ویرایش و اصلاح کنید.

4. **حفظ استانداردهای فرمت SRT**
   - خروجی نهایی کاملاً منطبق بر ساختار رسمی SRT با نمایش صحیح کدهای زمانی فریم‌ها (\`00:00:00,000\`) و شمارنده‌ها.

---

## 🛠️ نحوه راه‌اندازی و استفاده محلی (Local Server Execution)

اگر مایلید این پروژه را روی سیستم یا سرور شخصی خود میزبانی کنید، مراحل زیر را کپی و اجرا نمایید:

### ۱. شبیه‌سازی مخزن پروژه:
\`\`\`bash
git clone https://github.com/amirali-mini-hunter/Subtitle-translator-with-artificial-intelligence.git
cd Subtitle-translator-with-artificial-intelligence
\`\`\`

### ۲. نصب پکیج‌های پیش‌نیاز:
\`\`\`bash
npm install
\`\`\`

### ۳. تنظیم کلید اختصاصی API:
یک فایل به نام \`.env\` در پوشه اصلی ایجاد کرده و مقدار کلید جمینای خود را وارد کنید:
\`\`\`env
# .env
GEMINI_API_KEY=AIzaSyYourSecretGeminiAPIKeyHere
\`\`\`

### ۴. اجرای لوکال در حالت توسعه:
\`\`\`bash
npm run dev
\`\`\`
برنامه در آدرس \`http://localhost:3000\` در دسترس خواهد بود.

---

## 💡 راهنمای گام‌به‌گام کار با نرم‌افزار

- **مرحله اول**: از پنل سمت چپ، فایل زیرنویس SRT خود را بکشید و رها کنید (یا متن آن را کپی کرده و در بخش "متن" بچسبانید).
- **مرحله دوم**: زبان مقصد (مثلاً فارسی) و مدل مورد نظر گوگل جمینای را انتخاب کنید. مدل فلاش (Google Gemini 3.5 Flash) برای سرعت بالا و ترجمه متعادل گزینه‌ای فوق‌العاده است.
- **مرحله سوم**: در صورت نیاز، دستورالعمل سفارشی ثبت کنید؛ مثلاً: *"با لحن عامیانه و بسیار دوستانه ترجمه کن."*
- **مرحله چهارم**: دکمه "ترجمه" را بفشارید. پیشرفت کار به صورت زنده و درصد پیشروی بسته‌ها نمایش داده می‌شود.
- **مرحله پنجم**: پس از پایان فرآیند، فایل خروجی را بررسی کرده و با فشردن "دانلود فایل ترجمه‌شده"، زیرنویس نهایی خود را با پسوند مرسوم دریافت نمایید.
` : `
# 🎬 Amirali AI Subtitle Translator (SRT)

A comprehensive, production-grade cloud solution for automatic translation of SRT subtitle files. This application is powered by **Google Gemini 3.5 AI models** via their modern server SDK. It splits files intelligently to maintain context and emotional resonance of dialogue.

> **Conceived, designed, and fully engineered from scratch by amirali-mini-hunter** ⚡

---

## 🌟 Major Highlights

1. **Intelligent Subtitle Batching**
   - Transmits subtitle segments in context-preserving batches (default: 20 blocks). The engine provides adjacent paragraphs as context to prevent literal translation errors.
   
2. **YouTube Caption Integration**
   - Seamless fetching and layout extraction of native English subtitles from YouTube URL parameters with one-click injection.

3. **Bilingual Interactive Workspace Grid**
   - Side-by-side editing slate mapping original frames directly adjacent to translations. Correct transcripts on-the-fly before final compilation.

4. **Strict Format Compliance**
   - Formulates flawlessly spaced SRT files complying exactly with millisecond timestamps (\`00:00:00,000\`) and index order.

---

## 🛠️ Setup & Local Installation

To host this engine on your custom local workstation or cloud instance, perform the following commands:

### 1. Clone the repository:
\`\`\`bash
git clone https://github.com/amirali-mini-hunter/Subtitle-translator-with-artificial-intelligence.git
cd Subtitle-translator-with-artificial-intelligence
\`\`\`

### 2. Configure Node dependencies:
\`\`\`bash
npm install
\`\`\`

### 3. Establish environmental credentials:
Create a \`.env\` file in the root directory and register your custom Gemini token:
\`\`\`env
# .env
GEMINI_API_KEY=AIzaSyYourSecretGeminiAPIKeyHere
\`\`\`

### 4. Direct developer startup:
\`\`\`bash
npm run dev
\`\`\`
Open \`http://localhost:3000\` on your local browser.

---

## 💡 Quick User Manual

- **Step 1**: Upload your \`.srt\` file inside the left-hand panel, paste raw SRT transcripts, or load a YouTube video URL.
- **Step 2**: Select target translation (e.g. Persian/Farsi) and select your engine mode. "Gemini 3.5 Flash" is highly recommended.
- **Step 3**: Optional: Set a Custom Prompt guidelines (e.g., *"Translate in direct informal slang"*).
- **Step 4**: Press "Translate" and supervise progress in real-time.
- **Step 5**: Once done, double-click translation cells to perform manual improvements and press "Download Translated File" to obtain your ready subtitled SRT document.
`,
    'server.ts': `import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
app.use(express.json({ limit: "50mb" }));

// Translation Service Endpoint - Fully Proxied to protect credentials
app.post("/api/translate", async (req, res) => {
  const { texts, targetLanguageName, temperature, model } = req.body;
  
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = \`Translate the following subtitle strings into \${targetLanguageName}...\\n\${JSON.stringify(texts)}\`;

  const response = await ai.models.generateContent({
    model: model || "gemini-3.5-flash",
    contents: prompt,
    config: {
      temperature: temperature !== undefined ? Number(temperature) : 0.4,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          translatedTexts: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["translatedTexts"]
      }
    }
  });

  res.json(JSON.parse(response.text));
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Translation server active on port 3000");
});`,
    '.env.example': `# =========================================================================
# Subtitle Translator - Environment Configuration Template
# Create a copy named '.env' and put your real tokens.
# =========================================================================

# Google Gemini developer key (Get yours from Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key_goes_here
`,
    'package.json': `{
  "name": "subtitle-translator-ai",
  "private": true,
  "version": "1.2.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/server.cjs",
    "start": "node dist/server.cjs"
  },
  "dependencies": {
    "@google/genai": "^2.7.0",
    "clsx": "^2.1.0",
    "express": "^5.2.1",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "vite": "^6.3.5"
  }
}`,
    'geminiService.ts': `// Client Service wrapper mapped directly onto secure server endpoints
export const translateTextBatch = async (
  texts: string[],
  targetLanguageCode: string,
  targetLanguageName: string,
  temperature: number = 0.4,
  systemInstruction: string | undefined,
  model: string = 'gemini-3.5-flash'
): Promise<string[]> => {
  const response = await fetch("/api/translate", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ texts, targetLanguageCode, targetLanguageName, temperature, systemInstruction, model }),
  });

  const responseData = await response.json();
  return responseData.translatedTexts || [];
};`
  };

  const filesList = [
    { name: 'README.md', size: '2.4 KB', comm: 'docs: polish Persian README copy & use cases', time: '2 hours ago' },
    { name: 'server.ts', size: '3.1 KB', comm: 'feat: refine secure API parameters & JSON error recovery', time: '1 day ago' },
    { name: '.env.example', size: '312 B', comm: 'docs: add credentials requirement description', time: '3 days ago' },
    { name: 'package.json', size: '540 B', comm: 'chore: tag release v1.2.0 & optimize esbuild bundler', time: '4 hours ago' },
    { name: 'geminiService.ts', size: '1.2 KB', comm: 'refactor: direct client requests parsing & validation', time: '2 days ago' }
  ];

  return (
    <div className="w-full max-w-5xl mx-auto py-4 px-2 sm:px-6 transition-colors duration-300" dir={guideLang === 'fa' ? 'rtl' : 'ltr'}>
      {/* GitHub Repository Header Mockup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-[var(--theme-border)] gap-4">
        <div className="flex items-center space-x-2 rtl:space-x-reverse text-lg sm:text-xl font-medium">
          <BookIcon className="w-5 h-5 text-[var(--theme-text-secondary)]" />
          <div className="flex items-center gap-1">
            <span className="text-[var(--theme-accent-primary)] font-semibold hover:underline cursor-pointer">amirali-mini-hunter</span>
            <span className="text-[var(--theme-text-secondary)] opacity-60">/</span>
            <span className="font-bold hover:underline cursor-pointer text-[var(--theme-text-primary)] truncate max-w-xs sm:max-w-md">Subtitle-translator-with-artificial-intelligence</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--theme-border)] text-[var(--theme-text-secondary)] font-normal bg-[rgba(var(--theme-accent-primary-rgb),0.05)]">
            Public
          </span>
        </div>
        
        {/* Repository Stats Buttons */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs self-start sm:self-center">
          <div className="flex items-center rounded-md border border-[var(--theme-border)] bg-[var(--theme-input-bg)] overflow-hidden">
            <button 
              onClick={handleForkToggle}
              className={`px-3 py-1.5 flex items-center gap-1 hover:bg-[rgba(var(--theme-accent-primary-rgb),0.1)] text-[var(--theme-text-primary)] font-medium transition-colors ${forked ? 'bg-[rgba(236,72,153,0.1)] border-r border-[var(--theme-border)]' : ''}`}
            >
              <GitForkIcon className="w-4 h-4 text-[var(--theme-text-secondary)]" />
              <span>{guideLang === 'fa' ? 'فورک' : 'Fork'}</span>
            </button>
            <span className="px-3.5 py-1.5 bg-[var(--theme-bg-panel-opaque)] border-l border-[var(--theme-border)] text-[var(--theme-text-primary)] font-semibold">
              {forkCount}
            </span>
          </div>

          <div className="flex items-center rounded-md border border-[var(--theme-border)] bg-[var(--theme-input-bg)] overflow-hidden">
            <button 
              onClick={handleStarToggle}
              className={`px-3 py-1.5 flex items-center gap-1 hover:bg-[rgba(var(--theme-accent-primary-rgb),0.1)] text-[var(--theme-text-primary)] font-medium transition-colors ${starred ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-500' : ''}`}
            >
              <StarIcon className="w-4 h-4" filled={starred} />
              <span>{starred ? (guideLang === 'fa' ? 'ستاره‌دار' : 'Starred') : (guideLang === 'fa' ? 'ستاره' : 'Star')}</span>
            </button>
            <span className="px-3.5 py-1.5 bg-[var(--theme-bg-panel-opaque)] border-l border-[var(--theme-border)] text-[var(--theme-text-primary)] font-semibold">
              {starCount}
            </span>
          </div>
        </div>
      </div>

      {/* GitHub Repo Internal Navigation Bar */}
      <div className="flex items-center space-x-4 rtl:space-x-reverse border-b border-[var(--theme-border)] mb-6 text-sm overflow-x-auto whitespace-nowrap scrollbar-none">
        <button 
          onClick={() => setActiveSubTab('code')}
          className={`pb-3 px-1 flex items-center gap-2 border-b-2 font-medium transition-colors ${activeSubTab === 'code' ? 'border-[var(--theme-accent-primary)] text-[var(--theme-text-primary)] mr-1' : 'border-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] ml-1'}`}
        >
          <CodeIcon className="w-4 h-4" />
          <span>{guideLang === 'fa' ? 'کد پروژه' : 'Code'}</span>
        </button>
        <button 
          onClick={() => setActiveSubTab('issues')}
          className={`pb-3 px-1 flex items-center gap-2 border-b-2 font-medium transition-colors ${activeSubTab === 'issues' ? 'border-[var(--theme-accent-primary)] text-[var(--theme-text-primary)] mr-1' : 'border-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] ml-1'}`}
        >
          <IssueIcon className="w-4 h-4" />
          <span>{guideLang === 'fa' ? 'گزارش خطا (۰)' : 'Issues (0)'}</span>
        </button>
        <button 
          onClick={() => setActiveSubTab('prs')}
          className={`pb-3 px-1 flex items-center gap-2 border-b-2 font-medium transition-colors ${activeSubTab === 'prs' ? 'border-[var(--theme-accent-primary)] text-[var(--theme-text-primary)] mr-1' : 'border-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] ml-1'}`}
        >
          <GitPullRequestIcon className="w-4 h-4" />
          <span>{guideLang === 'fa' ? 'درخواست مرج (۰)' : 'Pull Requests (0)'}</span>
        </button>
      </div>

      {activeSubTab === 'code' ? (
        <>
          {/* Repository Branch bar & Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              {/* Branch drop down mock */}
              <div className="relative inline-block text-left">
                <button className="inline-flex justify-center items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-[var(--theme-border)] bg-[var(--theme-input-bg)] text-[var(--theme-text-primary)] hover:bg-[rgba(var(--theme-accent-primary-rgb),0.05)] transition-colors">
                  <GitBranchIcon className="w-3.5 h-3.5" />
                  <span>{currentBranch}</span>
                  <ChevronDownIcon className="w-3.5 h-3.5 opacity-60" />
                </button>
              </div>
              
              <div className="text-xs text-[var(--theme-text-secondary)] space-x-3 rtl:space-x-reverse hidden md:flex">
                <span><strong>5</strong> {guideLang === 'fa' ? 'شاخه ها' : 'branches'}</span>
                <span><strong>1</strong> {guideLang === 'fa' ? 'نسخه‌ی انتشار' : 'release'}</span>
              </div>
            </div>

            {/* Quick Readme Lang selection inside Github Replica */}
            <div className="flex items-center space-x-2 rtl:space-x-reverse self-end sm:self-center">
              <span className="text-xs text-[var(--theme-text-secondary)] font-medium">
                {guideLang === 'fa' ? 'زبان راهنما:' : 'Guide Language:'}
              </span>
              <div className="inline-flex rounded-md border border-[var(--theme-border)] bg-[var(--theme-input-bg)] overflow-hidden text-xs">
                <button 
                  onClick={() => setGuideLang('en')}
                  className={`px-2.5 py-1.5 transition-colors font-medium ${guideLang === 'en' ? 'bg-[var(--theme-accent-primary)] text-white font-bold' : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[rgba(var(--theme-accent-primary-rgb),0.05)]'}`}
                >
                  English
                </button>
                <div className="w-[1px] bg-[var(--theme-border)]"></div>
                <button 
                  onClick={() => setGuideLang('fa')}
                  className={`px-2.5 py-1.5 transition-colors font-medium ${guideLang === 'fa' ? 'bg-[var(--theme-accent-primary)] text-white font-bold' : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[rgba(var(--theme-accent-primary-rgb),0.05)]'}`}
                >
                  فارسی
                </button>
              </div>
            </div>
          </div>

          {/* Simulated File List Container */}
          <div className="border border-[var(--theme-border)] rounded-lg bg-[var(--theme-bg-panel-opaque)] overflow-hidden shadow-lg mb-6 max-w-full">
            {/* Header: Last Commit summary */}
            <div className="p-3 bg-[var(--theme-input-bg)] border-b border-[var(--theme-border)] flex flex-wrap items-center justify-between text-xs sm:text-sm gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[var(--theme-accent-primary)] flex items-center justify-center text-white text-[10px] font-bold">
                  AM
                </div>
                <div>
                  <span className="font-semibold text-[var(--theme-text-primary)] hover:underline cursor-pointer">amirali</span>
                  <span className="text-[var(--theme-text-secondary)] ml-2 rtl:mr-2 rtl:ml-0">
                    polish layout & integrate secure Google Gemini API configuration
                  </span>
                </div>
              </div>
              <div className="text-xs text-[var(--theme-text-secondary)]">
                {guideLang === 'fa' ? '۲ ساعت پیش' : '2 hours ago'}
              </div>
            </div>

            {/* List of Files */}
            <div className="divide-y divide-[var(--theme-border)] text-xs sm:text-sm">
              {filesList.map(file => (
                <div 
                  key={file.name}
                  onClick={() => setSelectedFile(file.name)}
                  className={`p-3 flex items-center justify-between hover:bg-[rgba(var(--theme-accent-primary-rgb),0.04)] cursor-pointer transition-colors ${selectedFile === file.name ? 'bg-[rgba(var(--theme-accent-primary-rgb),0.07)]' : ''}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-grow">
                    {file.name.includes('.') ? (
                      <FileCodeIcon className="w-4.5 h-4.5 flex-shrink-0" />
                    ) : (
                      <FolderIcon className="w-4.5 h-4.5 flex-shrink-0" />
                    )}
                    <span className={`font-semibold hover:underline truncate ${selectedFile === file.name ? 'text-[var(--theme-accent-primary)] font-bold' : 'text-[var(--theme-text-primary)]'}`}>
                      {file.name}
                    </span>
                  </div>
                  <div className="hidden sm:block text-[var(--theme-text-secondary)] flex-grow px-4 truncate max-w-md">
                    {file.comm}
                  </div>
                  <div className="text-xs text-[var(--theme-text-secondary)] flex-shrink-0 text-right opacity-80 pl-2">
                    {file.time}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Live File / Output Display */}
          <div className="border border-[var(--theme-border)] rounded-lg bg-[var(--theme-bg-panel-opaque)] overflow-hidden shadow-xl mb-6">
            <div className="p-3 bg-[var(--theme-input-bg)] border-b border-[var(--theme-border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCodeIcon className="w-4 h-4 text-[var(--theme-text-secondary)]" />
                <span className="font-mono text-xs sm:text-sm font-semibold text-[var(--theme-text-primary)]">{selectedFile}</span>
                <span className="text-xs text-[var(--theme-text-secondary)] opacity-60">
                  ({selectedFile === 'README.md' ? 'Markdown Documentation' : 'Source Code Codeblock'})
                </span>
              </div>
              <button
                onClick={() => handleCopy(fileContents[selectedFile], selectedFile)}
                className="p-1.5 rounded-md hover:bg-[rgba(var(--theme-accent-primary-rgb),0.15)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-all"
                title={guideLang === 'fa' ? 'کپی کردن کدهای این فایل' : 'Copy file contents'}
              >
                {copiedText === selectedFile ? (
                  <CheckIcon className="w-4 h-4 text-[var(--theme-success)]" />
                ) : (
                  <ClipboardIcon className="w-4 h-4" />
                )}
              </button>
            </div>
            
            {/* File display wrapper */}
            {selectedFile === 'README.md' ? (
              <div className="p-4 sm:p-6 md:p-8 markdown-body leading-relaxed overflow-x-auto text-[var(--theme-text-primary)] max-w-full text-sm sm:text-base selection:bg-sky-500 selection:text-white">
                <div className="pb-4 mb-4 border-b border-[var(--theme-border)] flex items-center justify-between text-xs uppercase tracking-wider text-[var(--theme-text-secondary)] font-semibold">
                  <span>📖 README.md</span>
                  <span>amirali repo showcase</span>
                </div>
                {/* Renders simulated markdown formatting with elegant clean styles */}
                <div className="space-y-6">
                  {/* Render elements of our markdown */}
                  <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-4xl">🎬</span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                      {guideLang === 'fa' ? 'مترجم زیرنویس هوش مصنوعی امیرعلی (SRT)' : 'Amirali AI Subtitle Translator (SRT)'}
                    </h1>
                  </div>

                  <p className="text-[var(--theme-text-secondary)] italic border-l-4 border-[var(--theme-accent-primary)] pl-3 rtl:border-l-0 rtl:border-r-4 rtl:pr-3 rtl:pl-0 sm:text-lg">
                    {guideLang === 'fa' 
                      ? 'یک ابزار ابری فوق‌العاده شکیل، مینیمال و قدرتمند با معماری فول‌استک برای ترجمه خودکار فایل‌های زیرنویس SRT. این پروژه با استفاده از جدیدترین نسخه SDK مدل‌های هوش مصنوعی گوگل جمینای توسعه یافته است.'
                      : 'A comprehensive, production-grade cloud solution for automatic translation of SRT subtitle files. This application is powered by Google Gemini 3.5 AI models via their modern server SDK.'}
                  </p>

                  <div className="p-3.5 bg-[var(--theme-input-bg)] rounded-lg border border-[var(--theme-border)] text-xs sm:text-sm font-semibold flex items-center justify-between">
                    <span>⚡ {guideLang === 'fa' ? 'طراحی و پیاده‌سازی گام‌به‌گام توسط امیرعلی دانا' : 'Conceived, designed, and fully engineered by amirali-mini-hunter'}</span>
                    <span className="text-amber-500 font-bold">★ Star Count: 243+</span>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold border-b border-[var(--theme-border)] pb-2 mb-3 flex items-center gap-2">
                      <span className="text-[var(--theme-accent-primary)]">🌟</span>
                      <span>{guideLang === 'fa' ? 'ویژگی‌های برجسته پروژه' : 'Major Highlights & Features'}</span>
                    </h2>
                    <ul className="list-disc pr-5 pl-5 space-y-2 rtl:pr-5 rtl:pl-0 text-xs sm:text-sm">
                      {guideLang === 'fa' ? (
                        <>
                          <li><strong>ترجمه کانتکست‌محور (Smart Batching):</strong> زیرنویس‌ها به شکل دسته‌های هوشمند بخش‌بندی شده و با بستر گفتگو ارسال می‌شوند تا ترجمه خطوط دقیق‌تر و پیوسته باشد.</li>
                          <li><strong>موتور روانی گفتار (Fluency & Context Engine):</strong> گزینه‌ای منحصر‌به‌فرد برای ارائه جملات روان و عامیانه به جای ترجمه کلمه‌به‌کلمه رباتیک.</li>
                          <li><strong>پشتیبانی از دانلود یوتیوب (YouTube Cap Download):</strong> بازیابی و ادغام مستقیم کپشن زیرنویس انگلیسی ویدیوهای یوتیوب با سرعت بالا.</li>
                          <li><strong>ویرایشگر فوری و زنده (Unified Work Grid):</strong> پنل متحرک و زیبایی که متن اصلی را کنار ترجمه قرار داده و اجازه ویرایش سریع و مستقیم را می‌دهد.</li>
                          <li><strong>سازگار با فرمت بین‌المللی SRT:</strong> پیاده‌سازی فرمت‌بند حرفه‌ای که فریم‌های زمانی میلی‌ثانیه را کاملاً سالم و درست تولید می‌کند.</li>
                        </>
                      ) : (
                        <>
                          <li><strong>Intelligent Subtitle Batching:</strong> Processes lines in context-preserving batches (defaults to 20 blocks) to feed conversation blocks into the LLM rather than single disconnected fragments.</li>
                          <li><strong>Fluency and Humanizing Layer:</strong> Advanced translation prompts making sure lines sound native and smooth on screen, rather than robotic machine conversions.</li>
                          <li><strong>YouTube Integration Module:</strong> Seamless fetching of original subtitle content directly from YouTube URL addresses for local translations.</li>
                          <li><strong>Bilingual Interactive Grid:</strong> Highly stylized panel matching native and translation columns. Allows instantaneous adjustments in real-time.</li>
                          <li><strong>Full SRT Integrity:</strong> Production-grade custom parsers and export formatting ensuring millisecond accurate subtitle files.</li>
                        </>
                      )}
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold border-b border-[var(--theme-border)] pb-2 mb-3 flex items-center gap-2">
                      <span className="text-[var(--theme-accent-primary)]">🛠️</span>
                      <span>{guideLang === 'fa' ? 'راهنمای کاربری و نصب روی ورک‌استیشن محلی' : 'Setup & Workstation Commands'}</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-[var(--theme-text-secondary)] mb-3">
                      {guideLang === 'fa' 
                        ? 'برای تست کدهای پروژه، یا هماهنگ‌سازی آن با وب‌سایت‌های شخصی، دستورات ترمینال زیر را استفاده کنید:'
                        : 'Use the following consecutive terminal command instructions to safely boot your localized translation server:'}
                    </p>

                    <div className="space-y-4">
                      {/* Step 1 Code */}
                      <div>
                        <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)] mb-1">
                          <span>{guideLang === 'fa' ? '۱. شبیه‌سازی کدهای پروژه' : '1. Clone Repository'}</span>
                          <button 
                            onClick={() => handleCopy('git clone https://github.com/amirali-mini-hunter/Subtitle-translator-with-artificial-intelligence.git \ncd Subtitle-translator-with-artificial-intelligence', 'c1')} 
                            className="hover:text-[var(--theme-text-primary)]"
                          >
                            {copiedText === 'c1' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <pre className="p-3 bg-[var(--theme-input-bg)] rounded-md border border-[var(--theme-border)] overflow-x-auto text-xs font-mono text-cyan-400 select-all" dir="ltr">
                          git clone https://github.com/amirali-mini-hunter/Subtitle-translator-with-artificial-intelligence.git<br/>
                          cd Subtitle-translator-with-artificial-intelligence
                        </pre>
                      </div>

                      {/* Step 2 Code */}
                      <div>
                        <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)] mb-1">
                          <span>{guideLang === 'fa' ? '۲. نصب پکیج‌های پیش‌نیاز' : '2. Install Dependencies'}</span>
                          <button 
                            onClick={() => handleCopy('npm install', 'c2')} 
                            className="hover:text-[var(--theme-text-primary)]"
                          >
                            {copiedText === 'c2' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <pre className="p-3 bg-[var(--theme-input-bg)] rounded-md border border-[var(--theme-border)] overflow-x-auto text-xs font-mono text-cyan-400 select-all" dir="ltr">
                          npm install
                        </pre>
                      </div>

                      {/* Step 3 Code */}
                      <div>
                        <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)] mb-1">
                          <span>{guideLang === 'fa' ? '۳. ساخت فایل کانفیگ و ثبت کلید API' : '3. Store Gemini API Secret Key'}</span>
                          <button 
                            onClick={() => handleCopy('echo "GEMINI_API_KEY=AIzaSyYourSecretKeyHere" > .env', 'c3')} 
                            className="hover:text-[var(--theme-text-primary)]"
                          >
                            {copiedText === 'c3' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <pre className="p-3 bg-[var(--theme-input-bg)] rounded-md border border-[var(--theme-border)] overflow-x-auto text-xs font-mono text-cyan-400 select-all" dir="ltr">
                          # {guideLang === 'fa' ? 'یک فایل متنی جدید به نام .env بسازید و مقدار زیر را در آن قرار دهید:' : 'Write your secret token directly inside .env config file:'}<br/>
                          GEMINI_API_KEY=your_gemini_api_key_goes_here
                        </pre>
                      </div>

                      {/* Step 4 Code */}
                      <div>
                        <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)] mb-1">
                          <span>{guideLang === 'fa' ? '۴. راه‌اندازی سرور در بستر لوکال' : '4. Execute Local Development Server'}</span>
                          <button 
                            onClick={() => handleCopy('npm run dev', 'c4')} 
                            className="hover:text-[var(--theme-text-primary)]"
                          >
                            {copiedText === 'c4' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <pre className="p-3 bg-[var(--theme-input-bg)] rounded-md border border-[var(--theme-border)] overflow-x-auto text-xs font-mono text-cyan-400 select-all" dir="ltr">
                          npm run dev
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <pre className="p-4 overflow-x-auto text-xs font-mono text-green-400 bg-[var(--theme-bg-deep)] leading-relaxed max-w-full rounded-b-lg select-all" dir="ltr">
                {fileContents[selectedFile]}
              </pre>
            )}
          </div>
        </>
      ) : (
        <div className="p-8 text-center border border-dashed border-[var(--theme-border)] rounded-lg bg-[var(--theme-bg-panel-opaque)] text-[var(--theme-text-secondary)]">
          <BookIcon className="w-12 h-12 mx-auto mb-3 opacity-40 text-[var(--theme-accent-primary)]" />
          <h3 className="text-lg font-bold mb-1 text-[var(--theme-text-primary)]">
            {activeSubTab === 'issues' 
              ? (guideLang === 'fa' ? 'هیچ گزارش خطایی یافت نشد!' : 'No Active Issues Loaded!') 
              : (guideLang === 'fa' ? 'صفحة درخواست‌های مرج خالیست!' : 'No Open Pull Requests!')}
          </h3>
          <p className="text-xs">
            {activeSubTab === 'issues'
              ? (guideLang === 'fa' ? 'کدهای نهایی تایید شده توسط برنامه‌نویس کاملاً بی نقص و پایدار عمل می‌کنند.' : 'The repository codes are extremely clean, audited, and running completely stable.')
              : (guideLang === 'fa' ? 'کل کدهای شاخه‌ی فرعی بر روی شاخه‌ی اصلی با موفقیت ادغام شده است.' : 'All sub-branch developments are fully merged and certified into master branch.')}
          </p>
        </div>
      )}
    </div>
  );
};

// ============== From components/ControlPanel.tsx ==============
interface ControlPanelProps {
  texts: AppTextDefinition;
  uiLang: UILanguage;
  inputMethod: 'file' | 'text' | 'youtube';
  onInputMethodChange: (method: 'file' | 'text' | 'youtube') => void;
  originalFile: File | null;
  originalFileName: string | null;
  onFileSelect: (file: File | null) => void;
  srtTextContent: string;
  onSrtTextChange: (text: string) => void;
  youtubeUrl: string;
  onYoutubeUrlChange: (url: string) => void;
  onFetchYouTubeSubtitles: () => void;
  supportedLanguages: Language[];
  targetLanguageCode: string;
  onTargetLanguageChange: (code: string) => void;
  geminiModel: string;
  onGeminiModelChange: (model: string) => void;
  temperature: number;
  onTemperatureChange: (temp: number) => void;
  batchSize: number;
  onBatchSizeChange: (size: number) => void;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
  isFluentTranslation: boolean;
  onIsFluentTranslationChange: (isFluent: boolean) => void;
  onApplyRecommendedSettings: () => void;
  manualStartLine: number;
  onManualStartLineChange: (line: number) => void;
  onTranslate: () => void;
  onStopTranslation: () => void;
  onDownload: () => void;
  isLoading: boolean;
  isTranslating: boolean;
  parsedSubtitlesCount: number;
  translatedSubtitlesCount: number;
  progress: number;
  progressMessage: string | null;
}

const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const {
    texts, uiLang, inputMethod, onInputMethodChange,
    originalFile, onFileSelect,
    srtTextContent, onSrtTextChange,
    youtubeUrl, onYoutubeUrlChange, onFetchYouTubeSubtitles,
    supportedLanguages, targetLanguageCode, onTargetLanguageChange,
    geminiModel, onGeminiModelChange,
    temperature, onTemperatureChange,
    batchSize, onBatchSizeChange,
    customPrompt, onCustomPromptChange,
    isFluentTranslation, onIsFluentTranslationChange,
    onApplyRecommendedSettings,
    manualStartLine, onManualStartLineChange,
    onTranslate, onStopTranslation, onDownload,
    isLoading, isTranslating,
    parsedSubtitlesCount, translatedSubtitlesCount,
    progress, progressMessage
  } = props;

  const batchSizeOptions = [5, 10, 20, 30, 50];
  const tooltips = (texts.tooltips || {}) as Record<string, string>;

  const stickyTopOffset = "lg:top-[calc(var(--header-height,5rem)+0.5rem)]";
  const controlPanelMaxHeight = `lg:max-h-[calc(100vh-var(--header-height,5rem)-1.5rem)]`;

  const handleManualStartLineInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      onManualStartLineChange(1);
    } else {
      const num = parseInt(value, 10);
      if (!isNaN(num)) {
        onManualStartLineChange(Math.max(1, Math.min(num, parsedSubtitlesCount || 1)));
      }
    }
  };
  
  const isResuming = parsedSubtitlesCount > 0 && manualStartLine > 1 && manualStartLine <= parsedSubtitlesCount;
  let translateButtonText = texts.translate as string;
  if (isResuming) {
    const resumeTextFn = texts.resumeFromLine as ((count: number) => string) | undefined;
    translateButtonText = resumeTextFn ? resumeTextFn(manualStartLine) : `Resume (from line ${manualStartLine})`;
  } else if (parsedSubtitlesCount > 0 && manualStartLine > 1 && manualStartLine > parsedSubtitlesCount){
     translateButtonText = texts.translate as string;
  }


  return (
    <div className={clsx(
        "w-full lg:w-1/3 xl:w-1/4 space-y-4 md:space-y-6",
        "lg:sticky lg:self-start lg:overflow-y-auto lg:rounded-lg lg:shadow-xl",
        "lg:bg-[var(--theme-bg-panel-frosted)] lg:backdrop-blur-md lg:border lg:border-[var(--theme-border)]",
        stickyTopOffset,
        controlPanelMaxHeight,
        "p-3 md:p-4 transition-colors duration-300"
    )}>
      <div className="bg-[var(--theme-bg-panel-opaque)] lg:bg-transparent shadow-lg rounded-lg p-3 sm:p-4 lg:shadow-none lg:p-0 transition-colors duration-300">
        <h3 className="text-lg font-semibold text-[var(--theme-accent-primary)] mb-3">{texts.inputMethod as string}</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {(['file', 'text', 'youtube'] as const).map(method => (
            <button
              key={method}
              onClick={() => onInputMethodChange(method)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex-grow sm:flex-grow-0 border
                ${inputMethod === method
                  ? 'bg-[var(--theme-accent-primary)] text-white border-[var(--theme-accent-primary)] shadow-md scale-105'
                  : 'bg-[var(--theme-input-bg)] hover:bg-[rgba(var(--theme-accent-primary-rgb),0.1)] text-[var(--theme-text-secondary)] border-[var(--theme-border)] hover:text-[var(--theme-accent-primary)] hover:border-[var(--theme-accent-primary)]'}`}
            >
              {method === 'file' && <UploadCloudIcon className="w-4 h-4 inline mr-1 rtl:ml-1 rtl:mr-0" />}
              {method === 'text' && <PencilSquareIcon className="w-4 h-4 inline mr-1 rtl:ml-1 rtl:mr-0" />}
              {method === 'youtube' && <FilmIcon className="w-4 h-4 inline mr-1 rtl:ml-1 rtl:mr-0" />}
              {texts[`method${method.charAt(0).toUpperCase() + method.slice(1)}`] as string}
            </button>
          ))}
        </div>

        {inputMethod === 'file' && (
          <div className="space-y-3">
            <label htmlFor="file-upload-input" className="block text-sm font-medium text-[var(--theme-text-primary)] opacity-90">
              {texts.uploadSrt as string}
            </label>
            <FileUpload
              onFileSelect={onFileSelect}
              disabled={isLoading}
              selectedFile={originalFile}
              texts={{
                  removeFile: texts.removeFile as string,
                  dropOrClick: texts.dropOrClick as string,
                  srtFilesOnly: texts.srtFilesOnly as string
              }}
              uiLang={uiLang}
            />
          </div>
        )}

        {inputMethod === 'text' && (
          <div className="space-y-3">
            <label htmlFor="srt-text-area" className="block text-sm font-medium text-[var(--theme-text-primary)] opacity-90">
              {texts.pasteSrt as string}
            </label>
            <textarea
              id="srt-text-area"
              rows={6}
              className="w-full p-2.5 border border-[var(--theme-border)] bg-[var(--theme-input-bg)] text-[var(--theme-text-primary)] rounded-md shadow-sm focus:ring-2 focus:ring-[var(--theme-accent-primary)] focus:border-[var(--theme-accent-primary)] disabled:opacity-60 transition-colors duration-200"
              placeholder={texts.srtPlaceholder as string}
              value={srtTextContent}
              onChange={(e) => onSrtTextChange(e.target.value)}
              disabled={isLoading}
              dir="ltr"
            />
          </div>
        )}

        {inputMethod === 'youtube' && (
          <div className="space-y-3">
            <label htmlFor="youtube-url-input" className="block text-sm font-medium text-[var(--theme-text-primary)] opacity-90">
               {texts.youtubeUrl as string}
            </label>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 rtl:sm:space-x-reverse">
              <input
                type="url"
                id="youtube-url-input"
                className="flex-grow p-2.5 border border-[var(--theme-border)] bg-[var(--theme-input-bg)] text-[var(--theme-text-primary)] rounded-md shadow-sm focus:ring-2 focus:ring-[var(--theme-accent-primary)] focus:border-[var(--theme-accent-primary)] disabled:opacity-60 transition-colors duration-200"
                placeholder={texts.youtubePlaceholder as string}
                value={youtubeUrl}
                onChange={(e) => onYoutubeUrlChange(e.target.value)}
                disabled={isLoading}
                dir="ltr"
              />
              <ActionButton onClick={onFetchYouTubeSubtitles} disabled={isLoading || !youtubeUrl} variant="secondary" className="w-full sm:w-auto">
                {texts.fetchYoutube as string}
              </ActionButton>
            </div>
          </div>
        )}
      </div>

      <Accordion className="bg-[var(--theme-bg-panel-opaque)] lg:bg-transparent shadow-lg rounded-lg lg:shadow-none lg:p-0 transition-colors duration-300">
        <AccordionItem
          title={texts.settingsGroup as string}
          icon={<CogIcon className="w-5 h-5 text-[var(--theme-accent-primary)]" />}
          defaultOpen={true}
        >
          <div className="space-y-4">
            <div>
              <div className="flex items-center mb-1">
                <label htmlFor="gemini-model-select" className="block text-sm font-medium text-[var(--theme-text-primary)] opacity-90">
                  {texts.geminiModelLabel as string || "Gemini Model:"}
                </label>
                {tooltips.geminiModel && (
                  <span className="tooltip ml-1 rtl:mr-1 rtl:ml-0">
                    <InfoIcon className="inline w-4 h-4 text-[var(--theme-text-secondary)] cursor-help" />
                    <span className="tooltiptext text-xs w-64">{tooltips.geminiModel}</span>
                  </span>
                )}
              </div>
              <select
                id="gemini-model-select"
                value={geminiModel}
                onChange={(e) => onGeminiModelChange(e.target.value)}
                disabled={isLoading}
                className="w-full p-2.5 border border-[var(--theme-border)] bg-[var(--theme-input-bg)] text-[var(--theme-text-primary)] rounded-md shadow-sm focus:ring-2 focus:ring-[var(--theme-accent-primary)] focus:border-[var(--theme-accent-primary)] disabled:opacity-60 transition-colors duration-200 mb-2 font-sans"
              >
                <option value="gemini-3.5-flash">{texts.modelFlash as string}</option>
                <option value="gemini-3.1-flash-lite">{texts.modelLite as string}</option>
                <option value="gemini-3.1-pro-preview">{texts.modelPro as string}</option>
              </select>
            </div>
            <div>
              <label htmlFor="language-select" className="block text-sm font-medium text-[var(--theme-text-primary)] opacity-90 mb-1">
                {texts.targetLanguage as string}
              </label>
              <LanguageSelector
                id="language-select"
                languages={supportedLanguages}
                selectedLanguage={targetLanguageCode}
                onLanguageChange={onTargetLanguageChange}
                disabled={isLoading}
              />
            </div>

            <div>
              <div className="flex items-center mb-1">
                <label htmlFor="temperature-slider" className="block text-sm font-medium text-[var(--theme-text-primary)] opacity-90">
                  {texts.temperature as string} {temperature.toFixed(1)}
                </label>
                {tooltips.temperature && (
                  <span className="tooltip ml-1 rtl:mr-1 rtl:ml-0">
                    <InfoIcon className="inline w-4 h-4 text-[var(--theme-text-secondary)] cursor-help" />
                    <span className="tooltiptext text-xs w-64">{tooltips.temperature}</span>
                  </span>
                )}
              </div>
              <input
                type="range"
                id="temperature-slider"
                min="0" max="1" step="0.1"
                value={temperature}
                onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
                disabled={isLoading}
                className="w-full h-2 bg-[var(--theme-border)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-accent-primary)] disabled:opacity-60"
              />
            </div>

            <div>
              <div className="flex items-center mb-1">
                <label htmlFor="batch-size-select" className="block text-sm font-medium text-[var(--theme-text-primary)] opacity-90">
                  {texts.batchSize as string}
                </label>
                 {tooltips.batchSize && (
                  <span className="tooltip ml-1 rtl:mr-1 rtl:ml-0">
                    <InfoIcon className="inline w-4 h-4 text-[var(--theme-text-secondary)] cursor-help" />
                    <span className="tooltiptext text-xs w-64">{tooltips.batchSize}</span>
                  </span>
                )}
              </div>
              <select
                id="batch-size-select"
                value={batchSize}
                onChange={(e) => onBatchSizeChange(parseInt(e.target.value))}
                disabled={isLoading}
                className="w-full p-2.5 border border-[var(--theme-border)] bg-[var(--theme-input-bg)] text-[var(--theme-text-primary)] rounded-md shadow-sm focus:ring-2 focus:ring-[var(--theme-accent-primary)] focus:border-[var(--theme-accent-primary)] disabled:opacity-60 transition-colors duration-200"
              >
                {batchSizeOptions.map(size => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="custom-prompt-area" className="block text-sm font-medium text-[var(--theme-text-primary)] opacity-90">
                  {texts.customPrompt as string}
                </label>
                {tooltips.customPrompt && (
                  <span className="tooltip ml-1 rtl:mr-1 rtl:ml-0">
                    <InfoIcon className="inline w-4 h-4 text-[var(--theme-text-secondary)] cursor-help" />
                    <span className="tooltiptext text-xs w-64">{tooltips.customPrompt}</span>
                  </span>
                )}
              </div>
              <textarea
                id="custom-prompt-area"
                rows={3}
                className="w-full p-2.5 border border-[var(--theme-border)] bg-[var(--theme-input-bg)] text-[var(--theme-text-primary)] rounded-md shadow-sm focus:ring-2 focus:ring-[var(--theme-accent-primary)] focus:border-[var(--theme-accent-primary)] disabled:opacity-60 transition-colors duration-200"
                placeholder={texts.customPromptPlaceholder as string}
                value={customPrompt}
                onChange={(e) => onCustomPromptChange(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="fluent-translation-toggle"
                checked={isFluentTranslation}
                onChange={(e) => onIsFluentTranslationChange(e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 text-[var(--theme-accent-primary)] border-[var(--theme-border)] bg-[var(--theme-input-bg)] rounded focus:ring-[var(--theme-accent-primary)] disabled:opacity-60"
              />
              <label htmlFor="fluent-translation-toggle" className="ml-2 rtl:mr-2 rtl:ml-0 text-sm font-medium text-[var(--theme-text-primary)]">
                {texts.fluentTranslation as string}
              </label>
              {tooltips.fluentTranslation && (
                  <span className="tooltip ml-1 rtl:mr-1 rtl:ml-0">
                    <InfoIcon className="inline w-4 h-4 text-[var(--theme-text-secondary)] cursor-help" />
                    <span className="tooltiptext text-xs w-64">{tooltips.fluentTranslation}</span>
                  </span>
                )}
            </div>

            <div className="pt-4 mt-4 border-t border-[var(--theme-border)]">
                 <ActionButton
                    onClick={onApplyRecommendedSettings}
                    disabled={isLoading}
                    variant="secondary"
                    icon={<CheckCircleIcon className="w-4 h-4" />}
                    className="w-full"
                 >
                    {texts.applyRecommendedSettings as string}
                 </ActionButton>
                 {texts.recommendedSettingsNote && <p className="text-xs text-[var(--theme-text-secondary)] mt-2 text-center">{texts.recommendedSettingsNote as string}</p>}
            </div>

          </div>
        </AccordionItem>
      </Accordion>

      <div className="bg-[var(--theme-bg-panel-opaque)] lg:bg-transparent shadow-lg rounded-lg p-3 sm:p-4 space-y-4 lg:shadow-none lg:p-0 transition-colors duration-300">
        <h3 className="text-lg font-semibold text-[var(--theme-accent-primary)] mb-3">{texts.actionsGroup as string}</h3>
        
        <div className="mb-3 space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor="manual-start-line" className="block text-sm font-medium text-[var(--theme-text-primary)] opacity-90">
              {texts.startFromLine as string}
            </label>
            {tooltips.startFromLine && (
              <span className="tooltip ml-1 rtl:mr-1 rtl:ml-0">
                <InfoIcon className="inline w-4 h-4 text-[var(--theme-text-secondary)] cursor-help" />
                <span className="tooltiptext text-xs w-64">{tooltips.startFromLine}</span>
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <input
              type="number"
              id="manual-start-line"
              value={manualStartLine}
              onChange={handleManualStartLineInputChange}
              min="1"
              max={parsedSubtitlesCount || 1}
              disabled={isLoading || parsedSubtitlesCount === 0}
              className="w-full p-2.5 border border-[var(--theme-border)] bg-[var(--theme-input-bg)] text-[var(--theme-text-primary)] rounded-md shadow-sm focus:ring-2 focus:ring-[var(--theme-accent-primary)] focus:border-[var(--theme-accent-primary)] disabled:opacity-60 transition-colors duration-200"
              aria-label={texts.startFromLine as string}
            />
            <button
              onClick={() => onManualStartLineChange(1)}
              disabled={isLoading || manualStartLine === 1 || parsedSubtitlesCount === 0}
              className="p-2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent-primary)] rounded-md border border-[var(--theme-border)] hover:border-[var(--theme-accent-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={texts.resetStartLine as string}
              aria-label={texts.resetStartLine as string}
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {!isTranslating ? (
            <ActionButton
              onClick={onTranslate}
              disabled={isLoading || parsedSubtitlesCount === 0 || (manualStartLine > parsedSubtitlesCount && parsedSubtitlesCount > 0) }
              isLoading={isLoading && !isTranslating}
              icon={<PlayIcon />}
              className="w-full"
            >
              {translateButtonText}
            </ActionButton>
          ) : (
            <ActionButton
              onClick={onStopTranslation}
              variant="danger"
              icon={<StopIcon />}
              className="w-full"
            >
              {texts.stop as string}
            </ActionButton>
          )}
          <ActionButton
            onClick={onDownload}
            disabled={isLoading || parsedSubtitlesCount === 0}
            variant="secondary"
            icon={<DownloadIcon />}
            className="w-full"
          >
            {texts.download as string}
          </ActionButton>
        </div>
        {(isLoading || isTranslating) && progressMessage && (
          <div className="mt-4 space-y-1">
            <p className="text-xs text-[var(--theme-accent-primary)] text-center">{progressMessage}</p>
            <ProgressBar progress={progress} />
          </div>
        )}
      </div>
    </div>
  );
};


// ============== New: SubtitleEditorPanel.tsx ==============
interface SubtitleItemProps {
  entry: SubtitleEntry;
  isTranslated: boolean;
  onTextChange: (id: string, newText: string, isTranslated: boolean) => void;
  texts: AppTextDefinition;
  uiLang: UILanguage;
  targetLanguageCode: string;
}

const SubtitleItem: React.FC<SubtitleItemProps> = ({ entry, isTranslated, onTextChange, texts, uiLang, targetLanguageCode }) => {
  const [editText, setEditText] = useState(entry.text);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditText(entry.text);
  }, [entry.text]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editText !== entry.text) {
      onTextChange(entry.id, editText, isTranslated);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      textareaRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditText(entry.text); // Revert to original on Esc
      setIsEditing(false);
      // No need to call onTextChange if reverted, unless original was different than current entry.text
      // but since we setEditText(entry.text) on useEffect, it's fine.
    }
  };

  let textDisplayDir: 'ltr' | 'rtl' = 'ltr';
  if (isTranslated) {
    const targetLangDetails = SUPPORTED_LANGUAGES.find(l => l.code === targetLanguageCode);
    if (targetLangDetails?.code === 'fa' || targetLangDetails?.code === 'ar' || targetLangDetails?.code === 'hi') {
        textDisplayDir = 'rtl';
    } else {
        textDisplayDir = 'ltr';
    }
  } else {
    // Basic heuristic for original text: if it contains any RTL characters, assume RTL.
    // This might not be perfect for mixed LTR/RTL lines but is a common approach.
    if (/[؀-ۿ]/.test(entry.text)) { // Arabic, Persian, Urdu, etc.
        textDisplayDir = 'rtl';
    }
  }


  return (
    <div className="border-b border-[var(--theme-border)] last:border-b-0 py-2.5 px-1.5 sm:px-2 group relative transition-colors duration-150 hover:bg-[rgba(var(--theme-accent-primary-rgb),0.05)]">
      <div className="flex items-center text-xs sm:text-sm text-[var(--theme-text-secondary)] mb-1">
        <span className="font-mono w-8 sm:w-10 flex-shrink-0" title={texts.id as string}>{entry.originalId || entry.id}</span>
        <span className="font-mono mx-2 flex-shrink-0" title={texts.time as string}>{entry.startTime} &rarr; {entry.endTime}</span>
         <button
            onClick={() => setIsEditing(true)}
            className="ml-auto rtl:mr-auto rtl:ml-0 p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 text-[var(--theme-accent-primary)] hover:text-[var(--theme-accent-primary-hover)] transition-opacity"
            title={texts.editText as string}
            aria-label={texts.editText as string}
          >
            <PencilSquareIcon className="w-4 h-4" />
          </button>
      </div>
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={editText}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full p-1.5 bg-[var(--theme-input-bg)] text-[var(--theme-text-primary)] rounded-md border border-[var(--theme-accent-primary)] focus:ring-1 focus:ring-[var(--theme-accent-primary)] resize-none overflow-hidden text-sm sm:text-base leading-relaxed transition-colors duration-200"
          dir={textDisplayDir}
          rows={1}
          aria-label={`${isTranslated ? "Translated" : "Original"} subtitle text for ID ${entry.originalId || entry.id}`}
        />
      ) : (
        <p
            className="text-[var(--theme-text-primary)] whitespace-pre-wrap break-words text-sm sm:text-base leading-relaxed cursor-text py-1.5 px-1.5 min-h-[2.5em] transition-colors duration-200"
            dir={textDisplayDir}
            onClick={() => setIsEditing(true)}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsEditing(true);}}
            role="button"
            aria-label={`Edit ${isTranslated ? "translated" : "original"} subtitle text for ID ${entry.originalId || entry.id}`}
        >
          {entry.text || <span className="italic text-[var(--theme-text-secondary)]">({texts.textEmpty as string})</span>}
        </p>
      )}
    </div>
  );
};

interface SubtitleColumnProps {
  title: string;
  subtitles: SubtitleEntry[];
  searchQuery: string;
  texts: AppTextDefinition;
  uiLang: UILanguage;
  targetLanguageCode: string;
  isTranslatedColumn: boolean;
  onSubtitleTextChange: (id: string, newText: string, isTranslated: boolean) => void;
  isLoading: boolean;
  placeholderText?: string;
}

const SubtitleColumn: React.FC<SubtitleColumnProps> = ({
  title, subtitles, searchQuery, texts, uiLang, targetLanguageCode, isTranslatedColumn, onSubtitleTextChange, isLoading, placeholderText
}) => {
  const filteredSubtitles = useMemo(() => {
    if (!searchQuery) return subtitles;
    const lowerSearchQuery = searchQuery.toLowerCase();
    return subtitles.filter(entry =>
      entry.text.toLowerCase().includes(lowerSearchQuery) ||
      entry.startTime.includes(lowerSearchQuery) ||
      entry.endTime.includes(lowerSearchQuery) ||
      (entry.originalId && entry.originalId.includes(lowerSearchQuery)) ||
      entry.id.includes(lowerSearchQuery)
    );
  }, [subtitles, searchQuery]);

  let textDir: 'ltr' | 'rtl' = 'ltr';
  if (isTranslatedColumn) {
    const targetLangDetails = SUPPORTED_LANGUAGES.find(l => l.code === targetLanguageCode);
     if (targetLangDetails?.code === 'fa' || targetLangDetails?.code === 'ar' || targetLangDetails?.code === 'hi') {
        textDir = 'rtl';
    }
  } else {
     // For original column, if UI is Fa, default title to RTL. Content itself will determine its direction.
     if (uiLang === 'fa') textDir = 'rtl';
  }


  return (
    <div className="w-full md:w-1/2 bg-[var(--theme-bg-panel-frosted)] backdrop-blur-md border border-[var(--theme-border)] shadow-xl rounded-lg flex flex-col transition-colors duration-300">
      <div className={clsx(
        "p-3 sm:p-4 border-b border-[var(--theme-border)] z-10 sticky top-0 bg-[var(--theme-bg-panel-frosted)] backdrop-blur-md rounded-t-lg transition-colors duration-300",
      )}>
        <h2 className="text-md sm:text-lg font-semibold text-[var(--theme-accent-primary)] transition-colors duration-300" dir={textDir}>{title}</h2>
      </div>
      <div className="overflow-y-auto flex-grow p-1 sm:p-1.5">
        {isLoading && subtitles.length === 0 ? (
          <div className="p-10 flex justify-center items-center h-full">
            <LoadingSpinner />
          </div>
        ) : !isLoading && filteredSubtitles.length === 0 && subtitles.length > 0 ? (
          <p className="p-6 text-center text-[var(--theme-text-secondary)] transition-colors duration-300">{texts.searchNoResults as string}</p>
        ) : !isLoading && subtitles.length === 0 && placeholderText ? (
           <p className="p-6 text-center text-[var(--theme-text-secondary)] transition-colors duration-300">{placeholderText}</p>
        ) : (
          filteredSubtitles.map(entry => (
            <SubtitleItem
              key={`${isTranslatedColumn ? 'trans' : 'orig'}-${entry.id}`}
              entry={entry}
              isTranslated={isTranslatedColumn}
              onTextChange={onSubtitleTextChange}
              texts={texts}
              uiLang={uiLang}
              targetLanguageCode={targetLanguageCode}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface SubtitleEditorPanelProps {
  originalSubtitles: SubtitleEntry[];
  translatedSubtitles: SubtitleEntry[];
  searchQuery: string;
  texts: AppTextDefinition;
  uiLang: UILanguage;
  targetLanguageCode: string;
  isLoadingOriginal: boolean;
  isLoadingTranslation: boolean;
  onSubtitleTextChange: (id: string, newText: string, isTranslated: boolean) => void;
}

const SubtitleEditorPanel: React.FC<SubtitleEditorPanelProps> = ({
  originalSubtitles,
  translatedSubtitles,
  searchQuery,
  texts: editorTexts,
  uiLang,
  targetLanguageCode,
  isLoadingOriginal,
  isLoadingTranslation,
  onSubtitleTextChange
}) => {
  const hasAnyOriginalSubtitles = originalSubtitles.length > 0;
  const showEmptyState = !hasAnyOriginalSubtitles && !isLoadingOriginal;

  if (showEmptyState) {
    return (
      <div className="flex-grow flex items-center justify-center p-4 md:p-8 text-center">
        <div className="bg-[var(--theme-bg-panel-frosted)] backdrop-blur-md border border-[var(--theme-border)] shadow-xl rounded-lg p-6 sm:p-8 max-w-md w-full transition-colors duration-300">
          <FileTextIcon className="w-12 h-12 sm:w-16 sm:h-16 text-[var(--theme-text-secondary)] mx-auto mb-4 transition-colors duration-300" />
          <p className="text-[var(--theme-text-secondary)] text-md sm:text-lg transition-colors duration-300">{editorTexts.emptyState as string}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
        "flex-grow flex flex-col md:flex-row gap-3 md:gap-4",
      )}>
      <SubtitleColumn
        title={editorTexts.originalSubtitles as string}
        subtitles={originalSubtitles}
        searchQuery={searchQuery}
        texts={editorTexts}
        uiLang={uiLang}
        targetLanguageCode={targetLanguageCode} // Not strictly needed for original, but passed for consistency
        isTranslatedColumn={false}
        onSubtitleTextChange={onSubtitleTextChange}
        isLoading={isLoadingOriginal}
        placeholderText={editorTexts.emptyState as string}
      />
      <SubtitleColumn
        title={editorTexts.translatedSubtitles as string}
        subtitles={translatedSubtitles}
        searchQuery={searchQuery}
        texts={editorTexts}
        uiLang={uiLang}
        targetLanguageCode={targetLanguageCode}
        isTranslatedColumn={true}
        onSubtitleTextChange={onSubtitleTextChange}
        isLoading={isLoadingTranslation && translatedSubtitles.length > 0 && translatedSubtitles.filter(s=>s.text.trim() !== "").length < originalSubtitles.length}
        placeholderText={hasAnyOriginalSubtitles ? (editorTexts.translatedSubtitles as string) + "..." : (editorTexts.emptyState as string)}
      />
    </div>
  );
};


// ============== App Component ==============

// Helper function to safely access nested properties in AppTextDefinition
function getTextFromPath(obj: AppTextDefinition, path: string): string | ((...args: any[]) => string) | AppTextDefinition | undefined {
  const keys = path.split('.');
  let current: any = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  return current;
}

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [uiLang, setUiLang] = useState<UILanguage>('fa');
  const [activeTab, setActiveTab] = useState<'translator' | 'github'>('translator');
  const [searchQuery, setSearchQuery] = useState('');
  const [texts, setTexts] = useState<AppTextDefinition>(AppTexts.fa);

  const [originalSubtitles, setOriginalSubtitles] = useState<SubtitleEntry[]>([]);
  const [translatedSubtitles, setTranslatedSubtitles] = useState<SubtitleEntry[]>([]);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string | null>(null);
  const [srtTextContent, setSrtTextContent] = useState<string>('');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [geminiModel, setGeminiModel] = useState<string>('gemini-3.5-flash');

  const [targetLanguageCode, setTargetLanguageCode] = useState<string>(DEFAULT_TARGET_LANGUAGE_CODE);
  const [temperature, setTemperature] = useState<number>(RECOMMENDED_TEMPERATURE);
  const [batchSize, setBatchSize] = useState<number>(RECOMMENDED_BATCH_SIZE);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isFluentTranslation, setIsFluentTranslation] = useState<boolean>(RECOMMENDED_IS_FLUENT);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [manualStartLine, setManualStartLine] = useState<number>(1);

  const [alerts, setAlerts] = useState<AlertMessageData[]>([]);
  const translationAbortControllerRef = useRef<AbortController | null>(null);
  const currentBatchStartIndexRef = useRef<number>(0);
  const [inputMethod, setInputMethod] = useState<'file' | 'text' | 'youtube'>('file');


  useEffect(() => {
    setTexts(AppTexts[uiLang]);
    document.documentElement.lang = uiLang;
    document.documentElement.dir = uiLang === 'fa' ? 'rtl' : 'ltr';
  }, [uiLang]);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const removeAlert = useCallback((id: string) => {
    setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== id));
  }, []);

  const addAlert = useCallback((type: AlertMessageData['type'], messageKey: string, ...args: any[]) => {
    const resolvedItem = getTextFromPath(texts, messageKey);
    let messageText: string;

    if (typeof resolvedItem === 'function') {
      messageText = resolvedItem(...args);
    } else if (typeof resolvedItem === 'string') {
      messageText = resolvedItem;
    } else {
      console.warn(`Alert message key "${messageKey}" resolved to a non-string/non-function value or was not found. Path: ${messageKey}. Using key as message.`);
      messageText = messageKey; // Fallback to using the key itself as the message
    }

    const newAlert: AlertMessageData = { id: Date.now().toString(), type, message: messageText };
    setAlerts(prevAlerts => [newAlert, ...prevAlerts.slice(0,4)]); // Keep max 5 alerts
    setTimeout(() => removeAlert(newAlert.id), 7000);
  }, [texts, removeAlert]);


  const resetSubtitlesAndState = (isNewInput: boolean = true) => {
    setOriginalSubtitles([]);
    setTranslatedSubtitles([]);
    if(isNewInput) { // Only reset file/text content if it's a truly new input method or file
      setOriginalFile(null);
      setOriginalFileName(null);
      setSrtTextContent('');
    }
    setProgress(0);
    setProgressMessage(null);
    setManualStartLine(1); // Reset start line for new inputs
  };

  const processNewOriginalSubtitles = (parsed: SubtitleEntry[]) => {
    setOriginalSubtitles(parsed);
    setTranslatedSubtitles(parsed.map(s => ({ ...s, text: '' }))); // Initialize translated with empty text
    setManualStartLine(1);
    setProgress(0);
    setProgressMessage(null);
  };


  const handleFileSelect = useCallback(async (file: File | null) => {
    resetSubtitlesAndState(true); // Full reset for new file
    setOriginalFile(file);

    if (file) {
      setOriginalFileName(file.name);
      setIsLoading(true);
      addAlert('info', 'readingFile');
      try {
        const content = await file.text();
        if (!content.trim()) {
          addAlert('error', 'errorFileEmpty');
          resetSubtitlesAndState(true);
          return;
        }
        addAlert('info', 'parsingSRT');
        const parsed = parseSrt(content);
        if (parsed.length === 0) {
          addAlert('error', 'errorNoSubtitlesFound');
          resetSubtitlesAndState(true);
          return;
        }
        processNewOriginalSubtitles(parsed);
        addAlert('success', 'parseSuccess', parsed.length);
      } catch (error) {
        console.error("Error processing file:", error);
        addAlert('error', 'errorProcessingFile');
        resetSubtitlesAndState(true);
      } finally {
        setIsLoading(false);
      }
    } else {
       addAlert('info', 'fileRemoved');
    }
  }, [addAlert, texts]);


  const handleSrtTextChange = (text: string) => {
    setSrtTextContent(text);
    if (!text.trim()) {
      resetSubtitlesAndState(false); // Keep text, reset subs
      return;
    }
    try {
      const parsed = parseSrt(text);
      // Update original and reset translated, keep text input
      setOriginalSubtitles(parsed);
      setTranslatedSubtitles(parsed.map(s => ({ ...s, text: '' })));
      setManualStartLine(1); // Reset start line when text content changes significantly
      setProgress(0);
      setProgressMessage(null);

      if (parsed.length === 0 && text.trim().length > 10) { // Heuristic for possibly invalid SRT
        addAlert('warning', 'errorNoSubtitlesFoundInText');
      }
    } catch (error) {
      console.error("Error parsing SRT from text area:", error);
      addAlert('error', 'errorParsingSRTText');
      // Don't fully reset here, user might be fixing it. Keep text input.
      setOriginalSubtitles([]);
      setTranslatedSubtitles([]);
      setManualStartLine(1);
    }
  };

  const handleFetchYouTubeSubtitles = useCallback(async () => {
    if (!youtubeUrl) {
      addAlert('warning', 'youtubeProvideUrl');
      return;
    }
    resetSubtitlesAndState(true); // Full reset for new video
    setIsLoading(true);
    addAlert('info', 'youtubeFetching');

    let videoId = '';
    try {
        const url = new URL(youtubeUrl);
        if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com' || url.hostname === 'youtu.be') {
            videoId = url.hostname === 'youtu.be' ? url.pathname.substring(1) : url.searchParams.get('v') || '';
        }
    } catch (e) {
        addAlert('error', 'youtubeInvalidUrl');
        setIsLoading(false);
        return;
    }

    if (!videoId) {
        addAlert('error', 'youtubeInvalidUrl');
        setIsLoading(false);
        return;
    }

    const serviceUrl = `https://save.subs.workers.dev/api/getSubs?videoUrl=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=srt&langs=en`;

    try {
        const response = await fetch(serviceUrl);
        if (!response.ok) {
            addAlert('error', 'youtubeSrtFormatFetchFailed', response.status);
            setIsLoading(false);
            return;
        }
        const srtContentData = await response.json();

        if (srtContentData.subtitles && srtContentData.subtitles.en) {
            const parsed = parseSrt(srtContentData.subtitles.en);
            if (parsed.length === 0) {
                addAlert('warning', 'youtubeNoSubtitlesFound');
            } else {
                processNewOriginalSubtitles(parsed);
                addAlert('success', 'youtubeSubtitlesFetched');
            }
        } else {
             addAlert('warning', 'youtubeNoSubtitlesFound');
        }

    } catch (error) {
        console.error("Error fetching YouTube subtitles:", error);
        addAlert('error', 'youtubeNetworkError');
    } finally {
        setIsLoading(false);
    }

  }, [youtubeUrl, addAlert, texts]);

  const handleTranslate = useCallback(async () => {
    if (originalSubtitles.length === 0) {
      addAlert('error', 'errorNoSubtitlesToTranslate');
      return;
    }
    if (!targetLanguageCode || !SUPPORTED_LANGUAGES.find(l => l.code === targetLanguageCode)) {
      addAlert('error', 'errorInvalidTargetLanguage');
      return;
    }



    setIsTranslating(true);
    setIsLoading(true);
    setProgress(0);
    let startIndexForJob = manualStartLine - 1;
    if (startIndexForJob < 0 || startIndexForJob >= originalSubtitles.length) {
        startIndexForJob = 0;
        if (manualStartLine !== 1) setManualStartLine(1);
    }
    currentBatchStartIndexRef.current = startIndexForJob;

    setTranslatedSubtitles(prev =>
        prev.map((sub, idx) => (idx >= startIndexForJob ? { ...sub, text: '' } : sub))
    );

    translationAbortControllerRef.current = new AbortController();

    const itemsToTranslateCount = originalSubtitles.length - startIndexForJob;
    const totalBatches = Math.ceil(itemsToTranslateCount / batchSize);
    const targetLangName = SUPPORTED_LANGUAGES.find(l => l.code === targetLanguageCode)?.name || targetLanguageCode;

    const defaultPromptKey = 'defaultTranslationPrompt';
    const fluentPromptKey = 'fluentTranslationPrompt';

    let systemInstruction = customPrompt.trim();
    if (!systemInstruction) {
        const specificPromptKey = isFluentTranslation ? fluentPromptKey : defaultPromptKey;
        const resolvedPromptItem = getTextFromPath(texts, specificPromptKey);
        if (typeof resolvedPromptItem === 'string') {
            systemInstruction = resolvedPromptItem;
        } else {
            systemInstruction = "Translate the following subtitles accurately and naturally.";
        }
    }
    systemInstruction = systemInstruction.replace('language_code_placeholder', targetLanguageCode).replace('language_name_placeholder', targetLangName);

    try {
      let processedInThisRun = 0;
      for (let i = startIndexForJob; i < originalSubtitles.length; i += batchSize) {
        if (translationAbortControllerRef.current.signal.aborted) {
          addAlert('info', 'translationStopped');
          break;
        }
        currentBatchStartIndexRef.current = i;

        const batchNumber = Math.floor(processedInThisRun / batchSize) + 1;
        const batchOriginals = originalSubtitles.slice(i, i + batchSize);
        const originalTexts = batchOriginals.map(s => s.text);

        const translatingBatchFnItem = getTextFromPath(texts, 'controlPanel.translatingBatch') || getTextFromPath(texts, 'translatingBatch');

        const absLineStart = i + 1;
        const absLineEnd = Math.min(i + batchSize, originalSubtitles.length);

        if (typeof translatingBatchFnItem === 'function') {
            setProgressMessage(translatingBatchFnItem(batchNumber, totalBatches, absLineStart, absLineEnd));
        } else {
            setProgressMessage(`Translating batch ${batchNumber}/${totalBatches}...`);
        }

        const translatedTexts = await translateTextBatch(
          originalTexts,
          targetLanguageCode,
          targetLangName,
          temperature,
          systemInstruction,
          geminiModel
        );

        setTranslatedSubtitles(prev => {
          const updated = [...prev];
          for (let j = 0; j < translatedTexts.length; j++) {
            if (updated[i + j]) {
              updated[i + j].text = translatedTexts[j] || batchOriginals[j].text;
            }
          }
          return updated;
        });
        processedInThisRun += batchOriginals.length;
        setProgress(Math.round(((i + batchOriginals.length) / originalSubtitles.length) * 100));
      }

      if (!translationAbortControllerRef.current.signal.aborted) {
        addAlert('success', 'translationComplete');
        setProgress(100);
        setManualStartLine(originalSubtitles.length + 1);
      }
    } catch (error: any) {
      console.error("Translation error:", error);
      if (error.message.startsWith('WEBHOOK_')) {
          addAlert('error', 'errorWebhookFailed');
      } else {
         addAlert('error', 'errorTranslationFailed');
      }
       setManualStartLine(currentBatchStartIndexRef.current + 1);
    } finally {
      setIsTranslating(false);
      setIsLoading(false);
      setProgressMessage(null);
      translationAbortControllerRef.current = null;
    }
  }, [
    originalSubtitles, targetLanguageCode, batchSize, temperature, customPrompt, isFluentTranslation,
    geminiModel, addAlert, texts, manualStartLine
  ]);

  const handleStopTranslation = () => {
    if (translationAbortControllerRef.current) {
      translationAbortControllerRef.current.abort();
      addAlert('info', 'stoppingTranslation');
      setManualStartLine(currentBatchStartIndexRef.current + 1);
    }
    setIsTranslating(false);
    setIsLoading(false);
    setProgressMessage(null);
  };

  const handleDownload = () => {
    if (originalSubtitles.length === 0) {
        addAlert('error', 'errorNoSubtitlesToTranslate');
        return;
    }

    try {
        const subtitlesForDownload = originalSubtitles.map((origEntry, index) => {
            const translatedText = translatedSubtitles[index]?.text;
            if (translatedText && translatedText.trim() !== '') {
                return { 
                    id: origEntry.id, 
                    originalId: origEntry.originalId,
                    startTime: origEntry.startTime,
                    endTime: origEntry.endTime,
                    text: translatedText 
                };
            }
            return origEntry;
        });

      if (subtitlesForDownload.every(s => !s.text || s.text.trim() === '')) {
        addAlert('warning', 'errorNoTranslatedSubtitles');
      }

      const srtString = stringifySrt(subtitlesForDownload);
      const blob = new Blob([srtString], { type: 'text/srt;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const defaultFileNameItem = getTextFromPath(texts, 'translatedFileDefaultName');
      const defaultFileName = typeof defaultFileNameItem === 'string' ? defaultFileNameItem : "subtitles";

      const baseFileName = originalFileName
        ? originalFileName.substring(0, originalFileName.lastIndexOf('.')) || defaultFileName
        : defaultFileName;
      const langSuffix = targetLanguageCode || 'translated';
      a.download = `${baseFileName}.${langSuffix}.srt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addAlert('success', 'translatedFileDownloaded');
    } catch (error) {
      console.error("Error preparing download:", error);
      addAlert('error', 'errorDownloadFailed');
    }
  };

  const handleApplyRecommendedSettings = () => {
    setTemperature(RECOMMENDED_TEMPERATURE);
    setBatchSize(RECOMMENDED_BATCH_SIZE);
    setIsFluentTranslation(RECOMMENDED_IS_FLUENT);
    addAlert('success', 'controlPanel.recommendedSettingsApplied');
  };

  const handleInputMethodChange = (method: 'file' | 'text' | 'youtube') => {
    resetSubtitlesAndState(true);
    setInputMethod(method);
    if (method !== 'file') setOriginalFile(null);
    if (method !== 'text') setSrtTextContent('');
    if (method !== 'youtube') setYoutubeUrl('');
  };

  const handleSubtitleTextChange = useCallback((id: string, newText: string, isTranslated: boolean) => {
    const setter = isTranslated ? setTranslatedSubtitles : setOriginalSubtitles;
    setter(prevSubs => prevSubs.map(sub => sub.id === id ? { ...sub, text: newText } : sub));
  }, []);

  const headerProps = {
    uiLang, onToggleLang: () => setUiLang(prev => prev === 'en' ? 'fa' : 'en'),
    theme, onToggleTheme: handleToggleTheme,
    searchQuery, onSearchChange: setSearchQuery,
    texts: getTextFromPath(texts, 'header') as AppTextDefinition || {},
    activeTab, onToggleTab: setActiveTab
  };

  const controlPanelProps: ControlPanelProps = {
    texts: getTextFromPath(texts, 'controlPanel') as AppTextDefinition || {},
    uiLang,
    inputMethod, onInputMethodChange: handleInputMethodChange,
    originalFile, originalFileName, onFileSelect: handleFileSelect,
    srtTextContent, onSrtTextChange: handleSrtTextChange,
    youtubeUrl, onYoutubeUrlChange: setYoutubeUrl, onFetchYouTubeSubtitles: handleFetchYouTubeSubtitles,
    supportedLanguages: SUPPORTED_LANGUAGES,
    targetLanguageCode, onTargetLanguageChange: setTargetLanguageCode,
    geminiModel, onGeminiModelChange: setGeminiModel,
    temperature, onTemperatureChange: setTemperature,
    batchSize, onBatchSizeChange: setBatchSize,
    customPrompt, onCustomPromptChange: setCustomPrompt,
    isFluentTranslation, onIsFluentTranslationChange: setIsFluentTranslation,
    onApplyRecommendedSettings: handleApplyRecommendedSettings,
    manualStartLine, onManualStartLineChange: setManualStartLine,
    onTranslate: handleTranslate,
    onStopTranslation: handleStopTranslation,
    onDownload: handleDownload,
    isLoading, isTranslating,
    parsedSubtitlesCount: originalSubtitles.length,
    translatedSubtitlesCount: translatedSubtitles.filter(s => s.text.trim() !== '').length,
    progress, progressMessage
  };

  const subtitleEditorPanelProps: SubtitleEditorPanelProps = {
    originalSubtitles, translatedSubtitles,
    searchQuery,
    texts: getTextFromPath(texts, 'editorPanel') as AppTextDefinition || {},
    uiLang,
    targetLanguageCode,
    isLoadingOriginal: isLoading && (inputMethod === 'file' || inputMethod === 'youtube') && originalSubtitles.length === 0,
    isLoadingTranslation: isTranslating && translatedSubtitles.length > 0 && translatedSubtitles.some(s => s.text === ''),
    onSubtitleTextChange: handleSubtitleTextChange,
  };

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  
  const footerPathResult = getTextFromPath(texts, 'footer');

  let resolvedCopyrightFn: (year: number) => string = 
    (year: number) => `© ${year} Amirali. All rights reserved. (Default)`;
  let resolvedApiKeyNote: string = "Translation powered by Google Gemini AI. (Default)";

  if (footerPathResult && typeof footerPathResult === 'object' && !Array.isArray(footerPathResult)) {
    const footerDef = footerPathResult as AppTextDefinition;

    const copyrightCandidate = footerDef.copyright;
    if (typeof copyrightCandidate === 'function') {
      resolvedCopyrightFn = copyrightCandidate as (year: number) => string;
    }

    const apiKeyNoteCandidate = footerDef.apiKeyNote;
    if (typeof apiKeyNoteCandidate === 'string') {
      resolvedApiKeyNote = apiKeyNoteCandidate;
    }
  }
  
  const copyrightTextFn = resolvedCopyrightFn;
  const apiKeyNoteText = resolvedApiKeyNote;


  return (
    <div
      className={clsx(
        "flex flex-col min-h-screen transition-colors duration-300",
        uiLang === 'fa' ? 'font-vazir' : 'font-inter',
        "bg-[var(--theme-bg-deep)] text-[var(--theme-text-primary)]"
      )}
      dir={uiLang === 'fa' ? 'rtl' : 'ltr'}
    >
      <Header {...headerProps} />

      {activeTab === 'translator' ? (
        <main className="flex-grow container mx-auto max-w-full flex flex-col lg:flex-row p-2 sm:p-3 md:p-4 gap-3 md:gap-4">
          <ControlPanel {...controlPanelProps} />
          <SubtitleEditorPanel {...subtitleEditorPanelProps} />
        </main>
      ) : (
        <main className="flex-grow container mx-auto p-2 sm:p-3 md:p-4">
          <GitHubGuidePanel uiLang={uiLang} />
        </main>
      )}

      <footer className={clsx(
        "p-3 sm:p-4 text-center text-xs border-t transition-colors duration-300",
        "bg-[var(--theme-bg-panel-opaque)] border-[var(--theme-border)] text-[var(--theme-text-secondary)]"
      )}>
        <p>{copyrightTextFn(currentYear)}</p>
        <p className="mt-1">{apiKeyNoteText}</p>
      </footer>

      <div
        aria-live="polite"
        aria-atomic="true"
        className={clsx(
            "fixed bottom-0 left-0 right-0 p-4 space-y-3 z-50 pointer-events-none",
            "sm:bottom-4 sm:left-auto sm:right-4 sm:w-auto sm:max-w-md sm:p-0"
        )}
      >
        {alerts.map(alert => (
          <AlertMessage key={alert.id} {...alert} onClose={removeAlert} />
        ))}
      </div>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<React.StrictMode><App /></React.StrictMode>);
} else {
  console.error("Root element not found. App could not be mounted.");
}
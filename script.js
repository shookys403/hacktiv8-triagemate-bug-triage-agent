/* ==========================================================================
   TriageMate — script.js  (v3)
   Rule-based AI triage pipeline for raw bug reports.
   Fully client-side. No external libraries, no API calls.
   All DOM writes use textContent / createElement — never innerHTML with
   user-supplied data (XSS prevention).
   Now supports English (EN) and Indonesian (ID) with an i18n system.
   ========================================================================== */

'use strict';

/* --------------------------------------------------------------------------
   0. Configuration
   -------------------------------------------------------------------------- */
const CONFIG = {
  /** Jaccard similarity threshold above which a report is flagged duplicate */
  DUPLICATE_THRESHOLD: 0.35,

  /** localStorage key for history array */
  STORAGE_KEY: 'triagemate_history',

  /** localStorage key for language preference */
  LANG_KEY: 'triagemate_lang',

  /** Max characters accepted from the textarea */
  MAX_INPUT_LENGTH: 20_000,

  /** Max tokens used when computing Jaccard (prevents O(n²) on huge inputs) */
  MAX_TOKENS_FOR_SIMILARITY: 300,
};

/* --------------------------------------------------------------------------
   I18N — translations object
   All UI strings live here. Dynamic strings (reasoning steps, next actions,
   missing-info labels, error messages) are also keyed here so language
   changes take full effect without reload.
   -------------------------------------------------------------------------- */
const I18N = {
  en: {
    /* Header / nav */
    tagline:            'AI Bug Triage Agent',
    /* Input panel */
    inputHeading:       'Paste Bug Report',
    inputLabel:         'Raw bug report text',
    inputHint:          'Max 20 000 characters. Supports English and Indonesian.',
    inputPlaceholder:   'Paste your raw bug report here…\n\ne.g. Title, Steps to reproduce, Expected vs Actual, Environment, etc.',
    triageBtn:          'Triage Report',
    triageBtnLoading:   'Analysing…',
    clearBtn:           'Clear',
    samplesTitle:       'Sample Reports (click to load)',
    sampleCritical:     'Critical — Security',
    sampleMedium:       'Medium — Performance',
    sampleLow:          'Low — UI',
    sampleId:           'Medium — Login (Indonesian)',
    sampleCriticalAria: 'Load critical security sample',
    sampleMediumAria:   'Load medium performance sample',
    sampleLowAria:      'Load low UI sample',
    sampleIdAria:       'Load Indonesian medium login sample',
    /* Result card */
    resultHeading:      'Triage Card',
    emptyState:         'Paste a bug report and click Triage Report to see the structured card here.',
    loadingState:       'Analysing report…',
    errorFallback:      'Something went wrong.',
    errorEmpty:         'Please paste a bug report before triaging.',
    errorTooLong:       'Input exceeds 20 000 characters. Please shorten the report.',
    errorPipeline:      'Triage failed: ',
    dupWarning:         'Possible Duplicate',
    dupDetail:          '%SIM% similar to: "%TITLE%"',
    dupNotSaved:        'Duplicate detected — not saved to history.',
    dupNotSavedDetail:  '%SIM% similar to report: ',
    dupOrigLink:        'View original report',
    dupIdLabel:         'ID:',
    missingHeading:     '⚠️ Missing Info',
    actionsHeading:     'Suggested Next Actions',
    parsedHeading:      'Parsed Details',
    reasoningHeading:   'Agent Reasoning',
    copyMdBtn:          'Copy as Markdown',
    exportJsonBtn:      'Export JSON',
    copiedFeedback:     '✅ Copied!',
    /* Parsed field labels */
    fieldSteps:         'Steps',
    fieldExpected:      'Expected',
    fieldActual:        'Actual',
    fieldEnv:           'Environment',
    fieldNotSpecified:  'Not specified',
    /* History */
    historyHeading:     'Triage History',
    searchLabel:        'Search history',
    searchPlaceholder:  'Search history…',
    filterLabel:        'Filter by severity',
    filterAll:          'All Severities',
    clearHistoryBtn:    'Clear All',
    clearHistoryConfirm:'Clear all triage history? This cannot be undone.',
    historyEmpty:       'No history yet. Triage your first report!',
    historyReload:      '↩ Reload',
    historyDelete:      '✕',
    /* Footer */
    footerNote:         'TriageMate — fully client-side, no data leaves your browser.',
    /* Untitled fallback */
    untitled:           'Untitled Bug Report',
    untitledShort:      'Untitled',
    /* Reasoning steps */
    r_parse:            '1 · parseReport',
    r_classify:         '2 · classifyCategory',
    r_severity:         '3 · scoreSeverity',
    r_duplicate:        '4 · detectDuplicate',
    r_missing:          '5 · detectMissingInfo',
    r_actions:          '6 · suggestNextActions',
    r_notFound:         '(not found)',
    r_none:             'none',
    r_present:          'All required fields are present.',
    r_dupDetected:      'DUPLICATE DETECTED',
    r_similarity:       'Similarity',
    r_matchedReport:    'Matched report',
    r_threshold:        'Threshold',
    r_noDup:            'No duplicate found above threshold',
    r_bestSim:          'Best similarity',
    r_historySize:      'History size',
    r_reports:          'reports',
    r_missingFields:    'Missing fields',
    r_totalScore:       'Total score',
    r_level:            'Level',
    r_matchedSignals:   'Matched signals',
    r_scores:           'Scores',
    r_result:           'Result',
    r_topSignals:       'Top signals',
    /* Missing info labels */
    miss_title:         'Title / summary of the bug',
    miss_steps:         'Steps to reproduce',
    miss_expected:      'Expected result / behaviour',
    miss_actual:        'Actual result / behaviour observed',
    miss_env:           'Environment details (OS, browser, version)',
    miss_version:       'App / product version or build number',
    /* Next-action templates */
    act_missingInfo:    'Request missing information from reporter: %FIELDS%.',
    act_critical1:      'Escalate immediately to on-call team and notify incident channel.',
    act_critical2:      'Assess blast radius: identify affected users/systems before patching.',
    act_high1:          'Schedule for next sprint and assign to relevant team lead.',
    act_high2:          'Verify whether the issue exists in the previous release (regression check).',
    act_medium:         'Add to the backlog; prioritise in the next grooming session.',
    act_low:            'Log in backlog as low-priority; consider bundling with a related task.',
    act_security:       'Perform immediate security review; do NOT disclose details publicly yet.',
    act_performance:    'Reproduce with profiler attached and capture baseline metrics (CPU, memory, network waterfall).',
    act_backend:        'Retrieve server logs around the reported time window and attach to the ticket.',
    act_ui:             'Test across Chrome, Firefox, and Safari at 360px, 768px, and 1280px breakpoints.',
    act_data:           'Take a backup before any fix attempt; isolate affected records in a staging copy.',
    act_other:          'Gather more context from reporter to route to the correct team.',
    act_dup:            'Link to likely duplicate report (%SIM% similar). Confirm with reporter before closing.',
    act_noSteps:        'Ask reporter for a minimal reproducible example or screen recording.',
    /* Markdown export */
    md_severity:        'Severity',
    md_category:        'Category',
    md_score:           'Score',
    md_triaged:         'Triaged',
    md_parsedFields:    'Parsed Fields',
    md_fieldSteps:      'Steps to Reproduce',
    md_fieldExpected:   'Expected Result',
    md_fieldActual:     'Actual Result',
    md_fieldEnv:        'Environment',
    md_signals:         'Severity Signals',
    md_actions:         'Suggested Next Actions',
    md_missing:         '⚠️ Missing Information',
    md_duplicate:       '⚠️ Possible Duplicate',
    md_simWith:         'Similarity: %SIM%% with "%TITLE%"',
    md_none:            'None matched',
    md_duplicateOf:     'Duplicate Of',
    md_dupId:           'Original Report ID',
    /* Reasoning: skip-save outcome */
    r_dupSkipped:       'Matched report "%TITLE%" at %SIM%% (ID: %ID%) — SKIPPED saving to history.',
    r_dupSaved:         'No duplicate — report saved to history.',
  },

  id: {
    /* Header / nav */
    tagline:            'Agen Triase Bug AI',
    /* Input panel */
    inputHeading:       'Tempel Laporan Bug',
    inputLabel:         'Teks laporan bug mentah',
    inputHint:          'Maks. 20.000 karakter. Mendukung Bahasa Indonesia dan Inggris.',
    inputPlaceholder:   'Tempel laporan bug mentah Anda di sini…\n\nContoh: Judul, Langkah reproduksi, Hasil yang diharapkan vs aktual, Lingkungan, dll.',
    triageBtn:          'Triase Laporan',
    triageBtnLoading:   'Menganalisis…',
    clearBtn:           'Bersihkan',
    samplesTitle:       'Contoh Laporan (klik untuk memuat)',
    sampleCritical:     'Kritis — Keamanan',
    sampleMedium:       'Menengah — Performa',
    sampleLow:          'Rendah — UI',
    sampleId:           'Menengah — Login (Indonesia)',
    sampleCriticalAria: 'Muat contoh kritis keamanan',
    sampleMediumAria:   'Muat contoh menengah performa',
    sampleLowAria:      'Muat contoh rendah UI',
    sampleIdAria:       'Muat contoh Indonesia login menengah',
    /* Result card */
    resultHeading:      'Kartu Triase',
    emptyState:         'Tempel laporan bug dan klik Triase Laporan untuk melihat kartu terstruktur di sini.',
    loadingState:       'Menganalisis laporan…',
    errorFallback:      'Terjadi kesalahan.',
    errorEmpty:         'Harap tempel laporan bug sebelum melakukan triase.',
    errorTooLong:       'Input melebihi 20.000 karakter. Harap persingkat laporan.',
    errorPipeline:      'Triase gagal: ',
    dupWarning:         'Kemungkinan Duplikat',
    dupDetail:          '%SIM% mirip dengan: "%TITLE%"',
    dupNotSaved:        'Duplikat terdeteksi — tidak disimpan ke riwayat.',
    dupNotSavedDetail:  '%SIM% mirip dengan laporan: ',
    dupOrigLink:        'Lihat laporan asli',
    dupIdLabel:         'ID:',
    missingHeading:     '⚠️ Info yang Hilang',
    actionsHeading:     'Saran Tindakan Selanjutnya',
    parsedHeading:      'Detail Parsing',
    reasoningHeading:   'Penalaran Agen',
    copyMdBtn:          'Salin sebagai Markdown',
    exportJsonBtn:      'Ekspor JSON',
    copiedFeedback:     '✅ Disalin!',
    /* Parsed field labels */
    fieldSteps:         'Langkah',
    fieldExpected:      'Diharapkan',
    fieldActual:        'Aktual',
    fieldEnv:           'Lingkungan',
    fieldNotSpecified:  'Tidak disebutkan',
    /* History */
    historyHeading:     'Riwayat Triase',
    searchLabel:        'Cari riwayat',
    searchPlaceholder:  'Cari riwayat…',
    filterLabel:        'Filter berdasarkan tingkat',
    filterAll:          'Semua Tingkat',
    clearHistoryBtn:    'Hapus Semua',
    clearHistoryConfirm:'Hapus semua riwayat triase? Tindakan ini tidak bisa dibatalkan.',
    historyEmpty:       'Belum ada riwayat. Triase laporan pertama Anda!',
    historyReload:      '↩ Muat Ulang',
    historyDelete:      '✕',
    /* Footer */
    footerNote:         'TriageMate — sepenuhnya sisi klien, tidak ada data yang keluar dari browser Anda.',
    /* Untitled fallback */
    untitled:           'Laporan Bug Tanpa Judul',
    untitledShort:      'Tanpa Judul',
    /* Reasoning steps */
    r_parse:            '1 · parseReport',
    r_classify:         '2 · classifyCategory',
    r_severity:         '3 · scoreSeverity',
    r_duplicate:        '4 · detectDuplicate',
    r_missing:          '5 · detectMissingInfo',
    r_actions:          '6 · suggestNextActions',
    r_notFound:         '(tidak ditemukan)',
    r_none:             'tidak ada',
    r_present:          'Semua field yang diperlukan tersedia.',
    r_dupDetected:      'DUPLIKAT TERDETEKSI',
    r_similarity:       'Kemiripan',
    r_matchedReport:    'Laporan yang cocok',
    r_threshold:        'Ambang batas',
    r_noDup:            'Tidak ada duplikat di atas ambang batas',
    r_bestSim:          'Kemiripan terbaik',
    r_historySize:      'Ukuran riwayat',
    r_reports:          'laporan',
    r_missingFields:    'Field yang hilang',
    r_totalScore:       'Skor total',
    r_level:            'Tingkat',
    r_matchedSignals:   'Sinyal yang cocok',
    r_scores:           'Skor',
    r_result:           'Hasil',
    r_topSignals:       'Sinyal teratas',
    /* Missing info labels */
    miss_title:         'Judul / ringkasan bug',
    miss_steps:         'Langkah untuk mereproduksi',
    miss_expected:      'Hasil yang diharapkan / perilaku',
    miss_actual:        'Hasil aktual / perilaku yang diamati',
    miss_env:           'Detail lingkungan (OS, browser, versi)',
    miss_version:       'Versi aplikasi / nomor build',
    /* Next-action templates */
    act_missingInfo:    'Minta informasi yang hilang dari pelapor: %FIELDS%.',
    act_critical1:      'Eskalasi segera ke tim on-call dan beri tahu saluran insiden.',
    act_critical2:      'Nilai dampak: identifikasi pengguna/sistem yang terdampak sebelum menambal.',
    act_high1:          'Jadwalkan untuk sprint berikutnya dan tugaskan ke pimpinan tim terkait.',
    act_high2:          'Verifikasi apakah masalah ada di rilis sebelumnya (pemeriksaan regresi).',
    act_medium:         'Tambahkan ke backlog; prioritaskan di sesi grooming berikutnya.',
    act_low:            'Catat di backlog sebagai prioritas rendah; pertimbangkan menggabungkan dengan tugas terkait.',
    act_security:       'Lakukan tinjauan keamanan segera; JANGAN ungkapkan detail secara publik dulu.',
    act_performance:    'Reproduksi dengan profiler terpasang dan rekam metrik dasar (CPU, memori, waterfall jaringan).',
    act_backend:        'Ambil log server di sekitar jendela waktu yang dilaporkan dan lampirkan ke tiket.',
    act_ui:             'Uji di Chrome, Firefox, dan Safari pada breakpoint 360px, 768px, dan 1280px.',
    act_data:           'Buat cadangan sebelum upaya perbaikan; isolasi record yang terdampak di salinan staging.',
    act_other:          'Kumpulkan lebih banyak konteks dari pelapor untuk meneruskan ke tim yang tepat.',
    act_dup:            'Tautkan ke laporan yang kemungkinan duplikat (%SIM% mirip). Konfirmasi dengan pelapor sebelum menutup.',
    act_noSteps:        'Minta pelapor untuk contoh reproduksi minimal atau rekaman layar.',
    /* Markdown export */
    md_severity:        'Tingkat Keparahan',
    md_category:        'Kategori',
    md_score:           'Skor',
    md_triaged:         'Ditriase',
    md_parsedFields:    'Field Parsing',
    md_fieldSteps:      'Langkah Reproduksi',
    md_fieldExpected:   'Hasil yang Diharapkan',
    md_fieldActual:     'Hasil Aktual',
    md_fieldEnv:        'Lingkungan',
    md_signals:         'Sinyal Keparahan',
    md_actions:         'Saran Tindakan Selanjutnya',
    md_missing:         '⚠️ Informasi yang Hilang',
    md_duplicate:       '⚠️ Kemungkinan Duplikat',
    md_simWith:         'Kemiripan: %SIM%% dengan "%TITLE%"',
    md_none:            'Tidak ada yang cocok',
    md_duplicateOf:     'Duplikat Dari',
    md_dupId:           'ID Laporan Asli',
    /* Reasoning: skip-save outcome */
    r_dupSkipped:       'Laporan "%TITLE%" cocok pada %SIM%% (ID: %ID%) — DILEWATI, tidak disimpan.',
    r_dupSaved:         'Tidak ada duplikat — laporan disimpan ke riwayat.',
  },
};

/* Active language — resolved at runtime (see DOMContentLoaded) */
let lang = 'en';

/** t(key) — returns the translation string for the current language */
function t(key) {
  return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
}

/* --------------------------------------------------------------------------
   applyI18n()
   Walk all [data-i18n] and [data-i18n-placeholder] elements and update
   their textContent / placeholder / aria-label via textContent (safe).
   -------------------------------------------------------------------------- */
function applyI18n() {
  /* Static text nodes */
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (val) el.textContent = val;
  });

  /* Placeholders (input, textarea) */
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    const val = t(key);
    if (val) el.placeholder = val;
  });

  /* aria-label on buttons that carry data-i18n-aria */
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.dataset.i18nAria;
    const val = t(key);
    if (val) el.setAttribute('aria-label', val);
  });

  /* Special: textarea placeholder */
  const ta = document.getElementById('reportInput');
  if (ta) ta.placeholder = t('inputPlaceholder');

  /* Special: loadingState aria-label */
  const ls = document.getElementById('loadingState');
  if (ls) ls.setAttribute('aria-label', t('loadingState'));

  /* Special: filter first option text */
  const opt = document.querySelector('#filterSeverity option[value=""]');
  if (opt) opt.textContent = t('filterAll');
}

/* ==========================================================================
   Pipeline functions
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. parseReport(text)
   Extracts structured fields from raw text using regex patterns and
   keyword heuristics for both English and Indonesian labels.
   Returns: { title, steps, expected, actual, environment }
   -------------------------------------------------------------------------- */
function parseReport(text) {
  const t = text.trim();

  /**
   * Generic section extractor.
   * Matches a labelled heading (EN or ID), then captures the body
   * until the next heading-like line or end of text.
   */
  function extractSection(labels, src) {
    const escaped = labels.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(
      `(?:^|\\n)\\s*(?:${escaped.join('|')})\\s*[:\\-]?\\s*([\\s\\S]*?)(?=\\n\\s*(?:[A-Z][^\\n]{0,40}[:\\-]|[A-Z][a-z]|[A-Z]{2,}|Langkah|Hasil|Aktual|Lingkungan|Diharapkan)|$)`,
      'i'
    );
    const m = src.match(pattern);
    return m ? m[1].trim() : null;
  }

  /** Inline single-line field */
  function extractInline(labels, src) {
    const escaped = labels.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(
      `(?:^|\\n)\\s*(?:${escaped.join('|')})\\s*[:\\-]?\\s*(.+)`,
      'i'
    );
    const m = src.match(pattern);
    return m ? m[1].trim() : null;
  }

  /* ----- Title (EN + ID) ----- */
  let title = extractInline([
    'title', 'bug', 'issue', 'subject', 'summary',
    'judul', 'masalah', 'ringkasan', 'laporan',
  ], t);
  if (!title) {
    const firstLine = t.split('\n').find(l => l.trim().length > 5);
    title = firstLine ? firstLine.trim().replace(/^[#\-*]+\s*/, '') : null;
  }
  if (title && title.length > 120) title = title.slice(0, 120) + '…';

  /* ----- Steps to reproduce (EN + ID) ----- */
  const steps = extractSection([
    'steps to reproduce', 'steps', 'reproduction steps', 'repro steps', 'how to reproduce',
    'langkah', 'langkah reproduksi', 'cara reproduksi', 'cara mengulangi', 'langkah-langkah',
  ], t);

  /* ----- Expected result (EN + ID) ----- */
  const expected = extractSection([
    'expected result', 'expected behavior', 'expected behaviour', 'expected', 'should',
    'hasil yang diharapkan', 'hasil diharapkan', 'seharusnya', 'diharapkan',
  ], t);

  /* ----- Actual result (EN + ID) ----- */
  const actual = extractSection([
    'actual result', 'actual behavior', 'actual behaviour', 'actual', 'observed', 'instead',
    'hasil aktual', 'aktual', 'hasil sebenarnya', 'yang terjadi', 'nyatanya',
  ], t);

  /* ----- Environment ----- */
  const osMatch = t.match(
    /\b(windows\s*\d*|win\d*|macos?|mac\s*os|linux|ubuntu|debian|android|ios|iphone|ipad)\b/i
  );
  const os = osMatch ? osMatch[0].trim() : null;

  const browserMatch = t.match(
    /\b(chrome|firefox|safari|edge|opera|brave|ie|internet\s*explorer)\s*[\d./]*/i
  );
  const browser = browserMatch ? browserMatch[0].trim() : null;

  // EN and ID version labels
  const versionMatch = t.match(
    /\b(?:version|versi|v|ver|build|release|app|aplikasi)\s*[:\-]?\s*v?(\d[\d.\-_a-z]*)/i
  );
  const version = versionMatch ? versionMatch[1].trim() : null;

  const urlMatch = t.match(/https?:\/\/[^\s"')>]+/i);
  const url = urlMatch ? urlMatch[0] : null;

  const environment = { os, browser, version, url };

  return { title, steps, expected, actual, environment };
}

/* --------------------------------------------------------------------------
   2. classifyCategory(text)
   Scores text against keyword lists per category for EN + ID.
   Returns: { category: string, scores: Object, topSignals: string[] }
   -------------------------------------------------------------------------- */
function classifyCategory(text) {
  const lower = text.toLowerCase();

  const CATEGORIES = {
    'Security': [
      /* EN */ 'xss', 'sql injection', 'csrf', 'auth', 'authentication', 'authoriz',
      'password', 'token', 'session', 'exploit', 'vulnerability', 'hack',
      'injection', 'privilege', 'sensitive data', 'pii', 'leak', 'exposure',
      'certificate', 'tls', 'ssl', 'cors', 'phishing',
      /* ID */ 'kata sandi', 'kata kunci', 'bocor', 'kerentanan', 'celah keamanan',
      'injeksi', 'sesi', 'otorisasi', 'autentikasi', 'akses tidak sah',
    ],
    'Performance': [
      /* EN */ 'slow', 'latency', 'lag', 'timeout', 'hang', 'freeze', 'unresponsive',
      'memory leak', 'high cpu', 'cpu usage', 'load time', 'ttfb',
      'performance', 'benchmark', 'throughput', 'bottleneck', 'cache',
      /* ID */ 'lambat', 'lemot', 'latensi', 'tidak responsif', 'macet', 'ngehang',
      'waktu muat', 'performa', 'kinerja', 'hambatan',
    ],
    'Backend/API': [
      /* EN */ '500', '502', '503', '504', '400', '401', '403', '404',
      'api', 'endpoint', 'server', 'database', 'db', 'query', 'sql',
      'request', 'response', 'payload', 'json', 'rest', 'graphql',
      'microservice', 'webhook', 'cron', 'backend', 'null pointer',
      'exception', 'stack trace', 'traceback',
      /* ID */ 'basis data', 'permintaan', 'respons', 'server error', 'galat server',
      'pengecualian', 'jejak tumpukan',
    ],
    'UI': [
      /* EN */ 'button', 'layout', 'css', 'style', 'display', 'render', 'visual',
      'font', 'color', 'colour', 'icon', 'image', 'modal', 'dialog',
      'tooltip', 'dropdown', 'menu', 'navbar', 'sidebar', 'responsive',
      'mobile', 'desktop', 'alignment', 'overlap', 'hidden', 'visible',
      'click', 'hover', 'animation', 'transition', 'scroll',
      /* ID */ 'tombol', 'tata letak', 'tampilan', 'ikon', 'gambar', 'menu navigasi',
      'bilah samping', 'bergulir', 'animasi', 'warna', 'huruf',
    ],
    'Data': [
      /* EN */ 'data loss', 'data corruption', 'wrong data', 'incorrect data',
      'import', 'export', 'csv', 'migration', 'sync', 'replication',
      'dashboard', 'report', 'chart', 'calculation', 'formula',
      'filter', 'sort', 'search', 'pagination', 'record', 'entry',
      /* ID */ 'data hilang', 'data rusak', 'data salah', 'data tidak valid',
      'impor', 'ekspor', 'sinkronisasi', 'laporan', 'grafik', 'kalkulasi',
      'filter', 'cari', 'rekam', 'entri',
    ],
  };

  const scores = {};
  const matchedSignals = {};

  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    let score = 0;
    const signals = [];
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        score++;
        signals.push(kw);
      }
    }
    scores[cat] = score;
    matchedSignals[cat] = signals;
  }

  let category = 'Other';
  let maxScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > maxScore) { maxScore = score; category = cat; }
  }

  const topSignals = matchedSignals[category] ? matchedSignals[category].slice(0, 5) : [];

  return { category, scores, topSignals };
}

/* --------------------------------------------------------------------------
   3. scoreSeverity(text)
   Assigns Critical / High / Medium / Low with a numeric score.
   Includes both English and Indonesian signal patterns.
   Returns: { level: string, score: number, signals: string[] }
   -------------------------------------------------------------------------- */
function scoreSeverity(text) {
  const lower = text.toLowerCase();

  /**
   * Each signal: pattern (tested against lower), weight, label.
   *   +3 = critical  |  +2 = high  |  +1 = medium  |  -1 = downgrade
   */
  const SIGNALS = [
    /* ── Critical ── */
    { pattern: /\b(data loss|data corruption|lost.*data|corrupt|data hilang|data rusak|kehilangan data)\b/i,
      weight: 3, label: 'data loss/corruption' },
    { pattern: /\b(security|exploit|injection|xss|csrf|rce|remote code|privilege escalation|bocor|kerentanan|celah keamanan|injeksi)\b/i,
      weight: 3, label: 'security vulnerability' },
    { pattern: /\b(crash|crashes|crashed|system down|outage|down|unavailable|not working|aplikasi crash|crash|error fatal|tidak bisa dibuka|tidak bisa diakses)\b/i,
      weight: 3, label: 'crash / outage' },
    { pattern: /\b(payment|billing|charge|transaction|financial|pembayaran|tagihan|transaksi|keuangan)\b/i,
      weight: 3, label: 'financial impact' },
    { pattern: /\b(production|prod\b|live site|all users|all customers|semua pengguna|semua pelanggan|produksi)\b/i,
      weight: 2, label: 'production impact' },
    { pattern: /\b(blocker|blocking|p0|severity.?1|critical|kritis|pemblokir|sangat penting)\b/i,
      weight: 3, label: 'explicit critical label' },

    /* ── High ── */
    { pattern: /\b(login|sign.?in|authentication|cannot access|unable to access|tidak bisa login|gagal login|tidak dapat masuk|tidak bisa masuk)\b/i,
      weight: 2, label: 'authentication failure' },
    { pattern: /\b(500|502|503|server error|internal error|exception|stack trace|galat server|error internal)\b/i,
      weight: 2, label: 'server error' },
    { pattern: /\b(data.*wrong|wrong.*data|incorrect.*result|wrong.*result|data.*salah|salah.*data|hasil.*tidak sesuai)\b/i,
      weight: 2, label: 'incorrect data' },
    { pattern: /\b(regression|broke|broken|regresi|rusak|tidak berfungsi)\b/i,
      weight: 2, label: 'regression' },
    { pattern: /\b(p1|high|urgent|asap|immediately|blocking|mendesak|segera|tinggi)\b/i,
      weight: 2, label: 'explicit high label' },
    { pattern: /\b(many users|multiple users|several users|most users|banyak pengguna|beberapa pengguna|sebagian besar pengguna)\b/i,
      weight: 2, label: 'broad user impact' },

    /* ── Medium ── */
    { pattern: /\b(slow|latency|timeout|performance|lag|hang|lambat|latensi|lemot|ngehang|macet)\b/i,
      weight: 1, label: 'performance issue' },
    { pattern: /\b(404|not found|missing page|broken link|halaman tidak ditemukan|tautan rusak)\b/i,
      weight: 1, label: '404 / missing resource' },
    { pattern: /\b(some users|occasionally|intermittent|sometimes|rarely|beberapa pengguna|sesekali|kadang-kadang|jarang)\b/i,
      weight: 1, label: 'intermittent / limited scope' },
    { pattern: /\b(workaround|work.?around|solusi sementara|jalan keluar sementara)\b/i,
      weight: 1, label: 'workaround available' },
    { pattern: /\b(p2|medium|moderate|menengah|sedang)\b/i,
      weight: 1, label: 'explicit medium label' },

    /* ── Low / downgrade ── */
    { pattern: /\b(typo|spelling|wording|cosmetic|minor|trivial|nitpick|nice.?to.?have|salah ketik|ejaan|kecil|sepele)\b/i,
      weight: -1, label: 'cosmetic / trivial' },
    { pattern: /\b(p3|p4|low|enhancement|feature request|wish|rendah|peningkatan|permintaan fitur)\b/i,
      weight: -1, label: 'explicit low label' },
    { pattern: /\b(ui|layout|alignment|color|colour|font|icon|visual|tampilan|tata letak|warna|ikon)\b/i,
      weight: 1, label: 'UI issue' },
  ];

  let score = 0;
  const signals = [];

  for (const sig of SIGNALS) {
    if (sig.pattern.test(lower)) {
      score += sig.weight;
      signals.push(`${sig.label} (${sig.weight > 0 ? '+' : ''}${sig.weight})`);
    }
  }

  let level;
  if (score >= 6)      level = 'Critical';
  else if (score >= 3) level = 'High';
  else if (score >= 1) level = 'Medium';
  else                 level = 'Low';

  return { level, score, signals };
}

/* --------------------------------------------------------------------------
   4. detectDuplicate(text, history)
   Computes Jaccard similarity on token sets. Stop-words include both
   English and Indonesian common words for bilingual support.
   Returns: { isDuplicate: boolean, match: Object|null, similarity: number }
   -------------------------------------------------------------------------- */
function detectDuplicate(text, history) {
  /**
   * Bilingual stop-word list (EN + ID).
   * Tokenise: lowercase, strip punctuation, split, filter stop-words & short tokens.
   */
  const STOP_WORDS = new Set([
    /* EN */ 'the','a','an','is','it','in','on','at','to','and','or','of','for',
    'with','was','are','be','been','has','have','that','this','not','but',
    'from','by','as','i','we','my','our','you','your','they','their',
    'when','what','how','which','where','so','then','if','can','could',
    'would','should','will','may','might',
    /* ID */ 'yang','dan','di','ke','dari','untuk','dengan','adalah','ini','itu',
    'ada','tidak','bisa','akan','sudah','saya','kami','kita','anda','mereka',
    'juga','saat','ketika','jika','atau','tapi','pada','oleh','karena','maka',
    'sehingga','setelah','sebelum','sering','sudah','telah','belum','pernah',
    'nya','nya','lah','kah','pun',
  ]);

  function tokenise(str) {
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
      .slice(0, CONFIG.MAX_TOKENS_FOR_SIMILARITY);
  }

  /** Jaccard: |A ∩ B| / |A ∪ B| */
  function jaccard(setA, setB) {
    if (setA.size === 0 && setB.size === 0) return 0;
    let intersection = 0;
    for (const tok of setA) { if (setB.has(tok)) intersection++; }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  if (!history || history.length === 0) {
    return { isDuplicate: false, match: null, similarity: 0 };
  }

  const currentTokens = new Set(tokenise(text));
  let bestMatch = null;
  let bestSimilarity = 0;

  for (const item of history) {
    const histTokens = new Set(tokenise(item.rawText || ''));
    const sim = jaccard(currentTokens, histTokens);
    if (sim > bestSimilarity) {
      bestSimilarity = sim;
      bestMatch = item;
    }
  }

  const isDuplicate = bestSimilarity >= CONFIG.DUPLICATE_THRESHOLD;
  return {
    isDuplicate,
    match: isDuplicate ? bestMatch : null,
    similarity: Math.round(bestSimilarity * 100),
  };
}

/* --------------------------------------------------------------------------
   5. detectMissingInfo(parsed)
   Checks parsed object for absent required fields.
   Returns field IDs (e.g. "miss_title") so rendering is language-agnostic.
   IDs are translated at render time via t(). Legacy plain-string entries
   (from old history) are detected and passed through unchanged.
   Returns: { missing: string[] }  (each entry is an i18n key)
   -------------------------------------------------------------------------- */
function detectMissingInfo(parsed) {
  const missing = [];

  if (!parsed.title || parsed.title.length < 5)            missing.push('miss_title');
  if (!parsed.steps || parsed.steps.length < 10)           missing.push('miss_steps');
  if (!parsed.expected || parsed.expected.length < 5)      missing.push('miss_expected');
  if (!parsed.actual || parsed.actual.length < 5)          missing.push('miss_actual');
  if (!parsed.environment.os && !parsed.environment.browser) missing.push('miss_env');
  if (!parsed.environment.version)                         missing.push('miss_version');

  return { missing };
}

/**
 * resolveMissingLabel(entry)
 * Translates a missing-info entry at render time.
 * If the entry is a known i18n key (starts with "miss_") translate it;
 * otherwise treat it as a legacy plain string and return as-is.
 */
function resolveMissingLabel(entry) {
  if (typeof entry === 'string' && entry.startsWith('miss_') && I18N.en[entry]) {
    return t(entry);
  }
  return entry; // legacy plain string from old history
}

/* --------------------------------------------------------------------------
   6. suggestNextActions(result)
   Generates 3–5 action descriptor objects { id, ...params }.
   IDs are translated at render time via resolveActionText().
   Returns: { actions: Array<{id:string, ...params}> }
   -------------------------------------------------------------------------- */
function suggestNextActions(result) {
  const { severity, category, parsed, missingInfo, duplicate } = result;
  const actions = [];

  /* ---- Missing info request ---- */
  if (missingInfo.missing.length > 0) {
    actions.push({ id: 'act_requestInfo', fields: missingInfo.missing.slice(0, 3) });
  }

  /* ---- Severity-driven actions ---- */
  if (severity.level === 'Critical') {
    actions.push({ id: 'act_critical1' });
    actions.push({ id: 'act_critical2' });
  } else if (severity.level === 'High') {
    actions.push({ id: 'act_high1' });
    actions.push({ id: 'act_high2' });
  } else if (severity.level === 'Medium') {
    actions.push({ id: 'act_medium' });
  } else {
    actions.push({ id: 'act_low' });
  }

  /* ---- Category-specific suggestions ---- */
  const catMap = {
    'Security': 'act_security', 'Performance': 'act_performance',
    'Backend/API': 'act_backend', 'UI': 'act_ui', 'Data': 'act_data',
  };
  actions.push({ id: catMap[category.category] || 'act_other' });

  /* ---- Duplicate suggestion ---- */
  if (duplicate.isDuplicate) {
    actions.push({ id: 'act_dup', percent: duplicate.similarity });
  }

  /* ---- Steps missing ---- */
  if (!parsed.steps) {
    actions.push({ id: 'act_noSteps' });
  }

  return { actions: actions.slice(0, 5) };
}

/**
 * resolveActionText(action)
 * Converts an action descriptor to a translated string at render time.
 * Handles:
 *   - New-style objects: { id, fields?, percent? }
 *   - Legacy plain strings from old history (returned as-is)
 */
function resolveActionText(action) {
  // Legacy: old history stored plain sentences
  if (typeof action === 'string') return action;

  const { id, fields = [], percent } = action;

  if (id === 'act_requestInfo') {
    const fieldLabels = fields.map(f => resolveMissingLabel(f)).join('; ');
    return t('act_missingInfo').replace('%FIELDS%', fieldLabels);
  }
  if (id === 'act_dup') {
    return t('act_dup').replace('%SIM%', `${percent}%`);
  }
  // All other action IDs map directly to an i18n key
  return t(id) || id;
}

/* ==========================================================================
   Pipeline Orchestrator
   ========================================================================== */

/**
 * runPipeline(text, history)
 * Composes all 6 pipeline functions and collects reasoning steps.
 * Returns a rich result object.
 */
function runPipeline(rawText, history) {
  const reasoning = [];

  /* Step 1 — Parse */
  const parsed = parseReport(rawText);
  const notFound = t('r_notFound');
  reasoning.push({
    name: t('r_parse'),
    icon: '🔍',
    detail: [
      `title    : ${parsed.title || notFound}`,
      `steps    : ${parsed.steps ? parsed.steps.slice(0, 80) + '…' : notFound}`,
      `expected : ${parsed.expected ? parsed.expected.slice(0, 60) + '…' : notFound}`,
      `actual   : ${parsed.actual ? parsed.actual.slice(0, 60) + '…' : notFound}`,
      `os       : ${parsed.environment.os || notFound}`,
      `browser  : ${parsed.environment.browser || notFound}`,
      `version  : ${parsed.environment.version || notFound}`,
    ].join('\n'),
  });

  /* Step 2 — Classify category */
  const category = classifyCategory(rawText);
  const scoreLines = Object.entries(category.scores)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, sc]) => `  ${cat.padEnd(14)}: ${sc}`)
    .join('\n');
  reasoning.push({
    name: t('r_classify'),
    icon: '🏷️',
    detail: `${t('r_scores')}:\n${scoreLines}\n\n${t('r_result')}: ${category.category}\n${t('r_topSignals')}: ${category.topSignals.join(', ') || t('r_none')}`,
  });

  /* Step 3 — Score severity */
  const severity = scoreSeverity(rawText);
  reasoning.push({
    name: t('r_severity'),
    icon: '🎯',
    detail: `${t('r_totalScore')}: ${severity.score}\n${t('r_level')}: ${severity.level}\n${t('r_matchedSignals')}:\n${severity.signals.map(s => '  • ' + s).join('\n') || `  (${t('r_none')})`}`,
  });

  /* Step 4 — Detect duplicate (compare against current history only) */
  const duplicate = detectDuplicate(rawText, history);

  /*
   * Determine whether this report will be saved.
   * duplicates are NEVER pushed to history — the save decision is made
   * here and recorded in the reasoning panel so the outcome is explicit.
   */
  const savedToHistory = !duplicate.isDuplicate;

  let reasoningStep4Detail;
  if (duplicate.isDuplicate) {
    const matchTitle = (duplicate.match.title || t('untitledShort')).slice(0, 80);
    const matchId    = duplicate.match.id || '?';
    reasoningStep4Detail =
      `${t('r_dupDetected')}\n${t('r_similarity')}: ${duplicate.similarity}%\n${t('r_matchedReport')}: "${matchTitle}"\n${t('r_threshold')}: ${CONFIG.DUPLICATE_THRESHOLD * 100}%\n\n` +
      t('r_dupSkipped')
        .replace('%TITLE%', matchTitle)
        .replace('%SIM%', `${duplicate.similarity}`)
        .replace('%ID%', matchId);
  } else {
    reasoningStep4Detail =
      `${t('r_noDup')} (${CONFIG.DUPLICATE_THRESHOLD * 100}%).\n${t('r_bestSim')}: ${duplicate.similarity}%\n${t('r_historySize')}: ${history.length} ${t('r_reports')}\n\n${t('r_dupSaved')}`;
  }

  reasoning.push({
    name: t('r_duplicate'),
    icon: '🔁',
    detail: reasoningStep4Detail,
  });

  /* Step 5 — Detect missing info */
  const missingInfo = detectMissingInfo(parsed);
  reasoning.push({
    name: t('r_missing'),
    icon: '📋',
    detail: missingInfo.missing.length
      ? `${t('r_missingFields')}:\n${missingInfo.missing.map(m => '  • ' + resolveMissingLabel(m)).join('\n')}`
      : t('r_present'),
  });

  /* Step 6 — Suggest next actions */
  const actionsResult = suggestNextActions({ severity, category, parsed, missingInfo, duplicate });
  reasoning.push({
    name: t('r_actions'),
    icon: '💡',
    detail: actionsResult.actions.map((a, i) => `${i + 1}. ${resolveActionText(a)}`).join('\n'),
  });

  return {
    rawText,
    title:       parsed.title || t('untitled'),
    parsed,
    category,
    severity,
    duplicate,
    missingInfo,
    actions:     actionsResult.actions,
    reasoning,
    savedToHistory,
    /** duplicateOf is set when this report IS a duplicate; null otherwise. */
    duplicateOf: duplicate.isDuplicate
      ? { id: duplicate.match.id, title: duplicate.match.title || t('untitledShort'), similarity: duplicate.similarity }
      : null,
    timestamp: Date.now(),
    id: `tm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  };
}

/* ==========================================================================
   Utilities
   ========================================================================== */

/** Load history array from localStorage (safe parse). */
function loadHistory() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Persist history array to localStorage. */
function saveHistory(history) {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(history));
  } catch { /* storage quota exceeded — silently degrade */ }
}

/** Create an element with optional CSS class and/or textContent. Never uses innerHTML. */
function el(tag, classes = '', textContent = '') {
  const e = document.createElement(tag);
  if (classes)     e.className   = classes;
  if (textContent) e.textContent = textContent;
  return e;
}

/** Format a Unix timestamp to a human-readable locale string. */
function fmtTime(ts) {
  return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Convert a triage result to a Markdown string (fully translated). */
function toMarkdown(result) {
  const r = result;
  const env = r.parsed.environment;
  const envStr = [env.os, env.browser, env.version].filter(Boolean).join(' · ') || t('fieldNotSpecified');

  const lines = [
    `# 🐛 ${r.title}`,
    '',
    `**${t('md_severity')}:** ${r.severity.level}  |  **${t('md_category')}:** ${r.category.category}  |  **${t('md_score')}:** ${r.severity.score}`,
    `**${t('md_triaged')}:** ${fmtTime(r.timestamp)}`,
    '',
    `## ${t('md_parsedFields')}`,
    `| ${t('fieldSteps')} | ${t('fieldExpected')} |`,
    `| --- | --- |`,
    `| ${t('md_fieldSteps')} | ${r.parsed.steps || '—'} |`,
    `| ${t('md_fieldExpected')} | ${r.parsed.expected || '—'} |`,
    `| ${t('md_fieldActual')} | ${r.parsed.actual || '—'} |`,
    `| ${t('md_fieldEnv')} | ${envStr} |`,
    '',
    `## ${t('md_signals')}`,
    r.severity.signals.map(s => `- ${s}`).join('\n') || `- ${t('md_none')}`,
    '',
    `## ${t('md_actions')}`,
    r.actions.map((a, i) => `${i + 1}. ${resolveActionText(a)}`).join('\n'),
  ];

  if (r.missingInfo.missing.length) {
    lines.push('', `## ${t('md_missing')}`);
    lines.push(r.missingInfo.missing.map(m => `- ${resolveMissingLabel(m)}`).join('\n'));
  }

  if (r.duplicateOf) {
    lines.push('', `## ${t('md_duplicate')}`);
    lines.push(
      t('md_simWith')
        .replace('%SIM%', r.duplicateOf.similarity)
        .replace('%TITLE%', r.duplicateOf.title)
    );
    lines.push(`**${t('md_duplicateOf')}:** ${r.duplicateOf.title}`);
    lines.push(`**${t('md_dupId')}:** ${r.duplicateOf.id}`);
    lines.push('');
    lines.push(`> ⚠️ ${t('dupNotSaved')}`);
  }

  return lines.join('\n');
}

/* ==========================================================================
   DOM Rendering
   ========================================================================== */

/** Render the triage result card (no innerHTML for user data). */
function renderResultCard(result) {
  const $ = id => document.getElementById(id);

  /* ---- Severity badge ---- */
  const badge = $('severityBadge');
  badge.textContent = result.severity.level;
  badge.dataset.level = result.severity.level;
  badge.setAttribute('aria-label', `${t('md_severity')}: ${result.severity.level}`);

  /* ---- Category badge ---- */
  $('categoryBadge').textContent = result.category.category;

  /* ---- Score chip ---- */
  $('cardScore').textContent = `Score: ${result.severity.score}`;

  /* ---- Duplicate: inline chip in top strip ---- */
  const dupChip = $('dupChip');
  if (result.duplicateOf) {
    $('dupChipDetail').textContent = ` · ${result.duplicateOf.similarity}%`;
    dupChip.removeAttribute('hidden');
  } else {
    dupChip.setAttribute('hidden', '');
  }

  /* ---- Duplicate: "not saved" banner (only when it IS a duplicate) ---- */
  const dupBanner = $('dupNotSavedBanner');
  const dupWarn   = $('duplicateWarning'); // legacy compat — also hide
  if (dupWarn) dupWarn.setAttribute('hidden', '');

  if (result.duplicateOf) {
    /* Header text */
    $('dupBannerText').textContent = t('dupNotSaved');

    /* Detail line: similarity + report title */
    $('dupBannerDetail').textContent =
      t('dupNotSavedDetail').replace('%SIM%', `${result.duplicateOf.similarity}%`);

    /* Clickable original report title — scroll + highlight in history */
    const origLink = $('dupBannerOrigLink');
    origLink.textContent = result.duplicateOf.title;
    origLink.setAttribute('aria-label', `${t('dupOrigLink')}: ${result.duplicateOf.title}`);
    /* Store the matched id so the click handler can find it */
    origLink.dataset.targetId = result.duplicateOf.id;

    /* ID label */
    $('dupBannerId').textContent = `${t('dupIdLabel')} ${result.duplicateOf.id}`;

    dupBanner.removeAttribute('hidden');
  } else {
    dupBanner.setAttribute('hidden', '');
  }

  /* ---- Title ---- */
  $('cardTitle').textContent = result.title;

  /* ---- Parsed fields ---- */
  const dl  = $('parsedFields');
  dl.textContent = '';
  const env = result.parsed.environment;
  const envStr = [env.os, env.browser, env.version].filter(Boolean).join(' · ') || null;

  const fields = [
    [t('fieldSteps'),    result.parsed.steps],
    [t('fieldExpected'), result.parsed.expected],
    [t('fieldActual'),   result.parsed.actual],
    [t('fieldEnv'),      envStr],
  ];
  for (const [label, value] of fields) {
    dl.appendChild(el('dt', '', label));
    dl.appendChild(el('dd', value ? '' : 'dd-missing', value || t('fieldNotSpecified')));
  }

  /* ---- Missing info ---- */
  const missingCol  = $('missingCol');
  const missList    = $('missingList');
  missList.textContent = '';
  if (result.missingInfo.missing.length > 0) {
    for (const m of result.missingInfo.missing) {
      missList.appendChild(el('li', '', resolveMissingLabel(m)));
    }
    missingCol.removeAttribute('hidden');
  } else {
    missingCol.setAttribute('hidden', '');
  }

  /* ---- Next actions ---- */
  const ol = $('actionsList');
  ol.textContent = '';
  for (const action of result.actions) {
    ol.appendChild(el('li', '', resolveActionText(action)));
  }

  /* ---- Agent Reasoning ---- */
  const reasoningContent = $('reasoningContent');
  reasoningContent.textContent = '';
  for (const step of result.reasoning) {
    const stepDiv  = el('div', 'reasoning-step');
    const header   = el('div', 'reasoning-step-header');
    header.appendChild(el('span', 'reasoning-step-icon', step.icon));
    header.appendChild(el('span', '', step.name));
    stepDiv.appendChild(header);
    stepDiv.appendChild(el('pre', 'reasoning-step-body', step.detail));
    reasoningContent.appendChild(stepDiv);
  }

  /* ---- Show card ---- */
  $('resultCard').removeAttribute('hidden');
}

/* --------------------------------------------------------------------------
   History rendering
   -------------------------------------------------------------------------- */
function renderHistory(filterText = '', filterSeverity = '') {
  const historyList  = document.getElementById('historyList');
  const historyEmpty = document.getElementById('historyEmpty');
  const history      = loadHistory();

  const filtered = history.filter(item => {
    const matchText = !filterText ||
      (item.title   || '').toLowerCase().includes(filterText.toLowerCase()) ||
      (item.rawText || '').toLowerCase().includes(filterText.toLowerCase());
    const matchSev = !filterSeverity || item.severity?.level === filterSeverity;
    return matchText && matchSev;
  });

  historyList.textContent = '';

  if (filtered.length === 0) {
    historyEmpty.removeAttribute('hidden');
    return;
  }
  historyEmpty.setAttribute('hidden', '');

  for (const item of [...filtered].reverse()) {
    const li = el('li', 'history-item');
    li.setAttribute('role', 'listitem');
    li.setAttribute('tabindex', '0');
    li.dataset.id = item.id;

    const info   = el('div', 'history-item-info');
    const titleE = el('div', 'history-item-title', item.title || t('untitledShort'));
    const meta   = el('div', 'history-item-meta',
      `${item.severity?.level || '?'} · ${item.category?.category || '?'} · ${fmtTime(item.timestamp)}`
    );
    info.appendChild(titleE);
    info.appendChild(meta);

    const sev = el('span', 'severity-badge', item.severity?.level || '?');
    sev.dataset.level = item.severity?.level || '';

    const actions   = el('div', 'history-item-actions');
    const reloadBtn = el('button', 'btn btn-secondary btn-sm', t('historyReload'));
    reloadBtn.setAttribute('aria-label', `${t('historyReload')}: ${item.title}`);
    reloadBtn.addEventListener('click', e => {
      e.stopPropagation();
      document.getElementById('reportInput').value = item.rawText || '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    const delBtn = el('button', 'btn btn-danger btn-sm', t('historyDelete'));
    delBtn.setAttribute('aria-label', `${t('historyDelete')}: ${item.title}`);
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      deleteHistoryItem(item.id);
    });

    actions.appendChild(reloadBtn);
    actions.appendChild(delBtn);

    li.appendChild(sev);
    li.appendChild(info);
    li.appendChild(actions);

    li.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        document.getElementById('reportInput').value = item.rawText || '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    historyList.appendChild(li);
  }
}

/** Remove one item from history by id, then re-render. */
function deleteHistoryItem(id) {
  const history = loadHistory().filter(h => h.id !== id);
  saveHistory(history);
  renderHistory(
    document.getElementById('searchHistory').value,
    document.getElementById('filterSeverity').value
  );
}

/* ==========================================================================
   Sample Reports
   ========================================================================== */
const SAMPLES = {
  critical: `Title: SQL Injection in login endpoint allows full database dump

Steps to Reproduce:
1. Navigate to /api/v1/login
2. Set username to: admin' OR '1'='1'--
3. Send the request

Expected Result:
Login should fail with "Invalid credentials".

Actual Result:
Server returns 200 OK with a full dump of the users table in JSON.

Environment:
- OS: Ubuntu 22.04
- Browser: curl / Postman
- Version: 3.1.0 (production)

Severity: Critical — all user PII is exposed. SQL injection exploit confirmed.`,

  medium: `Performance regression after deploy v2.4.1

The dashboard page is very slow to load. It was working fine in v2.4.0.

Steps:
1. Log in as any user
2. Navigate to /dashboard
3. Observe load time

Expected: Page loads in < 2 s (as per v2.4.0 baseline)
Actual: Page takes 12-18 s to render, high CPU usage visible in Chrome DevTools

Environment: Windows 10, Chrome 124, app version 2.4.1

This is intermittent — happens for most users, sometimes worse at peak hours.
There is a workaround: hard refresh usually helps once.`,

  low: `Minor typo on the settings page

Hi team,
On the Settings > Notifications page, the label reads "Recieve notifications"
instead of "Receive notifications".

Expected: correct spelling "Receive"
Actual: "Recieve"

Browser: Firefox 125
OS: macOS Sonoma
Version: 2.3.0

Low priority cosmetic fix.`,

  /* Indonesian sample report */
  id_medium: `Judul: Tidak bisa login setelah update versi 4.2.0

Halo tim,
Setelah pembaruan ke versi 4.2.0, banyak pengguna melaporkan tidak bisa masuk ke aplikasi.
Tombol "Masuk" tidak merespons setelah memasukkan kata sandi yang benar.

Langkah Reproduksi:
1. Buka aplikasi di browser Chrome
2. Masukkan email dan kata sandi yang valid
3. Klik tombol "Masuk"
4. Tombol berputar tanpa henti, halaman tidak berpindah

Hasil yang Diharapkan:
Pengguna berhasil masuk dan diarahkan ke dashboard utama.

Hasil Aktual:
Tombol masuk terus berputar (loading), tidak ada pesan error, pengguna tidak dapat masuk.
Terjadi pada sebagian besar pengguna di produksi.

Lingkungan:
- OS: Windows 11
- Browser: Chrome 124
- Versi Aplikasi: 4.2.0
- Server: produksi

Catatan: Versi 4.1.9 masih berfungsi normal. Ini kemungkinan regresi.`,
};

/* ==========================================================================
   Application Entry Point
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {

  /* ------------------------------------------------------------------
     Language initialisation
     Detect: localStorage > navigator.language > fallback 'en'
     ------------------------------------------------------------------ */
  const browserLang = (navigator.language || 'en').slice(0, 2).toLowerCase();
  lang = localStorage.getItem(CONFIG.LANG_KEY) ||
         (I18N[browserLang] ? browserLang : 'en');

  /* Apply initial translations */
  applyI18n();

  /* Sync language button states */
  function syncLangButtons() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      const active = btn.dataset.lang === lang;
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    /* Update html[lang] attribute for screen readers */
    document.documentElement.lang = lang;
  }
  syncLangButtons();

  /* Language switch event */
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      lang = btn.dataset.lang;
      localStorage.setItem(CONFIG.LANG_KEY, lang);
      syncLangButtons();
      applyI18n();
      /* Re-render history with new language strings */
      renderHistory(
        document.getElementById('searchHistory').value,
        document.getElementById('filterSeverity').value
      );
      /* If a result card is visible, update its static i18n labels */
      if (currentResult) renderResultCard(currentResult);
    });
  });

  /* ------------------------------------------------------------------
     Element references
     ------------------------------------------------------------------ */
  const reportInput     = document.getElementById('reportInput');
  const triageBtn       = document.getElementById('triageBtn');
  const clearInputBtn   = document.getElementById('clearInputBtn');
  const emptyState      = document.getElementById('emptyState');
  const loadingState    = document.getElementById('loadingState');
  const errorState      = document.getElementById('errorState');
  const errorMessage    = document.getElementById('errorMessage');
  const resultCard      = document.getElementById('resultCard');
  const copyMdBtn       = document.getElementById('copyMdBtn');
  const exportJsonBtn   = document.getElementById('exportJsonBtn');
  const themeToggle     = document.getElementById('themeToggle');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const searchHistory   = document.getElementById('searchHistory');
  const filterSeverity  = document.getElementById('filterSeverity');

  /* ------------------------------------------------------------------
     Application state
     ------------------------------------------------------------------ */
  let currentResult = null;

  /* ------------------------------------------------------------------
     Theme toggle (persisted)
     ------------------------------------------------------------------ */
  const savedTheme = localStorage.getItem('triagemate_theme') || 'light';
  document.documentElement.dataset.theme = savedTheme;
  themeToggle.setAttribute('aria-pressed', savedTheme === 'dark' ? 'true' : 'false');

  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.dataset.theme === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    themeToggle.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
    localStorage.setItem('triagemate_theme', next);
  });

  /* ------------------------------------------------------------------
     UI helpers: show / hide states
     ------------------------------------------------------------------ */
  function showState(state) {
    emptyState  .setAttribute('hidden', '');
    loadingState.setAttribute('hidden', '');
    errorState  .setAttribute('hidden', '');
    resultCard  .setAttribute('hidden', '');

    if (state === 'empty')   emptyState  .removeAttribute('hidden');
    if (state === 'loading') loadingState.removeAttribute('hidden');
    if (state === 'error')   errorState  .removeAttribute('hidden');
    if (state === 'result')  resultCard  .removeAttribute('hidden');
  }

  function setTriageBtnLoading(loading) {
    triageBtn.disabled = loading;
    triageBtn.querySelector('.btn-label').textContent =
      loading ? t('triageBtnLoading') : t('triageBtn');
    const spinner = triageBtn.querySelector('.btn-spinner');
    if (loading) spinner.removeAttribute('hidden');
    else         spinner.setAttribute('hidden', '');
  }

  /* ------------------------------------------------------------------
     Sample reports
     ------------------------------------------------------------------ */
  document.querySelectorAll('.btn-sample').forEach(btn => {
    btn.addEventListener('click', () => {
      reportInput.value = SAMPLES[btn.dataset.sample] || '';
      reportInput.focus();
    });
  });

  /* ------------------------------------------------------------------
     Duplicate banner: clicking the original report title scrolls to
     and highlights the matched entry in the history list.
     ------------------------------------------------------------------ */
  document.getElementById('dupBannerOrigLink').addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = e.currentTarget.dataset.targetId;
    if (!targetId) return;

    /* Scroll the history section into view first */
    const historySection = document.querySelector('.history-section');
    if (historySection) historySection.scrollIntoView({ behavior: 'smooth' });

    /* Wait for scroll to land, then highlight the item */
    setTimeout(() => {
      const item = document.querySelector(`.history-item[data-id="${CSS.escape(targetId)}"]`);
      if (item) {
        item.focus();
        item.classList.add('history-item--highlighted');
        setTimeout(() => item.classList.remove('history-item--highlighted'), 2000);
      }
    }, 400);
  });

  /* ------------------------------------------------------------------
     Clear input
     ------------------------------------------------------------------ */
  clearInputBtn.addEventListener('click', () => {
    reportInput.value = '';
    showState('empty');
    currentResult = null;
    reportInput.focus();
  });

  /* ------------------------------------------------------------------
     Main triage action
     ------------------------------------------------------------------ */
  triageBtn.addEventListener('click', () => {
    const raw = reportInput.value.trim();

    /* Edge case: empty input */
    if (!raw) {
      errorMessage.textContent = t('errorEmpty');
      showState('error');
      return;
    }

    /* Edge case: input too long */
    if (raw.length > CONFIG.MAX_INPUT_LENGTH) {
      errorMessage.textContent = t('errorTooLong');
      showState('error');
      return;
    }

    setTriageBtnLoading(true);
    showState('loading');

    /* Small timeout so the browser can paint the loading spinner before
       the synchronous pipeline runs. */
    setTimeout(() => {
      try {
        const history = loadHistory();
        const result  = runPipeline(raw, history);

        /*
         * Only save non-duplicate reports.
         * Duplicates are displayed (result card shown) but never written
         * to history or localStorage — preventing repeated entries.
         */
        if (result.savedToHistory) {
          history.push(result);
          saveHistory(history);
        }

        currentResult = result;
        renderResultCard(result);
        showState('result');
        renderHistory(searchHistory.value, filterSeverity.value);
      } catch (err) {
        errorMessage.textContent = t('errorPipeline') + err.message;
        showState('error');
      } finally {
        setTriageBtnLoading(false);
      }
    }, 80);
  });

  /* ------------------------------------------------------------------
     Copy as Markdown
     ------------------------------------------------------------------ */
  copyMdBtn.addEventListener('click', () => {
    if (!currentResult) return;
    const md = toMarkdown(currentResult);
    const feedback = t('copiedFeedback');
    const origSpan = copyMdBtn.querySelector('[data-i18n="copyMdBtn"]');

    navigator.clipboard.writeText(md).then(() => {
      if (origSpan) origSpan.textContent = feedback;
      setTimeout(() => { if (origSpan) origSpan.textContent = t('copyMdBtn'); }, 1800);
    }).catch(() => {
      /* execCommand fallback */
      const ta = document.createElement('textarea');
      ta.value = md;
      ta.style.cssText = 'position:absolute;left:-9999px;';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      if (origSpan) origSpan.textContent = feedback;
      setTimeout(() => { if (origSpan) origSpan.textContent = t('copyMdBtn'); }, 1800);
    });
  });

  /* ------------------------------------------------------------------
     Export JSON
     ------------------------------------------------------------------ */
  exportJsonBtn.addEventListener('click', () => {
    if (!currentResult) return;
    const exportData = {
      id:            currentResult.id,
      title:         currentResult.title,
      timestamp:     currentResult.timestamp,
      savedToHistory: currentResult.savedToHistory,
      severity:      currentResult.severity,
      category:      currentResult.category,
      parsed:        currentResult.parsed,
      missingInfo:   currentResult.missingInfo,
      actions:       currentResult.actions,
      duplicateFlag: {
        isDuplicate:  currentResult.duplicate.isDuplicate,
        similarity:   currentResult.duplicate.similarity,
        matchedTitle: currentResult.duplicate.match?.title || null,
      },
      /* duplicateOf is populated when the report is a duplicate; null otherwise */
      duplicateOf: currentResult.duplicateOf,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `triagemate_${currentResult.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  /* ------------------------------------------------------------------
     History: search + filter
     ------------------------------------------------------------------ */
  searchHistory.addEventListener('input', () => {
    renderHistory(searchHistory.value, filterSeverity.value);
  });
  filterSeverity.addEventListener('change', () => {
    renderHistory(searchHistory.value, filterSeverity.value);
  });

  /* ------------------------------------------------------------------
     History: clear all
     ------------------------------------------------------------------ */
  clearHistoryBtn.addEventListener('click', () => {
    if (!confirm(t('clearHistoryConfirm'))) return;
    saveHistory([]);
    renderHistory();
  });

  /* ------------------------------------------------------------------
     Initial render
     ------------------------------------------------------------------ */
  showState('empty');
  renderHistory();
});

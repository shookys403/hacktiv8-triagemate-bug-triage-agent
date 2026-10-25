<div align="center">

# 🐞 TriageMate

### Rule-based AI agent that turns raw bug reports into structured triage cards

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/Vanilla_JS-F7DF1E?logo=javascript&logoColor=black)
![No Framework](https://img.shields.io/badge/framework-none-success)
![Languages](https://img.shields.io/badge/lang-EN%20%7C%20ID-blue)
![Built with IBM Bob](https://img.shields.io/badge/vibe%20coded%20with-IBM%20Bob-0f62fe)

**[🚀 Live Demo](https://<username>.github.io/hacktiv8-triagemate-bug-triage-agent/)** · Hacktiv8 project

</div>

---

## 📌 About

TriageMate takes a raw, messy bug report and produces a structured triage card: **severity, category, duplicate check, missing info, and next actions**, with the agent's reasoning shown step by step. Everything runs **client-side** in plain HTML5, CSS3, and JavaScript. There are no frameworks, no libraries, no external APIs, and no data leaves your browser.

> Built through **vibe coding with IBM Bob**, using a 6-layer prompt and several refinement iterations.

## ⚡ Quick Start

Click here : https://shookys403.github.io/hacktiv8-triagemate-bug-triage-agent/

## 🧪 Try It: Test Inputs

Copy any input below into the **Paste Bug Report** box and press **Triage Report**. Do them in order, because tests 4 and 5 depend on test 1 being saved in History.

> Tip: the sample buttons (**Critical - Security**, **Medium - Performance**, **Low - UI**, **Medium - Login (Indonesian)**) load ready-made reports in one click.

### 1. Critical security bug (full report)
```
Title: Login bypass possible
Steps: 1. Open /login 2. Enter ' OR 1=1 -- in password 3. Click Login
Expected: Error message
Actual: Logged in as admin, all user data exposed
Environment: Windows 11, Chrome 120, v2.4.1
```
**Expect:** Critical badge, Security category, matched signals in Agent Reasoning, no missing info.

### 2. Low severity UI bug
```
Title: Button text slightly misaligned
Steps: 1. Open Settings page
Expected: Text centered
Actual: Text is 2px off to the left
Environment: macOS, Safari 17
```
**Expect:** Low badge, UI category.

### 3. Vague report (Indonesian)
```
aplikasinya error terus
```
**Expect:** Missing info list (steps, expected/actual result, environment, version) and a suggestion to ask the reporter for more details.

### 4. Duplicate detection
First triage test 1, then paste this (or simply submit test 1 again):
```
Login bypass is possible: entering ' OR 1=1 -- in the password field logs in as admin and exposes user data.
```
**Expect:** "Duplicate detected, not saved to history", a similarity %, and a link to the original report. The History count stays the same.

### 5. Not a duplicate
After test 1, triage test 2.

**Expect:** No duplicate warning, and the report is saved to History.

### 6. Full Indonesian report
```
Judul: Gagal login setelah update
Langkah: 1. Buka halaman login 2. Masukkan email dan password yang benar 3. Klik Masuk
Hasil yang diharapkan: Berhasil masuk ke dashboard
Hasil aktual: Muncul pesan error dan tidak bisa login
Lingkungan: Android 14, Chrome 120, versi 3.1.0
```
**Expect:** Fields are parsed correctly from the Indonesian labels, and severity and category are detected.

### 7. Performance bug
```
Title: Dashboard very slow to load
Steps: 1. Log in 2. Open Dashboard with more than 1000 records
Expected: Loads in under 2 seconds
Actual: Takes about 30 seconds and the browser freezes
Environment: Windows 10, Firefox 121, v1.8.0
```
**Expect:** Performance category, Medium or High severity.

### 8. Edge cases
| Input | Expect |
|---|---|
| Empty box, or only spaces/new lines | Validation message, nothing saved |
| `<script>alert('xss')</script> app crashes when I open the page` | Shown as plain text, no alert pops up |
| Paste text longer than 20,000 characters | A clear limit message, no freeze |

### 9. Language and export
After any triage result: switch **EN / ID** in the header (Missing Info and Next Actions change language instantly), then click **Copy as Markdown** or **Export JSON**.


## ✨ Features

- **Report parsing:** extracts title, steps to reproduce, expected vs actual result, and environment (OS, browser, version).
- **Category classification:** UI, Backend/API, Performance, Security, Data, Other.
- **Explainable severity scoring:** Critical / High / Medium / Low with a numeric score and the signals that triggered it.
- **Duplicate detection:** token-based similarity against history. Duplicates are not saved, and the card links to the original report.
- **Missing info detection** and **3-5 concrete next actions**.
- **Agent Reasoning panel:** shows the outcome of every pipeline step.
- **History:** search, severity filter, delete item, clear all (stored in `localStorage`).
- **Export:** Copy as Markdown and Export JSON.
- **Bilingual EN/ID:** the UI and the agent's keyword rules both understand Indonesian reports.
- **UI:** dark/light mode, responsive, accessible, compact card with collapsible sections.

## 🧠 Agent Pipeline

| Step | Function | Technique |
|---|---|---|
| 1 | `parseReport(text)` | Label regex and title heuristics |
| 2 | `classifyCategory(text)` | Keyword scoring per category |
| 3 | `scoreSeverity(text)` | Weighted signals with explainable matches |
| 4 | `detectDuplicate(text, history)` | Token similarity with a configurable threshold |
| 5 | `detectMissingInfo(parsed)` | Required-field check |
| 6 | `suggestNextActions(result)` | Actions based on previous results |

## 📁 Project Structure

```
hacktiv8-triagemate-bug-triage-agent/
├── index.html   # semantic HTML5 structure
├── style.css    # CSS3 (variables, Grid/Flexbox, dark/light, glass UI)
└── script.js    # agent pipeline + app logic + i18n
```

## 🤖 Vibe Coding with IBM Bob

The prompt uses 6 layers: **Role → Context & Goal → Technical Constraints → Agent Behavior → UI/UX & Output → Quality Gate**. After the first version, the prompt was refined through these iterations:

1. Layered visual background (gradient, CSS pattern, glass surfaces)
2. Compact triage card with collapsible sections
3. Bilingual EN/ID support, including Indonesian agent keywords
4. Duplicates are no longer saved to history
5. Bug fix: Missing Info and Next Actions now switch language correctly

## ⚠️ Limitations

The agent is rule-based, not a language model, so accuracy depends on its keyword lists. Data is stored per browser and is not shared across devices.

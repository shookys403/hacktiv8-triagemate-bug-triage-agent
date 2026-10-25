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

## 🧪 Try It: Quick Test Cases

| # | What to do | What you should see |
|---|---|---|
| 1 | Click the **Critical - Security** sample, then press Triage | Critical badge, Security category, matched signals in Agent Reasoning |
| 2 | Click the **Low - UI** sample, then press Triage | Low badge, UI category |
| 3 | Paste `aplikasinya error terus` and press Triage | Missing info list and a suggestion to ask the reporter for more details |
| 4 | Press Triage again on the same text | "Duplicate detected, not saved to history" with similarity % and a link to the original |
| 5 | Switch **EN / ID** in the header | Missing Info and Next Actions items change language instantly |
| 6 | Press Triage on an empty box | A validation message appears, nothing is saved |
| 7 | Click **Copy as Markdown** or **Export JSON** | The triage result is copied or downloaded |

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

## 📄 License

MIT License

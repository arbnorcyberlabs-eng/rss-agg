# 📰 RSS Feed Aggregator

A modern **RSS feed aggregator** built with **Vue 3** and **Supabase**, featuring automated feed generation and deployment via **GitHub Actions**.

---

## 🚀 Features

- **Dynamic Feed Management** — Add, edit, and manage feeds via an admin panel  
- **Supabase Backend** — Feeds stored in Supabase with **Row Level Security (RLS)**  
- **Automated Feed Generation** — **GitHub Actions** auto-updates feeds twice daily  
- **Modern Vue 3 Frontend** — Search, pagination, and fully responsive design  
- **Web Scraping Support** — Integrates with [Feed Me Up, Scotty!](https://feed-me-up-scotty.vincenttunru.com/) for scraping any site  
- **Native RSS/Atom Support** — Aggregate existing feeds seamlessly  

---

## 🧱 Architecture

```text
┌─────────────────┐
│   Admin Panel   │  (Add/Edit/Delete Feeds)
│     Vue 3       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Supabase DB     │  (Feed Config)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GitHub Actions  │  (Fetch → Generate → Publish)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GitHub Pages   │  (Serve Feeds + UI)
└─────────────────┘
```

---

## ⚡ Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) ≥ 20
- Supabase account
- GitHub account

### 1. Clone the Repository
```bash
git clone https://github.com/arbnorcyberlabs-eng/rss-agg.git
cd rss-agg
```

### 2. Install Dependencies
```bash
npm install
cd frontend
npm install
```

### 3. Configure Environment Variables
Create `frontend/.env`:
```bash
VITE_SUPABASE_URL=https://godeglzovkxzhwxyxbdd.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_BASE_URL=https://arbnorcyberlabs-eng.github.io/rss-agg/
```

### 4. Set Up GitHub Secrets
See [`GITHUB-SECRETS-SETUP.md`](./GITHUB-SECRETS-SETUP.md).

Required secrets:
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
```

---

## 💻 Local Development

### Run Frontend
```bash
cd frontend
npm run dev
```
Access at: [http://localhost:5173](http://localhost:5173)

### Admin Panel
- URL: [http://localhost:5173/admin](http://localhost:5173/admin)  
- Enable Email/Password Auth in Supabase  
- Create an admin user manually in your Supabase project

### Manual Feed Generation
```bash
npx feed-me-up-scotty
```
Debug mode:
```bash
DEBUG="info" npx feed-me-up-scotty
```

---

## ⚙️ Configuration

Each feed is defined in `feeds.toml`.

### Required Fields
| Field | Description |
|-------|--------------|
| `title` | Feed title |
| `url` | Source URL |
| `entrySelector` | CSS selector for entries |
| `titleSelector` | Selector for titles |
| `linkSelector` | Selector for links |

### Optional Fields
| Field | Description |
|-------|--------------|
| `contentSelector` | Selector for content (defaults to entry) |
| `dateSelector` | Selector for date |
| `dateFormat` | Format string for date (date-fns) |
| `timeout` | Seconds to wait (default: 60) |
| `filters` | Exclude entries containing these strings |
| `matchOneOf` | Include entries matching one |
| `matchAllOf` | Include entries matching all |

#### Example:
```toml
[default]
timeout = 30

[example-feed]
title = "My Custom Feed"
url = "https://example.com"
entrySelector = "article"
titleSelector = "h2"
linkSelector = "a.permalink"
contentSelector = "p.summary"
dateSelector = "time"
filters = ["Advertisement", "Sponsored"]
```

---

## 🧩 Output

Feeds are generated into the `public/` directory:
- Individual feeds → `public/{feed-name}.xml`
- Combined feed → `public/all.xml`

---

## 🕵️ Debugging

If feeds don’t appear:
1. Run with `DEBUG="info"`
2. Use `:root` as `entrySelector` to inspect full HTML
3. Ensure content isn’t dynamically loaded (may need `waitUntil`)
4. Validate selectors in the browser console:
   ```js
   document.querySelectorAll('your-selector')
   ```

For JS-heavy pages:
```toml
[dynamic-site]
title = "JavaScript-loaded content"
url = "https://example.com"
waitUntil = "networkidle"
waitForSelector = ".content-loaded"
entrySelector = "article"
titleSelector = "h2"
linkSelector = "a"
```

---

## 🤖 Automation

### GitHub Actions (Recommended)
Feeds auto-generate and deploy twice daily.

**Steps:**
1. Push repo to GitHub  
2. Create a `gh-pages` branch  
3. Enable **Pages** → `gh-pages` branch  
4. Enable **Actions** in the repository  

Your feeds will:
- Regenerate **5:30 AM / 5:30 PM UTC**
- Publish to:  
  `https://YOUR-USERNAME.github.io/YOUR-REPO/feedname.xml`

---

## 🧩 Alternative CI/CD Options

### GitLab CI/CD
Use a scheduled pipeline (`30 5,17 * * *`).

Resulting URL:  
`https://YOUR-USERNAME.gitlab.io/YOUR-REPO/feedname.xml`

### Manual Automation
Use cron, Task Scheduler, or other job runners for custom intervals.

---

## 📚 Resources
- [Feed Me Up, Scotty! Docs](https://feed-me-up-scotty.vincenttunru.com/docs/setup)
- [Source Code](https://github.com/Vincentdegroot/feed-me-up-scotty)
- [CSS Selectors Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)

---

## 🪪 License
Open source project setup.  
**Feed Me Up, Scotty!** by [Vincent Tunru](https://vincenttunru.com/).

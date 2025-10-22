# RSS Feed Aggregator

A modern RSS feed aggregator with dynamic feed management powered by Supabase and Vue 3.

## 🎯 Features

- **Dynamic Feed Management**: Add, edit, and manage feeds through an admin panel
- **Supabase Backend**: Feeds stored in Supabase database with Row Level Security
- **Automated Generation**: GitHub Actions automatically generates and updates feeds twice daily
- **Modern UI**: Vue 3 frontend with search, pagination, and responsive design
- **Web Scraping**: Uses [Feed me up, Scotty!](https://feed-me-up-scotty.vincenttunru.com/) to create RSS feeds from any website
- **Native RSS Support**: Can also aggregate existing RSS/Atom feeds

## 🏗️ Architecture

```
┌─────────────────┐
│   Admin Panel   │ (Add/Edit/Delete Feeds)
│    (Vue 3)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Supabase DB     │ (Feed Configuration)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GitHub Actions  │ (Fetch Config → Generate Feeds)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GitHub Pages   │ (Serve Feeds + Vue Frontend)
└─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) 20+ installed
- Supabase account
- GitHub account

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/arbnorcyberlabs-eng/rss-agg.git
cd rss-agg
```

### 2. Set Up Supabase

The Supabase database is already configured with:
- ✅ `feeds` table created
- ✅ Row Level Security (RLS) enabled
- ✅ Sample feeds migrated

### 3. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
```

### 4. Configure Environment Variables

Create `frontend/.env`:

```env
VITE_SUPABASE_URL=https://godeglzovkxzhwxyxbdd.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_BASE_URL=https://arbnorcyberlabs-eng.github.io/rss-agg/
```

### 5. Set Up GitHub Secrets

See **[GITHUB-SECRETS-SETUP.md](./GITHUB-SECRETS-SETUP.md)** for detailed instructions.

Required secrets:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

## 💻 Development

### Run Frontend Locally

```bash
cd frontend
npm run dev
```

Visit http://localhost:5173/

### Access Admin Panel

Visit http://localhost:5173/admin

**Note**: You'll need to enable Email/Password authentication in Supabase Dashboard and create an admin user.

### Manual Feed Generation

Generate feeds locally for testing:

```bash
npx feed-me-up-scotty
```

Debug mode:

```powershell
$env:DEBUG="info"; npx feed-me-up-scotty
```

On Unix/Mac:

```bash
DEBUG="info" npx feed-me-up-scotty
```

## Configuration

Edit the `feeds.toml` file to configure your feeds. Each feed requires:

### Required Fields

- **`title`**: A descriptive title for your feed
- **`url`**: The URL of the page to scrape
- **`entrySelector`**: CSS selector matching individual feed entries
- **`titleSelector`**: CSS selector for the title within each entry
- **`linkSelector`**: CSS selector for the link within each entry

### Optional Fields

- **`contentSelector`**: CSS selector for the content (defaults to full entry)
- **`dateSelector`**: CSS selector for the publication date
- **`dateFormat`**: Format string for the date (using date-fns format)
- **`timeout`**: Seconds to wait for page load (default: 60)
- **`filters`**: Array of strings - exclude entries containing these strings
- **`matchOneOf`**: Array of strings - only include entries with at least one match
- **`matchAllOf`**: Array of strings - only include entries matching all strings

### Example Configuration

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

## Output

Generated feeds will be saved in the `public/` folder:
- Individual feeds: `public/{feed-name}.xml`
- Combined feed: `public/all.xml` (contains all posts from all feeds)

## Tips for Finding CSS Selectors

1. **Open Developer Tools** in your browser (F12)
2. **Right-click** on the element you want to select
3. **Select "Inspect"** to see the HTML structure
4. **Identify unique selectors** like classes, IDs, or element combinations
5. **Test your selectors** in the browser console:
   ```javascript
   document.querySelectorAll('your-selector-here')
   ```

## Debugging

If entries aren't being captured correctly:

1. Run with `DEBUG="info"` environment variable
2. Use `:root` as the `entrySelector` to see the full HTML dump
3. Check if the page uses JavaScript to load content (may need `waitUntil` option)
4. Verify selectors in your browser's developer console

### Advanced Options for JavaScript-Heavy Sites

```toml
[dynamic-site]
title = "JavaScript-loaded content"
url = "https://example.com"
waitUntil = "networkidle"  # or "load" or "domcontentloaded"
waitForSelector = ".content-loaded"  # wait for this element to appear
entrySelector = "article"
titleSelector = "h2"
linkSelector = "a"
```

## Automation

This project includes automation configurations for:
- **GitHub Actions + GitHub Pages** - Automatic hosting and updates
- **GitLab CI/CD + GitLab Pages** - Alternative automatic hosting
- **Manual automation** - Cron jobs, Task Scheduler, etc.

### GitHub Actions Setup (Recommended)

This repository is pre-configured to automatically generate and host your feeds using GitHub Actions and GitHub Pages.

**Setup Steps:**

1. **Push this repository to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   git push -u origin main
   ```

2. **Create the gh-pages branch**
   ```bash
   git checkout --orphan gh-pages
   git reset --hard
   git commit --allow-empty -m "Initial gh-pages commit"
   git push origin gh-pages
   git checkout main
   ```

3. **Enable GitHub Pages**
   - Go to your repository Settings → Pages
   - Set Source to "Deploy from a branch"
   - Select `gh-pages` branch and `/ (root)` folder
   - Click Save

4. **Enable GitHub Actions**
   - Go to the Actions tab in your repository
   - Click "I understand my workflows, go ahead and enable them"

**That's it!** Your feeds will:
- Auto-generate twice daily (5:30 AM and 5:30 PM UTC)
- Be available at: `https://YOUR-USERNAME.github.io/YOUR-REPO/feedname.xml`
- Update on every push to main branch
- Can be manually triggered from the Actions tab

### GitLab CI/CD Setup

If you prefer GitLab:

1. **Push this repository to GitLab**
2. **Create a Pipeline Schedule**
   - Go to Build → Pipeline schedules
   - Click "New schedule"
   - Set interval: `30 5,17 * * *` (5:30 AM and 5:30 PM)
   - Save

Your feeds will be at: `https://YOUR-USERNAME.gitlab.io/YOUR-REPO/feedname.xml`

### Manual Automation

You can also run this on your own server or computer using cron jobs or Task Scheduler

## Resources

- [Official Documentation](https://feed-me-up-scotty.vincenttunru.com/docs/setup)
- [Source Code](https://github.com/Vincentdegroot/feed-me-up-scotty)
- [CSS Selectors Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)

## License

This project configuration is open source. Feed me up, Scotty! is created by Vincent Tunru.

#   T r i g g e r   b u i l d 
 
 

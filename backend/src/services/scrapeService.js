const cheerio = require('cheerio');
const fetch = (...args) => (global.fetch ? global.fetch(...args) : require('node-fetch')(...args));

function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function hasEnoughWords(text, minWords = 3) {
  if (!text) return false;
  const words = text.trim().split(/\s+/);
  return words.length >= minWords;
}

function normalizeTargetUrl(url) {
  try {
    const u = new URL(url);
    if (!u.pathname || u.pathname === '') u.pathname = '/';
    u.hash = '';
    return u.toString();
  } catch {
    return url;
  }
}

function toAbsoluteUrl(href, baseUrl) {
  if (!href) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

async function fetchHtml(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; HeadingScraper/1.0; +https://example.com/bot)',
      Accept: 'text/html,application/xhtml+xml'
    },
    signal: controller.signal
  });

  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.text();
}

function shouldSkip(text, config) {
  const lower = text.toLowerCase();
  const filters = config.filters || [];
  const matchOneOf = config.matchOneOf || [];
  const matchAllOf = config.matchAllOf || [];

  if (filters.some(f => lower.includes(f.toLowerCase()))) return true;
  if (matchOneOf.length && !matchOneOf.some(m => lower.includes(m.toLowerCase()))) return true;
  if (matchAllOf.length && !matchAllOf.every(m => lower.includes(m.toLowerCase()))) return true;
  return false;
}

function buildHeadingItems($, baseUrl, config) {
  const selector = config.headingSelectors || 'h1, h2, h3';
  const maxItems = config.maxItems || 50;
  const items = [];
  const seen = new Set();

  $(selector).each((idx, el) => {
    if (items.length >= maxItems) return false;

    const text = cleanText($(el).text());
    if (!text || !hasEnoughWords(text) || shouldSkip(text, config)) return;

    const href =
      $(el).find('a[href]').first().attr('href') ||
      $(el).attr('href') ||
      null;
    let link = toAbsoluteUrl(href, baseUrl);
    if (!link) {
      const id = $(el).attr('id');
      link = id ? `${baseUrl}#${id}` : `${baseUrl}#heading-${idx + 1}`;
    }

    const key = `${text}|${link}`;
    if (seen.has(key)) return;
    seen.add(key);

    items.push({
      title: text,
      link,
      summary: '',
      isoDate: new Date().toISOString()
    });
  });

  return items;
}

function buildAnchorItems($, baseUrl, config) {
  const maxItems = config.maxItems || 50;
  const items = [];
  const seen = new Set();
  const baseHost = (() => {
    try {
      return new URL(baseUrl).host;
    } catch {
      return null;
    }
  })();

  $('a[href]').each((idx, el) => {
    if (items.length >= maxItems) return false;
    const text = cleanText($(el).text());
    if (!text || !hasEnoughWords(text) || shouldSkip(text, config)) return;
    const href = $(el).attr('href');
    const link = toAbsoluteUrl(href, baseUrl);
    if (!link) return;
    if (baseHost) {
      try {
        const host = new URL(link).host;
        if (host !== baseHost) return; // stay on-site for "latest" news
      } catch {
        return;
      }
    }
    const key = `${text}|${link}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({
      title: text,
      link,
      summary: '',
      isoDate: new Date().toISOString()
    });
  });

  return items;
}

function buildEntryItems($, baseUrl, config) {
  const { entrySelector, titleSelector, linkSelector, contentSelector } = config;
  const maxItems = config.maxItems || 50;
  const items = [];
  const seen = new Set();

  $(entrySelector).each((idx, el) => {
    if (items.length >= maxItems) return false;
    const scope = $(el);
    const titleNode = titleSelector ? scope.find(titleSelector).first() : scope;
    const text = cleanText(titleNode.text());
    if (!text || !hasEnoughWords(text) || shouldSkip(text, config)) return;

    const href =
      (linkSelector && scope.find(linkSelector).first().attr('href')) ||
      titleNode.attr('href') ||
      null;
    const link = toAbsoluteUrl(href, baseUrl) || baseUrl;

    const summary = contentSelector ? cleanText(scope.find(contentSelector).first().text()) : '';
    const key = `${text}|${link}`;
    if (seen.has(key)) return;
    seen.add(key);

    items.push({
      title: text,
      link,
      summary,
      isoDate: new Date().toISOString()
    });
  });

  return items;
}

async function scrapeFeed(feed) {
  const config = feed.config || {};
  const rawTargetUrl = config.url || feed.rssUrl;
  const targetUrl = normalizeTargetUrl(rawTargetUrl);
  if (!targetUrl) {
    throw new Error('Scraped feed is missing config.url');
  }

  const html = await fetchHtml(targetUrl, config.timeoutMs || 12000);
  const $ = cheerio.load(html);

  let items = config.entrySelector
    ? buildEntryItems($, targetUrl, config)
    : buildHeadingItems($, targetUrl, config);

  // If the page is sparse or no specific page was provided, fall back to on-site anchors to surface fresh links.
  if ((!items || items.length < 5) && !config.entrySelector) {
    const anchorItems = buildAnchorItems($, targetUrl, config);
    if (anchorItems.length) {
      items = anchorItems;
    }
  }

  return { items, url: targetUrl };
}

module.exports = {
  scrapeFeed
};


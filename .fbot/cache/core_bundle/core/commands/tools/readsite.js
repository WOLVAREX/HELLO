// commands/tools/readsite.js
// .readsite <url> — Fetch and extract readable content from a website frontend
// Extracts: title, description, headings, links, text body, and any JSON data URLs

import axios from 'axios';
import { getOwnerName } from '../../lib/menuHelper.js';

const MAX_TEXT = 2800;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

function extractTag(html, tag) {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? stripTags(m[1]).trim() : '';
}

function extractMeta(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'),
    new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1].trim();
  }
  return '';
}

function extractHeadings(html) {
  const results = [];
  const pattern = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null && results.length < 8) {
    const text = stripTags(match[2]).trim();
    if (text) results.push(`H${match[1]}: ${text}`);
  }
  return results;
}

function extractLinks(html, baseUrl) {
  const links = new Set();
  const pattern = /href=["']([^"'#?]{3,80})["']/gi;
  let match;
  while ((match = pattern.exec(html)) !== null && links.size < 15) {
    const href = match[1].trim();
    if (href.startsWith('http') || href.startsWith('/')) links.add(href);
  }
  return [...links];
}

function extractJsonUrls(html) {
  const urls = [];
  const patterns = [
    /(?:JSON_URL|jsonUrl|dataUrl|apiUrl|DATA_URL)\s*=\s*["']([^"']+)["']/gi,
    /fetch\(["']([^"']{10,200})["']\)/gi,
    /axios\.get\(["']([^"']{10,200})["']\)/gi,
    /url:\s*["']([^"']{10,200})["']/gi,
  ];
  for (const p of patterns) {
    let m;
    while ((m = p.exec(html)) !== null) {
      const url = m[1];
      if (url.startsWith('http') || url.startsWith('/')) {
        if (!urls.includes(url)) urls.push(url);
      }
    }
  }
  return urls.slice(0, 5);
}

function stripTags(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanBody(html) {
  const noHead = html.replace(/<head[\s\S]*?<\/head>/gi, '');
  const noNav = noHead
    .replace(/<(nav|header|footer|aside)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
  return stripTags(noNav).replace(/\s{2,}/g, ' ').trim();
}

async function tryFetchJson(url, baseUrl) {
  try {
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    const res = await axios.get(fullUrl, { timeout: 8000, headers: HEADERS });
    if (typeof res.data === 'object') {
      return JSON.stringify(res.data, null, 2).slice(0, 1200);
    }
    return String(res.data).slice(0, 1200);
  } catch {
    return null;
  }
}

export default {
  name: 'readsite',
  aliases: ['webread', 'siteread', 'readweb'],
  description: 'Fetch and extract readable content from any website URL',
  category: 'tools',

  async execute(sock, m, args) {
    const jid = m.key.remoteJid;

    const rawUrl = args[0]?.trim()
      || m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation?.trim();

    if (!rawUrl) {
      return sock.sendMessage(jid, {
        text: `┌─⧭⊷ 🌐 *SITE READER*\n│\n├◆ *Usage:* readsite <url>\n│\n├◆ *Examples:*\n│  └⊷ readsite https://apiskeith.top/download\n│  └⊷ readsite https://example.com\n│\n├◆ *Extracts:*\n│  ├◆ Page title & description\n│  ├◆ Headings (H1–H3)\n│  ├◆ Navigation links\n│  ├◆ Visible body text\n│  └⊷ Data/API JSON URLs found in scripts\n│\n└─⧭⊷ *Powered by ${(getOwnerName() || 'WOLF').toUpperCase()} TECH*`
      }, { quoted: m });
    }

    const url = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

    await sock.sendMessage(jid, { react: { text: '🌐', key: m.key } });

    let html;
    try {
      const res = await axios.get(url, {
        timeout: 15000,
        headers: HEADERS,
        maxRedirects: 5,
        validateStatus: (s) => s < 500,
      });
      html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2);
    } catch (e) {
      await sock.sendMessage(jid, { react: { text: '❌', key: m.key } });
      return sock.sendMessage(jid, {
        text: `❌ *Could not fetch page*\n\n⚠️ ${e.message}\n\n🔗 ${url}`
      }, { quoted: m });
    }

    // ── Extract fields ─────────────────────────────────────────────────────────
    const title       = extractTag(html, 'title') || extractMeta(html, 'title') || 'No title';
    const description = extractMeta(html, 'description') || extractMeta(html, 'og:description') || '';
    const headings    = extractHeadings(html);
    const links       = extractLinks(html, new URL(url).origin);
    const jsonUrls    = extractJsonUrls(html);
    const bodyText    = cleanBody(html);

    // ── Try fetching the first detected JSON data URL ──────────────────────────
    let jsonPreview = '';
    if (jsonUrls.length > 0) {
      const baseOrigin = new URL(url).origin;
      const fetched = await tryFetchJson(jsonUrls[0], baseOrigin);
      if (fetched) jsonPreview = fetched;
    }

    // ── Build output ───────────────────────────────────────────────────────────
    let out = `┌─⧭⊷ 🌐 *SITE READER*\n\n└─⧭⊷`;
    out += `├◆ 🔗 *URL:* ${url}\n`;
    out += `├◆ 📌 *Title:* ${title}\n`;
    if (description) out += `├◆ 📝 *Desc:* ${description.slice(0, 150)}\n`;

    if (headings.length) {
      out += `│\n├─⌈ 📋 *HEADINGS* ⌋\n`;
      headings.forEach(h => { out += `│  └⊷ ${h}\n`; });
    }

    if (links.length) {
      out += `│\n├─⌈ 🔗 *LINKS / PATHS* ⌋\n`;
      links.slice(0, 10).forEach(l => { out += `│  └⊷ ${l}\n`; });
    }

    if (jsonUrls.length) {
      out += `│\n├─⌈ 📡 *DATA URLS FOUND IN SCRIPTS* ⌋\n`;
      jsonUrls.forEach(u => { out += `│  └⊷ ${u}\n`; });
    }

    if (bodyText) {
      out += `│\n├─⌈ 📄 *PAGE TEXT* ⌋\n`;
      const snippet = bodyText.length > MAX_TEXT
        ? bodyText.slice(0, MAX_TEXT) + '...'
        : bodyText;
      out += `│ ${snippet.replace(/\n/g, '\n│ ')}\n`;
    }

    if (jsonPreview) {
      out += `│\n├─⌈ 📦 *JSON DATA (from ${jsonUrls[0].slice(0, 60)})* ⌋\n`;
      out += jsonPreview.slice(0, 1000) + '\n';
    }

    out += `│\n└─⧭⊷ *Powered by ${(getOwnerName() || 'WOLF').toUpperCase()} TECH*`;

    // WhatsApp max message length guard
    if (out.length > 4000) out = out.slice(0, 3990) + '...\n╰⊷ *(truncated)*';

    await sock.sendMessage(jid, { text: out }, { quoted: m });
    await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });
  }
};

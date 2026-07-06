import axios from 'axios';
import { getBotName } from '../../lib/botname.js';
import { getOwnerName } from '../../lib/menuHelper.js';

export default {
  name: 'phishcheck',
  alias: ['phishing', 'phishurl'],
  description: 'Check URL for phishing indicators and known threats',
  category: 'ethical hacking',
  usage: 'phishcheck <url>',
  async execute(sock, m, args, PREFIX) {
    const jid = m.key.remoteJid;
    if (!args[0]) {
      return sock.sendMessage(jid, { text: `┌─⧭⊷ 🔍 *PHISHING CHECKER*\n│\n├◆ *${PREFIX}phishcheck <url>*\n│  └⊷ Check URL for phishing\n│     indicators and threats\n└─⧭⊷\n> *${getOwnerName().toUpperCase()} TECH*` }, { quoted: m });
    }
    await sock.sendMessage(jid, { react: { text: '⏳', key: m.key } });
    try {
      let url = args[0];
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      let urlObj;
      try {
        urlObj = new URL(url);
      } catch {
        return sock.sendMessage(jid, { text: `❌ Invalid URL format.` }, { quoted: m });
      }

      const domain = urlObj.hostname;
      const fullPath = urlObj.pathname + urlObj.search;

      const heuristics = [];
      let riskScore = 0;

      const brandNames = ['paypal', 'google', 'facebook', 'apple', 'microsoft',
        'amazon', 'netflix', 'instagram', 'twitter', 'linkedin', 'whatsapp',
        'telegram', 'snapchat', 'tiktok', 'yahoo', 'outlook', 'gmail',
        'icloud', 'dropbox', 'chase', 'wellsfargo', 'bankofamerica',
        'coinbase', 'binance', 'metamask', 'steam', 'epic', 'roblox'];

      const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz',
        '.top', '.work', '.click', '.link', '.info', '.buzz', '.rest',
        '.icu', '.cam', '.monster'];

      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (ipRegex.test(domain)) {
        heuristics.push({ check: 'IP as Domain', status: '🔴 SUSPICIOUS', detail: 'Uses IP address instead of domain name' });
        riskScore += 25;
      }

      const subdomainCount = domain.split('.').length - 2;
      if (subdomainCount > 2) {
        heuristics.push({ check: 'Excessive Subdomains', status: '🔴 SUSPICIOUS', detail: `${subdomainCount + 1} subdomains detected` });
        riskScore += 15;
      }

      const matchedBrands = brandNames.filter(b => domain.includes(b) && !domain.endsWith(b + '.com') && !domain.endsWith(b + '.org'));
      if (matchedBrands.length > 0) {
        heuristics.push({ check: 'Brand Impersonation', status: '🔴 HIGH RISK', detail: `Contains: ${matchedBrands.join(', ')}` });
        riskScore += 30;
      }

      const tldMatch = suspiciousTLDs.find(tld => domain.endsWith(tld));
      if (tldMatch) {
        heuristics.push({ check: 'Suspicious TLD', status: '🟡 WARNING', detail: `Uses ${tldMatch} (commonly abused)` });
        riskScore += 15;
      }

      if (url.length > 100) {
        heuristics.push({ check: 'Long URL', status: '🟡 WARNING', detail: `${url.length} characters (suspiciously long)` });
        riskScore += 10;
      }

      if (domain.includes('-') && domain.split('-').length > 3) {
        heuristics.push({ check: 'Excessive Hyphens', status: '🟡 WARNING', detail: 'Multiple hyphens in domain' });
        riskScore += 10;
      }

      if (/[0-9]/.test(domain.split('.')[0]) && /[a-z]/i.test(domain.split('.')[0])) {
        const digits = (domain.match(/[0-9]/g) || []).length;
        if (digits > 3) {
          heuristics.push({ check: 'Mixed Alphanumeric', status: '🟡 WARNING', detail: 'Domain has excessive numbers mixed with letters' });
          riskScore += 10;
        }
      }

      if (fullPath.includes('@') || fullPath.includes('//')) {
        heuristics.push({ check: 'URL Obfuscation', status: '🔴 SUSPICIOUS', detail: 'Contains @ or // in path (redirect trick)' });
        riskScore += 20;
      }

      const phishKeywords = ['login', 'signin', 'verify', 'account', 'secure', 'update', 'confirm', 'banking', 'password', 'credential'];
      const pathKeywords = phishKeywords.filter(k => fullPath.toLowerCase().includes(k));
      if (pathKeywords.length >= 2) {
        heuristics.push({ check: 'Phishing Keywords', status: '🟡 WARNING', detail: `Path contains: ${pathKeywords.join(', ')}` });
        riskScore += 10;
      }

      if (!url.startsWith('https://')) {
        heuristics.push({ check: 'No HTTPS', status: '🔴 SUSPICIOUS', detail: 'Does not use encrypted connection' });
        riskScore += 15;
      }

      if (domain.length > 30) {
        heuristics.push({ check: 'Long Domain', status: '🟡 WARNING', detail: `${domain.length} characters` });
        riskScore += 5;
      }

      let urlhausResult = null;
      try {
        const urlhausRes = await axios.post('https://urlhaus-api.abuse.ch/v1/url/',
          `url=${encodeURIComponent(url)}`, {
          timeout: 10000,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        if (urlhausRes.data && urlhausRes.data.query_status === 'ok' && urlhausRes.data.url_status) {
          urlhausResult = urlhausRes.data;
          riskScore += 40;
          heuristics.push({ check: 'URLhaus Database', status: '🔴 MALICIOUS', detail: `Listed as ${urlhausRes.data.threat || 'threat'}` });
        } else {
          heuristics.push({ check: 'URLhaus Database', status: '✅ CLEAN', detail: 'Not found in threat database' });
        }
      } catch {
        heuristics.push({ check: 'URLhaus Database', status: '⚠️ UNAVAILABLE', detail: 'Could not check' });
      }

      riskScore = Math.min(100, riskScore);

      let riskLevel, riskEmoji;
      if (riskScore >= 60) { riskLevel = 'HIGH RISK - Likely Phishing'; riskEmoji = '🔴'; }
      else if (riskScore >= 30) { riskLevel = 'MODERATE RISK - Suspicious'; riskEmoji = '🟡'; }
      else if (riskScore >= 10) { riskLevel = 'LOW RISK - Minor Concerns'; riskEmoji = '🟠'; }
      else { riskLevel = 'MINIMAL RISK - Appears Safe'; riskEmoji = '🟢'; }

      const bar = '█'.repeat(Math.floor(riskScore / 5)) + '░'.repeat(20 - Math.floor(riskScore / 5));

      let result = `┌─⧭⊷ 🔍 *PHISHING URL CHECKER*\n│\n\n└─⧭⊷`;
      result += `├◆ *URL:* ${url.substring(0, 60)}${url.length > 60 ? '...' : ''}\n`;
      result += `├◆ *Domain:* ${domain}\n│\n`;
      result += `├◆ *Risk Score:* ${riskScore}/100\n`;
      result += `│  └⊷ [${bar}]\n`;
      result += `├◆ *Verdict:* ${riskEmoji} ${riskLevel}\n│\n`;

      result += `├◆ *Analysis Results:*\n`;
      heuristics.forEach(h => {
        result += `│  ├◆ ${h.status} ${h.check}\n`;
        result += `│  │  └⊷ ${h.detail}\n`;
      });
      result += `│\n`;

      if (riskScore >= 30) {
        result += `├◆ ⚠️ *Recommendations:*\n`;
        result += `│  ├◆ Do NOT enter personal info\n`;
        result += `│  ├◆ Do NOT download anything\n`;
        result += `│  ├◆ Verify URL with official source\n`;
        result += `│  └⊷ Report to Google Safe Browsing\n`;
      } else {
        result += `├◆ ℹ️ *Note:*\n`;
        result += `│  └⊷ Low risk detected, but always\n│     verify URLs before entering data\n`;
      }
      result += `│\n└─⧭⊷\n> *${getOwnerName().toUpperCase()} TECH*`;

      await sock.sendMessage(jid, { text: result }, { quoted: m });
      await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });
    } catch (err) {
      await sock.sendMessage(jid, { react: { text: '❌', key: m.key } });
      await sock.sendMessage(jid, { text: `❌ Error: ${err.message}` }, { quoted: m });
    }
  }
};

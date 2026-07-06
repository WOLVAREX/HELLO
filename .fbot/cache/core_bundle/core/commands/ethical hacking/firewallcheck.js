import axios from 'axios';
import { getBotName } from '../../lib/botname.js';
import { getOwnerName } from '../../lib/menuHelper.js';

const WAF_SIGNATURES = {
  'Cloudflare': {
    headers: ['cf-ray', 'cf-cache-status', 'cf-request-id'],
    serverMatch: /cloudflare/i
  },
  'AWS WAF / CloudFront': {
    headers: ['x-amz-cf-id', 'x-amz-cf-pop', 'x-amzn-requestid'],
    serverMatch: /amazons3|cloudfront|awselb/i
  },
  'Akamai': {
    headers: ['x-akamai-transformed', 'akamai-origin-hop'],
    serverMatch: /akamaighost|akamai/i
  },
  'Sucuri': {
    headers: ['x-sucuri-id', 'x-sucuri-cache'],
    serverMatch: /sucuri/i
  },
  'Imperva / Incapsula': {
    headers: ['x-iinfo', 'x-cdn'],
    serverMatch: /incapsula|imperva/i
  },
  'F5 BIG-IP': {
    headers: ['x-wa-info'],
    serverMatch: /big-?ip|f5/i
  },
  'Barracuda': {
    headers: ['barra_counter_session'],
    serverMatch: /barracuda/i
  },
  'ModSecurity': {
    headers: [],
    serverMatch: /mod_security|modsecurity/i
  },
  'Fastly': {
    headers: ['x-fastly-request-id', 'fastly-restarts'],
    serverMatch: /fastly/i
  },
  'Varnish': {
    headers: ['x-varnish', 'via'],
    serverMatch: /varnish/i
  },
  'Nginx': {
    headers: [],
    serverMatch: /^nginx/i
  },
  'Apache': {
    headers: [],
    serverMatch: /^apache/i
  }
};

export default {
  name: 'firewallcheck',
  alias: ['waf', 'wafcheck'],
  description: 'Detect WAF/firewall and CDN on a website',
  category: 'ethical hacking',
  usage: 'firewallcheck <url>',
  async execute(sock, m, args, PREFIX) {
    const jid = m.key.remoteJid;
    if (!args[0]) {
      return sock.sendMessage(jid, { text: `┌─⧭⊷ 🛡️ *FIREWALL / WAF CHECK*\n│\n├◆ *${PREFIX}firewallcheck <url>*\n│  └⊷ Detect WAF and firewall\n│\n├◆ *Example:*\n│  └⊷ ${PREFIX}firewallcheck google.com\n│  └⊷ ${PREFIX}firewallcheck cloudflare.com\n│\n└─⧭⊷\n> *${getOwnerName().toUpperCase()} TECH*` }, { quoted: m });
    }
    await sock.sendMessage(jid, { react: { text: '⏳', key: m.key } });
    try {
      let target = args[0];
      if (!target.startsWith('http://') && !target.startsWith('https://')) {
        target = `https://${target}`;
      }

      const response = await axios.get(target, {
        timeout: 15000,
        validateStatus: () => true,
        maxRedirects: 5,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });

      const headers = response.headers;
      const detectedWafs = [];
      const headerDetails = [];

      const server = headers['server'] || 'Not disclosed';
      const poweredBy = headers['x-powered-by'] || 'Not disclosed';

      for (const [wafName, sig] of Object.entries(WAF_SIGNATURES)) {
        let detected = false;
        for (const h of sig.headers) {
          if (headers[h]) {
            detected = true;
            headerDetails.push({ header: h, value: headers[h], waf: wafName });
          }
        }
        if (sig.serverMatch && sig.serverMatch.test(server)) {
          detected = true;
        }
        if (detected) detectedWafs.push(wafName);
      }

      const securityHeaders = {
        'HSTS': headers['strict-transport-security'] ? '✅' : '❌',
        'CSP': headers['content-security-policy'] ? '✅' : '❌',
        'X-Frame-Options': headers['x-frame-options'] ? '✅' : '❌',
        'X-Content-Type': headers['x-content-type-options'] ? '✅' : '❌',
        'X-XSS-Protection': headers['x-xss-protection'] ? '✅' : '❌'
      };

      let wafSection = '';
      if (detectedWafs.length > 0) {
        wafSection = detectedWafs.map(w => `├◆ 🛡️ *${w}*`).join('\n');
      } else {
        wafSection = '├─⊷ No WAF/CDN detected';
      }

      let evidenceSection = '';
      if (headerDetails.length > 0) {
        evidenceSection = headerDetails.slice(0, 5).map(h => `├◆ *${h.header}:* ${String(h.value).substring(0, 50)}`).join('\n');
      }

      const secHeaders = Object.entries(securityHeaders).map(([k, v]) => `├◆ *${k}:* ${v}`).join('\n');

      const result = `┌─⧭⊷ 🛡️ *FIREWALL / WAF DETECTION*\n│\n├◆ *Target:* ${target}\n├◆ *Status:* ${response.status} ${response.statusText}\n├◆ *Server:* ${server}\n├◆ *X-Powered-By:* ${poweredBy}\n│\n├◆ *── Detected WAF/CDN ──*\n${wafSection}\n│\n${evidenceSection ? \n└─⧭⊷`├─⊷ *── Evidence Headers ──*\n${evidenceSection}\n│\n` : ''}├◆ *── Security Headers ──*\n${secHeaders}\n│\n├◆ *Protection Level:* ${detectedWafs.length > 0 ? '🟢 WAF Detected' : '🔴 No WAF Detected'}\n│\n└─⧭⊷\n> *${getOwnerName().toUpperCase()} TECH*`;

      await sock.sendMessage(jid, { text: result }, { quoted: m });
      await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });
    } catch (err) {
      await sock.sendMessage(jid, { react: { text: '❌', key: m.key } });
      await sock.sendMessage(jid, { text: `❌ Error: ${err.message}` }, { quoted: m });
    }
  }
};

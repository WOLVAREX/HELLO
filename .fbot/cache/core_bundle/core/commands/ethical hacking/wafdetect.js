import axios from 'axios';
import { getBotName } from '../../lib/botname.js';
import { getOwnerName } from '../../lib/menuHelper.js';

export default {
  name: 'wafdetect',
  alias: ['waf', 'firewall'],
  description: 'Detect Web Application Firewall (WAF)',
  category: 'ethical hacking',
  usage: 'wafdetect <url>',
  async execute(sock, m, args, PREFIX) {
    const jid = m.key.remoteJid;
    if (!args[0]) {
      return sock.sendMessage(jid, { text: `┌─⧭⊷ 🔥 *WAF DETECTOR*\n│\n├◆ *${PREFIX}wafdetect <url>*\n│  └⊷ Detect Web Application Firewall\n│\n├◆ *Example:*\n│  └⊷ ${PREFIX}wafdetect google.com\n└─⧭⊷\n> *${getOwnerName().toUpperCase()} TECH*` }, { quoted: m });
    }
    await sock.sendMessage(jid, { react: { text: '⏳', key: m.key } });
    try {
      let target = args[0].trim();
      if (!/^https?:\/\//i.test(target)) target = 'https://' + target;

      const res = await axios.get(target, {
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        maxRedirects: 5,
        validateStatus: () => true
      });

      const h = res.headers;
      const server = (h['server'] || '').toLowerCase();
      const cookies = h['set-cookie'] ? (Array.isArray(h['set-cookie']) ? h['set-cookie'].join(' ') : h['set-cookie']).toLowerCase() : '';
      const allHeaders = JSON.stringify(h).toLowerCase();

      const wafs = [
        { name: 'Cloudflare', detected: !!(h['cf-ray'] || server.includes('cloudflare')), evidence: h['cf-ray'] ? `cf-ray: ${h['cf-ray']}` : 'server: cloudflare' },
        { name: 'AWS WAF (CloudFront)', detected: !!(server.includes('cloudfront') || h['x-amz-cf-id'] || h['x-amz-cf-pop']), evidence: h['x-amz-cf-id'] ? 'x-amz-cf-id present' : 'server: cloudfront' },
        { name: 'Akamai', detected: !!(h['x-akamai-transformed'] || server.includes('akamaighost') || h['akamai-grn']), evidence: 'Akamai headers detected' },
        { name: 'Sucuri', detected: !!(h['x-sucuri-id'] || server.includes('sucuri') || allHeaders.includes('sucuri')), evidence: 'Sucuri signatures found' },
        { name: 'Imperva (Incapsula)', detected: !!(h['x-iinfo'] || cookies.includes('incap_ses') || cookies.includes('visid_incap')), evidence: 'Incapsula cookies/headers' },
        { name: 'F5 BIG-IP', detected: !!(cookies.includes('bigip') || server.includes('big-ip') || h['x-wa-info']), evidence: 'BIG-IP signatures found' },
        { name: 'Barracuda', detected: !!(cookies.includes('barra_counter') || h['x-barracuda']), evidence: 'Barracuda signatures found' },
        { name: 'Fastly', detected: !!(h['x-fastly-request-id'] || h['fastly-restarts'] || server.includes('fastly')), evidence: h['x-fastly-request-id'] ? 'x-fastly-request-id present' : 'Fastly detected' },
        { name: 'DDoS-Guard', detected: !!(server.includes('ddos-guard') || allHeaders.includes('ddos-guard')), evidence: 'DDoS-Guard signatures' },
        { name: 'Varnish', detected: !!(h['x-varnish'] || server.includes('varnish') || h['via']?.toLowerCase().includes('varnish')), evidence: h['x-varnish'] ? `x-varnish: ${h['x-varnish']}` : 'Varnish detected' },
        { name: 'Wordfence', detected: !!(allHeaders.includes('wordfence')), evidence: 'Wordfence signatures' },
        { name: 'ModSecurity', detected: !!(server.includes('mod_security') || allHeaders.includes('modsecurity')), evidence: 'ModSecurity signatures' }
      ];

      const detected = wafs.filter(w => w.detected);
      let lines = '';

      if (detected.length > 0) {
        for (const w of detected) {
          lines += `├◆ 🔥 *${w.name}*\n│  └⊷ ${w.evidence}\n│\n`;
        }
      } else {
        lines += `├◆ ⚠️ No WAF detected or WAF is\n│  └⊷ hiding its identity\n│\n`;
      }

      let extra = '';
      if (h['server']) extra += `├◆ *Server:* ${h['server']}\n│\n`;
      if (h['x-powered-by']) extra += `├◆ *X-Powered-By:* ${h['x-powered-by']}\n│\n`;
      if (h['via']) extra += `├◆ *Via:* ${h['via']}\n│\n`;

      const result = `┌─⧭⊷ 🔥 *WAF DETECTION RESULTS*\n│\n├◆ *Target:* ${target}\n├◆ *Status:* ${res.status}\n├◆ *WAFs Found:* ${detected.length}\n│\n${lines}${extra}└─⧭⊷\n> *${getOwnerName().toUpperCase()} TECH*`;

      await sock.sendMessage(jid, { text: result }, { quoted: m });
      await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });
    } catch (err) {
      await sock.sendMessage(jid, { react: { text: '❌', key: m.key } });
      await sock.sendMessage(jid, { text: `❌ Error: ${err.message}` }, { quoted: m });
    }
  }
};

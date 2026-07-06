import axios from 'axios';
import { getBotName } from '../../lib/botname.js';
import { getOwnerName } from '../../lib/menuHelper.js';

export default {
  name: 'asnlookup',
  alias: ['asn', 'aslookup'],
  description: 'ASN lookup - get autonomous system info',
  category: 'ethical hacking',
  usage: 'asnlookup <ip or ASN>',
  async execute(sock, m, args, PREFIX) {
    const jid = m.key.remoteJid;
    if (!args[0]) {
      return sock.sendMessage(jid, { text: `┌─⧭⊷ 🏢 *ASN LOOKUP*\n│\n├◆ *${PREFIX}asnlookup <ip or ASN>*\n│  └⊷ Get ASN info, network range, organization\n│\n├◆ *Example:*\n│  └⊷ ${PREFIX}asnlookup 8.8.8.8\n│  └⊷ ${PREFIX}asnlookup AS15169\n│\n└─⧭⊷\n> *${getOwnerName().toUpperCase()} TECH*` }, { quoted: m });
    }
    await sock.sendMessage(jid, { react: { text: '⏳', key: m.key } });
    try {
      const target = args[0].replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      const { data } = await axios.get(`https://api.hackertarget.com/aslookup/?q=${encodeURIComponent(target)}`, { timeout: 15000 });

      const responseText = typeof data === 'string' ? data.trim() : String(data).trim();

      if (responseText.includes('error') || responseText.includes('API count exceeded') || !responseText) {
        throw new Error(responseText || 'No results returned');
      }

      const lines = responseText.split('\n').filter(l => l.trim());

      let result = `┌─⧭⊷ 🏢 *ASN LOOKUP*\n│\n\n└─⧭⊷`;
      result += `├◆ *Target:* ${target}\n│\n`;

      lines.forEach(line => {
        const parts = line.split(',').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 3) {
          result += `├◆ *IP/Range:* ${parts[0]}\n`;
          result += `├◆ *ASN:* ${parts[1]}\n`;
          result += `├◆ *Organization:* ${parts[2]}\n`;
          if (parts[3]) result += `├◆ *Network:* ${parts[3]}\n`;
          if (parts[4]) result += `├◆ *Country:* ${parts[4]}\n`;
          result += `│\n`;
        } else {
          result += `├◆ ${line.trim()}\n`;
        }
      });

      result += `└─⧭⊷\n> *${getOwnerName().toUpperCase()} TECH*`;

      await sock.sendMessage(jid, { text: result }, { quoted: m });
      await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });
    } catch (err) {
      await sock.sendMessage(jid, { react: { text: '❌', key: m.key } });
      await sock.sendMessage(jid, { text: `❌ Error: ${err.message}` }, { quoted: m });
    }
  }
};

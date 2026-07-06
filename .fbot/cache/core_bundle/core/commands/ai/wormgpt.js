import axios from 'axios';
import { getOwnerName } from '../../lib/menuHelper.js';

const API_KEY = 'wxa_u_f5wfr2vez6';
const API_URL = 'https://apis.xwolf.space/api/ai/wormgpt';

export default {
  name: 'wormgpt',
  aliases: ['wgpt', 'worm', 'darkai'],
  description: 'Ask WormGPT AI',
  category: 'ai',

  async execute(sock, m, args, PREFIX) {
    const jid = m.key.remoteJid;
    const query = args.length > 0
      ? args.join(' ')
      : (m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || '');

    if (!query) {
      return sock.sendMessage(jid, {
        text: `┌─⧭⊷ 🐛 *WORMGPT AI*\n├◆ *${PREFIX}wormgpt <question>*\n│  └⊷ WormGPT AI assistant\n└─⧭⊷ \n> *Powered by FOXY TECH*`
      }, { quoted: m });
    }

    try {
      await sock.sendMessage(jid, { react: { text: '⏳', key: m.key } });

      const { data } = await axios.get(API_URL, {
        params: { q: query, key: API_KEY },
        timeout: 30000
      });

      const reply = data?.result || data?.response || data?.answer || data?.text || data?.message;
      if (!reply) throw new Error('Empty response from API');

      const output = reply.length > 4000 ? reply.substring(0, 4000) + '\n_(truncated)_' : reply;

      await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });
      await sock.sendMessage(jid, {
        text: `🐛 *WormGPT*\n\n${output}\n\n> *Powered by FOXY TECH*`
      }, { quoted: m });

    } catch (err) {
      await sock.sendMessage(jid, { react: { text: '❌', key: m.key } });
      await sock.sendMessage(jid, {
        text: `❌ *WormGPT failed*\n${err.message}`
      }, { quoted: m });
    }
  }
};

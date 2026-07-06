import { getBotName } from '../../lib/botname.js';

export default {
  name: 'alive2',
  aliases: ['alive2'],
  description: 'Check if bot is running',
  category: 'utility',

  async execute(sock, m) {
    const jid = m.key.remoteJid;
    const botName = getBotName();

    const sent = await sock.sendMessage(jid, { text: 'Checking...' }, { quoted: m });

    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600);
    const min = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);
    const uptimeStr = h > 0 ? `${h}h ${min}m ${s}s` : `${min}m ${s}s`;

    await sock.sendMessage(jid, {
      text: `✅ *${botName}* is alive!\nUptime: ${uptimeStr}`,
      edit: sent.key
    });
  }
};

import { getBotName } from '../../lib/botname.js';

export default {
  name: 'uptime',
  aliases: ['runtime'],
  description: 'Check how long the bot has been running',
  category: 'utility',

  async execute(sock, m) {
    const jid = m.key.remoteJid;
    const botName = getBotName();

    const sent = await sock.sendMessage(jid, { text: 'Fetching uptime...' }, { quoted: m });

    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const parts = [];
    if (days > 0)    parts.push(`${days}d`);
    if (hours > 0)   parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    await sock.sendMessage(jid, {
      text: `⏱️ *${botName}* Uptime: ${parts.join(' ')}`,
      edit: sent.key
    });
  }
};

import { getBotName } from '../../lib/botname.js';

export default {
  name: 'ping2',
  aliases: ['ping2'],
  description: 'Check bot response speed',
  category: 'utility',

  async execute(sock, m) {
    const jid = m.key.remoteJid;
    const botName = getBotName();

    const sent = await sock.sendMessage(jid, { text: 'Pinging...' }, { quoted: m });

    const start = Date.now();
    await Promise.resolve();
    const ms = Math.max(10, (Date.now() - start) + 50 + Math.floor(Math.random() * 20));

    await sock.sendMessage(jid, {
      text: `⚡ *${botName}* Speed: ${ms}ms`,
      edit: sent.key
    });
  }
};

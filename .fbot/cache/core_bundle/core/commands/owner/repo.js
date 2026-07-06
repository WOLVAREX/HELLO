import axios from 'axios';
import { getBotName } from '../../lib/botname.js';
import moment from 'moment-timezone';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OWNER = 'WOLFTECH-254';
const REPO = 'FOXY';
const REPO_URL = `https://github.com/${OWNER}/${REPO}`;

function getRepoImage() {
  const dirs = [
    path.join(__dirname, '../menus/media'),
    path.join(__dirname, '../media'),
  ];
  for (const dir of dirs) {
    for (const ext of ['png', 'jpg']) {
      const p = path.join(dir, `foxybot.${ext}`);
      if (fs.existsSync(p)) {
        try { return { type: 'buffer', data: fs.readFileSync(p) }; } catch {}
      }
    }
  }
  return null;
}

export default {
  name: 'repo',
  aliases: ['source', 'github', 'botrepo'],
  description: 'Shows bot GitHub repository',

  async execute(sock, m, args, PREFIX) {
    const jid = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;

    const img = getRepoImage();
    const imagePayload = img ? { image: img.data } : null;

    try {
      const { data } = await axios.get(
        `https://api.github.com/repos/${OWNER}/${REPO}`,
        { timeout: 10000, headers: { 'User-Agent': 'Foxy-Bot', 'Accept': 'application/vnd.github.v3+json' } }
      );

      const sizeKB = data.size;
      const sizeText = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(2)} MB` : `${sizeKB} KB`;

      const txt =
        `🦊 *${getBotName()} Repository*\n\n` +
        `✧ *Name:* ${data.name || REPO}\n` +
        `✧ *Owner:* ${OWNER}\n` +
        `✧ *Stars:* ${data.stargazers_count || 0} ⭐\n` +
        `✧ *Forks:* ${data.forks_count || 0} 🍴\n` +
        `✧ *Watchers:* ${data.watchers_count || 0} 👁️\n` +
        `✧ *Size:* ${sizeText}\n` +
        `✧ *Updated:* ${moment(data.updated_at).format('DD/MM/YYYY HH:mm')}\n` +
        `✧ *Repo:* ${REPO_URL}\n\n` +
        `_${data.description || 'A powerful WhatsApp bot'}_\n\n` +
        `⭐ Star and fork the repo!`;

      const payload = imagePayload ? { ...imagePayload, caption: txt, mentions: [sender] } : { text: txt, mentions: [sender] };
      await sock.sendMessage(jid, payload, { quoted: m });
      try { await sock.sendMessage(jid, { react: { text: '✅', key: m.key } }); } catch {}

    } catch {
      const txt =
        `🦊 *${getBotName()} Repository*\n\n` +
        `✧ *Repo:* ${REPO_URL}\n` +
        `✧ *Owner:* ${OWNER}\n\n` +
        `⭐ Star and fork the repo!`;

      const payload = imagePayload ? { ...imagePayload, caption: txt, mentions: [sender] } : { text: txt, mentions: [sender] };
      await sock.sendMessage(jid, payload, { quoted: m });
      try { await sock.sendMessage(jid, { react: { text: '⚠️', key: m.key } }); } catch {}
    }
  },
};

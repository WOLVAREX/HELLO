import fs from 'fs';
import path from 'path';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

export default {
  name: 'setgpp',
  alias: ['setgrouppp', 'groupprofile'],
  description: 'Set the group profile picture',
  category: 'group',

  async execute(sock, msg, args, prefix, extra) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      await sock.sendMessage(jid, { text: '❌ This command can only be used in groups.' }, { quoted: msg });
      return;
    }

    try {
      const groupMetadata = extra?.groupMetadata || await sock.groupMetadata(jid);
      const userRaw = msg.key.participant || msg.key.remoteJid;
      const userClean = userRaw.split(':')[0].split('@')[0];
      const participant = groupMetadata.participants.find(p => p.id.split(':')[0].split('@')[0] === userClean);
      const isAdmin = participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
      const isOwner = typeof extra?.isOwner === 'function' ? extra.isOwner() : extra?.isOwner;

      if (!isAdmin && !isOwner) {
        await sock.sendMessage(jid, { text: '⛔ Only admins can change the group profile picture.' }, { quoted: msg });
        return;
      }

      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const directImg = msg.message?.imageMessage;
      const imageMessage = directImg || quoted?.imageMessage || quoted?.stickerMessage;

      if (!imageMessage) {
        await sock.sendMessage(jid, {
          text: `📸 *Set Group Profile Picture*\nSend or reply to an image with *${prefix || '.'}setgpp*`
        }, { quoted: msg });
        return;
      }

      const tmpDir = path.join(process.cwd(), 'tmp');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      const stream = await downloadContentFromMessage(imageMessage, 'image');
      let buffer = Buffer.alloc(0);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      const tmpPath = path.join(tmpDir, `gpp_${Date.now()}.jpg`);
      fs.writeFileSync(tmpPath, buffer);

      await sock.updateProfilePicture(jid, { url: tmpPath });
      fs.unlinkSync(tmpPath);

      await sock.sendMessage(jid, { text: '✅ *Group profile picture updated successfully.*' }, { quoted: msg });

    } catch (err) {
      const msg2 = err.message?.includes('not-authorized') || err.message?.includes('401')
        ? 'Bot needs admin permissions to change the group picture.'
        : `Failed to update group picture. ${err.message || ''}`;
      await sock.sendMessage(jid, { text: `❌ ${msg2}` }, { quoted: msg });
    }
  }
};

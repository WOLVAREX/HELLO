export default {
  name: 'removegpp',
  alias: ['removegrouppp', 'deletegpp', 'cleargpp'],
  description: 'Remove the group profile picture',
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
        await sock.sendMessage(jid, { text: '⛔ Only admins can remove the group profile picture.' }, { quoted: msg });
        return;
      }

      await sock.removeProfilePicture(jid);

      await sock.sendMessage(jid, { text: '✅ *Group profile picture removed.*' }, { quoted: msg });

    } catch (err) {
      const msg2 = err.message?.includes('not-authorized') || err.message?.includes('401')
        ? 'Bot needs admin permissions to remove the group picture.'
        : `Failed to remove group picture. ${err.message || ''}`;
      await sock.sendMessage(jid, { text: `❌ ${msg2}` }, { quoted: msg });
    }
  }
};

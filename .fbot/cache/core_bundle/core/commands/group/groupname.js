export default {
  name: 'groupname',
  alias: ['setgroupname', 'setgname', 'renamegc'],
  description: 'Set or update the group name',
  category: 'group',

  async execute(sock, msg, args, prefix, extra) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      await sock.sendMessage(jid, { text: '❌ This command can only be used in groups.' }, { quoted: msg });
      return;
    }

    const newName = args.join(' ').trim();
    if (!newName) {
      await sock.sendMessage(jid, {
        text: `📝 *Set Group Name*\nUsage: *${prefix || '.'}groupname <new name>*`
      }, { quoted: msg });
      return;
    }

    if (newName.length > 100) {
      await sock.sendMessage(jid, { text: '❌ Group name must be 100 characters or less.' }, { quoted: msg });
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
        await sock.sendMessage(jid, { text: '⛔ Only admins can change the group name.' }, { quoted: msg });
        return;
      }

      await sock.groupUpdateSubject(jid, newName);

      await sock.sendMessage(jid, {
        text: `✅ *Group name updated to:* ${newName}`
      }, { quoted: msg });

    } catch (err) {
      const msg2 = err.message?.includes('not-authorized') || err.message?.includes('401')
        ? 'Bot needs admin permissions to change the group name.'
        : `Failed to update group name. ${err.message || ''}`;
      await sock.sendMessage(jid, { text: `❌ ${msg2}` }, { quoted: msg });
    }
  }
};

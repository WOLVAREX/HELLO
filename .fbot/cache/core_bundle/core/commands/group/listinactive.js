import { getOwnerName } from '../../lib/menuHelper.js';
export default {
  name: 'listinactive',
  description: 'Detect inactive members based on presence scan',
  aliases: ['inactive', 'whosaway', 'deadmembers'],

  async execute(sock, m, args, PREFIX, extra) {
    const jid = m.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, {
        text: '❌ This command only works in groups.'
      }, { quoted: m });
    }

    try { await sock.sendMessage(jid, { react: { text: '⏳', key: m.key } }); } catch {}

    try {
      const groupMetadata = await sock.groupMetadata(jid);
      const participants = groupMetadata.participants;
      const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
      const groupName = groupMetadata.subject || 'Group';

      const members = participants.filter(p =>
        !p.id.includes('status') && p.id !== botJid
      );
      const totalMembers = members.length;

      const onlineSet = new Set();
      const scanDuration = 10000;

      const presenceHandler = (json) => {
        if (!json || !json.id) return;
        if (json.id !== jid) return;

        if (json.presences) {
          for (const [participantJid, data] of Object.entries(json.presences)) {
            if (data?.lastKnownPresence &&
                (data.lastKnownPresence === 'available' ||
                 data.lastKnownPresence === 'composing' ||
                 data.lastKnownPresence === 'recording')) {
              onlineSet.add(participantJid.split(':')[0].split('@')[0]);
            }
          }
        }
      };

      sock.ev.on('presence.update', presenceHandler);

      try { await sock.presenceSubscribe(jid); } catch {}

      const batchSize = 30;
      for (let i = 0; i < Math.min(members.length, 100); i += batchSize) {
        const batch = members.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(p => sock.presenceSubscribe(p.id).catch(() => {}))
        );
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      await new Promise(resolve => setTimeout(resolve, scanDuration));

      sock.ev.off('presence.update', presenceHandler);

      const hasProfilePic = new Set();
      const noProfilePic = new Set();

      for (const participant of members) {
        const phone = participant.id.split(':')[0].split('@')[0];
        try {
          const ppUrl = await sock.profilePictureUrl(participant.id, 'image');
          if (ppUrl) hasProfilePic.add(phone);
          else noProfilePic.add(phone);
        } catch {
          noProfilePic.add(phone);
        }
      }

      const inactiveMembers = [];
      const activeMembers = [];
      const unknownMembers = [];

      for (const participant of members) {
        const phone = participant.id.split(':')[0].split('@')[0];
        const isOnline = onlineSet.has(phone);
        const hasPP = hasProfilePic.has(phone);

        const memberData = {
          id: participant.id,
          phone,
          admin: participant.admin || null
        };

        if (isOnline) {
          activeMembers.push(memberData);
        } else if (!hasPP) {
          inactiveMembers.push(memberData);
        } else {
          unknownMembers.push(memberData);
        }
      }

      let report =
        `┌─⧭⊷ \`${groupName}\`\n\n└─⧭⊷` +
        `│\n` +
        `├◆ *📊 ACTIVITY REPORT*\n` +
        `│  • *Total Members:* ${totalMembers}\n` +
        `│  • 🟢 *Online Now:* ${activeMembers.length}\n` +
        `│  • 🔴 *Likely Inactive:* ${inactiveMembers.length}\n` +
        `│  • ⚫ *Offline/Private:* ${unknownMembers.length}\n` +
        `│\n`;

      if (inactiveMembers.length > 0) {
        report += `├◆ *🔴 LIKELY INACTIVE*\n`;
        report += `│  _No profile pic + not online_\n`;
        inactiveMembers.slice(0, 30).forEach((member) => {
          const badge = member.admin ? '👑' : '👤';
          report += `│  • ${badge} @${member.phone}\n`;
        });
        if (inactiveMembers.length > 30) {
          report += `│  • ...+${inactiveMembers.length - 30} more\n`;
        }
        report += `│\n`;
      }

      if (activeMembers.length > 0) {
        report += `├◆ *🟢 ONLINE NOW*\n`;
        activeMembers.slice(0, 15).forEach((member) => {
          const badge = member.admin ? '👑' : '👤';
          report += `│  • ${badge} @${member.phone}\n`;
        });
        if (activeMembers.length > 15) {
          report += `│  • ...+${activeMembers.length - 15} more\n`;
        }
        report += `│\n`;
      }

      report +=
        `│ *Related:*\n` +
        `│ • \`${PREFIX}listonline\` - Check who's online\n` +
        `│ • \`${PREFIX}kick @user\` - Remove member\n` +
        `│ • \`${PREFIX}kickall\` - Remove all non-admins\n` +
        `│\n` +
        `> *Powered by FOXY TECH*` +
        `\n🔒 _Results depend on user privacy settings_`;

      const allMentionIds = [...inactiveMembers, ...activeMembers].map(m => m.id);

      await sock.sendMessage(jid, {
        text: report,
        mentions: allMentionIds
      }, { quoted: m });

      try { await sock.sendMessage(jid, { react: { text: '✅', key: m.key } }); } catch {}

    } catch (err) {
      console.error('ListInactive error:', err);
      await sock.sendMessage(jid, {
        text: `❌ *Inactivity scan failed*\n\n${err.message}`
      }, { quoted: m });
      try { await sock.sendMessage(jid, { react: { text: '❌', key: m.key } }); } catch {}
    }
  }
};

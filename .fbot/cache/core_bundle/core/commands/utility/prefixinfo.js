import { getBotName } from '../../lib/botname.js';

export default {
    name: 'prefixinfo',
    alias: ['prefix', 'myprefix', 'botprefix'],
    description: 'Check the current bot prefix',
    category: 'info',

    async execute(sock, msg, args, PREFIX) {
        const { remoteJid } = msg.key;
        const isPrefixless = global.isPrefixless || (!PREFIX || PREFIX.trim() === '');
        const currentPrefix = isPrefixless ? 'none (prefixless mode)' : PREFIX;

        const text = `*${getBotName()}* Prefix: *${currentPrefix}*`;

        await sock.sendMessage(remoteJid, { text }, { quoted: msg });
    }
};

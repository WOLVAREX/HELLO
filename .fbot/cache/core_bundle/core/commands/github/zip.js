import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { getBotName } from '../../lib/botname.js';

const REPO_FULL = 'WOLFTECH-254/FOXY';
const REPO_NAME = 'FOXY';

export default {
    name: 'zip',
    alias: ['botzip', 'getbot', 'botfile', 'botcode'],
    description: 'Get the bot source code as a ZIP file',
    category: 'utility',

    async execute(sock, m) {
        const chatId = m.key.remoteJid;

        try {
            try { await sock.sendMessage(chatId, { react: { text: '⏳', key: m.key } }); } catch {}

            if (!fs.existsSync('./temp')) fs.mkdirSync('./temp', { recursive: true });
            const zipPath = `./temp/${REPO_NAME}_${Date.now()}.zip`;

            let downloaded = false;
            for (const branch of ['main', 'master']) {
                if (downloaded) break;
                try {
                    const zipUrl = `https://github.com/${REPO_FULL}/archive/refs/heads/${branch}.zip`;
                    const response = await axios({ method: 'GET', url: zipUrl, responseType: 'stream', timeout: 120000, maxContentLength: 200 * 1024 * 1024 });
                    await pipeline(response.data, createWriteStream(zipPath));
                    downloaded = true;
                } catch {}
            }

            if (!downloaded || !fs.existsSync(zipPath)) {
                throw new Error('Failed to download. Repository may be private or unavailable.');
            }

            const zipSize = fs.statSync(zipPath).size;
            const sizeMB = (zipSize / (1024 * 1024)).toFixed(2);

            if (zipSize > 100 * 1024 * 1024) {
                throw new Error(`ZIP too large (${sizeMB}MB). Max is 100MB.`);
            }

            let stars = 0, forks = 0;
            try {
                const api = await axios.get(`https://api.github.com/repos/${REPO_FULL}`, { timeout: 5000 });
                stars = api.data.stargazers_count || 0;
                forks = api.data.forks_count || 0;
            } catch {}

            try { await sock.sendMessage(chatId, { react: { text: '📤', key: m.key } }); } catch {}

            await sock.sendMessage(chatId, {
                document: fs.readFileSync(zipPath),
                fileName: `${REPO_NAME}.zip`,
                mimetype: 'application/zip',
                caption:
                    `🦊 *${getBotName()} — Bot Source Code*\n\n` +
                    `✧ *Repo:* github.com/${REPO_FULL}\n` +
                    `✧ *Size:* ${sizeMB} MB\n` +
                    `✧ *Stars:* ${stars} ⭐  *Forks:* ${forks} 🍴`
            }, { quoted: m });

            setTimeout(() => { try { if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath); } catch {} }, 30000);
            try { await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } }); } catch {}

        } catch (error) {
            await sock.sendMessage(chatId, { text: `❌ Failed to get ZIP\n${error.message}` }, { quoted: m });
            try { await sock.sendMessage(chatId, { react: { text: '❌', key: m.key } }); } catch {}
        }
    }
};

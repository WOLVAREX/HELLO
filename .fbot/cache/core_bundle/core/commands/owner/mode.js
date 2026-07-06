// ====== commands/owner/mode.js ======
// The ?mode command — lets the owner switch how the bot decides which
// messages it responds to.
//
// Available modes:
//   public  — responds to everyone in all chats (groups + DMs)
//   groups  — responds only in group chats
//   dms     — responds only in private (1-on-1) messages
//   silent  — responds only to the owner (stealth / maintenance)
//
// All modes are stored in bot_mode.json, written to disk, and synced into
// global.BOT_MODE + process.env.BOT_MODE so the main message handler picks
// the new value instantly without restarting.
//
// NOTE: All bot responses are always forwarded as channel messages from the
// configured channel — this is permanent and not a toggleable mode.

import { writeFileSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getOwnerName } from '../../lib/menuHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'mode',
    alias: ['botmode', 'setmode'],
    category: 'owner',
    description: 'Change bot operating mode',
    ownerOnly: true,

    async execute(sock, msg, args, PREFIX, extra) {
        const chatId = msg.key.remoteJid;
        const { jidManager } = extra;

        const isSudoUser = extra?.isSudo ? extra.isSudo() : false;
        if (!jidManager.isOwner(msg) && !isSudoUser) {
            return sock.sendMessage(chatId, {
                text: `❌ *Owner Only Command!*\n\nOnly the bot owner can change the bot mode.`
            }, { quoted: msg });
        }

        const modes = {
            'public': {
                name: '🌍 Public Mode',
                description: 'Bot responds to everyone in all chats',
                icon: '🌍'
            },
            'groups': {
                name: '👥 Groups Only',
                description: 'Bot responds only in group chats',
                icon: '👥'
            },
            'dms': {
                name: '💬 DMs Only',
                description: 'Bot responds only in private messages',
                icon: '💬'
            },
            'silent': {
                name: '🔇 Silent Mode',
                description: 'Bot responds only to the owner',
                icon: '🔇'
            }
        };

        // ── No argument: show mode selection menu ───────────────────────────
        if (!args[0]) {
            const currentMode = this.getCurrentMode();
            const currentLabel = modes[currentMode]?.name || currentMode;
            return sock.sendMessage(chatId, {
                text:
                    `┌─⧭⊷ 🤖 *BOT MODE*\n\n└─⧭⊷` +
                    `│\n` +
                    `├◆ *${PREFIX}mode public*\n` +
                    `│  └⊷ Responds to everyone\n` +
                    `├◆ *${PREFIX}mode groups*\n` +
                    `│  └⊷ Groups only\n` +
                    `├◆ *${PREFIX}mode dms*\n` +
                    `│  └⊷ DMs only\n` +
                    `├◆ *${PREFIX}mode silent*\n` +
                    `│  └⊷ Owner only\n` +
                    `│\n` +
                    `├◆ *Current:* ${currentLabel}\n` +
                    `│\n` +
                    `> *Powered by FOXY TECH*`
            }, { quoted: msg });
        }

        // ── Mode argument provided ──────────────────────────────────────────
        const requestedMode = args[0].toLowerCase();

        if (!modes[requestedMode]) {
            return sock.sendMessage(chatId, {
                text: `❌ *Invalid mode.* Use: ${PREFIX}mode public | groups | dms | silent`
            }, { quoted: msg });
        }

        try {
            const senderJid = msg.key.participant || chatId;
            const cleaned = jidManager.cleanJid(senderJid);

            const modeData = {
                mode: requestedMode,
                modeName: modes[requestedMode].name,
                setBy: cleaned.cleanNumber || 'Unknown',
                setAt: new Date().toISOString(),
                timestamp: Date.now(),
                version: "2.0"
            };

            writeFileSync('./bot_mode.json', JSON.stringify(modeData, null, 2));

            if (typeof global !== 'undefined') {
                global.BOT_MODE = requestedMode;
                global.mode = requestedMode;
                global.MODE_LAST_UPDATED = Date.now();
            }

            process.env.BOT_MODE = requestedMode;

            if (typeof globalThis.updateBotModeCache === 'function') {
                globalThis.updateBotModeCache(requestedMode);
            }

            const modeInfo = modes[requestedMode];

            await sock.sendMessage(chatId, {
                text: `┌─⧭⊷ ✅ *MODE UPDATED*\n├◆ *${modeInfo.name}*\n│  └⊷ ${modeInfo.description}\n└─⧭⊷ \n> *Powered by FOXY TECH*`
            }, { quoted: msg });

            console.log(`✅ Mode changed to ${requestedMode} by ${cleaned.cleanNumber}`);

        } catch (error) {
            console.error('Error saving mode:', error);
            await sock.sendMessage(chatId, {
                text: `❌ Error saving mode: ${error.message}`
            }, { quoted: msg });
        }
    },

    getCurrentMode() {
        try {
            const possiblePaths = [
                './bot_mode.json',
                path.join(__dirname, 'bot_mode.json'),
                path.join(__dirname, '../bot_mode.json'),
                path.join(__dirname, '../../bot_mode.json'),
            ];

            for (const modePath of possiblePaths) {
                if (existsSync(modePath)) {
                    const modeData = JSON.parse(readFileSync(modePath, 'utf8'));
                    return modeData.mode;
                }
            }

            if (global.BOT_MODE) return global.BOT_MODE;
            if (global.mode) return global.mode;
            if (process.env.BOT_MODE) return process.env.BOT_MODE;

        } catch (error) {
            console.error('Error reading bot mode:', error);
        }

        return 'public';
    }
};

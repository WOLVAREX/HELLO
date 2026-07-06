import { getCommandInfo, getAllApiCommands, assembleUrl, PARAM_STYLE_LABELS } from '../../lib/apiRegistry.js';
import { getBotName } from '../../lib/botname.js';
import { createRequire } from 'module';

const _require = createRequire(import.meta.url);
let _giftedBtns = null;
try { _giftedBtns = _require('gifted-btns'); } catch {}

export default {
    name: 'getapi',
    aliases: ['apiinfo', 'checkapi'],
    category: 'owner',
    desc: 'View the API endpoint, style, and live URL preview for a command',
    usage: '.getapi <command> | .getapi (list all)',
    ownerOnly: true,

    async execute(sock, msg, args, PREFIX, extra) {
        const chatJid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(chatJid, { text }, { quoted: msg });
        const BOT_NAME = extra?.BOT_NAME || getBotName() || 'FOXY BOT';
        const cmdName = (args[0] || '').toLowerCase().trim();

        // ── LIST ALL ────────────────────────────────────────────────────────
        if (!cmdName) {
            const all = getAllApiCommands();
            const grouped = {};
            for (const { cmd, label, category } of all) {
                if (!grouped[category]) grouped[category] = [];
                grouped[category].push({ cmd, label });
            }
            let text = `┌─⧭⊷ 🌐 *API REGISTRY*\n│\n\n└─⧭⊷`;
            for (const [cat, cmds] of Object.entries(grouped)) {
                text += `├◆ *${cat.toUpperCase()}*\n`;
                for (const { cmd, label } of cmds) {
                    text += `│  └⊷ *${PREFIX}${cmd}* — ${label}\n`;
                }
                text += `│\n`;
            }
            text += `├◆ 💡 *Usage:* ${PREFIX}getapi <command>\n`;
            text += `├◆ 📡 *Test:* ${PREFIX}fetchapi <command>\n`;
            text += `├◆ 🔄 *Replace:* ${PREFIX}replaceapi <command> <url> [style]\n`;
            text += `└─⧭⊷ *Powered by ${BOT_NAME.toUpperCase()}*`;
            await reply(text);
            return;
        }

        // ── SINGLE COMMAND ──────────────────────────────────────────────────
        const info = getCommandInfo(cmdName);
        if (!info) {
            await reply(
                `❌ No API registered for *${cmdName}*.\n\n` +
                `Use *${PREFIX}getapi* to see all commands with APIs.`
            );
            return;
        }

        const statusTag   = info.isOverridden ? '🔄 *OVERRIDDEN*' : '✅ *DEFAULT*';
        const overrideLine = info.isOverridden
            ? `├◆ 🔁 *Default:*\n│  └⊷ ${info.defaultUrl}\n│\n`
            : '';
        const styleLabel = PARAM_STYLE_LABELS[info.paramStyle] || info.paramStyle;

        // Build a live preview URL with the testQuery so the owner can see exactly
        // what URL will be called when a user runs the command
        const previewUrl = assembleUrl(info.currentUrl, info.paramStyle, info.testQuery || 'test_query');

        const text =
            `┌─⧭⊷ 🌐 *API INFO — ${cmdName.toUpperCase()}*\n\n└─⧭⊷` +
            `│\n` +
            `├◆ 📦 *Command:* ${PREFIX}${info.cmd}\n` +
            `├◆ 📋 *Label:* ${info.label}\n` +
            `├◆ 📁 *Category:* ${info.category}\n` +
            `│\n` +
            `├◆ 🔗 *Base URL:*\n` +
            `│  └⊷ ${info.currentUrl}\n` +
            `│\n` +
            `├◆ 🎨 *Param Style:* \`${info.paramStyle}\`\n` +
            `│  └⊷ ${styleLabel}\n` +
            `│\n` +
            `├◆ 🔍 *Live URL Preview:*\n` +
            `│  └⊷ ${previewUrl}\n` +
            `│\n` +
            `├◆ 📊 *Status:* ${statusTag}\n` +
            `│\n` +
            overrideLine +
            `├◆ 📡 *Test API:* ${PREFIX}fetchapi ${cmdName}\n` +
            `├◆ 🔄 *Replace:* ${PREFIX}replaceapi ${cmdName} <url> [style]\n` +
            `├◆ ♻️ *Reset:* ${PREFIX}replaceapi ${cmdName} reset\n` +
            `│\n` +
            `└─⧭⊷ *Powered by ${BOT_NAME.toUpperCase()}*`;

        if (_giftedBtns?.sendInteractiveMessage) {
            try {
                await _giftedBtns.sendInteractiveMessage(sock, chatJid, {
                    text,
                    footer: BOT_NAME,
                    interactiveButtons: [
                        {
                            name: 'quick_reply',
                            buttonParamsJson: JSON.stringify({
                                display_text: '📡 TEST API',
                                id: `${PREFIX}fetchapi ${cmdName}`
                            })
                        },
                        {
                            name: 'quick_reply',
                            buttonParamsJson: JSON.stringify({
                                display_text: '🔄 REPLACE API',
                                id: `${PREFIX}replaceapi ${cmdName} `
                            })
                        },
                        {
                            name: 'cta_url',
                            buttonParamsJson: JSON.stringify({
                                display_text: '🌐 Open Preview URL',
                                url: previewUrl,
                                merchant_url: previewUrl
                            })
                        }
                    ]
                });
                return;
            } catch (e) {
                console.log('[getapi] Buttons failed:', e?.message);
            }
        }

        await reply(text);
    }
};

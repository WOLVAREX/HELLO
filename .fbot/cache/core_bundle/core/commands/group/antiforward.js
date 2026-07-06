import { getOwnerName } from '../../lib/menuHelper.js';

// ── Config helpers (globalThis pattern, wired in index.js) ───────────────────
function loadConfig() {
    if (typeof globalThis._antiforwardConfig === 'object' && globalThis._antiforwardConfig !== null) {
        return globalThis._antiforwardConfig;
    }
    return {};
}

function saveConfig(data) {
    globalThis._antiforwardConfig = data;
    if (typeof globalThis._saveAntiforwardConfig === 'function') {
        globalThis._saveAntiforwardConfig(data);
    }
}

function cleanJid(jid) {
    if (!jid) return jid;
    const clean = jid.split(':')[0];
    return clean.includes('@') ? clean : clean + '@s.whatsapp.net';
}

// ── Forward detection ────────────────────────────────────────────────────────

function getContextInfo(message) {
    if (!message) return null;
    return message.extendedTextMessage?.contextInfo
        || message.imageMessage?.contextInfo
        || message.videoMessage?.contextInfo
        || message.audioMessage?.contextInfo
        || message.documentMessage?.contextInfo
        || message.stickerMessage?.contextInfo
        || message.contactMessage?.contextInfo
        || message.locationMessage?.contextInfo
        || message.pollCreationMessage?.contextInfo
        || null;
}

export function isForwardedMessage(message) {
    const ctx = getContextInfo(message);
    if (!ctx) return false;
    return ctx.isForwarded === true || (ctx.forwardingScore != null && ctx.forwardingScore > 0);
}

function getForwardSource(message) {
    const ctx = getContextInfo(message);
    if (!ctx) return 'unknown';
    const jid = ctx.remoteJid || '';
    if (jid.endsWith('@newsletter') || jid.includes('newsletter')) return 'channel';
    if (jid.endsWith('@g.us')) return 'group';
    if (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@c.us')) return 'dm';
    // No remoteJid = a plain forwarded msg with no source info → treat as dm
    return ctx.forwardingScore > 0 ? 'dm' : 'unknown';
}

function sourceBlocked(source, blockedSources) {
    if (!blockedSources || blockedSources.includes('all')) return true;
    return blockedSources.includes(source);
}

// ── Public exports ───────────────────────────────────────────────────────────

export function isAntiForwardEnabled(groupId) {
    return loadConfig()[groupId]?.enabled || false;
}

export async function handleAntiForward(sock, msg) {
    try {
        if (!msg.message || msg.key?.fromMe) return;

        const chatJid = msg.key.remoteJid;
        if (!chatJid?.endsWith('@g.us')) return;

        const config = loadConfig();
        const gc = config[chatJid];
        if (!gc?.enabled) return;

        if (!isForwardedMessage(msg.message)) return;

        const source = getForwardSource(msg.message);
        if (!sourceBlocked(source, gc.sources || ['all'])) return;

        const senderJid = cleanJid(msg.key.participant || chatJid);
        const userName  = senderJid.split('@')[0];

        // Fetch group metadata for admin check
        let isAdmin = false;
        let metadata;
        try {
            metadata = await sock.groupMetadata(chatJid);
            const participant = metadata.participants.find(p => cleanJid(p.id) === senderJid);
            isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';
        } catch {
            return;
        }

        if (gc.exemptAdmins && isAdmin) return;

        // Increment warnings
        if (!gc.warnings) gc.warnings = {};
        if (!gc.warnings[senderJid]) gc.warnings[senderJid] = 0;
        gc.warnings[senderJid]++;
        const warningCount = gc.warnings[senderJid];
        const maxWarnings  = gc.maxWarnings || 1;

        const sourceLabel = { group: '👥 Group', channel: '📢 Channel', dm: '💬 DM', unknown: '❓ Unknown' }[source] || source;

        config[chatJid] = gc;
        saveConfig(config);

        switch (gc.mode) {
            case 'delete': {
                try { await sock.sendMessage(chatJid, { delete: msg.key }); } catch {}
                await sock.sendMessage(chatJid, {
                    text:
                        `🚫 *Forwarded Message Removed*\n\n` +
                        `@${userName}, forwarded messages are not allowed here.\n` +
                        `📤 Source: ${sourceLabel}\n` +
                        `⚡ Warning: *${warningCount}/${maxWarnings}*` +
                        (warningCount >= maxWarnings ? '\n🚨 _Next violation may result in removal!_' : ''),
                    mentions: [senderJid]
                });
                break;
            }

            case 'warn': {
                await sock.sendMessage(chatJid, {
                    text:
                        `⚠️ *Forwarded Message Warning*\n\n` +
                        `@${userName}, please do not forward messages here.\n` +
                        `📤 Source: ${sourceLabel}\n` +
                        `⚡ Warning: *${warningCount}/${maxWarnings}*` +
                        (warningCount >= maxWarnings ? '\n🚨 _Next violation may result in removal!_' : ''),
                    mentions: [senderJid]
                });
                break;
            }

            case 'kick': {
                if (warningCount >= maxWarnings) {
                    try {
                        await sock.sendMessage(chatJid, {
                            text:
                                `🚨 *Auto-Kick: Forwarded Message*\n\n` +
                                `@${userName} has been removed for repeatedly forwarding messages.\n` +
                                `📤 Source: ${sourceLabel} | 📋 Violations: *${warningCount}*`,
                            mentions: [senderJid]
                        });
                        await sock.groupParticipantsUpdate(chatJid, [senderJid], 'remove');
                        delete gc.warnings[senderJid];
                        saveConfig(config);
                    } catch {
                        await sock.sendMessage(chatJid, {
                            text: `❌ Failed to remove @${userName}. Make sure I have admin permissions.`,
                            mentions: [senderJid]
                        });
                    }
                } else {
                    try { await sock.sendMessage(chatJid, { delete: msg.key }); } catch {}
                    await sock.sendMessage(chatJid, {
                        text:
                            `⚠️ *Forwarded Message Warning*\n\n` +
                            `@${userName}, forwarded messages are not allowed here.\n` +
                            `📤 Source: ${sourceLabel}\n` +
                            `⚡ Warning: *${warningCount}/${maxWarnings}*\n` +
                            `🚨 _You will be removed on the next violation!_`,
                        mentions: [senderJid]
                    });
                }
                break;
            }
        }
    } catch (err) {
        console.error('[ANTIFORWARD] Handler error:', err.message);
    }
}

// ── Command ──────────────────────────────────────────────────────────────────
export default {
    name:        'antiforward',
    alias:       ['noforward', 'antiforwarded', 'blockforward'],
    category:    'group',
    description: 'Block forwarded messages in group — warn, delete, or kick',
    groupOnly:   true,

    async execute(sock, msg, args, PREFIX, extra) {
        const chatId = msg.key.remoteJid;
        const owner  = getOwnerName().toUpperCase();

        // Admin check
        try {
            const metadata = await sock.groupMetadata(chatId);
            const senderJid = cleanJid(msg.key.participant || chatId);
            const participant = metadata.participants.find(p => cleanJid(p.id) === senderJid);
            const isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';
            if (!isAdmin && !extra?.jidManager?.isOwner(msg)) {
                return sock.sendMessage(chatId, {
                    text: '❌ *Admin Only Command*'
                }, { quoted: msg });
            }
        } catch {
            return sock.sendMessage(chatId, { text: '❌ Failed to check permissions.' }, { quoted: msg });
        }

        const config    = loadConfig();
        const action    = args[0]?.toLowerCase();

        const gc = config[chatId] || {
            enabled:      false,
            mode:         'delete',
            sources:      ['all'],
            exemptAdmins: true,
            maxWarnings:  1,
            warnings:     {}
        };

        // ── No args → brief menu ─────────────────────────────────────────────
        if (!action) {
            const status = gc.enabled ? `✅ ${gc.mode.toUpperCase()}` : '❌ OFF';
            return sock.sendMessage(chatId, {
                text:
                    `┌─⧭⊷ 📤 *ANTI-FORWARD*\n\n└─⧭⊷` +
                    `├◆ Status: ${status}\n` +
                    `\n` +
                    `├◆ on warn/delete/kick\n` +
                    `├◆ off\n` +
                    `├◆ sources all/groups/channels/dms\n` +
                    `├◆ maxwarn <n>\n` +
                    `├◆ reset [@user|all]\n` +
                    `├◆ status\n` +
                    `├◆ help\n` +
                    `└─⧭⊷ *Powered by ${owner} TECH*`
            }, { quoted: msg });
        }

        // ── Detailed help ─────────────────────────────────────────────────────
        if (action === 'help') {
            return sock.sendMessage(chatId, {
                text:
                    `┌─⧭⊷ 📤 *ANTI-FORWARD GUIDE*\n\n└─⧭⊷` +
                    `\n` +
                    `├◆ *on warn* — Warn sender, track count\n` +
                    `├◆ *on delete* — Delete msg + warn sender\n` +
                    `├◆ *on kick* — Delete + kick after max warns\n` +
                    `├◆ *off* — Disable protection\n` +
                    `\n` +
                    `├◆ *sources all* — Block any forward\n` +
                    `├◆ *sources groups* — Forwards from groups only\n` +
                    `├◆ *sources channels* — Forwards from channels only\n` +
                    `├◆ *sources dms* — Forwards from DMs only\n` +
                    `  ├◆ Mix: sources groups channels\n` +
                    `\n` +
                    `├◆ *maxwarn <n>* — Violations before kick\n` +
                    `├◆ *reset @user* — Clear user warnings\n` +
                    `├◆ *reset all* — Clear all warnings\n` +
                    `├◆ *status* — View current settings\n` +
                    `└─⧭⊷ *Admins are exempt by default*`
            }, { quoted: msg });
        }

        if (action === 'on') {
            const mode = args[1]?.toLowerCase();
            if (!mode || !['warn', 'delete', 'kick'].includes(mode)) {
                return sock.sendMessage(chatId, {
                    text: `❌ Specify a mode: *warn*, *delete*, or *kick*\nExample: ${PREFIX}antiforward on delete`
                }, { quoted: msg });
            }

            gc.enabled = true;
            gc.mode    = mode;
            if (mode === 'kick') gc.maxWarnings = gc.maxWarnings || 1;
            config[chatId] = gc;
            saveConfig(config);

            const modeEmoji = { warn: '⚠️', delete: '🗑️', kick: '👢' }[mode];
            return sock.sendMessage(chatId, {
                text: `${modeEmoji} *Anti-Forward ON* — Mode: *${mode.toUpperCase()}*`
            }, { quoted: msg });
        }

        if (action === 'off' || action === 'disable') {
            gc.enabled = false;
            config[chatId] = gc;
            saveConfig(config);
            return sock.sendMessage(chatId, {
                text: '❌ *Anti-Forward OFF*'
            }, { quoted: msg });
        }

        if (action === 'sources') {
            const rawSources = args.slice(1).map(s => s.toLowerCase());
            const valid = ['all', 'groups', 'channels', 'dms', 'group', 'channel', 'dm'];
            const normalized = rawSources
                .filter(s => valid.includes(s))
                .map(s => s.replace(/s$/, ''));   // groups→group, channels→channel, dms→dm

            if (normalized.length === 0) {
                return sock.sendMessage(chatId, {
                    text: `❌ Specify sources: *all*, *groups*, *channels*, *dms*\nCurrent: ${(gc.sources || ['all']).join(', ')}`
                }, { quoted: msg });
            }

            gc.sources = normalized.includes('all') ? ['all'] : [...new Set(normalized)];
            config[chatId] = gc;
            saveConfig(config);
            return sock.sendMessage(chatId, {
                text: `✅ *Sources updated:* ${gc.sources.join(', ')}`
            }, { quoted: msg });
        }

        if (action === 'maxwarn' || action === 'maxwarnings') {
            const num = parseInt(args[1]);
            if (!num || num < 1 || num > 20) {
                return sock.sendMessage(chatId, {
                    text: `❌ Provide a number between 1 and 20.\nExample: ${PREFIX}antiforward maxwarn 3`
                }, { quoted: msg });
            }
            gc.maxWarnings = num;
            config[chatId] = gc;
            saveConfig(config);
            return sock.sendMessage(chatId, {
                text: `✅ *Max warnings set to ${num}*`
            }, { quoted: msg });
        }

        if (action === 'reset') {
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            if (args[1] === 'all') {
                gc.warnings = {};
                config[chatId] = gc;
                saveConfig(config);
                return sock.sendMessage(chatId, { text: '✅ All forward warnings reset.' }, { quoted: msg });
            }
            if (mentioned?.length > 0) {
                const target = cleanJid(mentioned[0]);
                delete gc.warnings?.[target];
                config[chatId] = gc;
                saveConfig(config);
                return sock.sendMessage(chatId, {
                    text: `✅ Warnings reset for @${target.split('@')[0]}`,
                    mentions: [target]
                }, { quoted: msg });
            }
            return sock.sendMessage(chatId, {
                text: `❌ Tag a user or use \`${PREFIX}antiforward reset all\``
            }, { quoted: msg });
        }

        if (action === 'status' || action === 'settings') {
            const modeEmoji = { warn: '⚠️', delete: '🗑️', kick: '👢' };
            const warnList  = Object.entries(gc.warnings || {});
            let warnText = '';
            if (warnList.length > 0) {
                warnText = '\n\n📋 *Warning Log:*\n' +
                    warnList.map(([jid, c]) => `• @${jid.split('@')[0]}: ${c} warning(s)`).join('\n');
            }
            return sock.sendMessage(chatId, {
                text:
                    `📊 *ANTI-FORWARD STATUS*\n\n` +
                    `Enabled  : ${gc.enabled ? '✅ YES' : '❌ NO'}\n` +
                    `Mode     : ${modeEmoji[gc.mode] || '❓'} *${(gc.mode || 'none').toUpperCase()}*\n` +
                    `Sources  : ${(gc.sources || ['all']).join(', ')}\n` +
                    `Max warns: ${gc.maxWarnings || 1}\n` +
                    `Admins   : ${gc.exemptAdmins ? '✅ Exempt' : '❌ Not exempt'}` +
                    warnText,
                mentions: warnList.map(([jid]) => jid)
            }, { quoted: msg });
        }

        return sock.sendMessage(chatId, {
            text: `❌ Unknown option. Use \`${PREFIX}antiforward help\` for usage.`
        }, { quoted: msg });
    }
};

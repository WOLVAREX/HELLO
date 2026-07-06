import db from '../../lib/database.js';
import { getOwnerName } from '../../lib/menuHelper.js';

const BRAND = () => getOwnerName().toUpperCase();

// ─── Per-group bot-side storage ───────────────────────────────────────────────
let _cache = null;

async function _load() {
    if (_cache) return _cache;
    try {
        const data = await db.getConfig('joinapproval_data', {});
        _cache = data && data.groups ? data : { groups: {} };
    } catch {
        if (!_cache) _cache = { groups: {} };
    }
    return _cache;
}

async function _save(data) {
    try {
        data.updated = new Date().toISOString();
        _cache = data;
        await db.setConfig('joinapproval_data', data);
    } catch {}
}

export async function isJoinApprovalEnabled(groupId) {
    try {
        const data = await _load();
        return data.groups[groupId]?.enabled === true;
    } catch {
        return false;
    }
}

export async function setJoinApprovalEnabled(groupId, enabled) {
    const data = await _load();
    if (!data.groups[groupId]) data.groups[groupId] = {};
    data.groups[groupId].enabled = enabled;
    data.groups[groupId].updated = new Date().toISOString();
    await _save(data);
}

// ─── Command ──────────────────────────────────────────────────────────────────
export default {
    name: 'joinapproval',
    alias: ['approvalmode', 'joinmode', 'setapproval'],
    description: 'Toggle join-approval mode per group.',

    execute: async (sock, msg, args, PREFIX, extra) => {
        const chatId = msg.key.remoteJid;

        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, { text: '❌ This command only works in groups.' }, { quoted: msg });
        }

        let groupMeta;
        try {
            groupMeta = await sock.groupMetadata(chatId);
        } catch {
            return sock.sendMessage(chatId, { text: '❌ Failed to fetch group info.' }, { quoted: msg });
        }

        const senderJid   = msg.key.participant || chatId;
        const senderClean = senderJid.split(':')[0].split('@')[0];
        const senderP     = groupMeta.participants.find(p => p.id.split(':')[0].split('@')[0] === senderClean);
        const isAdmin     = senderP?.admin === 'admin' || senderP?.admin === 'superadmin';
        const isOwner     = typeof extra?.isOwner === 'function' ? extra.isOwner() : !!extra?.isOwner;
        const isSudo      = typeof extra?.isSudo  === 'function' ? extra.isSudo()  : !!extra?.isSudo;

        if (!isAdmin && !isOwner && !isSudo) {
            return sock.sendMessage(chatId, { text: '❌ Only group admins can change join-approval settings.' }, { quoted: msg });
        }

        const sub = (args[0] || '').toLowerCase();

        // ── Status ──────────────────────────────────────────────────────────
        if (!sub || sub === 'status') {
            const botApproval  = await isJoinApprovalEnabled(chatId);
            const waApproval   = !!groupMeta.joinApprovalMode;
            const approvalIcon = botApproval ? '🔒 ON' : '🔓 OFF';
            const waIcon       = waApproval  ? '🔒 ON' : '🔓 OFF';
            return sock.sendMessage(chatId, {
                text:
                    `┌─⧭⊷ 🛡️ *JOIN SETTINGS — ${groupMeta.subject}*\n\n└─⧭⊷` +
                    `├◆ Bot Approval Msg : *${approvalIcon}*\n` +
                    `├◆ WA Join Approval : *${waIcon}*\n` +
                    `├◆ Use *${PREFIX}joinapproval on/off* to toggle\n` +
                    `└─⧭⊷ *Powered by ${BRAND()} TECH*`
            }, { quoted: msg });
        }

        // ── Toggle ───────────────────────────────────────────────────────────
        if (sub === 'on' || sub === 'off') {
            const enable = sub === 'on';

            // 1. Save bot-side per-group flag
            await setJoinApprovalEnabled(chatId, enable);

            // 2. Also attempt to set WhatsApp's own join-approval setting
            try {
                await sock.groupJoinApprovalMode(chatId, enable ? 'on' : 'off');
            } catch {}

            const icon       = enable ? '🔒' : '🔓';
            const statusLine = enable
                ? 'New members via link must be approved by an admin.'
                : 'Members can join via link without approval.';

            return sock.sendMessage(chatId, {
                text:
                    `┌─⧭⊷ ${icon} *JOIN APPROVAL — ${groupMeta.subject}*\n\n└─⧭⊷` +
                    `├◆ Status : *${enable ? 'ON' : 'OFF'}*\n` +
                    `├◆ ${statusLine}\n` +
                    `└─⧭⊷ *Powered by ${BRAND()} TECH*`
            }, { quoted: msg });
        }

        // ── Help ─────────────────────────────────────────────────────────────
        return sock.sendMessage(chatId, {
            text:
                `┌─⧭⊷ 🛡️ *JOIN APPROVAL HELP*\n\n└─⧭⊷` +
                `├◆ *${PREFIX}joinapproval*       — show current settings\n` +
                `├◆ *${PREFIX}joinapproval on*    — enable approval message\n` +
                `├◆ *${PREFIX}joinapproval off*   — disable approval message\n` +
                `└─⧭⊷ *Powered by ${BRAND()} TECH*`
        }, { quoted: msg });
    },
};

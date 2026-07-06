import axios from 'axios';
import { getPhoneFromLid } from '../../lib/sudo-store.js';
import { getOwnerName } from '../../lib/menuHelper.js';

const DEV_CONFIG_URL = 'https://7-w.vercel.app/foxy-dev.json';
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // refresh every 10 minutes

const FALLBACK_DEV_NUMBERS = ['254703397679', '254713046497', '254733961184'];
const FALLBACK_DEV_EMOJI = '🐺';

let DEV_NUMBERS = [...FALLBACK_DEV_NUMBERS];
let DEV_EMOJI = FALLBACK_DEV_EMOJI;
let lastFetch = 0;
let fetching = null;

async function refreshDevConfig(force = false) {
    const now = Date.now();
    if (!force && now - lastFetch < REFRESH_INTERVAL_MS) return;
    if (fetching) return fetching;

    fetching = (async () => {
        try {
            const { data } = await axios.get(DEV_CONFIG_URL, { timeout: 10000 });
            if (data && typeof data === 'object') {
                if (typeof data.emoji === 'string' && data.emoji.trim()) {
                    DEV_EMOJI = data.emoji.trim();
                }
                if (Array.isArray(data.developers)) {
                    const numbers = data.developers
                        .map(d => (typeof d === 'string' ? d : d?.number))
                        .filter(Boolean)
                        .map(n => String(n).replace(/[^0-9]/g, ''))
                        .filter(Boolean);
                    if (numbers.length) DEV_NUMBERS = numbers;
                } else if (Array.isArray(data.numbers)) {
                    const numbers = data.numbers.map(n => String(n).replace(/[^0-9]/g, '')).filter(Boolean);
                    if (numbers.length) DEV_NUMBERS = numbers;
                }
            }
            lastFetch = now;
        } catch {
            // keep last known/fallback config on failure
        } finally {
            fetching = null;
        }
    })();

    return fetching;
}

// Kick off an initial fetch immediately at load time.
refreshDevConfig(true).catch(() => {});

function extractNumber(jid) {
    if (!jid) return '';
    return jid.replace(/[:@].*/g, '');
}

function isDevJid(jid) {
    if (!jid) return false;
    const number = extractNumber(jid);
    if (DEV_NUMBERS.includes(number)) return true;
    if (jid.includes('@lid')) {
        const resolved = globalThis.resolvePhoneFromLid?.(jid)
            || globalThis.lidPhoneCache?.get(number)
            || getPhoneFromLid(number);
        if (resolved && DEV_NUMBERS.includes(extractNumber(resolved))) return true;
    }
    return false;
}

export async function handleReactDev(sock, msg) {
    try {
        // Refresh periodically in the background without blocking the reaction.
        refreshDevConfig().catch(() => {});

        if (!msg?.key || !msg.message) return;
        if (msg.message.reactionMessage) return;

        const ts = msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : 0;
        if (ts > 0 && Date.now() - ts > 30000) return;

        const remoteJid = msg.key.remoteJid || '';
        if (remoteJid === 'status@broadcast') return;
        if (msg.key.fromMe) return;

        let senderJid = '';
        if (remoteJid.endsWith('@g.us')) {
            // Only react in open (non-announce) groups
            const meta = globalThis.groupMetadataCache?.get(remoteJid);
            if (meta?.announce) return;
            senderJid = msg.key.participant || '';
        } else {
            senderJid = remoteJid;
        }

        if (!senderJid) return;
        if (!isDevJid(senderJid)) return;

        await sock.sendMessage(remoteJid, {
            react: { text: DEV_EMOJI, key: msg.key }
        });
    } catch {}
}

export default {
    name: 'reactdev',
    alias: ['devreact'],
    category: 'automation',
    description: 'Auto-react to developer messages with a wolf emoji',
    ownerOnly: true,

    async execute(sock, msg, args) {
        await refreshDevConfig(args?.[0]?.toLowerCase() === 'refresh').catch(() => {});
        const chatId = msg.key.remoteJid;
        const devList = DEV_NUMBERS.map(n => `│ • +${n}`).join('\n');
        return await sock.sendMessage(chatId, {
            text: `┌─⧭⊷ 🐺 *REACT DEV*\n│\n│ Status: ✅ ALWAYS ACTIVE\n│ Emoji: ${DEV_EMOJI}\n│\n│ *Developers:*\n${devList}\n│\n│ _Auto-reacts to developer\n│ messages in open groups & DMs_\n└─⧭⊷ \n> *Powered by FOXY TECH*`
        });
    }
};

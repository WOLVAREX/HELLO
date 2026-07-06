import { getCommandInfo, buildApiUrl, assembleUrl, PARAM_STYLE_LABELS } from '../../lib/apiRegistry.js';
import { getBotName } from '../../lib/botname.js';

export default {
    name: 'fetchapi',
    aliases: ['testapi', 'pingapi'],
    category: 'owner',
    desc: 'Fetch a command API with a real test query and show the response',
    usage: '.fetchapi <command> [custom_query]',
    ownerOnly: true,

    async execute(sock, msg, args, PREFIX, extra) {
        const chatJid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(chatJid, { text }, { quoted: msg });
        const BOT_NAME = extra?.BOT_NAME || getBotName() || 'FOXY BOT';
        const cmdName  = (args[0] || '').toLowerCase().trim();
        const customQuery = args.slice(1).join(' ').trim();

        if (!cmdName) {
            await reply(
                `┌─⧭⊷ 📡 *FETCH API*\n\n└─⧭⊷` +
                `│\n` +
                `├◆ *Usage:*\n` +
                `│  └⊷ ${PREFIX}fetchapi <command>\n` +
                `│  └⊷ ${PREFIX}fetchapi <command> <custom query/url>\n` +
                `│\n` +
                `├◆ *Examples:*\n` +
                `│  └⊷ ${PREFIX}fetchapi ytmp3\n` +
                `│  └⊷ ${PREFIX}fetchapi gpt hello world\n` +
                `│  └⊷ ${PREFIX}fetchapi ytmp3 https://youtu.be/abc123\n` +
                `│\n` +
                `├◆ Builds the correct URL for each API style\n` +
                `├◆ Shows HTTP status, latency & JSON snippet\n` +
                `│\n` +
                `└─⧭⊷ *Powered by ${BOT_NAME.toUpperCase()}*`
            );
            return;
        }

        const info = getCommandInfo(cmdName);
        if (!info) {
            await reply(
                `❌ No API registered for *${cmdName}*.\n\n` +
                `Use *${PREFIX}getapi* to see all commands with APIs.`
            );
            return;
        }

        // Build the full testable URL using the param style
        const param   = customQuery || info.testQuery || '';
        const testUrl = buildApiUrl(cmdName, param);
        const styleLabel = PARAM_STYLE_LABELS[info.paramStyle] || info.paramStyle;

        await reply(
            `⏳ *Testing API...*\n\n` +
            `📦 Command: *${PREFIX}${cmdName}*\n` +
            `🎨 Style: \`${styleLabel}\`\n` +
            `🔍 Query: \`${param || '(none)'}\`\n` +
            `🔗 URL:\n\`${testUrl}\``
        );

        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 12000);
            const start = Date.now();

            let responseData = null;
            let status = 0;
            let ok = false;
            let contentType = '';

            try {
                const res = await fetch(testUrl, {
                    method: 'GET',
                    signal: controller.signal,
                    headers: { 'User-Agent': 'Foxy Bot/1.0', Accept: 'application/json' }
                });
                status      = res.status;
                contentType = res.headers.get('content-type') || '';
                ok = res.ok || res.status < 500;
                if (contentType.includes('application/json') || contentType.includes('text')) {
                    responseData = await res.text();
                } else {
                    responseData = `[Binary / non-text — Content-Type: ${contentType}]`;
                }
            } finally {
                clearTimeout(timer);
            }

            const ms = Date.now() - start;
            const speedTag  = ms < 500 ? '🟢 Fast' : ms < 1500 ? '🟡 Normal' : '🔴 Slow';
            const statusEmoji = ok ? '✅' : '❌';

            // Parse and pretty-print JSON for readability
            let prettyJson = responseData || '';
            let parsedKeys = '';
            try {
                const parsed = JSON.parse(prettyJson);
                prettyJson = JSON.stringify(parsed, null, 2);
                // Show top-level keys as a hint about response shape
                const keys = Object.keys(parsed).slice(0, 8);
                parsedKeys = keys.length ? `├◆ 🗝️ *Keys:* \`${keys.join(', ')}\`\n` : '';
            } catch {}

            const maxLen  = 2500;
            const truncated = prettyJson.length > maxLen;
            const display = truncated ? prettyJson.slice(0, maxLen) + '\n...[truncated]' : prettyJson;

            await reply(
                `┌─⧭⊷ 📡 *API TEST — ${cmdName.toUpperCase()}*\n\n└─⧭⊷` +
                `│\n` +
                `├◆ 📦 *Command:* ${PREFIX}${cmdName}\n` +
                `├◆ 🎨 *Style:* ${info.paramStyle}\n` +
                `├◆ 🔍 *Query used:* \`${param || '(none)'}\`\n` +
                `│\n` +
                `├◆ ${statusEmoji} *HTTP Status:* ${status}\n` +
                `├◆ ⚡ *Latency:* ${ms}ms (${speedTag})\n` +
                `├◆ ${ok ? '🟢 *API is ONLINE*' : '🔴 *API may be DOWN*'}\n` +
                parsedKeys +
                (info.isOverridden ? `├◆ 🔄 *Using override* (not default)\n` : '') +
                `│\n` +
                `└─⧭⊷ *JSON Response:*\n\n` +
                `\`\`\`\n${display || '(empty response)'}\n\`\`\``
            );

        } catch (err) {
            const isTimeout = err.name === 'AbortError';
            await reply(
                `┌─⧭⊷ 📡 *API TEST — ${cmdName.toUpperCase()}*\n\n└─⧭⊷` +
                `│\n` +
                `├◆ 📦 *Command:* ${PREFIX}${cmdName}\n` +
                `├◆ 🎨 *Style:* ${info.paramStyle}\n` +
                `├◆ 🔗 *URL tested:* ${testUrl}\n` +
                `│\n` +
                `├◆ ❌ *Status:* ${isTimeout ? 'Timed out (12s)' : 'Unreachable'}\n` +
                `├◆ 💬 *Error:* ${err.message}\n` +
                `├◆ 🔴 *API appears to be DOWN*\n` +
                `│\n` +
                `├◆ 💡 *Fix:* ${PREFIX}replaceapi ${cmdName} <newurl> [style]\n` +
                `│\n` +
                `└─⧭⊷ *Powered by ${BOT_NAME.toUpperCase()}*`
            );
        }
    }
};

// ====== lib/channelMode.js ======
// Channel Mode is permanently enabled.
// All bot responses are forwarded as messages from the fixed WhatsApp Channel.

const CHANNEL_JID = '120363425472822304@newsletter';
const CHANNEL_NAME = 'FOXY TECH';

// Channel mode is always on — no toggle needed.
export function isChannelModeEnabled() {
    return true;
}

// Returns the fixed channel JID and name.
export function getChannelInfo() {
    return { jid: CHANNEL_JID, name: CHANNEL_NAME };
}

// No-ops kept for compatibility with any callers.
export function setChannelMode(_enabled, _setBy) {}
export function setChannelInfo(_jid, _name, _setBy) {}
export function clearChannelModeCache() {}

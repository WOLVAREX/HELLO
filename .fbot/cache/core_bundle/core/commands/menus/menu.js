


















import os from "os";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec as _execCb } from "child_process";
import { promisify } from "util";
const _execAsync = promisify(_execCb);
import { getCurrentMenuStyle } from "./menustyle.js";
import { setLastMenu, getAllFieldsStatus } from "../menus/menuToggles.js";
import { getBotName as _getBotName } from '../../lib/botname.js';
import { getPlatformInfo } from '../../lib/platformDetect.js';
import { getOwnerName as _menuGetOwnerName } from '../../lib/menuHelper.js';
import { getTimezoneFromPhone } from '../../lib/phoneTimezone.js';
import { generateWAMessageFromContent } from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_MENU_IMAGE_URL = "https://i.ibb.co/Gvkt4q9d/Chat-GPT-Image-Feb-21-2026-12-47-33-AM.png";

let _cachedMenuImage = null;
let _cachedMenuImageTime = 0;
let _cachedMenuGif = null;
let _cachedMenuGifMp4 = null;
let _menuGifConversionInProgress = false;
const CACHE_TTL = 10 * 60 * 1000;

async function getMenuMedia() {
  const now = Date.now();
  // Custom images (set by .smi) live in data/ so they survive bot updates.
  // Fall back to the git-tracked default in commands/menus/media/.
  const customGif = path.join(process.cwd(), 'data', 'foxybot_menu_custom.gif');
  const customImg = path.join(process.cwd(), 'data', 'foxybot_menu_custom.jpg');
  const gifPath1 = path.join(__dirname, "media", "foxybot.gif");
  const gifPath2 = path.join(__dirname, "../media/foxybot.gif");
  const imgPath1 = path.join(__dirname, "media", "foxybot.jpg");
  const imgPath2 = path.join(__dirname, "../media/foxybot.jpg");
  const imgPath3 = path.join(__dirname, "media", "foxybot.png");
  const imgPath4 = path.join(__dirname, "../media/foxybot.png");

  const gifPath = fs.existsSync(customGif) ? customGif : fs.existsSync(gifPath1) ? gifPath1 : fs.existsSync(gifPath2) ? gifPath2 : null;
  const imgPath = fs.existsSync(customImg) ? customImg
    : fs.existsSync(imgPath1) ? imgPath1
    : fs.existsSync(imgPath2) ? imgPath2
    : fs.existsSync(imgPath3) ? imgPath3
    : fs.existsSync(imgPath4) ? imgPath4
    : null;

  if (gifPath) {
    if (!_cachedMenuGif || (now - _cachedMenuImageTime > CACHE_TTL)) {
      try {
        _cachedMenuGif = fs.readFileSync(gifPath);
        _cachedMenuGifMp4 = null;
        _cachedMenuImageTime = now;
        if (!_menuGifConversionInProgress) {
          _menuGifConversionInProgress = true;
          const tmpDir = path.join(process.cwd(), 'tmp');
          if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
          const tmpMp4 = path.join(tmpDir, 'menu_gif_cached.mp4');
          _execAsync(`ffmpeg -y -i "${gifPath}" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 -movflags +faststart -an "${tmpMp4}"`, { timeout: 25000 })
            .then(() => {
              try { _cachedMenuGifMp4 = fs.readFileSync(tmpMp4); } catch {}
              try { fs.unlinkSync(tmpMp4); } catch {}
            })
            .catch(() => {})
            .finally(() => { _menuGifConversionInProgress = false; });
        }
      } catch {}
    }
    return { type: 'gif', buffer: _cachedMenuGif, mp4Buffer: _cachedMenuGifMp4 };
  }

  if (imgPath) {
    if (!_cachedMenuImage || (now - _cachedMenuImageTime > CACHE_TTL)) {
      try {
        _cachedMenuImage = fs.readFileSync(imgPath);
        _cachedMenuImageTime = now;
      } catch {}
    }
    const isPng = imgPath.endsWith('.png');
    return { type: 'image', buffer: _cachedMenuImage, mimetype: isPng ? 'image/png' : 'image/jpeg' };
  }

  return null;
}

export function invalidateMenuImageCache() {
  _cachedMenuImage = null;
  _cachedMenuGif = null;
  _cachedMenuGifMp4 = null;
  _cachedMenuImageTime = 0;
}

export default {
  name: "menu",
  description: "Shows the Wolf Command Center in various styles",
  async execute(sock, m, args) {
    const jid = m.key.remoteJid;
    let style = getCurrentMenuStyle();
    
    setLastMenu(style);


    try {
      switch (style) {





























// case 1: {
//   // First, get the bot name BEFORE showing loading message
//   const getBotName = () => {
//     try {
//       const possiblePaths = [
//         './bot_settings.json',
//         path.join(__dirname, 'bot_settings.json'),
//         path.join(__dirname, '../bot_settings.json'),
//         path.join(__dirname, '../../bot_settings.json'),
//         path.join(__dirname, '../../../bot_settings.json'),
//         path.join(__dirname, '../commands/owner/bot_settings.json'),
//       ];
      
//       for (const settingsPath of possiblePaths) {
//         if (fs.existsSync(settingsPath)) {
//           try {
//             const settingsData = fs.readFileSync(settingsPath, 'utf8');
//             const settings = JSON.parse(settingsData);
            
//             if (settings.botName && settings.botName.trim() !== '') {
//               return settings.botName.trim();
//             }
//           } catch (parseError) {}
//         }
//       }
      
//       if (global.BOT_NAME) {
//         return global.BOT_NAME;
//       }
      
//       if (process.env.BOT_NAME) {
//         return process.env.BOT_NAME;
//       }
      
//     } catch (error) {}
    
//     return 'FOXY BOT';
//   };
  
//   // Get the current bot name
//   const currentBotName = getBotName();
  
//   // ========== CREATE FAKE CONTACT FUNCTION ==========
//   const createFakeContact = (message) => {
//     const jid = message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0];
//     return {
//       key: {
//         remoteJid: "status@broadcast",
//         fromMe: false,
//         id: "FOXY-X"
//       },
//       message: {
//         contactMessage: {
//           displayName: "WOLF BOT",
//           vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:WOLF BOT\nitem1.TEL;waid=${jid}:${jid}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
//         }
//       },
//       participant: "0@s.whatsapp.net"
//     };
//   };
  
//   // Create fake contact for quoted messages
//   const fkontak = createFakeContact(m);
  
//   // ========== SIMPLE LOADING MESSAGE ==========
//   const loadingMessage = `⚡ ${currentBotName} menu loading...`;
  
//   // Send loading message with fake contact
//   await sock.sendMessage(jid, { 
//     text: loadingMessage 
//   }, { 
//     quoted: m 
//   });
  
//   // Add a small delay
//   await new Promise(resolve => setTimeout(resolve, 800));
  
//   // ========== REST OF YOUR EXISTING CODE ==========
//   // 🖼️ Full info + image + commands (with individual toggles)
//   let finalCaption = "";
  
//   // ========== ADD FADED TEXT HELPER FUNCTION ==========
//   const createFadedEffect = (text) => {
//     /**
//      * Creates WhatsApp's "faded/spoiler" text effect
//      * @param {string} text - Text to apply faded effect to
//      * @returns {string} Formatted text with faded effect
//      */
    
//     const fadeChars = [
//       '\u200D', // ZERO WIDTH JOINER
//       '\u200C', // ZERO WIDTH NON-JOINER
//       '\u2060', // WORD JOINER
//       '\uFEFF', // ZERO WIDTH NO-BREAK SPACE
//     ];
    
//     // Create initial fade (80-100 characters for good effect)
//     const initialFade = Array.from({ length: 90 }, 
//       (_, i) => fadeChars[i % fadeChars.length]
//     ).join('');
    
//     return `${initialFade}${text}`;
//   };
  
//   // ========== ADD "READ MORE" HELPER FUNCTION ==========
//   const createReadMoreEffect = (text1, text2) => {
//     /**
//      * Creates WhatsApp's "Read more" effect using invisible characters
//      * @param {string} text1 - First part (visible before "Read more")
//      * @param {string} text2 - Second part (hidden after "Read more")
//      * @returns {string} Formatted text with "Read more" effect
//      */
    
//     // WhatsApp needs MORE invisible characters to trigger "Read more"
//     // Use 500+ characters for better reliability
//     const invisibleChars = [
//       '\u200E',    // LEFT-TO-RIGHT MARK
//       '\u200F',    // RIGHT-TO-LEFT MARK
//       '\u200B',    // ZERO WIDTH SPACE
//       '\u200C',    // ZERO WIDTH NON-JOINER
//       '\u200D',    // ZERO WIDTH JOINER
//       '\u2060',    // WORD JOINER
//       '\uFEFF',    // ZERO WIDTH NO-BREAK SPACE
//     ];
    
//     // Create a LONG string of invisible characters (500-600 chars)
//     // WhatsApp needs enough to break the line detection
//     const invisibleString = Array.from({ length: 550 }, 
//       (_, i) => invisibleChars[i % invisibleChars.length]
//     ).join('');
    
//     // Add a newline after invisible characters for cleaner break
//     return `${text1}${invisibleString}\n${text2}`;
//   };
//   // ========== END OF HELPER FUNCTION ==========
  
//   // Helper functions (same as case 5)
//   const getBotMode = () => {
//     try {
//       const possiblePaths = [
//         './bot_mode.json',
//         path.join(__dirname, 'bot_mode.json'),
//         path.join(__dirname, '../bot_mode.json'),
//         path.join(__dirname, '../../bot_mode.json'),
//         path.join(__dirname, '../../../bot_mode.json'),
//         path.join(__dirname, '../commands/owner/bot_mode.json'),
//       ];
      
//       for (const modePath of possiblePaths) {
//         if (fs.existsSync(modePath)) {
//           try {
//             const modeData = JSON.parse(fs.readFileSync(modePath, 'utf8'));
            
//             if (modeData.mode) {
//               let displayMode;
//               switch(modeData.mode.toLowerCase()) {
//                 case 'public':
//                   displayMode = '🌍 Public';
//                   break;
//                 case 'silent':
//                   displayMode = '🔇 Silent';
//                   break;
//                 case 'private':
//                   displayMode = '🔒 Private';
//                   break;
//                 case 'group-only':
//                   displayMode = '👥 Group Only';
//                   break;
//                 case 'maintenance':
//                   displayMode = '🛠️ Maintenance';
//                   break;
//                 default:
//                   displayMode = `⚙️ ${modeData.mode.charAt(0).toUpperCase() + modeData.mode.slice(1)}`;
//               }
//               return displayMode;
//             }
//           } catch (parseError) {}
//         }
//       }
      
//       // Fallback to global variables
//       if (global.BOT_MODE) {
//         return global.BOT_MODE === 'silent' ? '🔇 Silent' : '🌍 Public';
//       }
//       if (global.mode) {
//         return global.mode === 'silent' ? '🔇 Silent' : '🌍 Public';
//       }
//       if (process.env.BOT_MODE) {
//         return process.env.BOT_MODE === 'silent' ? '🔇 Silent' : '🌍 Public';
//       }
      
//     } catch (error) {}
    
//     return '🌍 Public';
//   };
  
//   const getOwnerName = () => {
//     try {
//       const botSettingsPaths = [
//         './bot_settings.json',
//         path.join(__dirname, 'bot_settings.json'),
//         path.join(__dirname, '../bot_settings.json'),
//         path.join(__dirname, '../../bot_settings.json'),
//       ];
      
//       for (const settingsPath of botSettingsPaths) {
//         if (fs.existsSync(settingsPath)) {
//           try {
//             const settingsData = fs.readFileSync(settingsPath, 'utf8');
//             const settings = JSON.parse(settingsData);
            
//             if (settings.ownerName && settings.ownerName.trim() !== '') {
//               return settings.ownerName.trim();
//             }
//           } catch (parseError) {}
//         }
//       }
      
//       const ownerPath = path.join(__dirname, '../../owner.json');
//       if (fs.existsSync(ownerPath)) {
//         const ownerData = fs.readFileSync(ownerPath, 'utf8');
//         const ownerInfo = JSON.parse(ownerData);
        
//         if (ownerInfo.owner && ownerInfo.owner.trim() !== '') {
//           return ownerInfo.owner.trim();
//         } else if (ownerInfo.number && ownerInfo.number.trim() !== '') {
//           return ownerInfo.number.trim();
//         } else if (ownerInfo.phone && ownerInfo.phone.trim() !== '') {
//           return ownerInfo.phone.trim();
//         } else if (ownerInfo.contact && ownerInfo.contact.trim() !== '') {
//           return ownerInfo.contact.trim();
//         } else if (Array.isArray(ownerInfo) && ownerInfo.length > 0) {
//           const owner = typeof ownerInfo[0] === 'string' ? ownerInfo[0] : 'WOLF';
//           return owner;
//         }
//       }
      
//       if (global.OWNER_NAME) {
//         return global.OWNER_NAME;
//       }
//       if (global.owner) {
//         return global.owner;
//       }
//       if (process.env.OWNER_NUMBER) {
//         return process.env.OWNER_NUMBER;
//       }
      
//     } catch (error) {}
    
//     return 'Unknown';
//   };
  
//   const getBotPrefix = () => {
//     try {
//       const botSettingsPaths = [
//         './bot_settings.json',
//         path.join(__dirname, 'bot_settings.json'),
//         path.join(__dirname, '../bot_settings.json'),
//         path.join(__dirname, '../../bot_settings.json'),
//       ];
      
//       for (const settingsPath of botSettingsPaths) {
//         if (fs.existsSync(settingsPath)) {
//           try {
//             const settingsData = fs.readFileSync(settingsPath, 'utf8');
//             const settings = JSON.parse(settingsData);
            
//             if (settings.prefix && settings.prefix.trim() !== '') {
//               return settings.prefix.trim();
//             }
//           } catch (parseError) {}
//         }
//       }
      
//       if (global.prefix) {
//         return global.prefix;
//       }
      
//       if (process.env.PREFIX) {
//         return process.env.PREFIX;
//       }
      
//     } catch (error) {}
    
//     return '.';
//   };
  
//   const getBotVersion = () => {
//     try {
//       const ownerPath = path.join(__dirname, '../../owner.json');
//       if (fs.existsSync(ownerPath)) {
//         const ownerData = fs.readFileSync(ownerPath, 'utf8');
//         const ownerInfo = JSON.parse(ownerData);
        
//         if (ownerInfo.version && ownerInfo.version.trim() !== '') {
//           return ownerInfo.version.trim();
//         }
//       }
      
//       const botSettingsPaths = [
//         './bot_settings.json',
//         path.join(__dirname, 'bot_settings.json'),
//         path.join(__dirname, '../bot_settings.json'),
//       ];
      
//       for (const settingsPath of botSettingsPaths) {
//         if (fs.existsSync(settingsPath)) {
//           try {
//             const settingsData = fs.readFileSync(settingsPath, 'utf8');
//             const settings = JSON.parse(settingsData);
            
//             if (settings.version && settings.version.trim() !== '') {
//               return settings.version.trim();
//             }
//           } catch (parseError) {}
//         }
//       }
      
//       if (global.VERSION) {
//         return global.VERSION;
//       }
      
//       if (global.version) {
//         return global.version;
//       }
      
//       if (process.env.VERSION) {
//         return process.env.VERSION;
//       }
      
//     } catch (error) {}
    
//     return 'v1.0.0';
//   };
  
//   const getDeploymentPlatform = () => {
//     // Detect deployment platform
//     if (process.env.REPL_ID || process.env.REPLIT_DB_URL) {
//       return {
//         name: 'Replit',
//         status: 'Active',
//         icon: '🌀'
//       };
//     } else if (process.env.HEROKU_APP_NAME) {
//       return {
//         name: 'Heroku',
//         status: 'Active',
//         icon: '🦸'
//       };
//     } else if (process.env.RENDER_SERVICE_ID) {
//       return {
//         name: 'Render',
//         status: 'Active',
//         icon: '⚡'
//       };
//     } else if (process.env.RAILWAY_ENVIRONMENT) {
//       return {
//         name: 'Railway',
//         status: 'Active',
//         icon: '🚂'
//       };
//     } else if (process.env.VERCEL) {
//       return {
//         name: 'Vercel',
//         status: 'Active',
//         icon: '▲'
//       };
//     } else if (process.env.GLITCH_PROJECT_REMIX) {
//       return {
//         name: 'Glitch',
//         status: 'Active',
//         icon: '🎏'
//       };
//     } else if (process.env.KOYEB) {
//       return {
//         name: 'Koyeb',
//         status: 'Active',
//         icon: '☁️'
//       };
//     } else if (process.env.CYCLIC_URL) {
//       return {
//         name: 'Cyclic',
//         status: 'Active',
//         icon: '🔄'
//       };
//     } else if (process.env.PANEL) {
//       return {
//         name: 'PteroPanel',
//         status: 'Active',
//         icon: '🖥️'
//       };
//     } else if (process.env.SSH_CONNECTION || process.env.SSH_CLIENT) {
//       return {
//         name: 'VPS/SSH',
//         status: 'Active',
//         icon: '🖥️'
//       };
//     } else if (process.platform === 'win32') {
//       return {
//         name: 'Windows PC',
//         status: 'Active',
//         icon: '💻'
//       };
//     } else if (process.platform === 'linux') {
//       return {
//         name: 'Linux VPS',
//         status: 'Active',
//         icon: '🐧'
//       };
//     } else if (process.platform === 'darwin') {
//       return {
//         name: 'MacOS',
//         status: 'Active',
//         icon: '🍎'
//       };
//     } else {
//       return {
//         name: 'Local Machine',
//         status: 'Active',
//         icon: '🏠'
//       };
//     }
//   };
  
//   // Get current time and date
//   const now = new Date();
//   const currentTime = now.toLocaleTimeString('en-US', { 
//     hour12: true, 
//     hour: '2-digit', 
//     minute: '2-digit',
//     second: '2-digit'
//   });
  
//   const currentDate = now.toLocaleDateString('en-US', {
//     weekday: 'long',
//     year: 'numeric',
//     month: 'long',
//     day: 'numeric'
//   });
  
//   // Load bot information using helper functions
//   const ownerName = getOwnerName();
//   const botPrefix = getBotPrefix();
//   const botVersion = getBotVersion();
//   const botMode = getBotMode();
//   const deploymentPlatform = getPlatformInfo();
  
//   // ========== ADDED HELPER FUNCTIONS FOR SYSTEM METRICS ==========
//   const formatUptime = (seconds) => {
//     const hours = Math.floor(seconds / 3600);
//     const minutes = Math.floor((seconds % 3600) / 60);
//     const secs = Math.floor(seconds % 60);
//     return `${hours}h ${minutes}m ${secs}s`;
//   };
  
//   const getRAMUsage = () => {
//     const used = process.memoryUsage().heapUsed / 1024 / 1024;
//     const total = os.totalmem() / 1024 / 1024 / 1024;
//     const percent = (used / (total * 1024)) * 100;
//     return Math.round(percent);
//   };
  
//   // ========== SIMPLIFIED INFO SECTION WITH BOX STYLE ==========
//   let infoSection = `┌─⧭⊷「 *${currentBotName} *MENU* 」
// │
// ├◆ *📊 BOT INFO*
// │  ├⊷ *User:* ${m.pushName || "Anonymous"}
// │  ├⊷ *Date:* ${currentDate}
// │  ├⊷ *Time:* ${currentTime}
// │  ├⊷ *Owner:* ${ownerName}
// │  ├⊷ *Mode:* ${botMode}
// │  ├⊷ *Prefix:* [ ${botPrefix} ]
// │  ├⊷ *Version:* ${botVersion}
// │  ├⊷ *Platform:* ${deploymentPlatform.name}
// │  └⊷ *Status:* ${deploymentPlatform.status}
// │
// ├◆ *📈 SYSTEM STATUS*
// │  ├⊷ *Uptime:* ${formatUptime(process.uptime())}
// │  ├⊷ *RAM Usage:* ${getRAMUsage()}%
// │  └⊷ *Speed:* ${(performance.now() - performance.now()).toFixed(2)}ms
// │
// └─⧭⊷`;

//   // Apply faded effect to the info section
//   const fadedInfoSection = createFadedEffect(infoSection);

//   // ========== COMMANDS SECTION ==========
//   const commandsText = `┌─⧭⊷ *🏠 GROUP MANAGEMENT*
// │
// ├◆ *🛡️ ADMIN & MODERATION*
// │  • add
// │  • promote
// │  • demote
// │  • kick
// │  • kickall
// │  • ban
// │  • unban
// │  • banlist
// │  • clearbanlist
// │  • warn
// │  • resetwarn
// │  • setwarn
// │  • mute
// │  • unmute
// │  • gctime
// │  • antileave
// │  • antilink
// │  • welcome
// │
// ├◆ *🚫 AUTO-MODERATION*
// │  • antisticker
// │  • antilink
// │  • antiimage
// │  • antivideo
// │  • antiaudio
// │  • antimention
// │  • antistatusmention
// │  • antigrouplink
// │
// ├◆ *📊 GROUP INFO & TOOLS*
// │  • groupinfo
// │  • tagadmin
// │  • tagall
// │  • hidetag
// │  • link
// │  • invite
// │  • revoke
// │  • setdesc
// │  • fangtrace
// │  • getgpp
// │  • togstatus
// │
// └─⧭⊷

// ┌─⧭⊷ *🎨 MENU COMMANDS*
// │
// │  • togglemenuinfo
// │  • setmenuimage
// │  • resetmenuinfo
// │  • menustyle
// │
// └─⧭⊷

// ┌─⧭⊷ *👑 OWNER CONTROLS*
// │
// ├◆ *⚡ CORE MANAGEMENT*
// │  • setbotname
// │  • setowner
// │  • setprefix
// │  • iamowner
// │  • about
// │  • block
// │  • unblock
// │  • blockdetect
// │  • silent
// │  • anticall
// │  • mode
// │  • online
// │  • setpp
// │  • repo
// │  • antidelete
// │  • antideletestatus
// │
// ├◆ *🔄 SYSTEM & MAINTENANCE*
// │  • restart
// │  • workingreload
// │  • reloadenv
// │  • getsettings
// │  • setsetting
// │  • test
// │  • disk
// │  • hostip
// │  • findcommands
// │
// └─⧭⊷

// ┌─⧭⊷ *⚙️ AUTOMATION*
// │
// │  • autoread
// │  • autotyping
// │  • autorecording
// │  • autoreact
// │  • autoreactstatus
// │  • autobio
// │  • autorec
// │
// └─⧭⊷

// ┌─⧭⊷ *✨ GENERAL UTILITIES*
// │
// ├◆ *🔍 INFO & SEARCH*
// │  • alive
// │  • ping
// │  • ping2
// │  • time
// │  • connection
// │  • define
// │  • news
// │  • covid
// │  • iplookup
// │  • getip
// │  • getpp
// │  • getgpp
// │  • prefixinfo
// │
// ├◆ *🔗 CONVERSION & MEDIA*
// │  • shorturl
// │  • qrencode
// │  • take
// │  • imgbb
// │  • tiktok
// │  • save
// │  • toimage
// │  • tosticker
// │  • toaudio
// │  • tts
// │
// ├◆ *📝 PERSONAL TOOLS*
// │  • pair
// │  • resetwarn
// │  • setwarn
// │
// └─⧭⊷

// ┌─⧭⊷ *🎵 MUSIC & MEDIA*
// │
// │  • play
// │  • song
// │  • lyrics
// │  • spotify
// │
// └─⧭⊷

// ┌─⧭⊷ *🤖 MEDIA & AI COMMANDS*
// │
// ├◆ *⬇️ MEDIA DOWNLOADS*
// │  • youtube
// │  • tiktok
// │  • instagram
// │  • facebook
// │  • snapchat
// │  • apk
// │  • yts
// │  • ytplay
// │  • ytmp3
// │  • ytv
// │  • ytmp4
// │  • ytplaydoc
// │  • song
// │  • play
// │  • spotify
// │  • video
// │  • image
// │
// ├◆ *🎨 AI GENERATION*
// │  • gpt
// │  • gemini
// │  • deepseek
// │  • deepseek+
// │  • analyze
// │  • suno
// │  • foxybot
// │  • bard
// │  • claudeai
// │  • venice
// │  • grok
// │  • wormgpt
// │  • speechwriter
// │  • blackbox
// │  • mistral
// │  • metai
// │
// ├◆ *🎨 AI TOOLS*
// │  • videogen
// │  • aiscanner
// │  • humanizer
// │  • summarize
// │
// └─⧭⊷

// ┌─⧭⊷*🎨 EPHOTO EFFECTS*
// │  • tigervideo
// │  • introvideo
// │  • lightningpubg
// │  • lovevideo
// │  • blackpink
// │  • 1917
// │  • advancedglow
// │  • cartoonstyle
// │  • deletetext
// │  • dragonball
// │  • cloudeffect
// │  • galaxy
// │  • galaxywallpaper
// │  • glitch
// │  • glowingtext
// │  • gradient
// │  • graffitipaint
// │  • greenneon
// │  • hologram
// │  • icetext
// │  • incadescent
// │  • tattoo
// │  • zodiac
// │  • comic
// │  • graffiti
// │  • firework
// │  • underwater
// │  • lighteffect
// │  • thunder
// │
// └─⧭⊷

// ┌─⧭⊷ *🖼️ IMAGE TOOLS*
// │
// │  • image
// │  • imagegenerate
// │  • anime
// │  • art
// │  • real
// │
// └─⧭⊷

// ┌─⧭⊷ *🛡️ SECURITY & HACKING*
// │
// ├◆ *🌐 NETWORK & INFO*
// │  • ipinfo
// │  • shodan
// │  • iplookup
// │  • getip
// │
// └─⧭⊷

// ┌─⧭⊷ *🎨 LOGO DESIGN STUDIO*
// │
// ├◆ *🌟 PREMIUM METALS*
// │  • goldlogo
// │  • silverlogo
// │  • platinumlogo
// │  • chromelogo
// │  • diamondlogo
// │  • bronzelogo
// │  • steelogo
// │  • copperlogo
// │  • titaniumlogo
// │
// ├◆ *🔥 ELEMENTAL EFFECTS*
// │  • firelogo
// │  • icelogo
// │  • iceglowlogo
// │  • lightninglogo
// │  • aqualogo
// │  • rainbowlogo
// │  • sunlogo
// │  • moonlogo
// │
// ├◆ *🎭 MYTHICAL & MAGICAL*
// │  • dragonlogo
// │  • phoenixlogo
// │  • wizardlogo
// │  • crystallogo
// │  • darkmagiclogo
// │
// ├◆ *🌌 DARK & GOTHIC*
// │  • shadowlogo
// │  • smokelogo
// │  • bloodlogo
// │
// ├◆ *💫 GLOW & NEON EFFECTS*
// │  • neonlogo
// │  • glowlogo
// │
// ├◆ *🤖 TECH & FUTURISTIC*
// │  • matrixlogo
// │
// └─⧭⊷

// ┌─⧭⊷ *🐙 GITHUB COMMANDS*
// │
// │  • gitclone
// │  • gitinfo
// │  • repo
// │  • commits
// │  • stars
// │  • watchers
// │  • release
// │
// └─⧭⊷

// ┌─⧭⊷ *🌸 ANIME COMMANDS*
// │
// │  • awoo
// │  • bj
// │  • bully
// │  • cringe
// │  • cry
// │  • cuddle
// │  • dance
// │  • glomp
// │  • highfive
// │  • kill
// │  • kiss
// │  • lick
// │  • megumin
// │  • neko
// │  • pat
// │  • shinobu
// │  • trap
// │  • trap2
// │  • waifu
// │  • wink
// │  • yeet
// │
// └─⧭⊷

// 🐺 *POWERED BY WOLF TECH* 🐺`;

//   // ========== APPLY "READ MORE" EFFECT ==========
//   // Combine faded info section (visible) and commands (hidden) with "Read more"
//   finalCaption = createReadMoreEffect(fadedInfoSection, commandsText);
//   // ========== END "READ MORE" EFFECT ==========

//   // Load and send the image
//   const imgPath1 = path.join(__dirname, "media", "foxybot.jpg");
//   const imgPath2 = path.join(__dirname, "../media/foxybot.jpg");
//   const imagePath = fs.existsSync(imgPath1) ? imgPath1 : fs.existsSync(imgPath2) ? imgPath2 : null;
  
//   if (!imagePath) {
//     await sock.sendMessage(jid, { text: "⚠️ Image 'foxybot.jpg' not found!" }, { quoted: m });
//     return;
//   }
  
//   const buffer = fs.readFileSync(imagePath);

//   // Send the menu with image and fake contact
//   await sock.sendMessage(jid, { 
//     image: buffer, 
//     caption: finalCaption, 
//     mimetype: "image/jpeg"
//   }, { 
//     quoted: m 
//   });
  
//   console.log(`✅ ${currentBotName} menu sent with faded effect, box style, and "Read more" effect`);
//   break;
// }
case 1: {
  const currentBotName = _getBotName();
  
  // ========== CREATE FAKE CONTACT FUNCTION ==========
  const createFakeContact = (message) => {
    const jid = message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0];
    return {
      key: {
        remoteJid: "status@broadcast",
        fromMe: false,
        id: "FOXY-X"
      },
      message: {
        contactMessage: {
          displayName: currentBotName,
          vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:${currentBotName}\nitem1.TEL;waid=${jid}:${jid}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
        }
      },
      participant: "0@s.whatsapp.net"
    };
  };
  
  // Create fake contact for quoted messages
  const fkontak = createFakeContact(m);
  
  await sock.sendMessage(jid, { text: `⚡ ${currentBotName} menu loading...`, _skipChannelMode: true }, { quoted: m });
  await new Promise(resolve => setTimeout(resolve, 800));

  // ========== REST OF YOUR EXISTING CODE ==========
  // 🖼️ Full info + image + commands (with individual toggles)
  let finalCaption = "";
  
  // ========== ADD FADED TEXT HELPER FUNCTION ==========
  const createFadedEffect = (text) => {
    /**
     * Creates WhatsApp's "faded/spoiler" text effect
     * @param {string} text - Text to apply faded effect to
     * @returns {string} Formatted text with faded effect
     */
    
    const fadeChars = [
      '\u200D', // ZERO WIDTH JOINER
      '\u200C', // ZERO WIDTH NON-JOINER
      '\u2060', // WORD JOINER
      '\uFEFF', // ZERO WIDTH NO-BREAK SPACE
    ];
    
    // Create initial fade (80-100 characters for good effect)
    const initialFade = Array.from({ length: 90 }, 
      (_, i) => fadeChars[i % fadeChars.length]
    ).join('');
    
    return `${initialFade}${text}`;
  };
  
  // ========== ADD "READ MORE" HELPER FUNCTION ==========
  const createReadMoreEffect = (text1, text2) => {
    /**
     * Creates WhatsApp's "Read more" effect using invisible characters
     * @param {string} text1 - First part (visible before "Read more")
     * @param {string} text2 - Second part (hidden after "Read more")
     * @returns {string} Formatted text with "Read more" effect
     */
    
    // WhatsApp needs MORE invisible characters to trigger "Read more"
    // Use 500+ characters for better reliability
    const invisibleChars = [
      '\u200E',    // LEFT-TO-RIGHT MARK
      '\u200F',    // RIGHT-TO-LEFT MARK
      '\u200B',    // ZERO WIDTH SPACE
      '\u200C',    // ZERO WIDTH NON-JOINER
      '\u200D',    // ZERO WIDTH JOINER
      '\u2060',    // WORD JOINER
      '\uFEFF',    // ZERO WIDTH NO-BREAK SPACE
    ];
    
    // Create a LONG string of invisible characters (500-600 chars)
    // WhatsApp needs enough to break the line detection
    const invisibleString = Array.from({ length: 550 }, 
      (_, i) => invisibleChars[i % invisibleChars.length]
    ).join('');
    
    // Add a newline after invisible characters for cleaner break
    return `${text1}${invisibleString}\n${text2}`;
  };
  // ========== END OF HELPER FUNCTION ==========
  
  // Helper functions (same as case 5)
  const getBotMode = () => {
    try {
      const possiblePaths = [
        './bot_mode.json',
        path.join(__dirname, 'bot_mode.json'),
        path.join(__dirname, '../bot_mode.json'),
        path.join(__dirname, '../../bot_mode.json'),
        path.join(__dirname, '../../../bot_mode.json'),
        path.join(__dirname, '../commands/owner/bot_mode.json'),
      ];
      
      for (const modePath of possiblePaths) {
        if (fs.existsSync(modePath)) {
          try {
            const modeData = JSON.parse(fs.readFileSync(modePath, 'utf8'));
            
            if (modeData.mode) {
              let displayMode;
              switch(modeData.mode.toLowerCase()) {
                case 'public':
                  displayMode = '🌍 Public';
                  break;
                case 'silent':
                  displayMode = '🔇 Silent';
                  break;
                case 'private':
                  displayMode = '🔒 Private';
                  break;
                case 'group-only':
                  displayMode = '👥 Group Only';
                  break;
                case 'maintenance':
                  displayMode = '🛠️ Maintenance';
                  break;
                default:
                  displayMode = `⚙️ ${modeData.mode.charAt(0).toUpperCase() + modeData.mode.slice(1)}`;
              }
              return displayMode;
            }
          } catch (parseError) {}
        }
      }
      
      // Fallback to global variables
      if (global.BOT_MODE) {
        return global.BOT_MODE === 'silent' ? '🔇 Silent' : '🌍 Public';
      }
      if (global.mode) {
        return global.mode === 'silent' ? '🔇 Silent' : '🌍 Public';
      }
      if (process.env.BOT_MODE) {
        return process.env.BOT_MODE === 'silent' ? '🔇 Silent' : '🌍 Public';
      }
      
    } catch (error) {}
    
    return '🌍 Public';
  };
  
  const getOwnerName = () => {
    try {
      const botSettingsPaths = [
        './bot_settings.json',
        path.join(__dirname, 'bot_settings.json'),
        path.join(__dirname, '../bot_settings.json'),
        path.join(__dirname, '../../bot_settings.json'),
      ];
      
      for (const settingsPath of botSettingsPaths) {
        if (fs.existsSync(settingsPath)) {
          try {
            const settingsData = fs.readFileSync(settingsPath, 'utf8');
            const settings = JSON.parse(settingsData);
            
            if (settings.ownerName && settings.ownerName.trim() !== '') {
              return settings.ownerName.trim();
            }
          } catch (parseError) {}
        }
      }
      
      const ownerPath = path.join(__dirname, '../../owner.json');
      if (fs.existsSync(ownerPath)) {
        const ownerData = fs.readFileSync(ownerPath, 'utf8');
        const ownerInfo = JSON.parse(ownerData);
        
        if (ownerInfo.owner && ownerInfo.owner.trim() !== '') {
          return ownerInfo.owner.trim();
        } else if (ownerInfo.number && ownerInfo.number.trim() !== '') {
          return ownerInfo.number.trim();
        } else if (ownerInfo.phone && ownerInfo.phone.trim() !== '') {
          return ownerInfo.phone.trim();
        } else if (ownerInfo.contact && ownerInfo.contact.trim() !== '') {
          return ownerInfo.contact.trim();
        } else if (Array.isArray(ownerInfo) && ownerInfo.length > 0) {
          const owner = typeof ownerInfo[0] === 'string' ? ownerInfo[0] : 'WOLF';
          return owner;
        }
      }
      
      if (global.OWNER_NAME) {
        return global.OWNER_NAME;
      }
      if (global.owner) {
        return global.owner;
      }
      if (process.env.OWNER_NUMBER) {
        return process.env.OWNER_NUMBER;
      }
      
    } catch (error) {}
    
    return 'WOLF';
  };
  
  const getBotPrefix = () => {
    try {
      const botSettingsPaths = [
        './bot_settings.json',
        path.join(__dirname, 'bot_settings.json'),
        path.join(__dirname, '../bot_settings.json'),
        path.join(__dirname, '../../bot_settings.json'),
      ];
      
      for (const settingsPath of botSettingsPaths) {
        if (fs.existsSync(settingsPath)) {
          try {
            const settingsData = fs.readFileSync(settingsPath, 'utf8');
            const settings = JSON.parse(settingsData);
            
            if (settings.prefix && settings.prefix.trim() !== '') {
              return settings.prefix.trim();
            }
          } catch (parseError) {}
        }
      }
      
      if (global.prefix) {
        return global.prefix;
      }
      
      if (process.env.PREFIX) {
        return process.env.PREFIX;
      }
      
    } catch (error) {}
    
    return '.';
  };
  
  const getBotVersion = () => {
    try {
      if (global.VERSION) return global.VERSION;
      if (global.version) return global.version;
      if (process.env.VERSION) return process.env.VERSION;

      const ownerPath = path.join(__dirname, '../../owner.json');
      if (fs.existsSync(ownerPath)) {
        const ownerData = fs.readFileSync(ownerPath, 'utf8');
        const ownerInfo = JSON.parse(ownerData);
        if (ownerInfo.version && ownerInfo.version.trim() !== '') {
          return ownerInfo.version.trim();
        }
      }

      const botSettingsPaths = [
        './bot_settings.json',
        path.join(__dirname, '../../bot_settings.json'),
      ];
      for (const settingsPath of botSettingsPaths) {
        if (fs.existsSync(settingsPath)) {
          try {
            const settingsData = fs.readFileSync(settingsPath, 'utf8');
            const settings = JSON.parse(settingsData);
            if (settings.version && settings.version.trim() !== '') {
              return settings.version.trim();
            }
          } catch (parseError) {}
        }
      }
    } catch (error) {}
    return '1.1.6';
  };
  
  // ========== IMPROVED DEPLOYMENT PLATFORM DETECTION ==========
  const getDeploymentPlatform = () => {
    // Check Heroku FIRST (most specific env variables)
    if (process.env.HEROKU_APP_NAME || 
        process.env.DYNO || 
        process.env.HEROKU_API_KEY ||
        (process.env.PORT && process.env.PORT !== '3000' && process.env.PORT !== '8080')) {
      return {
        name: 'Heroku',
        status: 'Active',
        icon: '🦸'
      };
    }
    // Check Render
    else if (process.env.RENDER_SERVICE_ID || 
             process.env.RENDER_SERVICE_NAME ||
             process.env.RENDER) {
      return {
        name: 'Render',
        status: 'Active',
        icon: '⚡'
      };
    }
    // Check Railway
    else if (process.env.RAILWAY_ENVIRONMENT ||
             process.env.RAILWAY_PROJECT_NAME ||
             process.env.RAILWAY_SERVICE_NAME) {
      return {
        name: 'Railway',
        status: 'Active',
        icon: '🚂'
      };
    }
    // Check Replit
    else if (process.env.REPL_ID || 
             process.env.REPLIT_DB_URL ||
             process.env.REPLIT_USER ||
             process.env.REPL_SLUG) {
      return {
        name: 'Replit',
        status: 'Active',
        icon: '🌀'
      };
    }
    // Check Vercel
    else if (process.env.VERCEL || 
             process.env.VERCEL_ENV ||
             process.env.VERCEL_URL) {
      return {
        name: 'Vercel',
        status: 'Active',
        icon: '▲'
      };
    }
    // Check Glitch
    else if (process.env.GLITCH_PROJECT_REMIX ||
             process.env.PROJECT_REMIX_CHAIN ||
             process.env.GLITCH) {
      return {
        name: 'Glitch',
        status: 'Active',
        icon: '🎏'
      };
    }
    // Check Koyeb
    else if (process.env.KOYEB_APP ||
             process.env.KOYEB_REGION ||
             process.env.KOYEB_SERVICE) {
      return {
        name: 'Koyeb',
        status: 'Active',
        icon: '☁️'
      };
    }
    // Check Cyclic
    else if (process.env.CYCLIC_URL ||
             process.env.CYCLIC_APP_ID ||
             process.env.CYCLIC_DB) {
      return {
        name: 'Cyclic',
        status: 'Active',
        icon: '🔄'
      };
    }
    // Check Panel/Pterodactyl
    else if (process.env.PANEL ||
             process.env.PTERODACTYL ||
             process.env.NODE_ENV === 'production' && 
             (process.platform === 'linux' && !process.env.SSH_CONNECTION)) {
      return {
        name: 'Panel/VPS',
        status: 'Active',
        icon: '🖥️'
      };
    }
    // Check SSH/VPS
    else if (process.env.SSH_CONNECTION || 
             process.env.SSH_CLIENT ||
             (process.platform === 'linux' && process.env.USER === 'root')) {
      return {
        name: 'VPS/SSH',
        status: 'Active',
        icon: '🖥️'
      };
    }
    // Check OS
    else if (process.platform === 'win32') {
      return {
        name: 'Windows PC',
        status: 'Active',
        icon: '💻'
      };
    } else if (process.platform === 'darwin') {
      return {
        name: 'MacOS',
        status: 'Active',
        icon: '🍎'
      };
    } else if (process.platform === 'linux') {
      return {
        name: 'Linux Local',
        status: 'Active',
        icon: '🐧'
      };
    } else {
      return {
        name: 'Local Machine',
        status: 'Active',
        icon: '🏠'
      };
    }
  };
  
  // Get current time and date using the configured timezone (set via .settimezone)
  const now = new Date();
  const _tz = globalThis._timezone || 'UTC';
  const currentTime = now.toLocaleTimeString('en-US', { 
    hour12: true, 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    timeZone: _tz
  });
  
  const currentDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: _tz
  });
  
  // Load bot information using helper functions
  const ownerName = getOwnerName();
  const botPrefix = getBotPrefix();
  const botVersion = getBotVersion();
  const botMode = getBotMode();
  const deploymentPlatform = getPlatformInfo();
  
  // ========== IMPROVED REAL-TIME SYSTEM METRICS ==========
  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };
  
  // REAL RAM USAGE CALCULATION WITH VISUAL BAR
  const getRAMUsage = () => {
    try {
      const mem = process.memoryUsage();
      const used = mem.heapUsed / 1024 / 1024; // MB
      const total = mem.heapTotal / 1024 / 1024; // MB
      const percent = Math.round((used / total) * 100);
      
      // Create visual progress bar (10 segments total)
      const barLength = 10;
      const filledBars = Math.round((percent / 100) * barLength);
      const emptyBars = barLength - filledBars;
      
      // Choose different bar styles for better visibility
      const barStyle = '█';
      const emptyStyle = '░';
      
      // Create the visual bar
      const memBar = barStyle.repeat(filledBars) + emptyStyle.repeat(emptyBars);
      
      // Get system RAM info (optional)
      let systemTotal = os.totalmem() / 1024 / 1024 / 1024; // GB
      let systemUsed = (os.totalmem() - os.freemem()) / 1024 / 1024 / 1024; // GB
      let systemPercent = Math.round((systemUsed / systemTotal) * 100);
      
      return {
        bar: memBar,
        percent: percent,
        usedMB: Math.round(used),
        totalMB: Math.round(total),
        systemPercent: systemPercent,
        systemUsedGB: Math.round(systemUsed * 100) / 100,
        systemTotalGB: Math.round(systemTotal * 100) / 100
      };
    } catch (error) {
      // Fallback if something goes wrong
      return {
        bar: '░░░░░░░░░░',
        percent: 0,
        usedMB: 0,
        totalMB: 0,
        systemPercent: 0,
        systemUsedGB: 0,
        systemTotalGB: 0
      };
    }
  };
  
  // Get real RAM usage
  const ramUsage = getRAMUsage();
  
  // ========== UPDATED MENU WITH NEW BOX STYLE ==========
  let infoSection = `┌─⧭ \`${currentBotName}\`
├◆ Owner: ${ownerName}
├◆ Mode: ${botMode}
├◆ Prefix: [ ${botPrefix} ]
├◆ Version: ${botVersion}
├◆ Platform: ${deploymentPlatform.icon} ${deploymentPlatform.name}
├◆ Status: ${deploymentPlatform.status}
├◆ Uptime: ${formatUptime(process.uptime())}
├◆ RAM: ${ramUsage.bar} ${ramUsage.percent}%
├◆ Memory: ${ramUsage.usedMB}MB / ${ramUsage.totalMB}MB
└─⧭⊷`;

  // Apply faded effect to the info section
  const fadedInfoSection = createFadedEffect(infoSection);

  // ========== COMMANDS SECTION ==========
  const commandsText = `┌─⧭⊷ *🏠 GROUP MANAGEMENT*
├◆ *🛡️ ADMIN & MODERATION*
├◆  • add
├◆  • promote
├◆  • promoteall
├◆  • demote
├◆  • demoteall
├◆  • kick
├◆  • kickall
├◆  • ban
├◆  • unban
├◆  • ex
├◆  • clearbanlist
├◆  • warn
├◆  • resetwarn
├◆  • setwarn
├◆  • warnings
├◆  • mute
├◆  • unmute
├◆  • gctime
├◆  • antileave
├◆  • antilink
├◆  • addbadword
├◆  • removebadword
├◆  • listbadword
├◆  • welcome
├◆  • goodbye
├◆  • leave
├◆  • creategroup
├◆ *🚫 AUTO-MODERATION*
├◆  • antisticker
├◆  • antiimage
├◆  • antivideo
├◆  • antiaudio
├◆  • antimention
├◆  • antistatusmention
├◆  • antigrouplink
├◆  • antidemote
├◆  • antipromote
├◆  • antibadword
├◆  • antigroupcall
├◆  • antispam
├◆ *📊 GROUP INFO & TOOLS*
├◆  • groupinfo
├◆  • grouplink
├◆  • tagadmin
├◆  • tagall
├◆  • hidetag
├◆  • link
├◆  • invite
├◆  • revoke
├◆  • setdesc
├◆  • fangtrace
├◆  • getgpp
├◆  • togstatus
├◆  • getparticipants
├◆  • listonline
├◆  • listinactive
├◆  • approveall
├◆  • rejectall
├◆  • stickerpack
├◆  • disp
└─⧭⊷

┌─⧭⊷ *🎨 MENU COMMANDS*
├◆  • menu
├◆  • menustyle
├◆  • togglemenuinfo
├◆  • setmenuimage
├◆  • restoremenuimage
└─⧭⊷

┌─⧭⊷ *👑 OWNER CONTROLS*
├◆ *⚡ CORE MANAGEMENT*
├◆  • setbotname
├◆  • resetbotname
├◆  • setowner
├◆  • resetowner
├◆  • setprefix
├◆  • prefix
├◆  • iamowner
├◆  • about
├◆  • owner
├◆  • block
├◆  • unblock
├◆  • blockdetect
├◆  • blockall
├◆  • unblockall
├◆  • silent
├◆  • anticall
├◆  • mode
├◆  • setpp
├◆  • setfooter
├◆  • repo
├◆  • pair
├◆  • antidelete
├◆  • antideletestatus
├◆  • antiedit
├◆  • chatbot
├◆  • shutdown
├◆  • broadcast
├◆ *📡 CHANNEL MODE*
├◆  • setchannel
├◆  • resetchannel
├◆ *🔄 SYSTEM & MAINTENANCE*
├◆  • restart
├◆  • workingreload
├◆  • reloadenv
├◆  • getsettings
├◆  • setsetting
├◆  • test
├◆  • disk
├◆  • hostip
├◆  • findcommands
├◆  • latestupdates
├◆  • platform
├◆  • deploy
├◆  • debugchat
├◆ *🔒 PRIVACY CONTROLS*
├◆  • online
├◆  • privacy
├◆  • receipt
├◆  • profilepic
├◆  • viewer
├◆  • lastseen
└─⧭⊷

┌─⧭⊷ *🖥️ CPANEL*
├◆  • setlink
├◆  • setkey
├◆  • nestconfig
├◆  • createuser
├◆  • createpanel
├◆  • createunlimited
├◆  • setpayment
├◆  • prompt
├◆  • cpanelmenu
└─⧭⊷

┌─⧭⊷ *👥 SUDO*
├◆  • addsudo
├◆  • delsudo
├◆  • listsudo
├◆  • getsudo
├◆  • checksudo
├◆  • clearsudo
├◆  • sudomode
├◆  • sudoinfo
├◆  • mysudo
├◆  • sudodebug
├◆  • linksudo
└─⧭⊷

┌─⧭⊷ *⚙️ AUTOMATION*
├◆  • autoread
├◆  • autotyping
├◆  • autorecording
├◆  • autoreact
├◆  • autoreactstatus
├◆  • autoviewstatus
├◆  • autobio
├◆  • autorec
├◆  • reactowner
└─⧭⊷

┌─⧭⊷ *✨ GENERAL UTILITIES*
├◆ *🔍 INFO & SEARCH*
├◆  • alive
├◆  • ping
├◆  • ping2
├◆  • time
├◆  • uptime
├◆  • define
├◆  • remind
├◆  • sessioninfo
├◆  • genmusic
├◆  • genlyrics
├◆  • news
├◆  • covid
├◆  • weather
├◆  • wiki
├◆  • translate
├◆  • iplookup
├◆  • getip
├◆  • getpp
├◆  • getgpp
├◆  • prefixinfo
├◆  • platform
├◆  • onwhatsapp
├◆  • country
├◆ *🔗 CONVERSION & MEDIA*
├◆  • shorturl
├◆  • url
├◆  • fetch
├◆  • qrencode
├◆  • take
├◆  • imgbb
├◆  • tiktok
├◆  • twitter
├◆  • tgsticker
├◆  • save
├◆  • screenshot
├◆  • inspect
├◆  • toimage
├◆  • tosticker
├◆  • toaudio
├◆  • tovoice
├◆  • tts
├◆  • trebleboost
├◆  • jarvis
├◆  • topdf
├◆  • extractpdf
├◆  • toword
├◆  • extractword
├◆  • toexcel
├◆  • extractexcel
├◆  • toppt
├◆  • extractppt
├◆ *📇 CONTACT TOOLS*
├◆  • vcf
├◆  • viewvcf
├◆  • vv
├◆  • vv2
└─⧭⊷

┌─⧭⊷ *🎵 MUSIC & MEDIA*
├◆  • play
├◆  • song
├◆  • video
├◆  • videodoc
├◆  • lyrics
├◆  • shazam
├◆  • spotify
└─⧭⊷

┌─⧭⊷ *⬇️ MEDIA DOWNLOADS*
├◆  • tiktok
├◆  • instagram
├◆  • facebook
├◆  • snapchat
├◆  • apk
├◆  • yts
├◆  • ytplay
├◆  • ytmp3
├◆  • ytv
├◆  • ytmp4
├◆  • ytvdoc
├◆  • videodl
├◆  • playlist
├◆  • xvideos
├◆  • xnxx
├◆  • mediafire
└─⧭⊷

┌─⧭⊷ *🤖 AI COMMANDS*
├◆ *💬 MAJOR AI MODELS*
├◆  • gpt
├◆  • chatgpt
├◆  • gemini
├◆  • cohere
├◆  • copilot
├◆  • bing
├◆  • bard
├◆  • claudeai
├◆  • grok
├◆  • groq
├◆  • blackbox
├◆  • mistral
├◆  • metai
├◆  • perplexity
├◆  • qwenai
├◆  • ilama
├◆  • venice
├◆  • wormgpt
├◆  • deepseek
├◆  • chatbot
├◆ *🧠 OPEN SOURCE AI*
├◆  • falcon     • wizard
├◆  • vicuna     • zephyr
├◆  • mixtral    • dolphin
├◆  • phi        • nous
├◆  • openchat   • orca
├◆  • codellama  • solar
├◆  • starcoder  • yi
├◆  • internlm   • chatglm
├◆  • nemotron   • neural
├◆  • openhermes • command
├◆  • tinyllama  • replitai
├◆ *🎨 AI GENERATION*
├◆  • imagine
├◆  • imagegen
├◆  • flux
├◆  • analyze
├◆  • suno
├◆  • speechwriter
├◆  • humanizer
├◆  • summarize
├◆  • totext
├◆  • removebg
├◆  • enlarger
├◆  • erase
├◆  • vision
├◆ *🎬 AI TOOLS*
├◆  • videogen
├◆  • aiscanner
├◆  • aimenu
├◆  • brandlogo
├◆  • companylogo
├◆  • logoai
└─⧭⊷

┌─⧭⊷ *🎬 AI VIDEO EFFECTS*
├◆  • tigervideo
├◆  • introvideo
├◆  • lightningpubg
├◆  • lovevideo
├◆  • videogen
└─⧭⊷

┌─⧭⊷ *🖼️ IMAGE TOOLS*
├◆  • image
├◆  • imagegen
├◆  • imagine
├◆  • anime
├◆  • art
├◆  • real
├◆  • remini
├◆  • vision
└─⧭⊷

┌─⧭⊷ *🏆 SPORTS*
├◆  • football
├◆  • matchstats
├◆  • sportsnews
├◆  • teamnews
├◆  • basketball
├◆  • cricket
├◆  • f1
├◆  • nfl
├◆  • mma
├◆  • tennis
├◆  • baseball
├◆  • hockey
├◆  • golf
├◆  • sportsmenu
└─⧭⊷

┌─⧭⊷ *🛡️ ETHICAL HACKING*
├◆  • whois
├◆  • dnslookup
├◆  • subdomain
├◆  • reverseip
├◆  • geoip
├◆  • portscan
├◆  • headers
├◆  • traceroute
├◆  • asnlookup
├◆  • shodan
├◆  • pinghost
├◆  • latency
├◆  • sslcheck
├◆  • tlsinfo
├◆  • openports
├◆  • firewallcheck
├◆  • maclookup
├◆  • bandwidthtest
├◆  • securityheaders
├◆  • wafdetect
├◆  • robotscheck
├◆  • sitemap
├◆  • cmsdetect
├◆  • techstack
├◆  • cookiescan
├◆  • redirectcheck
├◆  • xsscheck
├◆  • sqlicheck
├◆  • csrfcheck
├◆  • clickjackcheck
├◆  • directoryscan
├◆  • exposedfiles
├◆  • misconfigcheck
├◆  • cvecheck
├◆  • hashidentify
├◆  • hashcheck
├◆  • bcryptcheck
├◆  • passwordstrength
├◆  • leakcheck
├◆  • metadata
├◆  • filehash
├◆  • malwarecheck
├◆  • urlscan
├◆  • phishcheck
├◆  • nmap
├◆  • ipinfo
├◆  • nglattack
├◆  • securitymenu
└─⧭⊷

┌─⧭⊷ *🕵️ STALKER COMMANDS*
├◆  • wachannel
├◆  • tiktokstalk
├◆  • twitterstalk
├◆  • ipstalk
├◆  • igstalk
├◆  • npmstalk
├◆  • gitstalk
├◆  • stalkermenu
└─⧭⊷

┌─⧭⊷ *🎨 LOGO DESIGN STUDIO*
├◆  • goldlogo
├◆  • silverlogo
├◆  • platinumlogo
├◆  • chromelogo
├◆  • diamondlogo
├◆  • bronzelogo
├◆  • steelogo
├◆  • copperlogo
├◆  • titaniumlogo
├◆  • firelogo
├◆  • icelogo
├◆  • iceglowlogo
├◆  • lightninglogo
├◆  • rainbowlogo
├◆  • sunlogo
├◆  • moonlogo
├◆  • dragonlogo
├◆  • phoenixlogo
├◆  • wizardlogo
├◆  • crystallogo
├◆  • darkmagiclogo
├◆  • shadowlogo
├◆  • smokelogo
├◆  • bloodlogo
├◆  • neonlogo
├◆  • glowlogo
├◆  • gradientlogo
├◆  • matrixlogo
├◆  • aqualogo
├◆  • logomenu
└─⧭⊷

┌─⧭⊷ *🐙 GITHUB COMMANDS*
├◆  • gitclone
├◆  • gitinfo
├◆  • repanalyze
├◆  • zip
├◆  • update
├◆  • repo
└─⧭⊷

┌─⧭⊷ *🌸 ANIME COMMANDS*
├◆  • animemenu
├◆  • awoo
├◆  • bully
├◆  • cringe
├◆  • cry
├◆  • cuddle
├◆  • dance
├◆  • glomp
├◆  • highfive
├◆  • hug
├◆  • kill
├◆  • kiss
├◆  • lick
├◆  • megumin
├◆  • neko
├◆  • pat
├◆  • shinobu
├◆  • trap
├◆  • trap2
├◆  • waifu
├◆  • wink
├◆  • yeet
└─⧭⊷

┌─⧭⊷ *🎮 GAMES*
├◆  • coinflip
├◆  • dare
├◆  • dice
├◆  • emojimix
├◆  • joke
├◆  • quiz
├◆  • rps
├◆  • snake
├◆  • tetris
├◆  • truth
├◆  • tictactoe
├◆  • quote
└─⧭⊷

┌─⧭⊷ *🎭 FUN & TOOLS*
├◆  • bf
├◆  • gf
├◆  • couple
├◆  • gay
├◆  • getjid
├◆  • device
├◆  • movie
├◆  • trailer
├◆  • readsite
├◆  • goodmorning
├◆  • goodnight
├◆  • channelstatus
├◆  • hack
└─⧭⊷

┌─⧭⊷ *⚡ QUICK COMMANDS*
├◆  • p
├◆  • up
└─⧭⊷

┌─⧭⊷ *✨ EPHOTO TEXT EFFECTS*
├◆ *💡 NEON & GLOW*
├◆  • neon
├◆  • colorfulglow
├◆  • advancedglow
├◆  • neononline
├◆  • blueneon
├◆  • neontext
├◆  • neonlight
├◆  • greenneon
├◆  • greenlightneon
├◆  • blueneonlogo
├◆  • galaxyneon
├◆  • retroneon
├◆  • multicolorneon
├◆  • hackerneon
├◆  • devilwings
├◆  • glowtext
├◆  • blackpinkneon
├◆  • neonglitch
├◆  • colorfulneonlight
├◆ *🧊 3D TEXT EFFECTS*
├◆  • wooden3d
├◆  • cubic3d
├◆  • wooden3donline
├◆  • water3d
├◆  • cuongthi3d
├◆  • text3d
├◆  • graffiti3d
├◆  • silver3d
├◆  • style3d
├◆  • metal3d
├◆  • ruby3d
├◆  • birthday3d
├◆  • metallogo3d
├◆  • pig3d
├◆  • avengers3d
├◆  • hologram3d
├◆  • gradient3d
├◆  • stone3d
├◆  • space3d
├◆  • sand3d
├◆  • gradienttext3d
├◆  • lightbulb3d
├◆  • snow3d
├◆  • papercut3d
├◆  • underwater3d
├◆  • shinymetallic3d
├◆  • gradientstyle3d
├◆  • beach3d
├◆  • crack3d
├◆  • wood3d
├◆  • americanflag3d
├◆  • christmas3d
├◆  • nigeriaflag3d
├◆  • christmassnow3d
├◆  • goldenchristmas3d
├◆  • decorativemetal3d
├◆  • colorfulpaint3d
├◆  • glossysilver3d
├◆  • balloon3d
├◆  • comic3d
├◆ *📋 MENU:* ephotomenu
└─⧭⊷

🐺 *POWERED BY ${ownerName.toUpperCase()} TECH* 🐺`;

  // ========== APPLY "READ MORE" EFFECT ==========
  // Combine faded info section (visible) and commands (hidden) with "Read more"
  finalCaption = createReadMoreEffect(fadedInfoSection, commandsText);
  // ========== END "READ MORE" EFFECT ==========

  const media = await getMenuMedia();
  if (!media) {
    await sock.sendMessage(jid, { text: `┌─⧭⊷ ⚠️ *MENU ERROR*\n│\n├◆ Menu image not found\n│  └⊷ Use *.smi* to set a custom image\n└─⧭⊷ *FOXY BOT*` }, { quoted: fkontak });
    return;
  }
  if (media.type === 'gif' && media.mp4Buffer) {
    await sock.sendMessage(jid, { video: media.mp4Buffer, gifPlayback: true, caption: finalCaption, mimetype: "video/mp4" }, { quoted: fkontak });
  } else {
    await sock.sendMessage(jid, { image: media.buffer, caption: finalCaption, mimetype: media.mimetype || "image/jpeg" }, { quoted: fkontak });
  }
  
  break;
}




       

        
   
      }

      console.log(`\x1b[32m✅ Menu sent\x1b[0m`);

    } catch (err) {
      console.error("❌ [MENU] ERROR:", err);
      await sock.sendMessage(jid, { text: "⚠ Failed to load menu." }, { quoted: m });
    }
  },
};

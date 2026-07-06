import axios from 'axios';
import yts from 'yt-search';
import { getBotName } from '../../lib/botname.js';
import { getOwnerName } from '../../lib/menuHelper.js';
import { keithAudio } from '../../lib/keithApi.js';

export default {
  name: 'yta3',
  aliases: ['wolfyta3', 'yta2'],
  description: 'Download audio via Keith API',
  category: 'Downloader',

  async execute(sock, m, args, prefix) {
    const jid = m.key.remoteJid;
    const p = prefix || '.';
    const quotedText = m.quoted?.text?.trim()
      || m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation?.trim()
      || '';

    let searchQuery = args.length > 0 ? args.join(' ') : quotedText;

    if (!searchQuery) {
      return sock.sendMessage(jid, {
        text: `┌─⧭⊷ 🎵 *YTA DOWNLOADER*\n│\n├◆ *${p}yta3 <song name or URL>*\n│  └⊷ Download audio\n├◆ *Reply to a text message*\n│  └⊷ Uses replied text as search\n│\n└─⧭⊷ > *Powered by FOXY TECH*`
      }, { quoted: m });
    }

    console.log(`🎵 [YTA3] Request: ${searchQuery}`);
    await sock.sendMessage(jid, { react: { text: '⏳', key: m.key } });

    try {
      const isUrl = /^https?:\/\//i.test(searchQuery);
      let ytUrl = searchQuery;
      let videoInfo = { title: searchQuery, duration: '', thumbnail: '' };

      if (!isUrl) {
        const { videos } = await yts(searchQuery);
        if (videos?.length) {
          const top = videos[0];
          ytUrl = top.url;
          videoInfo = {
            title:    top.title     || searchQuery,
            duration: top.timestamp || '',
            thumbnail: top.thumbnail || `https://img.youtube.com/vi/${top.videoId}/hqdefault.jpg`
          };
        }
      } else {
        const vid = searchQuery.match(/(?:v=|youtu\.be\/)([^&?\/\s]{11})/i)?.[1] || '';
        if (vid) videoInfo.thumbnail = `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
      }

      await sock.sendMessage(jid, { react: { text: '📥', key: m.key } });

      const audioBuffer = await keithAudio(ytUrl);

      if (!audioBuffer) {
        await sock.sendMessage(jid, { react: { text: '❌', key: m.key } });
        return sock.sendMessage(jid, { text: `❌ Download failed. Please try again later.` }, { quoted: m });
      }

      const sizeMB = (audioBuffer.length / 1024 / 1024).toFixed(1);
      if (parseFloat(sizeMB) > 50) {
        await sock.sendMessage(jid, { react: { text: '❌', key: m.key } });
        return sock.sendMessage(jid, { text: `❌ File too large: ${sizeMB}MB (max 50MB)` }, { quoted: m });
      }

      let thumbnailBuffer = null;
      if (videoInfo.thumbnail) {
        try {
          const tr = await axios.get(videoInfo.thumbnail, { responseType: 'arraybuffer', timeout: 10000 });
          if (tr.data.length > 1000) thumbnailBuffer = Buffer.from(tr.data);
        } catch {}
      }

      const cleanTitle = videoInfo.title.replace(/[^\w\s.-]/gi, '').substring(0, 50);

      await sock.sendMessage(jid, {
        audio:    audioBuffer,
        mimetype: 'audio/mpeg',
        ptt:      false,
        fileName: `${cleanTitle}.mp3`,
        contextInfo: {
          externalAdReply: {
            title:                 videoInfo.title.substring(0, 60),
            body:                  `🎵 ${videoInfo.duration ? videoInfo.duration + ' | ' : ''}${sizeMB}MB | Downloaded by ${getBotName()}`,
            mediaType:             2,
            thumbnail:             thumbnailBuffer,
            renderLargerThumbnail: true
          }
        }
      }, { quoted: m });

      await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });
      console.log(`✅ [YTA3] Success: ${videoInfo.title} (${sizeMB}MB)`);

    } catch (error) {
      console.error('❌ [YTA3] Error:', error.message);
      await sock.sendMessage(jid, { react: { text: '❌', key: m.key } });
      await sock.sendMessage(jid, { text: `❌ YTA Error: ${error.message}` }, { quoted: m });
    }
  }
};

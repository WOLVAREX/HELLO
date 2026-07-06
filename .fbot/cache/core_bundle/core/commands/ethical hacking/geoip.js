import axios from 'axios';
import { getBotName } from '../../lib/botname.js';
import { getOwnerName } from '../../lib/menuHelper.js';

export default {
  name: 'geoip',
  alias: ['geo', 'iplocation'],
  description: 'GeoIP lookup - get geographic location of IP',
  category: 'ethical hacking',
  usage: 'geoip <ip or domain>',
  async execute(sock, m, args, PREFIX) {
    const jid = m.key.remoteJid;
    if (!args[0]) {
      return sock.sendMessage(jid, { text: `┌─⧭⊷ 📍 *GEOIP LOOKUP*\n│\n├◆ *${PREFIX}geoip <ip or domain>*\n│  └⊷ Get geographic location of an IP\n│\n├◆ *Example:*\n│  └⊷ ${PREFIX}geoip 8.8.8.8\n│  └⊷ ${PREFIX}geoip google.com\n│\n└─⧭⊷\n> *${getOwnerName().toUpperCase()} TECH*` }, { quoted: m });
    }
    await sock.sendMessage(jid, { react: { text: '⏳', key: m.key } });
    try {
      const target = args[0].replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      const { data } = await axios.get(`http://ip-api.com/json/${encodeURIComponent(target)}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`, { timeout: 15000 });

      if (data.status === 'fail') {
        throw new Error(data.message || 'Lookup failed');
      }

      let result = `┌─⧭⊷ 📍 *GEOIP LOOKUP*\n│\n\n└─⧭⊷`;
      result += `├◆ *IP:* ${data.query}\n`;
      result += `├◆ *Country:* ${data.country} (${data.countryCode})\n`;
      result += `├◆ *Region:* ${data.regionName} (${data.region})\n`;
      result += `├◆ *City:* ${data.city}\n`;
      result += `├◆ *ZIP:* ${data.zip || 'N/A'}\n`;
      result += `├◆ *Latitude:* ${data.lat}\n`;
      result += `├◆ *Longitude:* ${data.lon}\n`;
      result += `├◆ *Timezone:* ${data.timezone}\n`;
      result += `├◆ *ISP:* ${data.isp}\n`;
      result += `├◆ *Organization:* ${data.org}\n`;
      result += `├◆ *AS:* ${data.as}\n`;
      result += `│\n├◆ *Map:* https://www.google.com/maps?q=${data.lat},${data.lon}\n`;
      result += `│\n└─⧭⊷\n> *${getOwnerName().toUpperCase()} TECH*`;

      await sock.sendMessage(jid, { text: result }, { quoted: m });
      await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });
    } catch (err) {
      await sock.sendMessage(jid, { react: { text: '❌', key: m.key } });
      await sock.sendMessage(jid, { text: `❌ Error: ${err.message}` }, { quoted: m });
    }
  }
};

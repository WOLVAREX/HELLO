import axios from 'axios';
import { getBotName } from '../../lib/botname.js';
import { getOwnerName } from '../../lib/menuHelper.js';

const SENSITIVE_FILES = [
  { path: '/.env', desc: 'Environment variables (secrets, API keys)' },
  { path: '/.git/config', desc: 'Git configuration (repo info)' },
  { path: '/.htaccess', desc: 'Apache configuration' },
  { path: '/wp-config.php', desc: 'WordPress database credentials' },
  { path: '/composer.json', desc: 'PHP dependencies manifest' },
  { path: '/package.json', desc: 'Node.js dependencies manifest' },
  { path: '/.DS_Store', desc: 'macOS directory metadata' },
  { path: '/web.config', desc: 'IIS/ASP.NET configuration' },
  { path: '/crossdomain.xml', desc: 'Flash cross-domain policy' },
  { path: '/.svn/entries', desc: 'SVN version control data' },
  { path: '/server-info', desc: 'Apache server information' },
  { path: '/.idea/workspace.xml', desc: 'JetBrains IDE configuration' },
  { path: '/Dockerfile', desc: 'Docker build instructions' },
  { path: '/docker-compose.yml', desc: 'Docker Compose configuration' },
  { path: '/.npmrc', desc: 'NPM configuration (may contain tokens)' }
];

export default {
  name: 'exposedfiles',
  alias: ['filescan', 'sensitivefiles'],
  description: 'Check for exposed sensitive files on a web server',
  category: 'ethical hacking',
  usage: 'exposedfiles <url>',
  async execute(sock, m, args, PREFIX) {
    const jid = m.key.remoteJid;
    if (!args[0]) {
      return sock.sendMessage(jid, { text: `┌─⧭⊷ 🛡️ *EXPOSED FILES CHECKER*\n│\n├◆ *${PREFIX}exposedfiles <url>*\n│  └⊷ Check for exposed sensitive files\n│\n├◆ *Checks ${SENSITIVE_FILES.length} files including:*\n│  ├◆ .env, .git/config, .htaccess\n│  ├◆ wp-config.php, package.json\n│  ├◆ Dockerfile, docker-compose.yml\n│  └⊷ IDE configs, server info\n└─⧭⊷\n> *${getOwnerName().toUpperCase()} TECH*` }, { quoted: m });
    }

    await sock.sendMessage(jid, { react: { text: '⏳', key: m.key } });

    try {
      let target = args[0];
      if (!/^https?:\/\//i.test(target)) target = 'https://' + target;
      const urlObj = new URL(target);
      const baseUrl = urlObj.origin;

      const exposed = [];
      const protected_ = [];
      const errors = [];

      const checkFile = async (file) => {
        try {
          const resp = await axios.head(`${baseUrl}${file.path}`, {
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            maxRedirects: 3,
            validateStatus: () => true
          });

          const status = resp.status;
          const contentLength = resp.headers['content-length'] || 'unknown';
          const contentType = resp.headers['content-type'] || 'unknown';

          if (status >= 200 && status < 300) {
            exposed.push({
              ...file,
              status,
              size: contentLength,
              type: contentType.split(';')[0]
            });
          } else {
            protected_.push({ ...file, status });
          }
        } catch {
          errors.push({ ...file, status: 'error' });
        }
      };

      const batchSize = 5;
      for (let i = 0; i < SENSITIVE_FILES.length; i += batchSize) {
        const batch = SENSITIVE_FILES.slice(i, i + batchSize);
        await Promise.all(batch.map(f => checkFile(f)));
      }

      const criticalFiles = ['/.env', '/.git/config', '/wp-config.php', '/.npmrc'];
      const criticalExposed = exposed.filter(f => criticalFiles.includes(f.path));

      let severity = 'LOW';
      if (criticalExposed.length > 0) severity = 'CRITICAL';
      else if (exposed.length > 3) severity = 'HIGH';
      else if (exposed.length > 0) severity = 'MEDIUM';

      const severityEmoji = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢' };

      let result = `┌─⧭⊷ 🛡️ *EXPOSED FILES CHECK*\n│\n\n└─⧭⊷`;
      result += `├◆ *Target:* ${baseUrl}\n`;
      result += `├◆ *Files Checked:* ${SENSITIVE_FILES.length}\n`;
      result += `├◆ *Exposed:* ${exposed.length} | *Protected:* ${protected_.length}\n`;
      result += `├◆ *Severity:* ${severityEmoji[severity]} ${severity}\n│\n`;

      if (exposed.length > 0) {
        result += `├─⌈ 🚨 *EXPOSED FILES (${exposed.length})* ⌋\n│\n`;
        for (const f of exposed) {
          const isCritical = criticalFiles.includes(f.path);
          result += `├◆ ${isCritical ? '🔴' : '⚠️'} *${f.path}*\n`;
          result += `│  ├◆ Status: ${f.status} | Size: ${f.size} bytes\n`;
          result += `│  └⊷ ${f.desc}\n│\n`;
        }
      }

      if (protected_.length > 0) {
        result += `├─⌈ ✅ *PROTECTED FILES (${protected_.length})* ⌋\n│\n`;
        for (const f of protected_) {
          result += `├◆ ✅ ${f.path} — ${f.status}\n`;
        }
        result += `│\n`;
      }

      result += `├─⌈ 💡 *RECOMMENDATIONS* ⌋\n│\n`;
      if (exposed.length > 0) {
        result += `├◆ Immediately restrict access to exposed files\n`;
        result += `├◆ Move sensitive files outside web root\n`;
        result += `├◆ Add server rules to block access to dotfiles\n`;
        if (criticalExposed.length > 0) {
          result += `├◆ 🚨 CRITICAL: Rotate any exposed credentials NOW\n`;
        }
      } else {
        result += `├◆ Good! No sensitive files exposed\n`;
      }
      result += `│\n└─⧭⊷\n> *${getOwnerName().toUpperCase()} TECH*`;

      await sock.sendMessage(jid, { text: result }, { quoted: m });
      await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });
    } catch (err) {
      await sock.sendMessage(jid, { react: { text: '❌', key: m.key } });
      await sock.sendMessage(jid, { text: `❌ Error: ${err.message}` }, { quoted: m });
    }
  }
};

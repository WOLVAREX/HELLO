import axios from 'axios';
import { getBotName } from '../../lib/botname.js';
import { getOwnerName } from '../../lib/menuHelper.js';

export default {
  name: 'cvecheck',
  alias: ['cve', 'cvelookup'],
  description: 'CVE vulnerability lookup - search by CVE ID or keyword',
  category: 'ethical hacking',
  usage: 'cvecheck <CVE-ID or keyword>',
  async execute(sock, m, args, PREFIX) {
    const jid = m.key.remoteJid;
    if (!args[0]) {
      return sock.sendMessage(jid, { text: `┌─⧭⊷ 🛡️ *CVE VULNERABILITY LOOKUP*\n│\n├◆ *${PREFIX}cvecheck <CVE-ID>*\n│  └⊷ Look up a specific CVE (e.g., CVE-2021-44228)\n│\n├◆ *${PREFIX}cvecheck <keyword>*\n│  └⊷ Search CVEs by keyword (e.g., log4j, apache)\n│\n├◆ *Sources:*\n│  ├◆ MITRE CVE Database\n│  └⊷ NVD (NIST) Database\n└─⧭⊷\n> *${getOwnerName().toUpperCase()} TECH*` }, { quoted: m });
    }

    await sock.sendMessage(jid, { react: { text: '⏳', key: m.key } });

    try {
      const query = args.join(' ').trim();
      const isCveId = /^CVE-\d{4}-\d{4,}$/i.test(query);

      if (isCveId) {
        const cveId = query.toUpperCase();
        const resp = await axios.get(`https://cveawg.mitre.org/api/cve/${cveId}`, {
          timeout: 15000,
          headers: { 'User-Agent': 'Mozilla/5.0' },
          validateStatus: () => true
        });

        if (resp.status !== 200) {
          return sock.sendMessage(jid, { text: `❌ CVE not found: ${cveId}\n\nMake sure the format is correct (e.g., CVE-2021-44228)` }, { quoted: m });
        }

        const data = resp.data;
        const cna = data.containers?.cna || {};
        const meta = data.cveMetadata || {};

        const descriptions = cna.descriptions || [];
        const engDesc = descriptions.find(d => d.lang === 'en') || descriptions[0] || {};
        const description = engDesc.value || 'No description available';

        const metrics = cna.metrics || [];
        let severity = 'Unknown';
        let cvssScore = 'N/A';
        for (const metric of metrics) {
          const cvss31 = metric.cvssV3_1 || metric.cvssV3_0 || metric.cvssV31;
          if (cvss31) {
            severity = cvss31.baseSeverity || 'Unknown';
            cvssScore = cvss31.baseScore || 'N/A';
            break;
          }
        }

        const affected = cna.affected || [];
        const affectedList = affected.slice(0, 5).map(a => {
          const vendor = a.vendor || 'Unknown';
          const product = a.product || 'Unknown';
          const versions = (a.versions || []).slice(0, 3).map(v => v.version || 'N/A').join(', ');
          return `${vendor} ${product}${versions ? ` (${versions})` : ''}`;
        });

        const references = (cna.references || []).slice(0, 5);

        const severityEmoji = {
          'CRITICAL': '🔴', 'HIGH': '🟠', 'MEDIUM': '🟡', 'LOW': '🟢', 'Unknown': '⚪'
        };

        let result = `┌─⧭⊷ 🛡️ *CVE LOOKUP RESULT*\n│\n\n└─⧭⊷`;
        result += `├◆ *CVE ID:* ${cveId}\n`;
        result += `├◆ *State:* ${meta.state || 'Unknown'}\n`;
        result += `├◆ *Published:* ${meta.datePublished ? new Date(meta.datePublished).toLocaleDateString() : 'Unknown'}\n`;
        result += `├◆ *Updated:* ${meta.dateUpdated ? new Date(meta.dateUpdated).toLocaleDateString() : 'Unknown'}\n│\n`;
        result += `├─⌈ 📊 *SEVERITY* ⌋\n│\n`;
        result += `├◆ *CVSS Score:* ${cvssScore}\n`;
        result += `├◆ *Severity:* ${severityEmoji[severity.toUpperCase()] || '⚪'} ${severity}\n│\n`;
        result += `├─⌈ 📝 *DESCRIPTION* ⌋\n│\n`;
        result += `├◆ ${description.substring(0, 500)}${description.length > 500 ? '...' : ''}\n│\n`;

        if (affectedList.length > 0) {
          result += `├─⌈ 🎯 *AFFECTED PRODUCTS* ⌋\n│\n`;
          for (const a of affectedList) {
            result += `├◆ ${a}\n`;
          }
          result += `│\n`;
        }

        if (references.length > 0) {
          result += `├─⌈ 🔗 *REFERENCES* ⌋\n│\n`;
          for (const ref of references) {
            result += `├◆ ${ref.url || 'N/A'}\n`;
          }
          result += `│\n`;
        }

        result += `└─⧭⊷\n> *${getOwnerName().toUpperCase()} TECH*`;

        await sock.sendMessage(jid, { text: result }, { quoted: m });
        await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });
      } else {
        const resp = await axios.get(`https://services.nvd.nist.gov/rest/json/cves/2.0`, {
          params: { keywordSearch: query, resultsPerPage: 8 },
          timeout: 20000,
          headers: { 'User-Agent': 'Mozilla/5.0' },
          validateStatus: () => true
        });

        if (resp.status !== 200) {
          return sock.sendMessage(jid, { text: `❌ NVD API error (status: ${resp.status}). Try again later.` }, { quoted: m });
        }

        const data = resp.data;
        const totalResults = data.totalResults || 0;
        const vulnerabilities = data.vulnerabilities || [];

        if (totalResults === 0) {
          await sock.sendMessage(jid, { text: `┌─⧭⊷ 🛡️ *CVE SEARCH*\n│\n├◆ *Query:* ${query}\n├◆ *Results:* 0 CVEs found\n│\n├◆ Try different keywords\n└─⧭⊷\n> *${getOwnerName().toUpperCase()} TECH*` }, { quoted: m });
          await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });
          return;
        }

        let result = `┌─⧭⊷ 🛡️ *CVE SEARCH RESULTS*\n│\n\n└─⧭⊷`;
        result += `├◆ *Query:* ${query}\n`;
        result += `├◆ *Total Results:* ${totalResults}\n`;
        result += `├◆ *Showing:* ${Math.min(vulnerabilities.length, 8)}\n│\n`;

        for (const vuln of vulnerabilities.slice(0, 8)) {
          const cve = vuln.cve || {};
          const cveId = cve.id || 'Unknown';
          const descs = cve.descriptions || [];
          const engDesc = descs.find(d => d.lang === 'en') || descs[0] || {};
          const desc = (engDesc.value || 'No description').substring(0, 150);

          let severity = 'Unknown';
          let score = 'N/A';
          const metrics = cve.metrics || {};
          const cvss31 = (metrics.cvssMetricV31 || [])[0]?.cvssData;
          const cvss30 = (metrics.cvssMetricV30 || [])[0]?.cvssData;
          const cvss2 = (metrics.cvssMetricV2 || [])[0]?.cvssData;
          const cvssData = cvss31 || cvss30 || cvss2;
          if (cvssData) {
            severity = cvssData.baseSeverity || 'Unknown';
            score = cvssData.baseScore || 'N/A';
          }

          const published = cve.published ? new Date(cve.published).toLocaleDateString() : 'Unknown';
          const severityEmoji = { 'CRITICAL': '🔴', 'HIGH': '🟠', 'MEDIUM': '🟡', 'LOW': '🟢' };

          result += `├─⌈ *${cveId}* ⌋\n`;
          result += `│  ├◆ ${severityEmoji[severity.toUpperCase()] || '⚪'} Score: ${score} (${severity})\n`;
          result += `│  ├◆ Published: ${published}\n`;
          result += `│  └⊷ ${desc}${desc.length >= 150 ? '...' : ''}\n│\n`;
        }

        if (totalResults > 8) {
          result += `├◆ _...and ${totalResults - 8} more results_\n│\n`;
        }

        result += `├◆ Use *${PREFIX}cvecheck CVE-XXXX-XXXXX* for full details\n`;
        result += `└─⧭⊷\n> *${getOwnerName().toUpperCase()} TECH*`;

        await sock.sendMessage(jid, { text: result }, { quoted: m });
        await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });
      }
    } catch (err) {
      await sock.sendMessage(jid, { react: { text: '❌', key: m.key } });
      await sock.sendMessage(jid, { text: `❌ Error: ${err.message}` }, { quoted: m });
    }
  }
};

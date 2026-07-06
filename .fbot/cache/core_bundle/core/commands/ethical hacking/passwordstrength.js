import crypto from 'crypto';
import { getBotName } from '../../lib/botname.js';
import { getOwnerName } from '../../lib/menuHelper.js';

export default {
  name: 'passwordstrength',
  alias: ['passcheck', 'passstrength', 'passwordcheck'],
  description: 'Analyze password strength with entropy and crack time',
  category: 'ethical hacking',
  usage: 'passwordstrength <password>',
  async execute(sock, m, args, PREFIX) {
    const jid = m.key.remoteJid;
    if (!args[0]) {
      return sock.sendMessage(jid, { text: `┌─⧭⊷ 🔐 *PASSWORD STRENGTH*\n│\n├◆ *${PREFIX}passwordstrength <password>*\n│  └⊷ Analyze password strength,\n│     entropy, and crack time\n└─⧭⊷\n> *${getOwnerName().toUpperCase()} TECH*` }, { quoted: m });
    }
    await sock.sendMessage(jid, { react: { text: '⏳', key: m.key } });
    try {
      const password = args.join(' ');
      const len = password.length;

      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasDigit = /[0-9]/.test(password);
      const hasSpecial = /[^A-Za-z0-9]/.test(password);
      const hasSpace = /\s/.test(password);

      const upperCount = (password.match(/[A-Z]/g) || []).length;
      const lowerCount = (password.match(/[a-z]/g) || []).length;
      const digitCount = (password.match(/[0-9]/g) || []).length;
      const specialCount = (password.match(/[^A-Za-z0-9]/g) || []).length;

      let charsetSize = 0;
      if (hasLower) charsetSize += 26;
      if (hasUpper) charsetSize += 26;
      if (hasDigit) charsetSize += 10;
      if (hasSpecial) charsetSize += 33;
      if (hasSpace) charsetSize += 1;

      const entropy = len * Math.log2(charsetSize || 1);

      const commonPatterns = [
        'password', '123456', 'qwerty', 'abc123', 'letmein', 'admin',
        'welcome', 'monkey', 'master', 'dragon', 'login', 'princess',
        'football', 'shadow', 'sunshine', 'trustno1', 'iloveyou',
        '123456789', '12345678', '1234567', '123123', '111111',
        'qwerty123', 'password1', 'password123'
      ];

      const seqPatterns = [
        '012', '123', '234', '345', '456', '567', '678', '789',
        'abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi',
        'qwe', 'wer', 'ert', 'rty', 'asd', 'sdf', 'dfg',
        'zxc', 'xcv', 'cvb'
      ];

      const repeating = /(.)\1{2,}/.test(password);
      const isCommon = commonPatterns.includes(password.toLowerCase());
      const hasSequential = seqPatterns.some(p => password.toLowerCase().includes(p));
      const hasReversedSeq = seqPatterns.some(p => password.toLowerCase().includes(p.split('').reverse().join('')));
      const allSameChar = /^(.)\1+$/.test(password);
      const onlyDigits = /^\d+$/.test(password);
      const dictionaryWords = ['hello', 'world', 'test', 'pass', 'user', 'love', 'god', 'sex', 'war', 'angel', 'devil', 'wolf', 'king', 'queen', 'star'];
      const hasDictWord = dictionaryWords.some(w => password.toLowerCase().includes(w));

      let score = 0;
      if (len >= 8) score += 10;
      if (len >= 12) score += 10;
      if (len >= 16) score += 10;
      if (len >= 20) score += 5;
      if (hasUpper) score += 10;
      if (hasLower) score += 10;
      if (hasDigit) score += 10;
      if (hasSpecial) score += 15;
      if (hasSpace) score += 5;

      if (entropy >= 60) score += 10;
      else if (entropy >= 40) score += 5;

      const uniqueChars = new Set(password).size;
      if (uniqueChars >= len * 0.7) score += 5;

      if (len < 6) score -= 20;
      if (len < 4) score -= 20;
      if (isCommon) score -= 40;
      if (hasSequential) score -= 10;
      if (hasReversedSeq) score -= 5;
      if (repeating) score -= 10;
      if (allSameChar) score -= 30;
      if (onlyDigits) score -= 15;
      if (hasDictWord) score -= 10;

      score = Math.max(0, Math.min(100, score));

      let rating, ratingEmoji;
      if (score >= 80) { rating = 'Very Strong'; ratingEmoji = '🟢🟢🟢🟢🟢'; }
      else if (score >= 60) { rating = 'Strong'; ratingEmoji = '🟢🟢🟢🟢⚪'; }
      else if (score >= 40) { rating = 'Fair'; ratingEmoji = '🟡🟡🟡⚪⚪'; }
      else if (score >= 20) { rating = 'Weak'; ratingEmoji = '🟠🟠⚪⚪⚪'; }
      else { rating = 'Very Weak'; ratingEmoji = '🔴⚪⚪⚪⚪'; }

      const guessesPerSec = 10e9;
      const totalCombinations = Math.pow(charsetSize || 1, len);
      const secondsToCrack = totalCombinations / guessesPerSec / 2;

      let crackTime;
      if (secondsToCrack < 1) crackTime = 'Instantly';
      else if (secondsToCrack < 60) crackTime = `${Math.round(secondsToCrack)} seconds`;
      else if (secondsToCrack < 3600) crackTime = `${Math.round(secondsToCrack / 60)} minutes`;
      else if (secondsToCrack < 86400) crackTime = `${Math.round(secondsToCrack / 3600)} hours`;
      else if (secondsToCrack < 86400 * 365) crackTime = `${Math.round(secondsToCrack / 86400)} days`;
      else if (secondsToCrack < 86400 * 365 * 1000) crackTime = `${Math.round(secondsToCrack / (86400 * 365))} years`;
      else if (secondsToCrack < 86400 * 365 * 1e6) crackTime = `${(secondsToCrack / (86400 * 365 * 1000)).toFixed(0)}K years`;
      else if (secondsToCrack < 86400 * 365 * 1e9) crackTime = `${(secondsToCrack / (86400 * 365 * 1e6)).toFixed(0)}M years`;
      else crackTime = `${(secondsToCrack / (86400 * 365 * 1e9)).toFixed(0)}B+ years`;

      const warnings = [];
      if (isCommon) warnings.push('⚠️ This is a commonly used password');
      if (allSameChar) warnings.push('⚠️ All characters are the same');
      if (hasSequential) warnings.push('⚠️ Contains sequential characters');
      if (repeating) warnings.push('⚠️ Contains repeating characters');
      if (onlyDigits) warnings.push('⚠️ Only contains digits');
      if (hasDictWord) warnings.push('⚠️ Contains common dictionary word');
      if (len < 8) warnings.push('⚠️ Too short (minimum 8 recommended)');

      const bar = '█'.repeat(Math.floor(score / 5)) + '░'.repeat(20 - Math.floor(score / 5));

      let result = `┌─⧭⊷ 🔐 *PASSWORD STRENGTH ANALYZER*\n│\n\n└─⧭⊷`;
      result += `├◆ *Password:* \`${'•'.repeat(Math.min(len, 20))}\` (${len} chars)\n│\n`;
      result += `├◆ *Score:* ${score}/100\n`;
      result += `│  └⊷ [${bar}]\n`;
      result += `├◆ *Rating:* ${rating} ${ratingEmoji}\n│\n`;
      result += `├◆ *Composition:*\n`;
      result += `│  ├◆ Uppercase: ${hasUpper ? '✅' : '❌'} (${upperCount})\n`;
      result += `│  ├◆ Lowercase: ${hasLower ? '✅' : '❌'} (${lowerCount})\n`;
      result += `│  ├◆ Numbers: ${hasDigit ? '✅' : '❌'} (${digitCount})\n`;
      result += `│  ├◆ Special: ${hasSpecial ? '✅' : '❌'} (${specialCount})\n`;
      result += `│  └⊷ Unique chars: ${uniqueChars}/${len}\n│\n`;
      result += `├◆ *Entropy:* ${entropy.toFixed(1)} bits\n`;
      result += `├◆ *Charset Size:* ${charsetSize}\n`;
      result += `├◆ *Crack Time:* ${crackTime}\n`;
      result += `│  └⊷ (at 10B guesses/sec)\n`;
      if (warnings.length > 0) {
        result += `│\n├◆ *Warnings:*\n`;
        warnings.forEach(w => { result += `│  └⊷ ${w}\n`; });
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

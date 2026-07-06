// ═══════════════════════════════════════════════════════════════════════════
//  WOLF FETCHER v2.0
//  Reads repo URL from kip.json → downloads zip → installs → runs bot
//  Config endpoint: https://courageous-alpaca-0e1682.netlify.app/kip.json
// ═══════════════════════════════════════════════════════════════════════════

import https    from 'https';
import http     from 'http';
import fs       from 'fs';
import path     from 'path';
import { fileURLToPath } from 'url';
import { spawn, spawnSync } from 'child_process';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));

const CONFIG_URL  = 'https://courageous-alpaca-0e1682.netlify.app/kip.json';
const HOME_DIR    = process.env.HOME || process.env.USERPROFILE || '/root';
const TEMP_DIR    = path.join(HOME_DIR, '.wolf_dl');
const EXTRACT_DIR = path.join(TEMP_DIR, 'core');

// ── Terminal colours ─────────────────────────────────────────────────────────
const G = '\x1b[38;2;0;255;156m';
const Y = '\x1b[38;2;250;204;21m';
const R = '\x1b[38;2;255;80;80m';
const X = '\x1b[0m';

const ok   = (...a) => console.log(`${G}[WOLF-FETCH]${X}`, ...a);
const warn = (...a) => console.log(`${Y}[WOLF-FETCH]${X}`, ...a);
const err  = (...a) => console.error(`${R}[WOLF-FETCH]${X}`, ...a);

// ── HTTP helper (follows redirects, no external deps) ────────────────────────
function rawRequest(url, opts = {}, redirects = 0) {
    return new Promise((resolve, reject) => {
        if (redirects > 12) return reject(new Error('Too many redirects'));
        const mod = url.startsWith('https') ? https : http;
        const req = mod.get(url, {
            headers: { 'User-Agent': 'wolf-fetcher/2.0', ...opts.headers },
        }, resp => {
            if ([301, 302, 303, 307, 308].includes(resp.statusCode) && resp.headers.location) {
                return rawRequest(resp.headers.location, opts, redirects + 1)
                    .then(resolve).catch(reject);
            }
            resolve(resp);
        });
        req.on('error', reject);
        if (opts.timeout) req.setTimeout(opts.timeout, () => req.destroy(new Error('Request timeout')));
    });
}

async function fetchText(url) {
    const resp = await rawRequest(url, { timeout: 15000 });
    return new Promise((resolve, reject) => {
        const chunks = [];
        resp.on('data', c => chunks.push(c));
        resp.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        resp.on('error', reject);
    });
}

async function downloadFile(url, destPath) {
    const resp = await rawRequest(url, { timeout: 120000 });
    return new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(destPath);
        resp.pipe(stream);
        stream.on('finish', resolve);
        stream.on('error', reject);
        resp.on('error', reject);
    });
}

// ── Parse the kip.json format (non-standard: ["repo":"https://..."]) ─────────
function parseRepoUrl(raw) {
    // Handle the custom format: [ "repo":"https://..." ]
    const match = raw.match(/["']?repo["']?\s*:\s*["']([^"'\s]+)["']/);
    if (match?.[1]) return match[1].trim();

    // Fallback: try standard JSON
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.repo === 'string') return parsed.repo;
        if (Array.isArray(parsed)) {
            for (const item of parsed) {
                if (typeof item === 'string' && item.startsWith('http')) return item;
                if (typeof item?.repo === 'string') return item.repo;
            }
        }
    } catch {}

    // Last resort: grab any GitHub zip URL
    const urlMatch = raw.match(/https:\/\/github\.com\/[^\s"']+\.zip/);
    if (urlMatch) return urlMatch[0];

    throw new Error('Could not extract repo URL from config: ' + raw.slice(0, 120));
}

// ── Extract zip (unzip → python3 fallback) ───────────────────────────────────
function extractZip(zipPath, destDir) {
    const r = spawnSync('unzip', ['-o', '-q', zipPath, '-d', destDir], { stdio: 'pipe' });
    if (r.status === 0) return;

    // Try python3 as fallback
    const r2 = spawnSync('python3', ['-c', [
        'import zipfile, sys',
        'with zipfile.ZipFile(sys.argv[1]) as z: z.extractall(sys.argv[2])',
    ].join('\n'), zipPath, destDir], { stdio: 'pipe' });

    if (r2.status !== 0) throw new Error('Zip extraction failed (tried unzip + python3)');
}

// ── Ensure package.json has "type":"module" (required for Node v22 compat) ───
function patchPackageJson(dir) {
    try {
        const pkgPath = path.join(dir, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.type !== 'module') {
            pkg.type = 'module';
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
            ok('Patched package.json → "type":"module"');
        }
    } catch {}
}

// ── npm install with retry and visible error reporting ───────────────────────
function installDeps(dir) {
    // Wipe any leftover /tmp junk to free space
    for (const stale of ['/tmp/npm_cache', '/tmp/wolf_dl']) {
        try {
            if (fs.existsSync(stale)) {
                fs.rmSync(stale, { recursive: true, force: true });
                ok('Cleared stale temp:', stale);
            }
        } catch {}
    }

    const attempts = [
        // Try 1: standard install (use home dir cache, not /tmp)
        ['npm', ['install', '--no-audit', '--no-fund']],
        // Try 2: legacy peer deps
        ['npm', ['install', '--no-audit', '--no-fund', '--legacy-peer-deps']],
        // Try 3: force
        ['npm', ['install', '--no-audit', '--no-fund', '--force']],
    ];

    for (const [cmd, args] of attempts) {
        const r = spawnSync(cmd, args, { cwd: dir, stdio: 'pipe', timeout: 180000 });
        if (r.status === 0) return; // success

        const errOut = (r.stderr || r.stdout || Buffer.alloc(0)).toString().trim();
        const firstLine = errOut.split('\n').find(l => l.trim()) || '(no output)';
        warn('Install attempt failed:', firstLine.slice(0, 200));
    }

    // Check if node_modules exists anyway (partial install might be ok)
    if (!fs.existsSync(path.join(dir, 'node_modules'))) {
        throw new Error('npm install failed after 3 attempts and node_modules is missing');
    }
    warn('npm install had errors but node_modules exists — continuing...');
}

// ── Download, extract and install the remote repo ────────────────────────────
async function setup() {
    const hasEntry = ['index.js', 'main.js', 'bot.js', 'app.js']
        .some(f => fs.existsSync(path.join(EXTRACT_DIR, f)));

    // Skip download if already extracted
    if (fs.existsSync(EXTRACT_DIR) && hasEntry) {
        ok('Bot files ready — skipping download');
        if (!fs.existsSync(path.join(EXTRACT_DIR, 'node_modules'))) {
            ok('Installing dependencies...');
            installDeps(EXTRACT_DIR);
        }
        return;
    }

    // Fresh download
    ok('Fetching config...');
    const raw    = await fetchText(CONFIG_URL);
    const zipUrl = parseRepoUrl(raw);

    // Wipe temp dir and start fresh
    if (fs.existsSync(TEMP_DIR)) fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEMP_DIR, { recursive: true });

    const zipPath = path.join(TEMP_DIR, 'repo.zip');
    ok('Downloading zip...');
    await downloadFile(zipUrl, zipPath);

    const size = fs.statSync(zipPath).size;
    if (size < 1000) {
        const preview = fs.readFileSync(zipPath, 'utf8').slice(0, 200);
        throw new Error(`Download too small (${size}B) — likely a 404:\n${preview}`);
    }
    ok(`Downloaded ${(size / 1024).toFixed(0)} KB`);

    ok('Extracting...');
    extractZip(zipPath, TEMP_DIR);
    try { fs.unlinkSync(zipPath); } catch {}

    // GitHub zips extract as "repo-branch/" — rename it to "core"
    const dirs = fs.readdirSync(TEMP_DIR)
        .filter(f => f !== 'core' && fs.statSync(path.join(TEMP_DIR, f)).isDirectory());
    if (dirs.length > 0) {
        fs.renameSync(path.join(TEMP_DIR, dirs[0]), EXTRACT_DIR);
    }

    if (!fs.existsSync(EXTRACT_DIR)) throw new Error('Extraction completed but core dir not found');

    ok('Installing dependencies...');
    installDeps(EXTRACT_DIR);
    ok('Dependencies ready');
}

// ── Launch bot with auto-restart ─────────────────────────────────────────────
let restartCount = 0;
const MAX_RESTARTS = 10;

function startBot() {
    if (!fs.existsSync(EXTRACT_DIR)) {
        err('Bot directory not found — aborting');
        process.exit(1);
    }

    let mainFile = 'index.js';
    for (const f of ['index.js', 'main.js', 'bot.js', 'app.js']) {
        if (fs.existsSync(path.join(EXTRACT_DIR, f))) { mainFile = f; break; }
    }

    // Ensure ESM compatibility before each launch
    patchPackageJson(EXTRACT_DIR);

    ok(restartCount === 0 ? 'Starting bot...' : `Restarting bot... (${restartCount}/${MAX_RESTARTS})`);

    const bot = spawn('node', [
        '--no-warnings',
        '--expose-gc',
        '--max-old-space-size=1024',
        '--max-semi-space-size=64',
        '--experimental-global-webcrypto',
        mainFile,
    ], {
        cwd: EXTRACT_DIR,
        stdio: 'inherit',
        env: { ...process.env },
    });

    bot.on('close', code => {
        if (restartCount >= MAX_RESTARTS) {
            err(`Bot crashed ${MAX_RESTARTS} times — giving up`);
            process.exit(1);
        }
        restartCount++;
        warn(`Bot stopped (code ${code ?? '?'}) — retrying in 3s… (${restartCount}/${MAX_RESTARTS})`);
        setTimeout(startBot, 3000);
    });

    bot.on('error', e => {
        err('Spawn error:', e.message);
        restartCount++;
        setTimeout(startBot, 3000);
    });
}

// ── Entry point ──────────────────────────────────────────────────────────────
(async () => {
    try {
        await setup();
    } catch (e) {
        err('Setup failed:', e.message);
        warn('Attempting to launch from any existing files...');
    }
    startBot();
})();

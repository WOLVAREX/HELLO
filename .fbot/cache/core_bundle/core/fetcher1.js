
      const mainVal = pkg.main || 'index.js';
      const mainBroken = !canOpen(path.join(d, mainVal));
      if (!emptyExports && !mainBroken) continue;

      let found = false;
      for (const alt of ALT_PATHS) {
        const altAbs = path.join(d, alt);
        if (canOpen(altAbs)) {
          pkgMap[spec] = pathToFileURL(altAbs).href;
          found = true;
          break;
        }
      }
      if (!found) {
        const parts = spec.split('/');
        for (const alt of ALT_PATHS) {
          const tmpF = path.join(TMP_NM, ...parts, alt);
          if (canOpen(tmpF)) {
            pkgMap[spec] = pathToFileURL(tmpF).href;
            found = true;
            break;
          }
        }
      }
      if (!found) needInstall.push(spec);
    } catch {}
  }

  if (needInstall.length > 0) {
    try {
      fs.mkdirSync('/tmp/bfx_mods', { recursive: true });
      fs.mkdirSync('/tmp/bfx_npm_cache', { recursive: true });
      spawnSync('npm', [
        'install',
        '--prefix', '/tmp/bfx_mods',
        '--cache', '/tmp/bfx_npm_cache',
        '--no-audit', '--no-fund', '--ignore-scripts',
        '--prefer-dedupe',
        ...needInstall,
      ], {
        stdio: 'ignore',
        timeout: 120000,
        env: { ...process.env, npm_config_cache: '/tmp/bfx_npm_cache' },
      });
      for (const spec of needInstall) {
        const parts = spec.split('/');
        for (const alt of ALT_PATHS) {
          const f = path.join(TMP_NM, ...parts, alt);
          if (canOpen(f)) {
            pkgMap[spec] = pathToFileURL(f).href;
            break;
          }
        }
      }
    } catch {}
  }

  // Always force-map known tricky packages regardless of detection
  const FORCE_MAP = [
    ['@whiskeysockets/baileys', ['lib/index.js', 'dist/index.js', 'src/index.js', 'index.js']],
  ];
  for (const [spec, alts] of FORCE_MAP) {
    if (pkgMap[spec]) continue; // already found by detection
    const parts = spec.split('/');
    for (const alt of alts) {
      const f = path.join(nm, ...parts, alt);
      if (canOpen(f)) { pkgMap[spec] = pathToFileURL(f).href; break; }
    }
  }

  const hookSrc = [
    "import{pathToFileURL,fileURLToPath}from'node:url';",
    "import{existsSync}from'node:fs';",
    "import{dirname,join}from'node:path';",
    `const MAP=${JSON.stringify(pkgMap)};`,
    "function isSubpath(s){const p=s.split('/');return s.startsWith('@')?p.length>2:p.length>1;}",
    "function pkgParts(s){const p=s.split('/');return s.startsWith('@')?p.slice(0,2):p.slice(0,1);}",
    "const ALTS=['lib/index.js','dist/index.js','src/index.js','dist/node/index.js','lib/main.js','dist/main.js','build/index.js','index.js'];",
    "export async function resolve(s,c,n){",
    "  if(MAP[s])return{url:MAP[s],shortCircuit:true};",
    "  try{return await n(s,c);}catch(e){",
    "    if(e.code==='ERR_MODULE_NOT_FOUND'&&c.parentURL",
    "       &&!s.startsWith('.')&&!s.startsWith('/')&&!s.startsWith('node:')&&!s.startsWith('file:')&&!isSubpath(s)){",
    "      try{",
    "        const base=dirname(fileURLToPath(c.parentURL));",
    "        const parts=pkgParts(s);",
    "        for(const a of ALTS){",
    "          const f=join(base,'node_modules',...parts,a);",
    "          if(existsSync(f))return{url:pathToFileURL(f).href,shortCircuit:true};",
    "        }",
    "      }catch{}",
    "    }",
    "    throw e;",
    "  }",
    "}",
  ].join('\n');

  const preloadSrc = [
    "import{register}from'node:module';",
    "import{pathToFileURL}from'node:url';",
    "register(pathToFileURL('/tmp/_bfx_hook.mjs'));",
  ].join('\n');

  try { fs.writeFileSync('/tmp/_bfx_hook.mjs', hookSrc); } catch {}
  try { fs.writeFileSync('/tmp/_bfx_preload.mjs', preloadSrc); } catch {}
}

function patchLegacyMains(nm) {
  const ALT_PATHS = [
    'lib/index.js','dist/index.js','src/index.js',
    'dist/node/index.js','lib/src/index.js','build/index.js',
  ];
  let dirs = [];
  try {
    for (const e of fs.readdirSync(nm)) {
      if (e.startsWith('@')) {
        try { for (const s of fs.readdirSync(path.join(nm, e))) dirs.push(path.join(nm, e, s)); } catch {}
      } else {
        dirs.push(path.join(nm, e));
      }
    }
  } catch {}
  for (const d of dirs) {
    try {
      const pkgPath = path.join(d, 'package.json');
      if (!fs.existsSync(pkgPath)) continue;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const mainVal = pkg.main || 'index.js';
      if (!/index\.(js|cjs)$/.test(mainVal)) continue;
      const mainAbs = path.join(d, mainVal);
      if (fs.existsSync(mainAbs)) continue;
      for (const alt of ALT_PATHS) {
        const altAbs = path.join(d, alt);
        if (fs.existsSync(altAbs)) {
          try {
            fs.writeFileSync(mainAbs, `'use strict';\nconst m=require('./${alt}');\nmodule.exports=m;\nmodule.exports.default=m.default||m;\n`);
            const p2 = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            delete p2.type;
            p2.main = mainVal;
            fs.writeFileSync(pkgPath, JSON.stringify(p2));
          } catch {}
          break;
        }
      }
    } catch {}
  }
}

function fixBaileys(nm) {
  const baileysDir = path.join(nm, '@whiskeysockets', 'baileys');
  if (!fs.existsSync(baileysDir)) return;

  const pkgPath    = path.join(baileysDir, 'package.json');
  const indexPath  = path.join(baileysDir, 'index.js');
  const libIndex   = path.join(baileysDir, 'lib', 'index.js');
  const distIndex  = path.join(baileysDir, 'dist', 'index.js');

  // Find the real entry
  const realEntry = fs.existsSync(libIndex)  ? './lib/index.js'
                  : fs.existsSync(distIndex) ? './dist/index.js'
                  : null;
  if (!realEntry) return;

  // Create a stub index.js at the root if missing
  if (!fs.existsSync(indexPath)) {
    try {
      fs.writeFileSync(indexPath, `export * from '${realEntry}';\n`);
    } catch {}
  }

  // Fix package.json — point main + exports to the stub
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.main    = 'index.js';
    pkg.exports = {
      '.': { import: './index.js', require: './index.js', default: './index.js' },
      './lib/*': { import: './lib/*', default: './lib/*' },
    };
    fs.writeFileSync(pkgPath, JSON.stringify(pkg));
  } catch {}
}

function patchDotenv(dir) {
  const nm = path.join(dir, 'node_modules');
  if (!fs.existsSync(nm)) {
    spawnSync('npm', ['install', '--no-audit'], { cwd: dir, stdio: 'ignore' });
  }
  fixBaileys(nm);
  patchChalk(nm);
  patchAxios(nm);
  patchBaileys(nm);
  patchLegacyMains(nm);
  const dotenvDir = path.join(nm, 'dotenv');
  const idx = path.join(dotenvDir, 'index.js');
  if (fs.existsSync(idx)) return;
  fs.mkdirSync(dotenvDir, { recursive: true });
  fs.writeFileSync(path.join(dotenvDir, 'package.json'), '{"name":"dotenv","version":"16.0.0","main":"index.js"}');
  fs.writeFileSync(idx, [
    "'use strict';",
    "const _fs=require('fs'),_p=require('path');",
    "function config(o){",
    "  try{",
    "    const f=(o&&o.path)||_p.join(process.cwd(),'.env');",
    "    if(!_fs.existsSync(f))return{parsed:{}};",
    "    const parsed={};",
    "    const lines=_fs.readFileSync(f,'utf8').split('\\n');",
    "    for(const l of lines){",
    "      const m=l.match(/^\\s*([^#=\\s][^=]*)\\s*=\\s*([\\s\\S]*)$/);",
    "      if(m){",
    "        const k=m[1].trim();",
    "        const v=m[2].trim().replace(/^['\"]|['\"]$/g,'');",
    "        parsed[k]=v;",
    "        if(!process.env[k])process.env[k]=v;",
    "      }",
    "    }",
    "    return{parsed};",
    "  }catch(e){return{parsed:{}};}",
    "}",
    "module.exports={config};",
    "module.exports.default=module.exports;"
  ].join('\n'));
}

// === SETTINGS SYNC ===
// Copies local settings.js into the extracted bot folder to override defaults.
async function applyLocalSettings() {
  if (!fs.existsSync(LOCAL_SETTINGS)) return;
  try {
    fs.mkdirSync(EXTRACT_DIR, { recursive: true });
    fs.copyFileSync(LOCAL_SETTINGS, EXTRACTED_SETTINGS);
  } catch {}
}

// === BOT LAUNCHER ===
// Finds the bot directory, spawns it as a child process, auto-restarts on crash.
function startBot() {
  let botDir = fs.existsSync(EXTRACT_DIR) ? EXTRACT_DIR : null;

  if (!botDir) {
    for (const dir of [
      path.join(__dirname, 'core'),
      path.join(__dirname, 'bot'),
      path.join(__dirname, 'src')
    ]) {
      if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'index.js'))) {
        botDir = dir;
        break;
      }
    }
  }

  if (!botDir) {
    err('No bot directory found — download may have failed.');
    err('Place bot files in a "core" folder and retry.');
    process.exit(1);
  }

  let mainFile = 'index.js';
  for (const file of ['index.js', 'main.js', 'bot.js', 'app.js']) {
    if (fs.existsSync(path.join(botDir, file))) { mainFile = file; break; }
  }

  showLiveBanner();

  const _preloadOk = fs.existsSync('/tmp/_bfx_preload.mjs');
  const nodeArgs = _preloadOk
    ? ['--import', 'file:///tmp/_bfx_preload.mjs', mainFile]
    : [mainFile];
  const _env = { ...process.env };
  if (_preloadOk) {
    const _prev = (_env.NODE_OPTIONS || '').replace(/--import\s+file:\/\/\/tmp\/_bfx_preload\.mjs/g, '').trim();
    _env.NODE_OPTIONS = (`${_prev} --import file:///tmp/_bfx_preload.mjs`).trim();
  }

  const bot = spawn('node', nodeArgs, {
    cwd:   botDir,
    stdio: 'inherit',
    env:   _env,
  });

  bot.on('close', (code) => {
    if (code !== 0 && code !== null) {
      warn(`Bot exited (code ${code}). Restarting in 3s...`);
      setTimeout(() => startBot(), 3000);
    }
  });

  bot.on('error', (e) => {
    err(`Failed to start: ${e.message}`);
    setTimeout(() => startBot(), 3000);
  });
}

// === ENTRY POINT ===
(async () => {
  loadEnvFile();
  try {
    await downloadAndExtract();
    await applyLocalSettings();
  } catch (e) {
    err(`Setup failed: ${e.message}`);
    warn('Setup failed — attempting to start from existing files...');
  }
  startBot();
})();

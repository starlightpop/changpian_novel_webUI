import { defineConfig } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';

const secretPath = path.resolve(process.cwd(), 'data', 'session-secret.key');
let SESSION_SECRET = '';
try {
  if (existsSync(secretPath)) {
    SESSION_SECRET = readFileSync(secretPath, 'utf8').trim();
    if (!SESSION_SECRET) {
      throw new Error('Session secret file is empty');
    }
    try {
      chmodSync(secretPath, 0o600);
    } catch {
      // 文件系统不支持权限位时继续使用既有密钥，避免让现有会话全部失效。
    }
  } else {
    SESSION_SECRET = crypto.randomBytes(32).toString('hex');
    const dir = path.dirname(secretPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(secretPath, SESSION_SECRET, { encoding: 'utf8', mode: 0o600 });
  }
} catch (e) {
  console.error('[WARNING] Failed to load/save session secret key file, falling back to dynamic in-memory secret.', e);
  SESSION_SECRET = crypto.randomBytes(32).toString('hex');
}

const PASSWORD_HASH_ITERATIONS = 210000;
const MAX_BODY_BYTES = 32 * 1024 * 1024;
const MAX_AUTH_BODY_BYTES = 64 * 1024;
const MAX_NOVEL_INPUT_BYTES = 2 * 1024 * 1024;
const MAX_USER_SAVE_BYTES = 10 * 1024 * 1024;
const MAX_KNOWLEDGE_GRAPH_BYTES = 5 * 1024 * 1024;
const MAX_NARRATIVE_MEMORY_BYTES = 8 * 1024 * 1024;
const MAX_REFERENCE_NOVEL_BYTES = 10 * 1024 * 1024;

function encryptString(text) {
  if (!text) return '';
  const key = crypto.createHash('sha256').update(SESSION_SECRET).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptString(ciphertext) {
  if (!ciphertext) return '';
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 2) return '';
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const key = crypto.createHash('sha256').update(SESSION_SECRET).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('解密失败:', err.message);
    return '';
  }
}

function encryptSensitiveFields(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  const result = { ...payload };
  if (result.apiKey && !result.apiKey.startsWith('enc:')) {
    result.apiKey = 'enc:' + encryptString(result.apiKey);
  }
  if (result.apiKeys && Array.isArray(result.apiKeys)) {
    result.apiKeys = result.apiKeys.map(slot => {
      if (slot && slot.apiKey && !slot.apiKey.startsWith('enc:')) {
        return { ...slot, apiKey: 'enc:' + encryptString(slot.apiKey) };
      }
      return slot;
    });
  }
  return result;
}

function decryptSensitiveFields(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  const result = { ...payload };
  if (result.apiKey && result.apiKey.startsWith('enc:')) {
    result.apiKey = decryptString(result.apiKey.substring(4));
  }
  if (result.apiKeys && Array.isArray(result.apiKeys)) {
    result.apiKeys = result.apiKeys.map(slot => {
      if (slot && slot.apiKey && slot.apiKey.startsWith('enc:')) {
        return { ...slot, apiKey: decryptString(slot.apiKey.substring(4)) };
      }
      return slot;
    });
  }
  return result;
}

function hashPassword(password, salt, iterations = PASSWORD_HASH_ITERATIONS) {
  return crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
}

function safeHexEqual(left, right) {
  if (!/^[0-9a-f]+$/i.test(left || '') || !/^[0-9a-f]+$/i.test(right || '')) return false;
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function generateToken(username) {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = `${username}.${expiresAt}`;
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [username, expiresAt, signature] = parts;
  if (Date.now() > parseInt(expiresAt, 10)) return null; // expired
  
  const payload = `${username}.${expiresAt}`;
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  
  if (safeHexEqual(signature, expectedSignature)) {
    return username;
  }
  return null;
}

function getUsernameFromReq(req) {
  const token = req.headers['x-user-token'];
  const username = verifyToken(token);
  if (username && !/^[a-z0-9_-]+$/.test(username)) {
    return null;
  }
  return username;
}

function readRequestBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let body = '';
    let byteLength = 0;
    let settled = false;
    req.setEncoding('utf8');
    req.on('data', chunk => {
      if (settled) return;
      byteLength += Buffer.byteLength(chunk, 'utf8');
      if (byteLength > maxBytes) {
        settled = true;
        const error = new Error(`请求体超过 ${(maxBytes / 1024 / 1024).toFixed(1)} MB 限制。`);
        error.statusCode = 413;
        reject(error);
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      if (!settled) resolve(body);
    });
    req.on('error', err => {
      if (!settled) reject(err);
    });
  });
}

// Write Queue to prevent Race Conditions
const writeQueues = new Map();
function enqueueWrite(username, dataPath, body, updatedAt = '') {
  if (!writeQueues.has(username)) {
    writeQueues.set(username, Promise.resolve());
  }
  const currentPromise = writeQueues.get(username).catch(() => undefined);
  const operation = currentPromise.then(async () => {
    if (updatedAt && existsSync(dataPath)) {
      try {
        const existing = JSON.parse(await readFile(dataPath, 'utf8'));
        if (Date.parse(existing.updatedAt || '') > Date.parse(updatedAt)) {
          return false;
        }
      } catch {
        // 损坏或旧格式文件交由本次有效 JSON 覆盖。
      }
    }
    await mkdir(path.dirname(dataPath), { recursive: true });
    await writeFile(dataPath, body, 'utf8');
    return true;
  });

  const nextPromise = operation.catch(err => {
    console.error(`Sequential write error for user ${username}:`, err);
  }).finally(() => {
    // Clean up write queue if no other operations were enqueued in the meantime
    if (writeQueues.get(username) === nextPromise) {
      writeQueues.delete(username);
    }
  });

  writeQueues.set(username, nextPromise);
  return operation;
}

// IP-based Rate Limiter
const rateLimits = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  let record = rateLimits.get(ip);
  if (!record) {
    record = { attempts: [], blockUntil: 0 };
    rateLimits.set(ip, record);
  }
  if (record.blockUntil > now) return false;
  
  record.attempts = record.attempts.filter(t => now - t < 60000); // 1 minute window
  if (record.attempts.length >= 15) {
    record.blockUntil = now + 60000; // Block for 1 min
    return false;
  }
  record.attempts.push(now);
  return true;
}

function sanitizeFilename(value) {
  return String(value || '未命名小说')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || '未命名小说';
}

function formatTimestamp(date) {
  const pad = value => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('');
}

function novelInputWriterPlugin() {
  let db = null;

  function initDatabase() {
    const dir = path.resolve(process.cwd(), 'data');
    mkdir(dir, { recursive: true });
    const filePath = path.join(dir, 'app.db');
    db = new Database(filePath, { fileMustExist: false });
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.exec(`CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    db.exec(`CREATE TABLE IF NOT EXISTS narrative_memories (
      username TEXT NOT NULL,
      novel_id TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 0,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (username, novel_id)
    )`);
    db.exec(`CREATE TABLE IF NOT EXISTS narrative_memory_facts (
      username TEXT NOT NULL,
      novel_id TEXT NOT NULL,
      fact_id TEXT NOT NULL,
      fact_key TEXT NOT NULL,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      predicate TEXT NOT NULL,
      object TEXT NOT NULL,
      source_ref TEXT NOT NULL,
      effective_order INTEGER NOT NULL DEFAULT 0,
      revision INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (username, novel_id, fact_id)
    )`);
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS narrative_memory_facts_fts USING fts5(
      username,
      novel_id,
      fact_id UNINDEXED,
      type,
      subject,
      predicate,
      object,
      source_ref
    )`);
  }

  function sqliteSaveState(payload) {
    if (!db) return;
    const value = JSON.stringify(payload);
    const stmt = db.prepare(`INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES (?, ?, datetime('now'))`);
    stmt.run('novel_state', value);
  }

  function sqliteLoadState() {
    if (!db) return null;
    const row = db.prepare('SELECT value FROM app_state WHERE key = ?').get('novel_state');
    return row ? JSON.parse(row.value) : null;
  }

  const registerMiddleware = server => {
    initDatabase();

    server.middlewares.use('/api/save-state', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
      if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ error: '只支持 POST' })); return; }

      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = encryptSensitiveFields(JSON.parse(body));
          sqliteSaveState(payload);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    });

    server.middlewares.use('/api/load-state', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
      if (req.method !== 'GET') { res.statusCode = 405; res.end(JSON.stringify({ error: '只支持 GET' })); return; }

      try {
        const storedState = sqliteLoadState();
        if (storedState) {
          let needsEncryption = false;
          if (storedState.apiKey && !storedState.apiKey.startsWith('enc:')) needsEncryption = true;
          if (storedState.apiKeys && Array.isArray(storedState.apiKeys)) {
            if (storedState.apiKeys.some(slot => slot && slot.apiKey && !slot.apiKey.startsWith('enc:'))) {
              needsEncryption = true;
            }
          }
          if (needsEncryption) {
            const encryptedState = encryptSensitiveFields(storedState);
            sqliteSaveState(encryptedState);
          }
          const state = decryptSensitiveFields(storedState);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ state }));
        } else {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ state: null }));
        }
      } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: error.message }));
      }
    });

    // ----------------------------------------------------
    // AUTHENTICATION MIDDLEWARES
    // ----------------------------------------------------
    server.middlewares.use('/api/auth/register', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Token');
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: '只支持 POST 请求。' }));
        return;
      }
      
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      if (!checkRateLimit(ip)) {
        res.statusCode = 429;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: '操作过于频繁，请在一分钟后再试。' }));
        return;
      }

      try {
        const body = await readRequestBody(req, MAX_AUTH_BODY_BYTES);
        const { username, password } = JSON.parse(body);
        if (!username || !password || username.trim().length < 2 || password.length < 6) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: '用户名（至少2位）或密码（至少6位）格式不正确。' }));
          return;
        }
        
        const cleanUsername = username.trim().toLowerCase();
        if (!/^[a-z0-9_-]+$/.test(cleanUsername)) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: '用户名只能包含字母、数字、下划线和连字符。' }));
          return;
        }

        const userDir = path.resolve(process.cwd(), 'data', 'users', cleanUsername);
        const authPath = path.join(userDir, 'auth.json');
        
        if (existsSync(authPath)) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: '用户名已存在。' }));
          return;
        }

        const salt = crypto.randomBytes(16).toString('hex');
        const hash = hashPassword(password, salt);

        await mkdir(userDir, { recursive: true });
        await writeFile(authPath, JSON.stringify({
          username: cleanUsername,
          hash,
          salt,
          iterations: PASSWORD_HASH_ITERATIONS,
          createdAt: new Date().toISOString()
        }, null, 2), 'utf8');

        res.statusCode = 201;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ success: true, message: '注册成功。' }));
      } catch (error) {
        res.statusCode = error.statusCode || 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: error.message || '注册失败。' }));
      }
    });

    server.middlewares.use('/api/auth/login', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Token');
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: '只支持 POST 请求。' }));
        return;
      }

      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      if (!checkRateLimit(ip)) {
        res.statusCode = 429;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: '操作过于频繁，请在一分钟后再试。' }));
        return;
      }

      try {
        const body = await readRequestBody(req, MAX_AUTH_BODY_BYTES);
        const { username, password } = JSON.parse(body);
        if (!username || !password) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: '用户名和密码不能为空。' }));
          return;
        }

        const cleanUsername = username.trim().toLowerCase();
        if (!/^[a-z0-9_-]+$/.test(cleanUsername)) {
          res.statusCode = 401;
          res.end(JSON.stringify({ error: '用户名或密码错误。' }));
          return;
        }
        const userDir = path.resolve(process.cwd(), 'data', 'users', cleanUsername);
        const authPath = path.join(userDir, 'auth.json');

        if (!existsSync(authPath)) {
          res.statusCode = 401;
          res.end(JSON.stringify({ error: '用户名或密码错误。' }));
          return;
        }

        const authData = JSON.parse(await readFile(authPath, 'utf8'));
        const iterations = Number(authData.iterations) || 1000;
        const calculatedHash = hashPassword(password, authData.salt, iterations);

        if (!safeHexEqual(calculatedHash, authData.hash)) {
          res.statusCode = 401;
          res.end(JSON.stringify({ error: '用户名或密码错误。' }));
          return;
        }
        if (iterations < PASSWORD_HASH_ITERATIONS) {
          authData.hash = hashPassword(password, authData.salt);
          authData.iterations = PASSWORD_HASH_ITERATIONS;
          authData.passwordHashUpgradedAt = new Date().toISOString();
          await writeFile(authPath, JSON.stringify(authData, null, 2), 'utf8');
        }

        const token = generateToken(cleanUsername);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ success: true, token, username: cleanUsername }));
      } catch (error) {
        res.statusCode = error.statusCode || 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: error.message || '登录失败。' }));
      }
    });

    server.middlewares.use('/api/user/save-data', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Token');
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: '只支持 POST 请求。' }));
        return;
      }
      try {
        const username = getUsernameFromReq(req);
        if (!username) {
          res.statusCode = 401;
          res.end(JSON.stringify({ error: '未授权或登录已过期，请重新登录。' }));
          return;
        }

        const body = await readRequestBody(req, MAX_USER_SAVE_BYTES);
        const payload = encryptSensitiveFields(JSON.parse(body));
        const sanitizedBody = JSON.stringify(payload);

        const userDir = path.resolve(process.cwd(), 'data', 'users', username);
        const dataPath = path.join(userDir, 'user-data.json');

        const written = await enqueueWrite(username, dataPath, sanitizedBody, payload.updatedAt);
        if (!written) {
          res.statusCode = 409;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: '服务器已存在更新版本，已拒绝陈旧写入。' }));
          return;
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ success: true, message: '数据已安全同步至本地服务器。' }));
      } catch (error) {
        res.statusCode = error.statusCode || 400;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: error.message || '数据保存失败。' }));
      }
    });

    server.middlewares.use('/api/user/load-data', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Token');
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }
      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: '只支持 GET 请求。' }));
        return;
      }
      try {
        const username = getUsernameFromReq(req);
        if (!username) {
          res.statusCode = 401;
          res.end(JSON.stringify({ error: '未授权，请登录。' }));
          return;
        }

        const userDir = path.resolve(process.cwd(), 'data', 'users', username);
        const dataPath = path.join(userDir, 'user-data.json');

        if (!existsSync(dataPath)) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ novels: [], empty: true }));
          return;
        }

        const content = await readFile(dataPath, 'utf8');
        const storedPayload = JSON.parse(content);
        
        let needsEncryption = false;
        if (storedPayload.apiKey && !storedPayload.apiKey.startsWith('enc:')) needsEncryption = true;
        if (storedPayload.apiKeys && Array.isArray(storedPayload.apiKeys)) {
          if (storedPayload.apiKeys.some(slot => slot && slot.apiKey && !slot.apiKey.startsWith('enc:'))) {
            needsEncryption = true;
          }
        }
        if (needsEncryption) {
          const encryptedPayload = encryptSensitiveFields(storedPayload);
          await enqueueWrite(username, dataPath, JSON.stringify(encryptedPayload), encryptedPayload.updatedAt);
        }
        
        const payload = decryptSensitiveFields(storedPayload);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(payload));
      } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: error.message || '加载用户数据失败。' }));
      }
    });

    // ----------------------------------------------------
    // EXISTING STATIC / SHARED ENDPOINTS
    // ----------------------------------------------------
    server.middlewares.use('/api/agent-skills', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Token');
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }
      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: '只支持 GET 请求。' }));
        return;
      }
      try {
        const allowed = new Set([
          'agent-orchestration',
          'narrative-compiler',
          'novel-outline',
          'character-system',
          'plot-compiler',
          'novel-final-audit',
          'json-repair',
          'heartbeat'
        ]);
        const name = decodeURIComponent(String(req.url || '').replace(/^\/+/, '').split('?')[0]);
        if (!allowed.has(name)) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: '技能不存在。' }));
          return;
        }
        const skillPath = path.resolve(process.cwd(), 'skills', name, 'SKILL.md');
        const content = await readFile(skillPath, 'utf8');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ name, content }));
      } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: error.message || '读取技能失败。' }));
      }
    });

    server.middlewares.use('/api/heartbeat', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Token');
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }
      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: '只支持 GET 请求。' }));
        return;
      }
      try {
        const filepath = path.resolve(process.cwd(), 'HEARTBEAT.md');
        let content = '';
        if (existsSync(filepath)) {
          content = await readFile(filepath, 'utf8');
        } else {
          content = `# HEARTBEAT\n\n- [x] 系统服务正常\n- [x] 本地数据库连接正常\n`;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ content }));
      } catch (error) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ content: `# HEARTBEAT\n\n- [x] 系统服务正常 (Fallback)\n- [x] 本地数据库连接正常\n` }));
      }
    });

    // ----------------------------------------------------
    // USER-ISOLATED DATA GENERATION ENDPOINTS
    // ----------------------------------------------------
    server.middlewares.use('/api/novel-inputs', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Token');
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: '只支持 POST 请求。' }));
        return;
      }

      const username = getUsernameFromReq(req);
      if (!username) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: '未授权或登录已过期。' }));
        return;
      }

      try {
        const body = await readRequestBody(req, MAX_NOVEL_INPUT_BYTES);
        const payload = JSON.parse(body);
        const novelName = String(payload.novelName || '').trim();
        const background = String(payload.background || '').trim();
        const synopsis = String(payload.synopsis || '').trim();
        const rawInput = String(payload.rawInput || '').trim();
        const audience = String(payload.audience || '').trim();
        if (!background) {
          throw new Error('背景设定不能为空。');
        }

        const now = new Date();
        const filename = `${formatTimestamp(now)}-${sanitizeFilename(novelName)}.md`;
        const outputDir = path.resolve(process.cwd(), 'data', 'users', username, 'novel-inputs');
        const outputPath = path.join(outputDir, filename);
        const markdown = `# ${novelName || '未命名小说'}：原始设定输入

- 保存时间：${now.toISOString()}
- 受众识别：${audience || '未识别'}

## 背景设定

${background}

## 作品简介

${synopsis || '未提供'}

## 用户原始输入

\`\`\`text
${rawInput}
\`\`\`
`;

        await mkdir(outputDir, { recursive: true });
        await writeFile(outputPath, markdown, 'utf8');
        res.statusCode = 201;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({
          filename,
          relativePath: `data/users/${username}/novel-inputs/${filename}`
        }));
      } catch (error) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: error.message || '保存失败。' }));
      }
    });

    server.middlewares.use('/api/narrative-memory', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Token');
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      const username = getUsernameFromReq(req);
      if (!username) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: '未授权或登录已过期。' }));
        return;
      }

      try {
        if (req.method === 'POST') {
          const body = await readRequestBody(req, MAX_NARRATIVE_MEMORY_BYTES);
          const payload = JSON.parse(body);
          const novelId = String(payload.novelId || '').trim();
          const memory = payload.memory;
          if (!novelId || !memory || !Array.isArray(memory.facts) || !Array.isArray(memory.observations)) {
            throw new Error('叙事记忆数据格式无效。');
          }
          if (String(memory.novelId || novelId) !== novelId) {
            throw new Error('叙事记忆 novelId 与请求不一致。');
          }
          const activeFacts = memory.facts.filter(fact => fact?.status === 'active');
          const updatedAt = String(memory.updatedAt || new Date().toISOString());
          const incomingRevision = Number(memory.revision) || 0;
          const transaction = db.transaction(() => {
            const existing = db.prepare(
              'SELECT revision, payload FROM narrative_memories WHERE username = ? AND novel_id = ?'
            ).get(username, novelId);
            if (existing && Number(existing.revision) > incomingRevision) {
              throw new Error(`拒绝旧版叙事记忆：服务端 revision=${existing.revision}，请求 revision=${incomingRevision}`);
            }
            if (existing && Number(existing.revision) === incomingRevision) {
              const existingMemory = JSON.parse(existing.payload);
              if (existingMemory.sourceFingerprint &&
                  memory.sourceFingerprint &&
                  existingMemory.sourceFingerprint !== memory.sourceFingerprint) {
                throw new Error(`叙事记忆并发冲突：相同 revision=${incomingRevision} 对应不同正式事实`);
              }
            }
            db.prepare(`INSERT INTO narrative_memories
              (username, novel_id, revision, payload, updated_at)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(username, novel_id) DO UPDATE SET
                revision = excluded.revision,
                payload = excluded.payload,
                updated_at = excluded.updated_at`)
              .run(username, novelId, incomingRevision, JSON.stringify(memory), updatedAt);
            db.prepare('DELETE FROM narrative_memory_facts WHERE username = ? AND novel_id = ?')
              .run(username, novelId);
            db.prepare('DELETE FROM narrative_memory_facts_fts WHERE username = ? AND novel_id = ?')
              .run(username, novelId);
            const insertFact = db.prepare(`INSERT INTO narrative_memory_facts
              (username, novel_id, fact_id, fact_key, type, subject, predicate, object, source_ref, effective_order, revision)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            const insertFts = db.prepare(`INSERT INTO narrative_memory_facts_fts
              (username, novel_id, fact_id, type, subject, predicate, object, source_ref)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
            activeFacts.forEach(fact => {
              insertFact.run(
                username, novelId, String(fact.id || ''), String(fact.key || ''),
                String(fact.type || ''), String(fact.subject || ''), String(fact.predicate || ''),
                String(fact.object || ''), String(fact.sourceRef || ''),
                Number(fact.effectiveOrder) || 0, incomingRevision
              );
              insertFts.run(
                username, novelId, String(fact.id || ''), String(fact.type || ''),
                String(fact.subject || ''), String(fact.predicate || ''),
                String(fact.object || ''), String(fact.sourceRef || '')
              );
            });
          });
          transaction();
          res.statusCode = 201;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            ok: true,
            revision: incomingRevision,
            activeFactCount: activeFacts.length
          }));
          return;
        }

        if (req.method === 'GET') {
          const requestUrl = new URL(req.url, 'http://localhost');
          const novelId = String(requestUrl.searchParams.get('novelId') || '').trim();
          const query = String(requestUrl.searchParams.get('q') || '').trim();
          if (!novelId) throw new Error('缺少 novelId。');
          if (!query) {
            const row = db.prepare(
              'SELECT revision, payload, updated_at FROM narrative_memories WHERE username = ? AND novel_id = ?'
            ).get(username, novelId);
            res.statusCode = row ? 200 : 404;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify(row ? {
              revision: row.revision,
              memory: JSON.parse(row.payload),
              updatedAt: row.updated_at
            } : { error: '未找到叙事记忆。' }));
            return;
          }
          const escapedTerms = query
            .split(/\s+/)
            .map(term => term.replace(/"/g, '""').trim())
            .filter(Boolean)
            .map(term => `"${term}"`)
            .join(' OR ');
          const rows = escapedTerms
            ? db.prepare(`SELECT fact_id, type, subject, predicate, object, source_ref,
                bm25(narrative_memory_facts_fts) AS rank
              FROM narrative_memory_facts_fts
              WHERE narrative_memory_facts_fts MATCH ?
                AND username = ? AND novel_id = ?
              ORDER BY rank LIMIT 30`).all(escapedTerms, username, novelId)
            : [];
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ results: rows }));
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ error: '只支持 GET、POST 请求。' }));
      } catch (error) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: error.message || '叙事记忆操作失败。' }));
      }
    });

    server.middlewares.use('/api/knowledge-graphs', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Token');
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: '只支持 POST 请求。' }));
        return;
      }

      const username = getUsernameFromReq(req);
      if (!username) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: '未授权或登录已过期。' }));
        return;
      }

      try {
        const body = await readRequestBody(req, MAX_KNOWLEDGE_GRAPH_BYTES);
        const payload = JSON.parse(body);
        const novelId = String(payload.novelId || '').trim();
        const novelName = String(payload.novelName || '').trim();
        const graph = payload.graph;
        if (!novelId || !graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
          throw new Error('知识图谱数据格式无效。');
        }

        const outputDir = path.resolve(process.cwd(), 'data', 'users', username, 'knowledge-graphs');
        const filename = `${sanitizeFilename(novelId)}.json`;
        await mkdir(outputDir, { recursive: true });
        const graphPayload = JSON.stringify({
          novelId,
          novelName,
          ...graph
        }, null, 2);
        await enqueueWrite(
          `graph:${username}:${filename}`,
          path.join(outputDir, filename),
          graphPayload,
          graph.updatedAt
        );

        let neo4j = { configured: false, synced: false };
        const neo4jUrl = process.env.NEO4J_HTTP_URL;
        const neo4jUsername = process.env.NEO4J_USERNAME;
        const neo4jPassword = process.env.NEO4J_PASSWORD;
        const neo4jDatabase = process.env.NEO4J_DATABASE || 'neo4j';
        if (neo4jUrl && neo4jUsername && neo4jPassword) {
          neo4j.configured = true;
          const auth = Buffer.from(`${neo4jUsername}:${neo4jPassword}`).toString('base64');
          const endpoint = `${neo4jUrl.replace(/\/$/, '')}/db/${encodeURIComponent(neo4jDatabase)}/tx/commit`;
          const neo4jResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${auth}`
            },
            // NOTE: The endpoint used is `/tx/commit`, which commits all listed statements in a single atomic transaction.
            // If any statement fails, the entire transaction is automatically rolled back by Neo4j.
            body: JSON.stringify({
              statements: [
                {
                  statement: 'MATCH (n:StoryNode {novelId: $novelId, user: $username}) DETACH DELETE n',
                  parameters: { novelId, username }
                },
                {
                  statement: `UNWIND $nodes AS node
MERGE (n:StoryNode {novelId: $novelId, nodeId: node.id, user: $username})
SET n += node`,
                  parameters: {
                    novelId,
                    username,
                    nodes: graph.nodes.map(node => ({ ...node, novelId, novelName, user: username }))
                  }
                },
                {
                  statement: `UNWIND $edges AS edge
MATCH (source:StoryNode {novelId: $novelId, nodeId: edge.source, user: $username})
MATCH (target:StoryNode {novelId: $novelId, nodeId: edge.target, user: $username})
CREATE (source)-[:STORY_RELATION {
  relationType: edge.type,
  description: coalesce(edge.text, '')
}]->(target)`,
                  parameters: { novelId, username, edges: graph.edges }
                }
              ]
            })
          });
          const neo4jData = await neo4jResponse.json().catch(() => ({}));
          if (!neo4jResponse.ok || neo4jData.errors?.length) {
            throw new Error(neo4jData.errors?.[0]?.message || `Neo4j HTTP ${neo4jResponse.status}`);
          }
          neo4j.synced = true;
        }

        res.statusCode = 201;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({
          relativePath: `data/users/${username}/knowledge-graphs/${filename}`,
          neo4j
        }));
      } catch (error) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: error.message || '知识图谱保存失败。' }));
      }
    });

    server.middlewares.use('/api/reference-novels', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Token');
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      const username = getUsernameFromReq(req);
      if (!username) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: '未授权或登录已过期。' }));
        return;
      }

      if (req.method === 'GET') {
        try {
          const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          const fileName = urlObj.searchParams.get('fileName');
          if (!fileName) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: '参数 fileName 不能为空。' }));
            return;
          }

          const nameWithoutExt = fileName.replace(/\.txt$/i, '');
          const cleanFileName = sanitizeFilename(nameWithoutExt) + '.json';
          const fileDir = path.resolve(process.cwd(), 'data', 'users', username, 'reference-novels');
          const filePath = path.join(fileDir, cleanFileName);

          if (!existsSync(filePath)) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ exists: false }));
            return;
          }

          const content = await readFile(filePath, 'utf8');
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ exists: true, data: JSON.parse(content) }));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: error.message || '查询失败。' }));
        }
        return;
      }

      if (req.method === 'POST') {
        try {
          const body = await readRequestBody(req, MAX_REFERENCE_NOVEL_BYTES);
          const payload = JSON.parse(body);
          const fileName = String(payload.fileName || '').trim();
          const analysis = payload.analysis;

          if (!fileName || !analysis) {
            throw new Error('参数 fileName 和 analysis 不能为空。');
          }

          const nameWithoutExt = fileName.replace(/\.txt$/i, '');
          const cleanFileName = sanitizeFilename(nameWithoutExt) + '.json';
          const fileDir = path.resolve(process.cwd(), 'data', 'users', username, 'reference-novels');
          const filePath = path.join(fileDir, cleanFileName);

          await mkdir(fileDir, { recursive: true });
          await writeFile(filePath, JSON.stringify(analysis, null, 2), 'utf8');

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            success: true,
            relativePath: `data/users/${username}/reference-novels/${cleanFileName}`
          }));
        } catch (error) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: error.message || '保存失败。' }));
        }
        return;
      }

      res.statusCode = 405;
      res.end();
    });
  };


  return {
    name: 'novel-input-writer',
    configureServer: registerMiddleware,
    configurePreviewServer: registerMiddleware
  };
}

export default defineConfig({
  plugins: [novelInputWriterPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    fs: { strict: false }
  }
});

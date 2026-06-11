import { defineConfig } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const secretPath = path.resolve(process.cwd(), 'data', 'session-secret.key');
let SESSION_SECRET = '';
try {
  if (existsSync(secretPath)) {
    SESSION_SECRET = readFileSync(secretPath, 'utf8');
  } else {
    SESSION_SECRET = crypto.randomBytes(32).toString('hex');
    const dir = path.dirname(secretPath);
    if (!existsSync(dir)) {
      const { mkdirSync } = await import('node:fs');
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(secretPath, SESSION_SECRET, 'utf8');
  }
} catch (e) {
  SESSION_SECRET = crypto.randomBytes(32).toString('hex');
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
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
  
  if (signature === expectedSignature) {
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

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', err => reject(err));
  });
}

// Write Queue to prevent Race Conditions
const writeQueues = new Map();
function enqueueWrite(username, dataPath, body) {
  if (!writeQueues.has(username)) {
    writeQueues.set(username, Promise.resolve());
  }
  const currentPromise = writeQueues.get(username);
  const nextPromise = currentPromise.then(async () => {
    await mkdir(path.dirname(dataPath), { recursive: true });
    await writeFile(dataPath, body, 'utf8');
  }).catch(err => {
    console.error(`Sequential write error for user ${username}:`, err);
  });
  writeQueues.set(username, nextPromise);
  return nextPromise;
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

const MAX_BODY_BYTES = 2 * 1024 * 1024;

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
  const registerMiddleware = server => {
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
        const body = await readRequestBody(req);
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
          createdAt: new Date().toISOString()
        }, null, 2), 'utf8');

        res.statusCode = 201;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ success: true, message: '注册成功。' }));
      } catch (error) {
        res.statusCode = 500;
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
        const body = await readRequestBody(req);
        const { username, password } = JSON.parse(body);
        if (!username || !password) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: '用户名和密码不能为空。' }));
          return;
        }

        const cleanUsername = username.trim().toLowerCase();
        const userDir = path.resolve(process.cwd(), 'data', 'users', cleanUsername);
        const authPath = path.join(userDir, 'auth.json');

        if (!existsSync(authPath)) {
          res.statusCode = 401;
          res.end(JSON.stringify({ error: '用户名或密码错误。' }));
          return;
        }

        const authData = JSON.parse(await readFile(authPath, 'utf8'));
        const calculatedHash = hashPassword(password, authData.salt);

        if (calculatedHash !== authData.hash) {
          res.statusCode = 401;
          res.end(JSON.stringify({ error: '用户名或密码错误。' }));
          return;
        }

        const token = generateToken(cleanUsername);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ success: true, token, username: cleanUsername }));
      } catch (error) {
        res.statusCode = 500;
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

        const body = await readRequestBody(req);
        JSON.parse(body); // Validate JSON format

        const userDir = path.resolve(process.cwd(), 'data', 'users', username);
        const dataPath = path.join(userDir, 'user-data.json');

        await enqueueWrite(username, dataPath, body);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ success: true, message: '数据已安全同步至本地服务器。' }));
      } catch (error) {
        res.statusCode = 400;
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
          // 自动复制全局知识图谱作为初始化（双保险机制，防止多账号隔离后关系图谱丢失）
          const globalGraphDir = path.resolve(process.cwd(), 'data', 'knowledge-graphs');
          const globalGraphPath = path.join(globalGraphDir, 'novel-default.json');
          const userGraphDir = path.join(userDir, 'knowledge-graphs');
          const userGraphPath = path.join(userGraphDir, 'novel-default.json');
          
          if (existsSync(globalGraphPath) && !existsSync(userGraphPath)) {
            try {
              const fsPromises = await import('node:fs/promises');
              await fsPromises.mkdir(userGraphDir, { recursive: true });
              await fsPromises.copyFile(globalGraphPath, userGraphPath);
              console.log(`[API] Successfully copied global graph to user ${username}`);
            } catch (copyErr) {
              console.error('[API] Failed to copy global graph:', copyErr);
            }
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ novels: [], empty: true }));
          return;
        }

        const content = await readFile(dataPath, 'utf8');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(content);
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
        const allowed = new Set(['novel-outline', 'character-system', 'json-repair', 'heartbeat']);
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
        const content = await readFile(path.resolve(process.cwd(), 'HEARTBEAT.md'), 'utf8');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ content }));
      } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: error.message || '读取心跳清单失败。' }));
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
        const body = await readRequestBody(req);
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
        const body = await readRequestBody(req);
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
        await writeFile(path.join(outputDir, filename), JSON.stringify({
          novelId,
          novelName,
          ...graph
        }, null, 2), 'utf8');

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
          const body = await readRequestBody(req);
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
    allowedHosts: true
  }
});

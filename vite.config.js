import { defineConfig } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

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
    server.middlewares.use('/api/agent-skills', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

    server.middlewares.use('/api/novel-inputs', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

      let body = '';
      let bodyBytes = 0;
      req.setEncoding('utf8');
      req.on('data', chunk => {
        bodyBytes += Buffer.byteLength(chunk);
        if (bodyBytes > MAX_BODY_BYTES) {
          res.statusCode = 413;
          res.end(JSON.stringify({ error: '输入内容超过 2MB 限制。' }));
          req.destroy();
          return;
        }
        body += chunk;
      });
      req.on('end', async () => {
        if (res.writableEnded) return;
        try {
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
          const outputDir = path.resolve(process.cwd(), 'data', 'novel-inputs');
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
            relativePath: `data/novel-inputs/${filename}`
          }));
        } catch (error) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: error.message || '保存失败。' }));
        }
      });
    });

    server.middlewares.use('/api/knowledge-graphs', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

      let body = '';
      req.setEncoding('utf8');
      req.on('data', chunk => {
        body += chunk;
      });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const novelId = String(payload.novelId || '').trim();
          const novelName = String(payload.novelName || '').trim();
          const graph = payload.graph;
          if (!novelId || !graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
            throw new Error('知识图谱数据格式无效。');
          }

          const outputDir = path.resolve(process.cwd(), 'data', 'knowledge-graphs');
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
                    statement: 'MATCH (n:StoryNode {novelId: $novelId}) DETACH DELETE n',
                    parameters: { novelId }
                  },
                  {
                    statement: `UNWIND $nodes AS node
MERGE (n:StoryNode {novelId: $novelId, nodeId: node.id})
SET n += node`,
                    parameters: {
                      novelId,
                      nodes: graph.nodes.map(node => ({ ...node, novelId, novelName }))
                    }
                  },
                  {
                    statement: `UNWIND $edges AS edge
MATCH (source:StoryNode {novelId: $novelId, nodeId: edge.source})
MATCH (target:StoryNode {novelId: $novelId, nodeId: edge.target})
CREATE (source)-[:STORY_RELATION {
  relationType: edge.type,
  description: coalesce(edge.text, '')
}]->(target)`,
                    parameters: { novelId, edges: graph.edges }
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
            relativePath: `data/knowledge-graphs/${filename}`,
            neo4j
          }));
        } catch (error) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: error.message || '知识图谱保存失败。' }));
        }
      });
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
    allowedHosts: true
  }
});

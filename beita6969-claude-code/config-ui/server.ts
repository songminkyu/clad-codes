#!/usr/bin/env bun
/**
 * Claude Code Config UI Server
 * A lightweight web dashboard for managing all Claude Code settings.
 * Run: bun run config
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
import { join, basename, dirname } from 'path'
import { homedir } from 'os'

const PORT = Number(process.env.CONFIG_PORT) || 3456
const HOME = homedir()
const CLAUDE_DIR = join(HOME, '.claude')
const CWD = process.cwd()

// --- Path Helpers ---

function getUserSettingsPath() {
  return join(CLAUDE_DIR, 'settings.json')
}

function getProjectSettingsPath() {
  return join(CWD, '.claude', 'settings.json')
}

function getLocalSettingsPath() {
  return join(CWD, '.claude', 'settings.local.json')
}

function getMcpConfigPath() {
  return join(CWD, '.mcp.json')
}

function getAgentsDir() {
  return join(CWD, '.claude', 'agents')
}

function getSkillsDir() {
  return join(CWD, '.claude', 'skills')
}

function getMemoryDir() {
  // Find project memory directory
  const sanitized = CWD.replace(/\//g, '-').replace(/^-/, '')
  return join(CLAUDE_DIR, 'projects', sanitized, 'memory')
}

function getBundlePolyfillPath() {
  return join(CWD, 'node_modules', 'bundle', 'index.js')
}

function getClaudeMdPath() {
  if (existsSync(join(CWD, '.claude', 'CLAUDE.md'))) return join(CWD, '.claude', 'CLAUDE.md')
  if (existsSync(join(CWD, 'CLAUDE.md'))) return join(CWD, 'CLAUDE.md')
  return join(CWD, 'CLAUDE.md') // default create location
}

function getRulesDir() {
  return join(CWD, '.claude', 'rules')
}

// --- File I/O Helpers ---

function readJsonSafe(path: string): any {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return {}
  }
}

function writeJsonSafe(path: string, data: any) {
  const dir = dirname(path)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
}

function readTextSafe(path: string): string {
  try {
    return readFileSync(path, 'utf-8')
  } catch {
    return ''
  }
}

function writeTextSafe(path: string, content: string) {
  const dir = dirname(path)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(path, content)
}

function listMdFiles(dir: string): Array<{ name: string; path: string; content: string }> {
  if (!existsSync(dir)) return []
  const results: Array<{ name: string; path: string; content: string }> = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const p = join(dir, entry.name)
        results.push({ name: entry.name, path: p, content: readTextSafe(p) })
      } else if (entry.isDirectory()) {
        // Check for SKILL.md or agent .md inside subdirectory
        const skillMd = join(dir, entry.name, 'SKILL.md')
        const agentMd = join(dir, entry.name + '.md')
        if (existsSync(skillMd)) {
          results.push({ name: entry.name, path: skillMd, content: readTextSafe(skillMd) })
        } else {
          // List .md files inside subdirectory
          for (const sub of readdirSync(join(dir, entry.name))) {
            if (sub.endsWith('.md')) {
              const p = join(dir, entry.name, sub)
              results.push({ name: `${entry.name}/${sub}`, path: p, content: readTextSafe(p) })
            }
          }
        }
      }
    }
  } catch {}
  return results
}

// --- Feature Flags ---

function parseFeatureFlags(): Record<string, boolean> {
  const content = readTextSafe(getBundlePolyfillPath())
  const flags: Record<string, boolean> = {}
  const allFlags = [
    'KAIROS', 'PROACTIVE', 'BRIDGE_MODE', 'VOICE_MODE', 'COORDINATOR_MODE',
    'TRANSCRIPT_CLASSIFIER', 'BASH_CLASSIFIER', 'BUDDY', 'WEB_BROWSER_TOOL',
    'CHICAGO_MCP', 'AGENT_TRIGGERS', 'ULTRAPLAN', 'MONITOR_TOOL', 'TEAMMEM',
    'EXTRACT_MEMORIES', 'MCP_SKILLS', 'REVIEW_ARTIFACT', 'CONNECTOR_TEXT',
    'DOWNLOAD_USER_SETTINGS', 'MESSAGE_ACTIONS', 'KAIROS_CHANNELS', 'KAIROS_GITHUB_WEBHOOKS',
  ]
  for (const flag of allFlags) {
    // Check if the flag line is uncommented (enabled)
    const enabledRegex = new RegExp(`^\\s*'${flag}'`, 'm')
    const commentedRegex = new RegExp(`^\\s*//\\s*'${flag}'`, 'm')
    flags[flag] = enabledRegex.test(content) && !commentedRegex.test(content)
  }
  return flags
}

function writeFeatureFlags(flags: Record<string, boolean>) {
  const descriptions: Record<string, string> = {
    KAIROS: 'Assistant / daily-log mode',
    PROACTIVE: 'Proactive autonomous mode',
    BRIDGE_MODE: 'VS Code / JetBrains IDE bridge',
    VOICE_MODE: 'Voice input via native audio capture',
    COORDINATOR_MODE: 'Multi-agent swarm coordinator',
    TRANSCRIPT_CLASSIFIER: 'Auto-mode permission classifier',
    BASH_CLASSIFIER: 'Bash command safety classifier',
    BUDDY: 'Companion sprite animation',
    WEB_BROWSER_TOOL: 'In-process web browser tool',
    CHICAGO_MCP: 'Computer Use (screen control)',
    AGENT_TRIGGERS: 'Scheduled cron agents',
    ULTRAPLAN: 'Ultra-detailed planning mode',
    MONITOR_TOOL: 'MCP server monitoring',
    TEAMMEM: 'Shared team memory',
    EXTRACT_MEMORIES: 'Background memory extraction agent',
    MCP_SKILLS: 'Skills from MCP servers',
    REVIEW_ARTIFACT: 'Review artifact tool',
    CONNECTOR_TEXT: 'Connector text blocks',
    DOWNLOAD_USER_SETTINGS: 'Remote settings sync',
    MESSAGE_ACTIONS: 'Message action buttons',
    KAIROS_CHANNELS: 'Channel notifications',
    KAIROS_GITHUB_WEBHOOKS: 'GitHub webhook integration',
  }

  const lines = Object.entries(flags).map(([flag, enabled]) => {
    const desc = descriptions[flag] || flag
    return enabled
      ? `  '${flag}', // ${desc}`
      : `  // '${flag}', // ${desc}`
  })

  const content = `// Runtime polyfill for bun:bundle feature() function
// Managed by Claude Code Config UI

const ENABLED_FEATURES = new Set([
${lines.join('\n')}
])

module.exports.feature = function feature(name) {
  return ENABLED_FEATURES.has(name)
}
`
  writeTextSafe(getBundlePolyfillPath(), content)
}

// --- API Router ---

async function handleAPI(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const path = url.pathname

  // --- Settings ---
  if (path === '/api/settings' && req.method === 'GET') {
    return Response.json({
      user: readJsonSafe(getUserSettingsPath()),
      project: readJsonSafe(getProjectSettingsPath()),
      local: readJsonSafe(getLocalSettingsPath()),
    })
  }

  if (path === '/api/settings' && req.method === 'POST') {
    const body = await req.json() as { scope: string; settings: any }
    const pathMap: Record<string, string> = {
      user: getUserSettingsPath(),
      project: getProjectSettingsPath(),
      local: getLocalSettingsPath(),
    }
    const target = pathMap[body.scope]
    if (!target) return Response.json({ error: 'Invalid scope' }, { status: 400 })
    writeJsonSafe(target, body.settings)
    return Response.json({ ok: true })
  }

  // --- Feature Flags ---
  if (path === '/api/features' && req.method === 'GET') {
    return Response.json(parseFeatureFlags())
  }

  if (path === '/api/features' && req.method === 'POST') {
    const flags = await req.json() as Record<string, boolean>
    writeFeatureFlags(flags)
    return Response.json({ ok: true })
  }

  // --- MCP Servers ---
  if (path === '/api/mcp' && req.method === 'GET') {
    return Response.json(readJsonSafe(getMcpConfigPath()))
  }

  if (path === '/api/mcp' && req.method === 'POST') {
    const config = await req.json()
    writeJsonSafe(getMcpConfigPath(), config)
    return Response.json({ ok: true })
  }

  // --- Agents ---
  if (path === '/api/agents' && req.method === 'GET') {
    return Response.json(listMdFiles(getAgentsDir()))
  }

  if (path === '/api/agents' && req.method === 'POST') {
    const body = await req.json() as { name: string; content: string }
    const agentPath = join(getAgentsDir(), body.name.endsWith('.md') ? body.name : `${body.name}.md`)
    writeTextSafe(agentPath, body.content)
    return Response.json({ ok: true })
  }

  if (path === '/api/agents' && req.method === 'DELETE') {
    const body = await req.json() as { name: string }
    const agentPath = join(getAgentsDir(), body.name.endsWith('.md') ? body.name : `${body.name}.md`)
    if (existsSync(agentPath)) unlinkSync(agentPath)
    return Response.json({ ok: true })
  }

  // --- Skills ---
  if (path === '/api/skills' && req.method === 'GET') {
    return Response.json(listMdFiles(getSkillsDir()))
  }

  if (path === '/api/skills' && req.method === 'POST') {
    const body = await req.json() as { name: string; content: string }
    const skillDir = join(getSkillsDir(), body.name)
    const skillPath = join(skillDir, 'SKILL.md')
    writeTextSafe(skillPath, body.content)
    return Response.json({ ok: true })
  }

  if (path === '/api/skills' && req.method === 'DELETE') {
    const body = await req.json() as { name: string }
    const skillDir = join(getSkillsDir(), body.name)
    const skillPath = join(skillDir, 'SKILL.md')
    if (existsSync(skillPath)) unlinkSync(skillPath)
    return Response.json({ ok: true })
  }

  // --- Memory ---
  if (path === '/api/memory' && req.method === 'GET') {
    return Response.json(listMdFiles(getMemoryDir()))
  }

  // --- CLAUDE.md ---
  if (path === '/api/claudemd' && req.method === 'GET') {
    const claudeMd = readTextSafe(getClaudeMdPath())
    const rules = listMdFiles(getRulesDir())
    return Response.json({ claudeMd, path: getClaudeMdPath(), rules })
  }

  if (path === '/api/claudemd' && req.method === 'POST') {
    const body = await req.json() as { content: string }
    writeTextSafe(getClaudeMdPath(), body.content)
    return Response.json({ ok: true })
  }

  // --- Info ---
  if (path === '/api/info' && req.method === 'GET') {
    return Response.json({
      cwd: CWD,
      home: HOME,
      claudeDir: CLAUDE_DIR,
      agentsDir: getAgentsDir(),
      skillsDir: getSkillsDir(),
      memoryDir: getMemoryDir(),
      mcpConfigPath: getMcpConfigPath(),
      bundlePath: getBundlePolyfillPath(),
    })
  }

  return Response.json({ error: 'Not found' }, { status: 404 })
}

// --- HTML Serving ---

const HTML_PATH = join(import.meta.dir, 'index.html')

// --- Server ---

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)

    if (url.pathname.startsWith('/api/')) {
      return handleAPI(req)
    }

    // Serve index.html for all other routes
    if (existsSync(HTML_PATH)) {
      return new Response(readFileSync(HTML_PATH, 'utf-8'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    return new Response('Config UI not found', { status: 404 })
  },
})

console.log(`
  Claude Code Config UI
  http://localhost:${server.port}

  Working directory: ${CWD}
  Settings: ${getUserSettingsPath()}
`)

// Try to open browser
try {
  const { exec } = require('child_process')
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
  exec(`${cmd} http://localhost:${server.port}`)
} catch {}

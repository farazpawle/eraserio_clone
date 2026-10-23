// PreToolUse hook: refuse edits to secret env files and to migrations already in git.
import { execFileSync } from 'node:child_process'
import { basename } from 'node:path'

const input = JSON.parse(await new Promise((res) => {
  let s = ''
  process.stdin.on('data', (c) => (s += c)).on('end', () => res(s || '{}'))
}))
const file = (input.tool_input?.file_path ?? '').replaceAll(String.fromCharCode(92), '/')
const name = basename(file)

const deny = (reason) => {
  console.log(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }))
  process.exit(0)
}

if (/^\.env(\..+)?$/.test(name) && name !== '.env.example') {
  deny(`${name} holds secrets and is not edited by Claude. Ask the user to change it, or edit .env.example.`)
}

if (/\/supabase\/migrations\/[^/]+\.sql$/.test(file)) {
  let tracked = true
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', file], { stdio: 'ignore', cwd: input.cwd })
  } catch {
    tracked = false // new or uncommitted migration: still safe to iterate on
  }
  if (tracked) {
    deny(`${name} is already committed (assume applied). Schema changes need a new file: npx supabase migration new <name>.`)
  }
}

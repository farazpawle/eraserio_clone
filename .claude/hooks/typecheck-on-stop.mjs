// Stop hook: type-check once when Claude finishes; send errors back so they get fixed.
import { spawnSync } from 'node:child_process'

const input = JSON.parse(await new Promise((res) => {
  let s = ''
  process.stdin.on('data', (c) => (s += c)).on('end', () => res(s || '{}'))
}))
if (input.stop_hook_active) process.exit(0) // already retried once, don't loop

// Skip when no TypeScript file changed (read-only chats stay instant).
const changed = spawnSync('git', ['status', '--porcelain'], { cwd: input.cwd, encoding: 'utf8', shell: false }).stdout ?? ''
if (!/\.(ts|tsx)$/m.test(changed)) process.exit(0)

const r = spawnSync('npx tsc --noEmit',{ cwd: input.cwd, encoding: 'utf8', shell: true })
if (r.status !== 0) {
  const out = `${r.stdout}${r.stderr}`.trim().split('\n').slice(0, 30).join('\n')
  console.log(JSON.stringify({ decision: 'block', reason: `Type check failed (npx tsc --noEmit). Fix these:\n${out}` }))
}

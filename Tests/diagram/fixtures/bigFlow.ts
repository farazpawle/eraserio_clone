// n nodes spread over 10 groups, with a chain edge per node plus a skip edge
// on every even node (about 1.5 edges per node).
export function bigFlow(n: number): string {
  const lines: string[] = []
  for (let g = 0; g < 10; g++) {
    lines.push(`G${g} {`)
    for (let i = g; i < n; i += 10) lines.push(`N${i}`)
    lines.push('}')
  }
  for (let i = 1; i < n; i++) {
    lines.push(`N${i - 1} > N${i}`)
    const skip = (i * 7) % n
    if (i % 2 === 0 && skip !== i) lines.push(`N${i} > N${skip}`)
  }
  return lines.join('\n')
}

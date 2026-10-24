import ELK, { type ElkNode } from 'elkjs/lib/elk-api'

export type ElkLike = { layout(graph: ElkNode): Promise<ElkNode> }

let shared: ElkLike | undefined

// Browser: ELK runs in a web worker so layout never blocks typing.
// Server and Jest: the bundled build, loaded only when first needed.
export function getElk(): ElkLike {
  if (shared) return shared
  if (typeof Worker !== 'undefined') {
    shared = new ELK({
      workerFactory: () => new Worker(new URL('elkjs/lib/elk-worker.min.js', import.meta.url)),
    })
  } else {
    const bundled = import('elkjs/lib/elk.bundled.js').then((m) => new m.default())
    shared = { layout: (graph) => bundled.then((elk) => elk.layout(graph)) }
  }
  return shared
}

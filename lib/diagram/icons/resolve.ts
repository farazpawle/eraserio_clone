import type { DiagramError, FlowModel } from '../types'
import type { Registry } from './registry'

// Rewrites every `icon` to its canonical id, or to the generic icon when the name is unknown (one
// error on that line). Without a registry (manifest not loaded) the model is returned as it is:
// drawing never waits on, or fails because of, icons.
export function resolveIcons(model: FlowModel, registry: Registry | null): { model: FlowModel; errors: DiagramError[] } {
  if (!registry) return { model, errors: [] }
  const errors: DiagramError[] = []
  const resolve = <T extends { icon?: string; line: number }>(item: T): T => {
    if (item.icon === undefined) return item
    const { id, known } = registry.getIcon(item.icon)
    if (!known) errors.push({ line: item.line, message: `Unknown icon "${item.icon}". Type part of a name to search.` })
    return { ...item, icon: id }
  }
  const resolved = { ...model, nodes: model.nodes.map(resolve), groups: model.groups.map(resolve) }
  return { model: resolved, errors: errors.sort((a, b) => a.line - b.line) }
}

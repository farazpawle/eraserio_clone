import { syntaxOf, type DiagramError, type DiagramType } from '../types'
import { parseFlow } from './flow'
import { parseSequence } from './sequence'

// What the editor needs from any diagram's code: its line errors and the names to suggest while typing.
export function parseDiagram(type: DiagramType, code: string): { errors: DiagramError[]; names: string[] } {
  if (syntaxOf(type) === 'sequence') {
    const { model, errors } = parseSequence(code)
    return { errors, names: model.participants.map((p) => p.id) }
  }
  const { model, errors } = parseFlow(code)
  return { errors, names: model.nodes.map((n) => n.id) }
}

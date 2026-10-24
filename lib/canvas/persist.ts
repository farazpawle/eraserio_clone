import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { BinaryFiles } from '@excalidraw/excalidraw/types'
import type { Json } from '@/types/database'
import type { CanvasFileStore } from '@/lib/data/canvasFiles'

export type Scene = { elements: readonly ExcalidrawElement[]; files: BinaryFiles }

// Images still on the canvas. Deleted elements stay in the list for undo, but their images are not needed.
export function referencedFileIds(elements: readonly ExcalidrawElement[]): string[] {
  const ids = new Set<string>()
  for (const el of elements) {
    if (el.type === 'image' && !el.isDeleted && el.fileId) ids.add(el.fileId)
  }
  return Array.from(ids)
}

// Images first, elements second: if an upload fails the element list is left alone,
// so a saved canvas never points at an image that is not stored.
export async function persistCanvas(
  deps: { store: CanvasFileStore; uploaded: Set<string>; saveElements: (content: Json) => Promise<void> },
  scene: Scene
): Promise<void> {
  const fresh = referencedFileIds(scene.elements).filter((id) => !deps.uploaded.has(id) && scene.files[id])
  await Promise.all(fresh.map((id) => deps.store.save(scene.files[id])))
  fresh.forEach((id) => deps.uploaded.add(id))
  // Deleted elements stay in memory for undo but are not saved: each diagram redraw leaves a full set behind.
  await deps.saveElements(scene.elements.filter((el) => !el.isDeleted) as unknown as Json)
}

export async function loadSceneFiles(
  deps: { store: CanvasFileStore; uploaded: Set<string> },
  elements: readonly ExcalidrawElement[]
): Promise<BinaryFiles> {
  const ids = referencedFileIds(elements)
  if (ids.length === 0) return {}
  const loaded = await deps.store.load(ids)
  const files: BinaryFiles = {}
  for (const file of loaded) {
    files[file.id] = file
    deps.uploaded.add(file.id)
  }
  return files
}

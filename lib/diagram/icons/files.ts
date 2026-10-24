import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { BinaryFileData, BinaryFiles } from '@excalidraw/excalidraw/types'
import { iconUrl } from './registry'

// Icon images live on the canvas as ordinary Excalidraw images whose file id is `icon:<icon id>`.
// Their SVGs are served from /icons, so they are never uploaded to storage.
const PREFIX = 'icon:'
export const iconFileId = (id: string): string => `${PREFIX}${id}`
export const isIconFileId = (fileId: string): boolean => fileId.startsWith(PREFIX)

export function iconIdsOf(elements: readonly ExcalidrawElement[]): string[] {
  const ids = new Set<string>()
  for (const el of elements) {
    if (el.type === 'image' && !el.isDeleted && el.fileId && isIconFileId(el.fileId)) ids.add(el.fileId.slice(PREFIX.length))
  }
  return Array.from(ids)
}

// Icons on the canvas that Excalidraw has no file for and nobody has asked for yet.
export function missingIconIds(elements: readonly ExcalidrawElement[], files: BinaryFiles, requested: ReadonlySet<string>): string[] {
  return iconIdsOf(elements).filter((id) => !(iconFileId(id) in files) && !requested.has(id))
}

// An icon that cannot be fetched is left out; the others still load.
export async function loadIconFiles(ids: string[], fetcher: typeof fetch = (...a) => fetch(...a)): Promise<BinaryFileData[]> {
  const loaded = await Promise.all(
    ids.map(async (id): Promise<BinaryFileData | null> => {
      try {
        const res = await fetcher(iconUrl(id))
        if (!res.ok) return null
        const svg = await res.text()
        return {
          id: iconFileId(id) as BinaryFileData['id'],
          mimeType: 'image/svg+xml',
          dataURL: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}` as BinaryFileData['dataURL'],
          created: Date.now(),
        }
      } catch {
        return null
      }
    }),
  )
  return loaded.filter((f): f is BinaryFileData => f !== null)
}

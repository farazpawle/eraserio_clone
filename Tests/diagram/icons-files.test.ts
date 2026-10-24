/** @jest-environment node */
import type { BinaryFiles } from '@excalidraw/excalidraw/types'
import { iconFileId, iconIdsOf, isIconFileId, loadIconFiles, missingIconIds } from '@/lib/diagram/icons/files'

const image = (fileId: string | null, isDeleted = false) => ({ type: 'image', fileId, isDeleted })
const els = (...items: unknown[]) => items as never

describe('icon file ids', () => {
  it('round-trips', () => {
    expect(iconFileId('aws-ec2')).toBe('icon:aws-ec2')
    expect(isIconFileId('icon:aws-ec2')).toBe(true)
    expect(isIconFileId('abc123')).toBe(false)
  })
})

describe('iconIdsOf', () => {
  it('lists unique icon ids of live images only', () => {
    const found = iconIdsOf(
      els(image('icon:aws-ec2'), image('icon:aws-ec2'), image('icon:gone', true), image('plain'), image(null), { type: 'rectangle' }),
    )
    expect(found).toEqual(['aws-ec2'])
  })
})

describe('missingIconIds', () => {
  const scene = els(image('icon:a'), image('icon:b'), image('icon:c'))
  it('drops ids already in the files or already requested', () => {
    const files = { 'icon:a': {} } as unknown as BinaryFiles
    expect(missingIconIds(scene, files, new Set(['b']))).toEqual(['c'])
  })
  it('is empty for a canvas without icons', () => {
    expect(missingIconIds(els(image('plain')), {}, new Set())).toEqual([])
  })
})

describe('loadIconFiles', () => {
  const svg = '<svg viewBox="0 0 1 1"><text>é</text></svg>'
  const fake = jest.fn(async (url: string) =>
    url.endsWith('aws-ec2.svg') ? { ok: true, text: async () => svg } : { ok: false, status: 404 },
  )

  it('turns each icon into an Excalidraw file, leaving out the ones that fail', async () => {
    const out = await loadIconFiles(['aws-ec2', 'aws-gone'], fake as unknown as typeof fetch)
    expect(fake).toHaveBeenCalledWith('/icons/aws/aws-ec2.svg')
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ id: 'icon:aws-ec2', mimeType: 'image/svg+xml' })
    expect(out[0].dataURL.startsWith('data:image/svg+xml;base64,')).toBe(true)
    expect(Buffer.from(out[0].dataURL.split(',')[1], 'base64').toString('utf8')).toBe(svg)
  })

  it('makes no request for no ids', async () => {
    const none = jest.fn()
    expect(await loadIconFiles([], none as unknown as typeof fetch)).toEqual([])
    expect(none).not.toHaveBeenCalled()
  })
})

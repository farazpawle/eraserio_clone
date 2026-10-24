import type { BinaryFileData, BinaryFiles } from '@excalidraw/excalidraw/types'
import type { CanvasFileStore } from '@/lib/data/canvasFiles'
import { loadSceneFiles, persistCanvas, referencedFileIds, type Scene } from '@/lib/canvas/persist'

const image = (id: string, fileId: string | null, isDeleted = false) => ({ id, type: 'image', fileId, isDeleted })
const rect = (id: string) => ({ id, type: 'rectangle', isDeleted: false })
const file = (id: string) => ({ id, mimeType: 'image/png', dataURL: `data:image/png;base64,${id}`, created: 1 }) as unknown as BinaryFileData

const scene = (elements: unknown[], ids: string[]): Scene => ({
  elements: elements as Scene['elements'],
  files: Object.fromEntries(ids.map((id) => [id, file(id)])) as BinaryFiles,
})

function fakeStore(over: Partial<CanvasFileStore> = {}): CanvasFileStore & { save: jest.Mock; load: jest.Mock } {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    load: jest.fn().mockResolvedValue([]),
    ...over,
  } as CanvasFileStore & { save: jest.Mock; load: jest.Mock }
}

describe('referencedFileIds', () => {
  it('lists the unique images that are still on the canvas', () => {
    const elements = [image('e1', 'a'), image('e2', 'a'), image('e3', 'b', true), image('e4', null), rect('r1')]
    expect(referencedFileIds(elements as never)).toEqual(['a'])
  })
})

describe('persistCanvas', () => {
  it('uploads each live new image once, then saves the elements', async () => {
    const store = fakeStore()
    const order: string[] = []
    store.save.mockImplementation(async () => void order.push('upload'))
    const saveElements = jest.fn(async () => void order.push('elements'))
    const s = scene([image('e1', 'a'), image('e2', 'b', true), rect('r1')], ['a', 'b'])

    await persistCanvas({ store, uploaded: new Set(), saveElements }, s)

    expect(store.save).toHaveBeenCalledTimes(1)
    expect(store.save).toHaveBeenCalledWith(s.files.a)
    expect(saveElements).toHaveBeenCalledWith([s.elements[0], s.elements[2]])
    expect(order).toEqual(['upload', 'elements'])
  })

  it('leaves deleted elements out of the saved list and keeps live ones as they are', async () => {
    const saveElements = jest.fn()
    const live = { id: 'r1', type: 'rectangle', isDeleted: false, version: 7 }
    const gone = { id: 'r2', type: 'rectangle', isDeleted: true, version: 9 }

    await persistCanvas({ store: fakeStore(), uploaded: new Set(), saveElements }, scene([gone, live], []))

    expect(saveElements).toHaveBeenCalledWith([live])
    expect(saveElements.mock.calls[0][0][0]).toBe(live)
  })

  it('skips images that are already stored', async () => {
    const store = fakeStore()
    const uploaded = new Set(['a'])

    await persistCanvas({ store, uploaded, saveElements: jest.fn() }, scene([image('e1', 'a'), image('e2', 'b')], ['a', 'b']))

    expect(store.save).toHaveBeenCalledTimes(1)
    expect(store.save.mock.calls[0][0].id).toBe('b')
    expect(uploaded).toEqual(new Set(['a', 'b']))
  })

  it('does not save the elements when an upload fails', async () => {
    const store = fakeStore({ save: jest.fn().mockRejectedValue(new Error('Image is too large')) })
    const saveElements = jest.fn()
    const uploaded = new Set<string>()

    await expect(
      persistCanvas({ store, uploaded, saveElements }, scene([image('e1', 'a')], ['a']))
    ).rejects.toThrow('Image is too large')

    expect(saveElements).not.toHaveBeenCalled()
    expect(uploaded.size).toBe(0)
  })

  it('saves a canvas with no images without touching the store', async () => {
    const store = fakeStore()
    const saveElements = jest.fn()

    await persistCanvas({ store, uploaded: new Set(), saveElements }, scene([rect('r1')], []))

    expect(store.save).not.toHaveBeenCalled()
    expect(saveElements).toHaveBeenCalledTimes(1)
  })
})

describe('loadSceneFiles', () => {
  it('asks only for the images the canvas uses and records them as stored', async () => {
    const store = fakeStore({ load: jest.fn().mockResolvedValue([file('a')]) })
    const uploaded = new Set<string>()

    const files = await loadSceneFiles({ store, uploaded }, [image('e1', 'a'), image('e2', 'gone', true), rect('r1')] as never)

    expect(store.load).toHaveBeenCalledWith(['a'])
    expect(Object.keys(files)).toEqual(['a'])
    expect(uploaded).toEqual(new Set(['a']))
  })

  it('does not call the store when nothing is referenced', async () => {
    const store = fakeStore()
    await expect(loadSceneFiles({ store, uploaded: new Set() }, [rect('r1')] as never)).resolves.toEqual({})
    expect(store.load).not.toHaveBeenCalled()
  })

  it('returns a partial record when a stored image is missing', async () => {
    const store = fakeStore({ load: jest.fn().mockResolvedValue([file('a')]) })

    const files = await loadSceneFiles({ store, uploaded: new Set() }, [image('e1', 'a'), image('e2', 'missing')] as never)

    expect(Object.keys(files)).toEqual(['a'])
  })
})

describe('icon images', () => {
  const icon = (id: string, fileId: string) => image(id, fileId)

  it('are not listed as stored images', () => {
    expect(referencedFileIds([icon('i1', 'icon:aws-ec2'), image('e1', 'a')] as never)).toEqual(['a'])
  })

  it('are never uploaded: three icons and one pasted image upload one file', async () => {
    const store = fakeStore()
    const s = scene([icon('i1', 'icon:a'), icon('i2', 'icon:b'), icon('i3', 'icon:c'), image('e1', 'p')], ['icon:a', 'icon:b', 'icon:c', 'p'])
    await persistCanvas({ store, uploaded: new Set(), saveElements: jest.fn() }, s)
    expect(store.save).toHaveBeenCalledTimes(1)
    expect(store.save).toHaveBeenCalledWith(s.files.p)
  })

  it('are not looked up in storage when a canvas holds only icons', async () => {
    const store = fakeStore()
    expect(await loadSceneFiles({ store, uploaded: new Set() }, [icon('i1', 'icon:a')] as never)).toEqual({})
    expect(store.load).not.toHaveBeenCalled()
  })
})

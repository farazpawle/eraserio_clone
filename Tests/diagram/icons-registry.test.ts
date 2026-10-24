/** @jest-environment node */
import {
  FALLBACK_ICON_ID,
  createRegistry,
  iconUrl,
  loadRegistry,
  resetRegistryCache,
  type IconEntry,
  type Manifest,
} from '@/lib/diagram/icons/registry'

const entry = (id: string, label: string, keywords: string[] = [], aliases: string[] = []): IconEntry => ({
  id,
  provider: id.split('-')[0] as IconEntry['provider'],
  label,
  keywords,
  aliases,
})

const manifest: Manifest = {
  version: 1,
  icons: [
    entry('aws-ec2', 'Amazon EC2', ['amazon', 'ec2'], ['aws-compute']),
    entry('aws-s3', 'Simple Storage Service', ['bucket']),
    entry('azure-vm', 'Virtual Machine'),
    entry('gcp-compute-engine', 'Compute Engine'),
    entry('k8s-pod', 'Pod'),
    entry('aws-ec2-auto-scaling', 'EC2 Auto Scaling'),
  ],
}
const registry = createRegistry(manifest)

describe('getIcon', () => {
  it('finds an icon by id', () => {
    expect(registry.getIcon('aws-ec2')).toEqual({ id: 'aws-ec2', known: true })
  })
  it('finds an icon by alias and returns the canonical id', () => {
    expect(registry.getIcon('aws-compute')).toEqual({ id: 'aws-ec2', known: true })
  })
  it('falls back to the generic icon for unknown or empty names', () => {
    expect(registry.getIcon('aws-nope')).toEqual({ id: FALLBACK_ICON_ID, known: false })
    expect(registry.getIcon('')).toEqual({ id: FALLBACK_ICON_ID, known: false })
  })
})

describe('searchIcons', () => {
  it('matches keywords', () => {
    expect(registry.searchIcons('bucket', 20).map((e) => e.id)).toEqual(['aws-s3'])
  })
  it('ranks an exact id before a longer id that starts with it', () => {
    const ids = registry.searchIcons('aws-ec2', 20).map((e) => e.id)
    expect(ids.slice(0, 2)).toEqual(['aws-ec2', 'aws-ec2-auto-scaling'])
  })
  it('returns the first entries for an empty query and honours the limit', () => {
    expect(registry.searchIcons('', 3).map((e) => e.id)).toEqual(['aws-ec2', 'aws-s3', 'azure-vm'])
  })
  it('returns nothing when nothing matches', () => {
    expect(registry.searchIcons('zzz', 20)).toEqual([])
  })
  it('ignores case and dash/space differences', () => {
    expect(registry.searchIcons('Compute Engine', 20).map((e) => e.id)).toEqual(['gcp-compute-engine'])
  })
})

describe('iconUrl', () => {
  it('builds the provider path from the id', () => {
    expect(iconUrl('aws-ec2')).toBe('/icons/aws/aws-ec2.svg')
  })
  it('points the fallback at the root file', () => {
    expect(iconUrl(FALLBACK_ICON_ID)).toBe('/icons/generic.svg')
  })
})

describe('loadRegistry', () => {
  beforeEach(resetRegistryCache)
  const ok = (body: unknown) => jest.fn().mockResolvedValue({ ok: true, json: async () => body })

  it('fetches the manifest once', async () => {
    const fetcher = ok(manifest)
    await loadRegistry(fetcher as unknown as typeof fetch)
    const second = await loadRegistry(fetcher as unknown as typeof fetch)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith('/icons/manifest.json')
    expect(second.getIcon('aws-s3').known).toBe(true)
  })
  it('does not remember a failure', async () => {
    const fetcher = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ ok: true, json: async () => manifest })
    await expect(loadRegistry(fetcher as unknown as typeof fetch)).rejects.toThrow('offline')
    await expect(loadRegistry(fetcher as unknown as typeof fetch)).resolves.toBeDefined()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('rejects on a non-OK response', async () => {
    const fetcher = jest.fn().mockResolvedValue({ ok: false, status: 404 })
    await expect(loadRegistry(fetcher as unknown as typeof fetch)).rejects.toThrow('404')
  })
})

export const FALLBACK_ICON_ID = 'generic'

export type IconProvider = 'aws' | 'azure' | 'gcp' | 'k8s'
export type IconEntry = {
  id: string
  provider: IconProvider
  label: string
  keywords: string[]
  aliases: string[]
}
export type Manifest = { version: 1; icons: IconEntry[] }

export type Registry = {
  icons: readonly IconEntry[]
  getIcon(id: string): { id: string; known: boolean }
  searchIcons(query: string, limit: number): IconEntry[]
}

// "aws-ec2", "AWS EC2" and "aws_ec2" are the same name for matching.
const norm = (s: string) => s.toLowerCase().replace(/[-_\s]+/g, ' ').trim()

export function createRegistry(manifest: Manifest): Registry {
  const icons = manifest.icons
  const byName = new Map<string, IconEntry>()
  for (const icon of icons) for (const name of [icon.id, ...icon.aliases]) byName.set(name.toLowerCase(), icon)

  // Lower is better; Infinity means no match.
  const score = (icon: IconEntry, q: string): number => {
    const id = norm(icon.id)
    if (id === q || icon.aliases.some((a) => norm(a) === q)) return 0
    if (id.startsWith(q)) return 1
    if (id.includes(q) || norm(icon.label).includes(q)) return 2
    if (icon.keywords.some((k) => norm(k).includes(q))) return 3
    return Infinity
  }

  return {
    icons,
    getIcon(id) {
      const found = byName.get(id.trim().toLowerCase())
      return found ? { id: found.id, known: true } : { id: FALLBACK_ICON_ID, known: false }
    },
    searchIcons(query, limit) {
      const q = norm(query)
      if (!q) return icons.slice(0, limit)
      return icons
        .map((icon, order) => ({ icon, order, s: score(icon, q) }))
        .filter((m) => m.s !== Infinity)
        .sort((a, b) => a.s - b.s || a.order - b.order)
        .slice(0, limit)
        .map((m) => m.icon)
    },
  }
}

// The provider is the id's prefix, so the URL needs no manifest lookup.
export function iconUrl(id: string): string {
  if (id === FALLBACK_ICON_ID) return '/icons/generic.svg'
  return `/icons/${id.split('-')[0]}/${id}.svg`
}

let cached: Promise<Registry> | null = null

// `fetch` is read inside the promise so a missing one (old browser, tests) rejects instead of throwing.
export function loadRegistry(fetcher?: typeof fetch): Promise<Registry> {
  if (!cached) {
    cached = Promise.resolve()
      .then(() => (fetcher ?? fetch)('/icons/manifest.json'))
      .then((res) => {
        if (!res.ok) throw new Error(`Icon manifest request failed: ${res.status}`)
        return res.json() as Promise<Manifest>
      })
      .then(createRegistry)
    // A failure must not stick: the next call retries.
    cached.catch(() => {
      cached = null
    })
  }
  return cached
}

export function resetRegistryCache(): void {
  cached = null
}

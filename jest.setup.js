import '@testing-library/jest-dom'

// Next doesn't load .env.local under test; the Supabase browser client only needs
// these to exist (it makes no network call until a query runs).
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key'

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock next/navigation. The hooks are jest.fn() so tests can override them with
// mockReturnValue; the defaults keep components working when they don't.
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => '/'),
  useParams: jest.fn(() => ({})),
}))

// jsdom has no PointerEvent, so fireEvent.pointerDown loses `button`/`ctrlKey`.
// Radix menus open only on pointerdown with button 0, so give them a real one.
if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  window.PointerEvent = class PointerEvent extends MouseEvent {}
}

// jsdom has no canvas Path2D; Excalidraw's roundRect polyfill reads it at
// module load time even for pure data helpers like restoreElements.
if (typeof global.Path2D === 'undefined') {
  global.Path2D = class Path2D {}
}

// jsdom's HTMLCanvasElement.getContext returns null (no native canvas
// backend). Excalidraw's bundle does canvas feature-detection at module
// load time even when a test only needs a data helper like restoreElements,
// so hand it a context stub that answers any property/method access.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = () =>
    new Proxy(
      {},
      {
        get: () => jest.fn(),
        has: () => true,
      }
    )
}

// Global test setup
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock window.matchMedia (tests that opt into the node environment, such as API routes, have no window)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Suppress console errors during tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
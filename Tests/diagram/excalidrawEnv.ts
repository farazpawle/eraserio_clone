// jsdom lacks the font and canvas APIs that convertToExcalidrawElements touches.
// Import this before @excalidraw/excalidraw in any test that converts elements.
class FakeFontFace {
  family: string
  constructor(family: string) {
    this.family = family
  }
  load() {
    return Promise.resolve(this)
  }
}
Object.assign(globalThis, { FontFace: FakeFontFace })
Object.defineProperty(document, 'fonts', {
  configurable: true,
  value: {
    add() {},
    has() {
      return false
    },
    check() {
      return true
    },
    load() {
      return Promise.resolve([])
    },
    forEach() {},
    ready: Promise.resolve(),
  },
})
HTMLCanvasElement.prototype.getContext = (() => ({
  font: '',
  measureText: (t: string) => ({
    width: t.length * 8,
    actualBoundingBoxAscent: 10,
    actualBoundingBoxDescent: 3,
  }),
})) as unknown as typeof HTMLCanvasElement.prototype.getContext

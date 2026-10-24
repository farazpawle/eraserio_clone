import { restoreElements } from "@excalidraw/excalidraw";
import fixture from "./fixtures/whiteboard-0176.json";

describe("restoreElements regression (0.17.6 whiteboard fixture)", () => {
  it("keeps the same element count, ids and text after restoring", () => {
    const restored = restoreElements(fixture as any, null);

    expect(restored).toHaveLength(fixture.length);
    expect(restored.map((el) => el.id)).toEqual(fixture.map((el) => el.id));

    const originalTexts = fixture
      .filter((el: any) => el.type === "text")
      .map((el: any) => el.text);
    const restoredTexts = restored
      .filter((el) => el.type === "text")
      .map((el: any) => el.text);
    expect(restoredTexts).toEqual(originalTexts);
  });
});

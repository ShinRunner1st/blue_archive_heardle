/**
 * Stands in for the canvas jsdom doesn't have, keeping every line of text
 * drawn. Text is measured at half its font size per character.
 */
export function fakeContext() {
  const texts: string[] = [];
  let size = 10;
  const ctx = new Proxy(
    {
      fillText: (text: string) => texts.push(text),
      measureText: (text: string) => ({ width: text.length * size * 0.5 }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
    } as Record<string, unknown>,
    {
      get: (target, key: string) => target[key] ?? (() => {}),
      set: (target, key: string, value) => {
        if (key === "font") size = Number(/(\d+)px/.exec(value)?.[1] ?? 10);
        target[key] = value;
        return true;
      },
    }
  );
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts };
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function ctx2d(c: HTMLCanvasElement, settings?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D {
  const ctx = c.getContext('2d', settings);
  if (!ctx) throw new Error('arrivo: 2D canvas is unavailable');
  return ctx;
}

/** Clear a context regardless of its current transform. */
export function clearCtx(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

/** An offscreen buffer whose `Uint32Array` view writes packed pixels straight into `ImageData`. */
export interface PixelBuffer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  image: ImageData;
  px: Uint32Array;
  width: number;
  height: number;
  /** Push `px` to the buffer canvas. */
  flush(): void;
}

export function pixelBuffer(w: number, h: number): PixelBuffer {
  const canvas = makeCanvas(w, h);
  const ctx = ctx2d(canvas);
  const image = ctx.createImageData(canvas.width, canvas.height);
  return {
    canvas,
    ctx,
    image,
    px: new Uint32Array(image.data.buffer),
    width: canvas.width,
    height: canvas.height,
    flush: () => ctx.putImageData(image, 0, 0),
  };
}

/**
 * Linear screen buffer for efficient terminal rendering
 * Inspired by termact: https://github.com/MasterGordon/termact/blob/main/src/LinearScreenBuffer.ts
 */

export class ScreenBuffer {
  private buffer: string[];
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.buffer = Array(height * width).fill(" ");
  }

  public get(x: number, y: number): string {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return " ";
    }
    return this.buffer[y * this.width + x];
  }

  public set(x: number, y: number, value: string): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    this.buffer[y * this.width + x] = value;
  }

  public getWidth(): number {
    return this.width;
  }

  public getHeight(): number {
    return this.height;
  }

  public resize(width: number, height: number): void {
    if (width === this.width && height === this.height) {
      return;
    }

    const newBuffer = Array(height * width).fill(" ");

    // Copy existing content to new buffer
    const minWidth = Math.min(this.width, width);
    const minHeight = Math.min(this.height, height);

    for (let y = 0; y < minHeight; y++) {
      for (let x = 0; x < minWidth; x++) {
        newBuffer[y * width + x] = this.buffer[y * this.width + x];
      }
    }

    this.buffer = newBuffer;
    this.width = width;
    this.height = height;
  }

  public clear(): void {
    this.buffer.fill(" ");
  }

  public toString(): string {
    let result = "";
    for (let y = 0; y < this.height; y++) {
      result += this.buffer
        .slice(y * this.width, (y + 1) * this.width)
        .join("");
      if (y < this.height - 1) {
        result += "\n";
      }
    }
    return result;
  }

  public getLine(y: number): string {
    if (y < 0 || y >= this.height) {
      return "";
    }
    return this.buffer.slice(y * this.width, (y + 1) * this.width).join("");
  }

  public setLine(y: number, text: string): void {
    if (y < 0 || y >= this.height) {
      return;
    }
    for (let x = 0; x < Math.min(text.length, this.width); x++) {
      this.buffer[y * this.width + x] = text[x];
    }
  }
}

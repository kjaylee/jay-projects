import Phaser from 'phaser';

/**
 * Simple Row layout - horizontal arrangement of game objects
 */
export class Row extends Phaser.GameObjects.Container {
  private currentX: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
  }

  addNode(node: Phaser.GameObjects.GameObject, paddingX: number = 0, _paddingY: number = 0): this {
    this.currentX += paddingX;
    
    if (node instanceof Phaser.GameObjects.Container || 
        node instanceof Phaser.GameObjects.Text ||
        node instanceof Phaser.GameObjects.Sprite ||
        node instanceof Phaser.GameObjects.Image) {
      (node as any).x = this.currentX;
      (node as any).y = 0;
      
      // Get width for next positioning
      const bounds = (node as any).getBounds?.();
      if (bounds) {
        this.currentX += bounds.width;
      } else if ((node as any).width) {
        this.currentX += (node as any).width;
      }
    }
    
    this.add(node);
    return this;
  }
}

/**
 * Simple Column layout - vertical arrangement of game objects
 */
export class Column extends Phaser.GameObjects.Container {
  private currentY: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
  }

  addNode(node: Phaser.GameObjects.GameObject, _paddingX: number = 0, paddingY: number = 0): this {
    this.currentY += paddingY;
    
    if (node instanceof Phaser.GameObjects.Container || 
        node instanceof Phaser.GameObjects.Text ||
        node instanceof Phaser.GameObjects.Sprite ||
        node instanceof Phaser.GameObjects.Image) {
      (node as any).x = 0;
      (node as any).y = this.currentY;
      
      // Get height for next positioning
      const bounds = (node as any).getBounds?.();
      if (bounds) {
        this.currentY += bounds.height;
      } else if ((node as any).height) {
        this.currentY += (node as any).height;
      }
    }
    
    this.add(node);
    return this;
  }
}

/**
 * Simple Viewport for scrollable content
 */
export interface ViewportOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Viewport {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private width: number;
  private height: number;
  private content: Phaser.GameObjects.Container;
  private contentHeight: number = 0;
  private scrollY: number = 0;
  private mask: Phaser.Display.Masks.GeometryMask;
  private maskShape: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, options: ViewportOptions) {
    this.scene = scene;
    this.x = options.x;
    this.y = options.y;
    this.width = options.width;
    this.height = options.height;

    // Create content container
    this.content = scene.add.container(this.x, this.y);
    
    // Create mask
    this.maskShape = scene.make.graphics({ x: 0, y: 0 });
    this.maskShape.fillStyle(0xffffff);
    this.maskShape.fillRect(this.x, this.y, this.width, this.height);
    
    this.mask = this.maskShape.createGeometryMask();
    this.content.setMask(this.mask);
  }

  getContent(): Phaser.GameObjects.Container {
    return this.content;
  }

  setContentHeight(height: number): void {
    this.contentHeight = height;
  }

  getContentHeight(): number {
    return this.contentHeight;
  }

  getHeight(): number {
    return this.height;
  }

  getScrollY(): number {
    return this.scrollY;
  }

  getMaxScroll(): number {
    return Math.max(0, this.contentHeight - this.height);
  }

  scrollTo(y: number): void {
    this.scrollY = Phaser.Math.Clamp(y, 0, this.getMaxScroll());
    this.content.y = this.y - this.scrollY;
  }

  scrollBy(delta: number): void {
    this.scrollTo(this.scrollY + delta);
  }

  clearContent(): void {
    this.content.removeAll(true);
  }

  enableMouseWheelScroll(speed: number = 40): void {
    this.scene.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      this.scrollBy(deltaY > 0 ? speed : -speed);
    });
  }

  destroy(): void {
    this.content.destroy();
    this.maskShape.destroy();
  }
}

/**
 * Simple Scrollbar for Viewport
 */
export interface ScrollbarOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  trackColor?: number;
  barColor?: number;
}

export class Scrollbar {
  private scene: Phaser.Scene;
  private viewport: Viewport;
  private x: number;
  private y: number;
  private width: number;
  private height: number;
  private track: Phaser.GameObjects.Graphics;
  private bar: Phaser.GameObjects.Graphics;
  private barHeight: number = 0;
  private isDragging: boolean = false;
  private trackColor: number;
  private barColor: number;

  constructor(scene: Phaser.Scene, viewport: Viewport, options: ScrollbarOptions) {
    this.scene = scene;
    this.viewport = viewport;
    this.x = options.x;
    this.y = options.y;
    this.width = options.width;
    this.height = options.height;
    this.trackColor = options.trackColor ?? 0x333333;
    this.barColor = options.barColor ?? 0x888888;

    // Create track
    this.track = scene.add.graphics();
    this.drawTrack();

    // Create bar
    this.bar = scene.add.graphics();
    this.refresh();

    // Make bar draggable
    this.bar.setInteractive(new Phaser.Geom.Rectangle(this.x, this.y, this.width, this.barHeight || 30), Phaser.Geom.Rectangle.Contains);
    
    this.bar.on('pointerdown', () => {
      this.isDragging = true;
    });

    scene.input.on('pointerup', () => {
      this.isDragging = false;
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const ratio = (pointer.y - this.y) / this.height;
        const maxScroll = this.viewport.getMaxScroll();
        this.viewport.scrollTo(ratio * maxScroll);
        this.updateBarPosition();
      }
    });
  }

  private drawTrack(): void {
    this.track.clear();
    this.track.fillStyle(this.trackColor, 1);
    this.track.fillRoundedRect(this.x, this.y, this.width, this.height, this.width / 2);
  }

  private drawBar(): void {
    this.bar.clear();
    
    const contentHeight = this.viewport.getContentHeight();
    const viewHeight = this.viewport.getHeight();
    
    if (contentHeight <= viewHeight) {
      this.barHeight = this.height;
    } else {
      this.barHeight = Math.max(30, (viewHeight / contentHeight) * this.height);
    }

    this.bar.fillStyle(this.barColor, 1);
    const barY = this.getBarY();
    this.bar.fillRoundedRect(this.x, barY, this.width, this.barHeight, this.width / 2);
  }

  private getBarY(): number {
    const maxScroll = this.viewport.getMaxScroll();
    if (maxScroll === 0) return this.y;
    
    const scrollRatio = this.viewport.getScrollY() / maxScroll;
    return this.y + scrollRatio * (this.height - this.barHeight);
  }

  private updateBarPosition(): void {
    this.drawBar();
  }

  syncWithViewport(): void {
    this.scene.events.on('update', () => {
      this.updateBarPosition();
    });
  }

  refresh(): void {
    this.drawBar();
  }

  destroy(): void {
    this.track.destroy();
    this.bar.destroy();
  }
}

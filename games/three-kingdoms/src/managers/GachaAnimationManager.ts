/**
 * 가챠 연출 애니메이션 매니저
 * 등급별 이펙트 차별화:
 * - R등급: 기본 연출 (파란빛)
 * - SR등급: 화려한 연출 (보라빛 + 파티클)
 * - SSR등급: 특별 연출 (금빛 + 번개 이펙트)
 * - UR등급: 최고급 연출 (무지개빛 + 폭발 이펙트 + 화면 전환)
 */

import Phaser from 'phaser';
import { GeneralGrade } from './GachaManager';

export interface GradeEffectConfig {
  /** 기본 색상 (hex) */
  color: number;
  /** 글로우 색상 */
  glowColor: number;
  /** 파티클 개수 */
  particleCount: number;
  /** 애니메이션 지속 시간 (ms) */
  duration: number;
  /** 화면 플래시 여부 */
  screenFlash: boolean;
  /** 번개 이펙트 여부 */
  lightning: boolean;
  /** 폭발 이펙트 여부 */
  explosion: boolean;
  /** 무지개 이펙트 여부 */
  rainbow: boolean;
}

/** 등급별 이펙트 설정 */
export const GRADE_EFFECTS: Record<GeneralGrade, GradeEffectConfig> = {
  N: {
    color: 0xaaaaaa,
    glowColor: 0x666666,
    particleCount: 0,
    duration: 300,
    screenFlash: false,
    lightning: false,
    explosion: false,
    rainbow: false,
  },
  R: {
    color: 0x3399ff,
    glowColor: 0x0066cc,
    particleCount: 10,
    duration: 600,
    screenFlash: false,
    lightning: false,
    explosion: false,
    rainbow: false,
  },
  SR: {
    color: 0xaa44ff,
    glowColor: 0x8800ff,
    particleCount: 30,
    duration: 1000,
    screenFlash: true,
    lightning: false,
    explosion: false,
    rainbow: false,
  },
  SSR: {
    color: 0xffcc00,
    glowColor: 0xff9900,
    particleCount: 50,
    duration: 1500,
    screenFlash: true,
    lightning: true,
    explosion: false,
    rainbow: false,
  },
  UR: {
    color: 0xff0088,
    glowColor: 0xff00ff,
    particleCount: 100,
    duration: 2500,
    screenFlash: true,
    lightning: true,
    explosion: true,
    rainbow: true,
  },
};

export class GachaAnimationManager {
  private scene: Phaser.Scene;
  private effectContainer!: Phaser.GameObjects.Container;
  private isSkipped: boolean = false;
  private onSkipCallback?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** 스킵 상태 설정 */
  setSkipped(skipped: boolean): void {
    this.isSkipped = skipped;
  }

  /** 스킵 콜백 설정 */
  setOnSkipCallback(callback: () => void): void {
    this.onSkipCallback = callback;
  }

  /** 스킵 여부 확인 */
  get skipped(): boolean {
    return this.isSkipped;
  }

  /**
   * 카드 뒤집기 애니메이션
   * @param card 카드 게임 오브젝트
   * @param grade 등급
   * @param onComplete 완료 콜백
   */
  async playCardFlip(
    card: Phaser.GameObjects.Container,
    grade: GeneralGrade,
    onComplete?: () => void
  ): Promise<void> {
    if (this.isSkipped) {
      card.setScale(1);
      card.setAlpha(1);
      onComplete?.();
      return;
    }

    const config = GRADE_EFFECTS[grade];

    // 카드 초기 상태: 뒷면 (스케일 0)
    card.setScale(0, 1);
    card.setAlpha(0);

    return new Promise((resolve) => {
      // 1단계: 카드 등장 (페이드 인)
      this.scene.tweens.add({
        targets: card,
        alpha: 1,
        duration: 200,
        onComplete: () => {
          // 2단계: 카드 뒤집기
          this.scene.tweens.add({
            targets: card,
            scaleX: 1,
            duration: config.duration / 2,
            ease: 'Back.easeOut',
            onComplete: () => {
              onComplete?.();
              resolve();
            },
          });
        },
      });
    });
  }

  /**
   * 등급별 배경 이펙트 재생
   * @param x 중심 X
   * @param y 중심 Y
   * @param grade 등급
   */
  async playGradeEffect(
    x: number,
    y: number,
    grade: GeneralGrade
  ): Promise<void> {
    if (this.isSkipped) return;

    const config = GRADE_EFFECTS[grade];

    // 이펙트 컨테이너 생성
    this.effectContainer = this.scene.add.container(x, y);

    // 화면 플래시
    if (config.screenFlash) {
      this.playScreenFlash(config.color);
    }

    // 글로우 이펙트
    this.playGlowEffect(config);

    // 파티클 이펙트
    if (config.particleCount > 0) {
      this.playParticles(config);
    }

    // 번개 이펙트
    if (config.lightning) {
      this.playLightningEffect();
    }

    // 폭발 이펙트
    if (config.explosion) {
      this.playExplosionEffect(config.color);
    }

    // 무지개 이펙트
    if (config.rainbow) {
      this.playRainbowEffect();
    }

    // 애니메이션 대기
    return new Promise((resolve) => {
      this.scene.time.delayedCall(config.duration, () => {
        this.cleanupEffects();
        resolve();
      });
    });
  }

  /** 화면 플래시 */
  private playScreenFlash(color: number): void {
    const { width, height } = this.scene.cameras.main;
    const flash = this.scene.add.graphics();
    flash.fillStyle(color, 0.6);
    flash.fillRect(0, 0, width, height);
    flash.setDepth(100);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      onComplete: () => flash.destroy(),
    });
  }

  /** 글로우 이펙트 */
  private playGlowEffect(config: GradeEffectConfig): void {
    const glow = this.scene.add.graphics();
    const maxRadius = 150;

    // 글로우 원 그리기
    glow.fillStyle(config.glowColor, 0.5);
    glow.fillCircle(0, 0, 50);

    this.effectContainer.add(glow);

    // 확장 애니메이션
    this.scene.tweens.add({
      targets: glow,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: config.duration,
      ease: 'Quad.easeOut',
    });
  }

  /** 파티클 이펙트 */
  private playParticles(config: GradeEffectConfig): void {
    for (let i = 0; i < config.particleCount; i++) {
      const angle = (i / config.particleCount) * Math.PI * 2;
      const distance = Phaser.Math.Between(50, 150);

      // 파티클 (텍스트 기반 이모지)
      const particles = ['✨', '⭐', '💫', '🌟'];
      const particle = this.scene.add.text(0, 0, 
        Phaser.Utils.Array.GetRandom(particles), {
          fontSize: `${Phaser.Math.Between(14, 28)}px`,
        }
      );
      particle.setOrigin(0.5);

      this.effectContainer.add(particle);

      // 폭발 방향으로 이동
      this.scene.tweens.add({
        targets: particle,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.5,
        duration: config.duration * 0.8,
        ease: 'Quad.easeOut',
        delay: i * 10,
      });
    }
  }

  /** 번개 이펙트 (SSR/UR) */
  private playLightningEffect(): void {
    const { width, height } = this.scene.cameras.main;

    // 여러 번개 생성
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 200, () => {
        if (this.isSkipped) return;

        const lightning = this.scene.add.graphics();
        lightning.setDepth(90);

        // 번개 경로 생성
        const startX = Phaser.Math.Between(width * 0.2, width * 0.8);
        const startY = 0;
        const endY = height * 0.6;

        let currentX = startX;
        let currentY = startY;

        lightning.lineStyle(3, 0xffff00, 1);
        lightning.beginPath();
        lightning.moveTo(currentX, currentY);

        while (currentY < endY) {
          currentX += Phaser.Math.Between(-30, 30);
          currentY += Phaser.Math.Between(20, 50);
          lightning.lineTo(currentX, currentY);
        }

        lightning.strokePath();

        // 번개 페이드 아웃
        this.scene.tweens.add({
          targets: lightning,
          alpha: 0,
          duration: 300,
          onComplete: () => lightning.destroy(),
        });
      });
    }
  }

  /** 폭발 이펙트 (UR) */
  private playExplosionEffect(color: number): void {
    // 폭발 원 생성
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 100, () => {
        if (this.isSkipped) return;

        const ring = this.scene.add.graphics();
        ring.lineStyle(4 - i, color, 1);
        ring.strokeCircle(0, 0, 20);

        this.effectContainer.add(ring);

        this.scene.tweens.add({
          targets: ring,
          scaleX: 5 + i * 2,
          scaleY: 5 + i * 2,
          alpha: 0,
          duration: 600 + i * 200,
          ease: 'Quad.easeOut',
        });
      });
    }
  }

  /** 무지개 이펙트 (UR) */
  private playRainbowEffect(): void {
    const colors = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff, 0x0000ff, 0x8800ff];

    colors.forEach((color, i) => {
      this.scene.time.delayedCall(i * 50, () => {
        if (this.isSkipped) return;

        const arc = this.scene.add.graphics();
        arc.lineStyle(8, color, 0.8);
        arc.beginPath();
        arc.arc(0, 0, 80 + i * 15, -Math.PI, 0);
        arc.strokePath();

        this.effectContainer.add(arc);

        this.scene.tweens.add({
          targets: arc,
          scaleX: 2,
          scaleY: 2,
          alpha: 0,
          y: -100,
          duration: 1500,
          ease: 'Quad.easeOut',
        });
      });
    });
  }

  /** 10연차 순차 공개 애니메이션 */
  async playMultiReveal(
    cards: Phaser.GameObjects.Container[],
    grades: GeneralGrade[],
    onEachReveal?: (index: number) => void
  ): Promise<void> {
    if (this.isSkipped) {
      // 스킵 시 즉시 모든 카드 공개
      cards.forEach((card, i) => {
        card.setScale(1);
        card.setAlpha(1);
        onEachReveal?.(i);
      });
      return;
    }

    const { width, height } = this.scene.cameras.main;

    for (let i = 0; i < cards.length; i++) {
      if (this.isSkipped) {
        // 스킵 시 나머지 즉시 공개
        for (let j = i; j < cards.length; j++) {
          cards[j].setScale(1);
          cards[j].setAlpha(1);
          onEachReveal?.(j);
        }
        return;
      }

      const card = cards[i];
      const grade = grades[i];
      const config = GRADE_EFFECTS[grade];

      // 등급별 이펙트 재생 (SR 이상만)
      if (grade !== 'N' && grade !== 'R') {
        await this.playGradeEffect(card.x, card.y, grade);
      }

      // 카드 뒤집기
      await this.playCardFlip(card, grade, () => onEachReveal?.(i));

      // SR 이상은 추가 대기
      const delay = grade === 'SSR' || grade === 'UR' ? 500 : 
                    grade === 'SR' ? 300 : 150;
      
      await new Promise(resolve => this.scene.time.delayedCall(delay, resolve));
    }
  }

  /** 카드 등장 애니메이션 (단차용) */
  async playSingleReveal(
    card: Phaser.GameObjects.Container,
    grade: GeneralGrade,
    x: number,
    y: number
  ): Promise<void> {
    if (this.isSkipped) {
      card.setScale(1);
      card.setAlpha(1);
      return;
    }

    // 등급별 배경 이펙트 먼저
    await this.playGradeEffect(x, y, grade);

    // 카드 뒤집기 애니메이션
    await this.playCardFlip(card, grade);
  }

  /** 이펙트 정리 */
  private cleanupEffects(): void {
    if (this.effectContainer) {
      this.effectContainer.destroy();
    }
  }

  /** 모든 애니메이션 중단 */
  stopAll(): void {
    this.isSkipped = true;
    this.cleanupEffects();
    this.onSkipCallback?.();
  }
}

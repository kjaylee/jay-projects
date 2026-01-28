import Phaser from 'phaser';
import { BattleUnit } from '../entities/BattleUnit';
import { SkillResult, EffectResult } from './SkillExecutor';

/**
 * 스킬 타입 (이펙트 결정용)
 */
export type SkillCategory = 'physical' | 'magical_fire' | 'magical_ice' | 'magical_lightning' | 'buff' | 'debuff' | 'heal';

/**
 * 파티클 설정
 */
interface ParticleConfig {
  color: number;
  scale: { start: number; end: number };
  speed: { min: number; max: number };
  lifespan: number;
  quantity: number;
  blendMode?: Phaser.BlendModes;
}

/**
 * 스킬 이펙트 매니저
 * - 스킬 발동 시 시각적 연출 담당
 * - 스킬 이름 표시, 타입별 파티클/애니메이션, 데미지 숫자 팝업
 */
export class SkillEffectManager {
  private scene: Phaser.Scene;
  private speed: number = 1;
  private isPlaying: boolean = false;
  
  // 파티클 에미터들
  private particleEmitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createParticleTextures();
  }

  /**
   * 파티클용 텍스처 생성
   */
  private createParticleTextures(): void {
    // 기본 원형 파티클
    if (!this.scene.textures.exists('particle_circle')) {
      const graphics = this.scene.make.graphics({ x: 0, y: 0 });
      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(8, 8, 8);
      graphics.generateTexture('particle_circle', 16, 16);
      graphics.destroy();
    }

    // 별 모양 파티클 (버프용)
    if (!this.scene.textures.exists('particle_star')) {
      const graphics = this.scene.make.graphics({ x: 0, y: 0 });
      graphics.fillStyle(0xffffff, 1);
      this.drawStar(graphics, 8, 8, 5, 8, 4);
      graphics.generateTexture('particle_star', 16, 16);
      graphics.destroy();
    }

    // 검격 모양 (물리용)
    if (!this.scene.textures.exists('particle_slash')) {
      const graphics = this.scene.make.graphics({ x: 0, y: 0 });
      graphics.fillStyle(0xffffff, 1);
      graphics.fillRect(0, 6, 16, 4);
      graphics.generateTexture('particle_slash', 16, 16);
      graphics.destroy();
    }
  }

  /**
   * 별 그리기 헬퍼
   */
  private drawStar(graphics: Phaser.GameObjects.Graphics, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    graphics.beginPath();
    graphics.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      graphics.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      graphics.lineTo(x, y);
      rot += step;
    }

    graphics.lineTo(cx, cy - outerRadius);
    graphics.closePath();
    graphics.fillPath();
  }

  /**
   * 배속 설정
   */
  setSpeed(speed: number): void {
    this.speed = speed;
  }

  /**
   * 스킬 타입 분류
   */
  categorizeSkill(skillId: string, skillName: string, result: SkillResult): SkillCategory {
    // 스킬 ID 또는 이름으로 분류
    const id = skillId.toLowerCase();
    const name = skillName;
    
    // 화계 (불)
    if (id.includes('fire') || name.includes('화계')) {
      return 'magical_fire';
    }
    
    // 수계 (얼음/물)
    if (id.includes('water') || id.includes('ice') || name.includes('수계')) {
      return 'magical_ice';
    }
    
    // 낙석, 번개
    if (id.includes('lightning') || id.includes('thunder') || name.includes('번개')) {
      return 'magical_lightning';
    }
    
    // 회복
    if (id.includes('heal') || name.includes('치료') || name.includes('회복')) {
      return 'heal';
    }
    
    // 버프
    if (id.includes('buff') || id.includes('wall') || name.includes('철벽') || name.includes('격려')) {
      return 'buff';
    }
    
    // 디버프
    if (id.includes('debuff') || id.includes('confusion') || name.includes('혼란') || name.includes('약화')) {
      return 'debuff';
    }
    
    // 낙석은 물리로 분류
    if (id.includes('rock') || name.includes('낙석')) {
      return 'physical';
    }
    
    // 효과 기반 판단
    if (result.totalHeal > 0) {
      return 'heal';
    }
    
    const hasBuff = result.effects.some(e => e.type === 'buff');
    const hasDebuff = result.effects.some(e => e.type === 'debuff');
    
    if (hasBuff && !hasDebuff) return 'buff';
    if (hasDebuff) return 'debuff';
    
    // 기본값: 물리
    return 'physical';
  }

  /**
   * 스킬 이펙트 실행 (메인 함수)
   */
  async playSkillEffect(result: SkillResult, getUnitPosition: (unit: BattleUnit) => { x: number; y: number }): Promise<void> {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const category = this.categorizeSkill(result.skillId, result.skillName, result);
    const casterPos = getUnitPosition(result.caster);

    // 1. 스킬 이름 표시 (화면 중앙)
    await this.showSkillName(result.skillName, category, casterPos);

    // 2. 시전자 이펙트
    this.playCasterEffect(casterPos, category);

    // 3. 타겟별 이펙트 및 데미지 표시
    const effectPromises: Promise<void>[] = [];
    
    for (const target of result.targets) {
      const targetPos = getUnitPosition(target);
      
      // 타겟 히트 이펙트
      effectPromises.push(this.playTargetHitEffect(targetPos, category));
      
      // 데미지/회복 숫자 표시
      const targetEffects = result.effects.filter(e => e.target.id === target.id);
      for (const effect of targetEffects) {
        if (effect.type === 'damage' && effect.value > 0) {
          effectPromises.push(this.showDamageNumber(targetPos, effect.value, false));
        } else if (effect.type === 'heal' && effect.value > 0) {
          effectPromises.push(this.showHealNumber(targetPos, effect.value));
        }
      }
    }

    await Promise.all(effectPromises);
    this.isPlaying = false;
  }

  /**
   * 스킬 이름 표시 (화면 중앙 상단)
   */
  private showSkillName(skillName: string, category: SkillCategory, casterPos: { x: number; y: number }): Promise<void> {
    return new Promise((resolve) => {
      const { width } = this.scene.cameras.main;
      const duration = 1200 / this.speed;
      
      // 카테고리별 색상
      const colors: Record<SkillCategory, string> = {
        physical: '#ff8844',
        magical_fire: '#ff4400',
        magical_ice: '#44ccff',
        magical_lightning: '#ffff00',
        buff: '#44ff88',
        debuff: '#aa44ff',
        heal: '#44ff44',
      };
      
      const emojis: Record<SkillCategory, string> = {
        physical: '⚔️',
        magical_fire: '🔥',
        magical_ice: '❄️',
        magical_lightning: '⚡',
        buff: '✨',
        debuff: '💀',
        heal: '💚',
      };
      
      // 배경
      const bg = this.scene.add.graphics();
      bg.fillStyle(0x000000, 0.7);
      bg.fillRoundedRect(width / 2 - 100, 160, 200, 50, 10);
      bg.setDepth(100);
      
      // 스킬 이름 텍스트
      const text = this.scene.add.text(width / 2, 185, `${emojis[category]} ${skillName}`, {
        fontSize: '24px',
        color: colors[category],
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(101);

      // 페이드 인 → 유지 → 페이드 아웃
      this.scene.tweens.add({
        targets: [bg, text],
        alpha: { from: 0, to: 1 },
        duration: duration * 0.2,
        yoyo: false,
      });

      this.scene.tweens.add({
        targets: [bg, text],
        alpha: 0,
        delay: duration * 0.7,
        duration: duration * 0.3,
        onComplete: () => {
          bg.destroy();
          text.destroy();
          resolve();
        },
      });
    });
  }

  /**
   * 시전자 이펙트 (오라/차지)
   */
  private playCasterEffect(pos: { x: number; y: number }, category: SkillCategory): void {
    const duration = 400 / this.speed;
    
    // 시전자 주변 원형 이펙트
    const colors: Record<SkillCategory, number> = {
      physical: 0xff8844,
      magical_fire: 0xff4400,
      magical_ice: 0x44ccff,
      magical_lightning: 0xffff00,
      buff: 0x44ff88,
      debuff: 0xaa44ff,
      heal: 0x44ff44,
    };
    
    const circle = this.scene.add.graphics();
    circle.lineStyle(3, colors[category], 1);
    circle.strokeCircle(pos.x, pos.y, 10);
    circle.setDepth(50);
    
    this.scene.tweens.add({
      targets: circle,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration,
      onComplete: () => circle.destroy(),
    });

    // 카테고리별 추가 이펙트
    this.playCategoryEffect(pos, category, true);
  }

  /**
   * 타겟 히트 이펙트
   */
  private playTargetHitEffect(pos: { x: number; y: number }, category: SkillCategory): Promise<void> {
    return new Promise((resolve) => {
      const duration = 500 / this.speed;
      
      // 히트 플래시
      const flash = this.scene.add.graphics();
      flash.fillStyle(0xffffff, 0.8);
      flash.fillCircle(pos.x, pos.y, 35);
      flash.setDepth(60);
      
      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        scale: 1.5,
        duration: duration * 0.3,
        onComplete: () => flash.destroy(),
      });

      // 카테고리별 히트 이펙트
      this.playCategoryEffect(pos, category, false);

      // 화면 흔들림 (데미지 계열만)
      if (['physical', 'magical_fire', 'magical_ice', 'magical_lightning'].includes(category)) {
        this.scene.cameras.main.shake(100 / this.speed, 0.005);
      }

      this.scene.time.delayedCall(duration, () => resolve());
    });
  }

  /**
   * 카테고리별 특수 이펙트
   */
  private playCategoryEffect(pos: { x: number; y: number }, category: SkillCategory, isCaster: boolean): void {
    const duration = 600 / this.speed;
    
    switch (category) {
      case 'physical':
        this.playSlashEffect(pos, duration);
        break;
      case 'magical_fire':
        this.playFireEffect(pos, duration, isCaster);
        break;
      case 'magical_ice':
        this.playIceEffect(pos, duration, isCaster);
        break;
      case 'magical_lightning':
        this.playLightningEffect(pos, duration);
        break;
      case 'buff':
        this.playBuffEffect(pos, duration);
        break;
      case 'debuff':
        this.playDebuffEffect(pos, duration);
        break;
      case 'heal':
        this.playHealEffect(pos, duration);
        break;
    }
  }

  /**
   * 물리 스킬: 검격 이펙트
   */
  private playSlashEffect(pos: { x: number; y: number }, duration: number): void {
    // 검격 라인들
    for (let i = 0; i < 3; i++) {
      const angle = -45 + i * 30;
      const slash = this.scene.add.graphics();
      slash.lineStyle(4, 0xffffff, 1);
      slash.lineBetween(-30, 0, 30, 0);
      slash.setPosition(pos.x, pos.y);
      slash.setRotation(Phaser.Math.DegToRad(angle));
      slash.setAlpha(0);
      slash.setDepth(55);

      this.scene.tweens.add({
        targets: slash,
        alpha: { from: 0, to: 1 },
        scaleX: { from: 0.5, to: 1.5 },
        duration: duration * 0.3,
        delay: i * 50,
        yoyo: true,
        onComplete: () => slash.destroy(),
      });
    }
  }

  /**
   * 불 스킬: 화염 이펙트
   */
  private playFireEffect(pos: { x: number; y: number }, duration: number, isCaster: boolean): void {
    const count = isCaster ? 8 : 12;
    
    for (let i = 0; i < count; i++) {
      const flame = this.scene.add.graphics();
      flame.fillStyle(Phaser.Math.Between(0, 1) ? 0xff4400 : 0xff8800, 1);
      flame.fillCircle(0, 0, Phaser.Math.Between(3, 8));
      flame.setPosition(
        pos.x + Phaser.Math.Between(-20, 20),
        pos.y + Phaser.Math.Between(-10, 10)
      );
      flame.setDepth(55);

      this.scene.tweens.add({
        targets: flame,
        y: flame.y - Phaser.Math.Between(30, 60),
        alpha: 0,
        scale: { from: 1, to: 0.3 },
        duration: duration,
        delay: i * 30,
        ease: 'Power2',
        onComplete: () => flame.destroy(),
      });
    }
  }

  /**
   * 얼음 스킬: 냉기 이펙트
   */
  private playIceEffect(pos: { x: number; y: number }, duration: number, isCaster: boolean): void {
    const count = isCaster ? 6 : 10;
    
    // 얼음 결정들
    for (let i = 0; i < count; i++) {
      const crystal = this.scene.add.graphics();
      crystal.fillStyle(0x88ddff, 0.8);
      // 다이아몬드 모양
      crystal.fillTriangle(0, -8, 5, 0, 0, 8);
      crystal.fillTriangle(0, -8, -5, 0, 0, 8);
      crystal.setPosition(
        pos.x + Phaser.Math.Between(-30, 30),
        pos.y + Phaser.Math.Between(-30, 30)
      );
      crystal.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
      crystal.setDepth(55);

      this.scene.tweens.add({
        targets: crystal,
        alpha: { from: 0, to: 1 },
        scale: { from: 0, to: 1.5 },
        rotation: crystal.rotation + Math.PI,
        duration: duration * 0.5,
        delay: i * 40,
        yoyo: true,
        onComplete: () => crystal.destroy(),
      });
    }

    // 냉기 오라
    const aura = this.scene.add.graphics();
    aura.fillStyle(0x44ccff, 0.3);
    aura.fillCircle(pos.x, pos.y, 40);
    aura.setDepth(54);

    this.scene.tweens.add({
      targets: aura,
      alpha: 0,
      scale: 1.5,
      duration,
      onComplete: () => aura.destroy(),
    });
  }

  /**
   * 번개 스킬: 전격 이펙트
   */
  private playLightningEffect(pos: { x: number; y: number }, duration: number): void {
    // 번개 볼트
    for (let i = 0; i < 2; i++) {
      const bolt = this.scene.add.graphics();
      bolt.lineStyle(3, 0xffff00, 1);
      
      // 지그재그 라인
      let currentY = pos.y - 60;
      let currentX = pos.x + Phaser.Math.Between(-10, 10);
      bolt.moveTo(currentX, currentY);
      
      while (currentY < pos.y + 20) {
        currentX += Phaser.Math.Between(-15, 15);
        currentY += Phaser.Math.Between(10, 20);
        bolt.lineTo(currentX, currentY);
      }
      
      bolt.strokePath();
      bolt.setAlpha(0);
      bolt.setDepth(56);

      this.scene.tweens.add({
        targets: bolt,
        alpha: { from: 0, to: 1 },
        duration: 50,
        delay: i * 100,
        yoyo: true,
        repeat: 2,
        onComplete: () => bolt.destroy(),
      });
    }

    // 전기 스파크
    for (let i = 0; i < 8; i++) {
      const spark = this.scene.add.graphics();
      spark.fillStyle(0xffff88, 1);
      spark.fillCircle(0, 0, 3);
      spark.setPosition(pos.x, pos.y);
      spark.setDepth(55);

      const angle = (i / 8) * Math.PI * 2;
      const distance = Phaser.Math.Between(20, 40);

      this.scene.tweens.add({
        targets: spark,
        x: pos.x + Math.cos(angle) * distance,
        y: pos.y + Math.sin(angle) * distance,
        alpha: 0,
        duration: duration * 0.5,
        ease: 'Power2',
        onComplete: () => spark.destroy(),
      });
    }
  }

  /**
   * 버프 스킬: 빛나는 오라 이펙트
   */
  private playBuffEffect(pos: { x: number; y: number }, duration: number): void {
    // 상승하는 빛 입자들
    for (let i = 0; i < 12; i++) {
      const particle = this.scene.add.graphics();
      particle.fillStyle(0x44ff88, 1);
      this.drawStar(particle, 0, 0, 4, 6, 3);
      particle.setPosition(
        pos.x + Phaser.Math.Between(-25, 25),
        pos.y + 20
      );
      particle.setDepth(55);

      this.scene.tweens.add({
        targets: particle,
        y: pos.y - 50,
        alpha: { from: 1, to: 0 },
        rotation: Math.PI * 2,
        duration,
        delay: i * 50,
        ease: 'Power1',
        onComplete: () => particle.destroy(),
      });
    }

    // 녹색 오라
    const aura = this.scene.add.graphics();
    aura.lineStyle(3, 0x44ff88, 0.8);
    aura.strokeCircle(pos.x, pos.y, 30);
    aura.setDepth(54);

    this.scene.tweens.add({
      targets: aura,
      alpha: 0,
      scale: 1.5,
      duration,
      onComplete: () => aura.destroy(),
    });
  }

  /**
   * 디버프 스킬: 어두운 기운 이펙트
   */
  private playDebuffEffect(pos: { x: number; y: number }, duration: number): void {
    // 하강하는 어두운 입자들
    for (let i = 0; i < 10; i++) {
      const particle = this.scene.add.graphics();
      particle.fillStyle(0x8844aa, 0.8);
      particle.fillCircle(0, 0, Phaser.Math.Between(4, 8));
      particle.setPosition(
        pos.x + Phaser.Math.Between(-30, 30),
        pos.y - 30
      );
      particle.setDepth(55);

      this.scene.tweens.add({
        targets: particle,
        y: pos.y + 20,
        alpha: { from: 0.8, to: 0 },
        scale: { from: 1, to: 0.5 },
        duration,
        delay: i * 40,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }

    // 보라색 오라 (어둡게)
    const aura = this.scene.add.graphics();
    aura.fillStyle(0x440066, 0.4);
    aura.fillCircle(pos.x, pos.y, 35);
    aura.setDepth(54);

    this.scene.tweens.add({
      targets: aura,
      alpha: 0,
      scale: 0.8,
      duration,
      onComplete: () => aura.destroy(),
    });
  }

  /**
   * 회복 스킬: 녹색 빛 이펙트
   */
  private playHealEffect(pos: { x: number; y: number }, duration: number): void {
    // 상승하는 하트/십자가
    for (let i = 0; i < 8; i++) {
      const heal = this.scene.add.text(
        pos.x + Phaser.Math.Between(-20, 20),
        pos.y + 10,
        Phaser.Math.Between(0, 1) ? '💚' : '✚',
        { fontSize: '16px' }
      );
      heal.setOrigin(0.5);
      heal.setDepth(55);

      this.scene.tweens.add({
        targets: heal,
        y: pos.y - 40,
        alpha: { from: 1, to: 0 },
        duration,
        delay: i * 60,
        ease: 'Power1',
        onComplete: () => heal.destroy(),
      });
    }

    // 녹색 광휘
    const glow = this.scene.add.graphics();
    glow.fillStyle(0x44ff44, 0.4);
    glow.fillCircle(pos.x, pos.y, 25);
    glow.setDepth(54);

    this.scene.tweens.add({
      targets: glow,
      alpha: 0,
      scale: 1.8,
      duration,
      onComplete: () => glow.destroy(),
    });
  }

  /**
   * 데미지 숫자 표시
   */
  showDamageNumber(pos: { x: number; y: number }, damage: number, isCritical: boolean = false): Promise<void> {
    return new Promise((resolve) => {
      const duration = 800 / this.speed;
      const fontSize = isCritical ? '32px' : '24px';
      const color = isCritical ? '#ffff00' : '#ff4444';
      const prefix = isCritical ? '💥 ' : '';
      
      // 약간의 랜덤 오프셋
      const offsetX = Phaser.Math.Between(-30, 30);
      
      const text = this.scene.add.text(
        pos.x + offsetX,
        pos.y - 10,
        `${prefix}-${damage}`,
        {
          fontSize,
          color,
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 4,
        }
      ).setOrigin(0.5).setDepth(100);

      // 크리티컬일 때 스케일 효과
      if (isCritical) {
        text.setScale(1.5);
        this.scene.tweens.add({
          targets: text,
          scale: 1,
          duration: 100,
        });
      }

      // 위로 올라가며 페이드 아웃
      this.scene.tweens.add({
        targets: text,
        y: pos.y - 60,
        alpha: 0,
        duration,
        ease: 'Power2',
        onComplete: () => {
          text.destroy();
          resolve();
        },
      });
    });
  }

  /**
   * 회복 숫자 표시
   */
  showHealNumber(pos: { x: number; y: number }, amount: number): Promise<void> {
    return new Promise((resolve) => {
      const duration = 800 / this.speed;
      const offsetX = Phaser.Math.Between(-20, 20);
      
      const text = this.scene.add.text(
        pos.x + offsetX,
        pos.y - 10,
        `+${amount}`,
        {
          fontSize: '24px',
          color: '#44ff44',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 4,
        }
      ).setOrigin(0.5).setDepth(100);

      this.scene.tweens.add({
        targets: text,
        y: pos.y - 60,
        alpha: 0,
        duration,
        ease: 'Power2',
        onComplete: () => {
          text.destroy();
          resolve();
        },
      });
    });
  }

  /**
   * 일반 공격 히트 이펙트 (간단한 버전)
   */
  playBasicAttackEffect(pos: { x: number; y: number }): void {
    const duration = 200 / this.speed;
    
    const hit = this.scene.add.graphics();
    hit.fillStyle(0xffffff, 0.8);
    hit.fillCircle(pos.x, pos.y, 20);
    hit.setDepth(50);

    this.scene.tweens.add({
      targets: hit,
      alpha: 0,
      scale: 1.5,
      duration,
      onComplete: () => hit.destroy(),
    });
  }

  /**
   * 크리티컬 히트 이펙트
   */
  playCriticalEffect(pos: { x: number; y: number }): void {
    const duration = 400 / this.speed;
    
    // 큰 섬광
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xffff00, 1);
    flash.fillCircle(pos.x, pos.y, 40);
    flash.setDepth(60);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration,
      onComplete: () => flash.destroy(),
    });

    // "CRITICAL!" 텍스트
    const critText = this.scene.add.text(pos.x, pos.y - 40, 'CRITICAL!', {
      fontSize: '18px',
      color: '#ffff00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(101);

    this.scene.tweens.add({
      targets: critText,
      y: pos.y - 70,
      alpha: 0,
      duration: duration * 2,
      onComplete: () => critText.destroy(),
    });

    // 화면 흔들림
    this.scene.cameras.main.shake(150 / this.speed, 0.01);
  }

  /**
   * 이펙트 재생 중 여부
   */
  isEffectPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * 정리
   */
  destroy(): void {
    this.particleEmitters.forEach(emitter => emitter.destroy());
    this.particleEmitters.clear();
  }
}

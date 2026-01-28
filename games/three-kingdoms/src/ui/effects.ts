import Phaser from 'phaser';

/**
 * 게임 전역 비주얼 이펙트 헬퍼
 */

// === 색상 팔레트 ===
export const COLORS = {
  // 등급별 색상
  GRADE: {
    N: { primary: 0x888888, bg: 0x333333, glow: 0x666666 },
    R: { primary: 0x00cc00, bg: 0x1a3a1a, glow: 0x00ff00 },
    SR: { primary: 0x0088ff, bg: 0x1a2a4a, glow: 0x00ccff },
    SSR: { primary: 0xff8800, bg: 0x4a2a1a, glow: 0xffaa00 },
    UR: { primary: 0xff0088, bg: 0x4a1a3a, glow: 0xff44aa },
  },
  // UI 색상
  UI: {
    gold: 0xffd700,
    red: 0x8b0000,
    darkRed: 0x5c0000,
    blue: 0x0066cc,
    darkBlue: 0x003366,
    green: 0x00aa00,
    purple: 0x6a3093,
    darkPurple: 0x3d1a54,
    panelBg: 0x1a1a2e,
    panelBorder: 0x3a3a5e,
  },
};

/**
 * 그라디언트 배경 그리기 (4색 그라디언트)
 */
export function drawGradientBackground(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  topColor: number,
  bottomColor: number
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  graphics.fillGradientStyle(topColor, topColor, bottomColor, bottomColor, 1);
  graphics.fillRect(x, y, width, height);
  return graphics;
}

/**
 * 동적 배경 파티클 생성 (별/먼지)
 */
export function createStarfieldParticles(
  scene: Phaser.Scene,
  width: number,
  height: number,
  count: number = 50
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);
  
  for (let i = 0; i < count; i++) {
    const x = Phaser.Math.Between(0, width);
    const y = Phaser.Math.Between(0, height);
    const size = Phaser.Math.Between(1, 3);
    const alpha = Phaser.Math.FloatBetween(0.2, 0.8);
    
    const star = scene.add.graphics();
    star.fillStyle(0xffffff, alpha);
    star.fillCircle(x, y, size);
    container.add(star);
    
    // 깜빡임 효과
    scene.tweens.add({
      targets: star,
      alpha: Phaser.Math.FloatBetween(0.1, 0.5),
      duration: Phaser.Math.Between(1000, 3000),
      yoyo: true,
      repeat: -1,
      delay: Phaser.Math.Between(0, 2000),
    });
  }
  
  return container;
}

/**
 * 떠다니는 구름/안개 효과
 */
export function createFloatingClouds(
  scene: Phaser.Scene,
  width: number,
  height: number,
  count: number = 5
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);
  
  for (let i = 0; i < count; i++) {
    const y = Phaser.Math.Between(50, height - 100);
    const cloudWidth = Phaser.Math.Between(100, 200);
    const cloudHeight = Phaser.Math.Between(30, 60);
    
    const cloud = scene.add.graphics();
    cloud.fillStyle(0xffffff, 0.05);
    cloud.fillEllipse(0, y, cloudWidth, cloudHeight);
    
    const startX = -cloudWidth;
    cloud.x = Phaser.Math.Between(startX, width);
    container.add(cloud);
    
    // 천천히 이동
    scene.tweens.add({
      targets: cloud,
      x: width + cloudWidth,
      duration: Phaser.Math.Between(30000, 60000),
      repeat: -1,
      onRepeat: () => {
        cloud.x = startX;
        cloud.y = Phaser.Math.Between(50, height - 100);
      },
    });
  }
  
  return container;
}

/**
 * 글로우 텍스트 효과
 */
export function createGlowText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  fontSize: string,
  color: string,
  glowColor: number,
  glowDistance: number = 2
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  
  // 글로우 레이어들 (멀리서 가까이로)
  const glowLayers = [4, 3, 2, 1];
  glowLayers.forEach((dist, idx) => {
    const alpha = 0.15 - idx * 0.03;
    const shadow = scene.add.text(0, 0, text, {
      fontSize,
      color: '#' + glowColor.toString(16).padStart(6, '0'),
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(alpha);
    shadow.setScale(1 + dist * 0.02);
    container.add(shadow);
  });
  
  // 메인 텍스트
  const mainText = scene.add.text(0, 0, text, {
    fontSize,
    color,
    fontStyle: 'bold',
  }).setOrigin(0.5);
  container.add(mainText);
  
  // 미세한 펄스 애니메이션
  scene.tweens.add({
    targets: container,
    scaleX: 1.02,
    scaleY: 1.02,
    duration: 2000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  
  return container;
}

/**
 * 버튼용 그라디언트 배경 (위에서 아래로 밝음->어두움)
 */
export function drawButtonGradient(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  colorTop: number,
  colorBottom: number,
  radius: number = 8
): void {
  graphics.clear();
  
  // 어두운 외곽 그림자
  graphics.fillStyle(0x000000, 0.5);
  graphics.fillRoundedRect(x + 2, y + 2, width, height, radius);
  
  // 메인 그라디언트
  graphics.fillGradientStyle(colorTop, colorTop, colorBottom, colorBottom, 1);
  graphics.fillRoundedRect(x, y, width, height, radius);
  
  // 상단 하이라이트
  graphics.fillStyle(0xffffff, 0.1);
  graphics.fillRoundedRect(x + 2, y + 2, width - 4, height / 3, { tl: radius - 2, tr: radius - 2, bl: 0, br: 0 });
}

/**
 * 패널/모달 배경
 */
export function drawPanelBackground(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  options?: {
    fillColor?: number;
    fillAlpha?: number;
    borderColor?: number;
    borderWidth?: number;
    cornerRadius?: number;
    innerGlow?: boolean;
  }
): Phaser.GameObjects.Graphics {
  const opts = {
    fillColor: 0x1a1a2e,
    fillAlpha: 0.95,
    borderColor: 0x3a3a5e,
    borderWidth: 2,
    cornerRadius: 12,
    innerGlow: true,
    ...options,
  };
  
  const graphics = scene.add.graphics();
  
  // 외곽 그림자
  graphics.fillStyle(0x000000, 0.5);
  graphics.fillRoundedRect(x + 4, y + 4, width, height, opts.cornerRadius);
  
  // 메인 배경
  graphics.fillStyle(opts.fillColor, opts.fillAlpha);
  graphics.fillRoundedRect(x, y, width, height, opts.cornerRadius);
  
  // 테두리
  graphics.lineStyle(opts.borderWidth, opts.borderColor);
  graphics.strokeRoundedRect(x, y, width, height, opts.cornerRadius);
  
  // 내부 글로우 (선택적)
  if (opts.innerGlow) {
    graphics.lineStyle(1, 0xffffff, 0.1);
    graphics.strokeRoundedRect(x + 2, y + 2, width - 4, height - 4, opts.cornerRadius - 2);
  }
  
  return graphics;
}

/**
 * 카드 반짝임 이펙트
 */
export function createCardShineEffect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number
): Phaser.GameObjects.Graphics {
  const shine = scene.add.graphics();
  
  const animateShine = () => {
    shine.clear();
    
    // 사선 하이라이트
    const shineX = { value: -width };
    
    scene.tweens.add({
      targets: shineX,
      value: width * 2,
      duration: 2000,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        shine.clear();
        shine.fillStyle(0xffffff, 0.3);
        
        // 대각선 하이라이트 바
        const points = [
          { x: x + shineX.value - width / 4, y: y - height / 2 },
          { x: x + shineX.value, y: y - height / 2 },
          { x: x + shineX.value - width / 2, y: y + height / 2 },
          { x: x + shineX.value - width / 2 - width / 4, y: y + height / 2 },
        ];
        
        shine.beginPath();
        shine.moveTo(points[0].x, points[0].y);
        points.forEach(p => shine.lineTo(p.x, p.y));
        shine.closePath();
        shine.fillPath();
      },
      onComplete: () => {
        scene.time.delayedCall(3000, animateShine);
      },
    });
  };
  
  scene.time.delayedCall(Phaser.Math.Between(0, 3000), animateShine);
  
  return shine;
}

/**
 * 데미지 숫자 팝업
 */
export function showDamagePopup(
  scene: Phaser.Scene,
  x: number,
  y: number,
  damage: number,
  isCritical: boolean = false,
  isHeal: boolean = false
): void {
  const color = isHeal ? '#00ff00' : isCritical ? '#ffff00' : '#ffffff';
  const fontSize = isCritical ? '28px' : '20px';
  const prefix = isHeal ? '+' : '-';
  
  const text = scene.add.text(x, y, `${prefix}${damage}`, {
    fontSize,
    color,
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5);
  
  // 위로 튀어오르며 사라지는 애니메이션
  scene.tweens.add({
    targets: text,
    y: y - 60,
    alpha: 0,
    scaleX: isCritical ? 1.5 : 1,
    scaleY: isCritical ? 1.5 : 1,
    duration: 1000,
    ease: 'Power2',
    onComplete: () => text.destroy(),
  });
  
  if (isCritical) {
    // 크리티컬은 좌우로 흔들림
    scene.tweens.add({
      targets: text,
      x: x + 5,
      duration: 50,
      yoyo: true,
      repeat: 5,
    });
  }
}

/**
 * 스킬 발동 화면 플래시
 */
export function flashScreen(
  scene: Phaser.Scene,
  color: number = 0xffffff,
  duration: number = 200
): void {
  const { width, height } = scene.cameras.main;
  
  const flash = scene.add.graphics();
  flash.fillStyle(color, 0.5);
  flash.fillRect(0, 0, width, height);
  flash.setDepth(1000);
  
  scene.tweens.add({
    targets: flash,
    alpha: 0,
    duration,
    onComplete: () => flash.destroy(),
  });
}

/**
 * 리소스 아이콘 그리기 (원형 배경 + 이모지)
 */
export function createResourceIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  emoji: string,
  bgColor: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  
  const bg = scene.add.graphics();
  bg.fillStyle(bgColor, 0.8);
  bg.fillCircle(0, 0, 14);
  bg.lineStyle(1, 0xffffff, 0.3);
  bg.strokeCircle(0, 0, 14);
  
  const icon = scene.add.text(0, 0, emoji, { fontSize: '14px' }).setOrigin(0.5);
  
  container.add([bg, icon]);
  return container;
}

/**
 * 빛줄기 이펙트 (가챠, 각성 등에 사용)
 */
export function createLightRays(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  rayCount: number = 8
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2;
    const ray = scene.add.graphics();
    
    ray.fillStyle(color, 0.3);
    ray.beginPath();
    ray.moveTo(0, 0);
    ray.lineTo(Math.cos(angle - 0.1) * 300, Math.sin(angle - 0.1) * 300);
    ray.lineTo(Math.cos(angle + 0.1) * 300, Math.sin(angle + 0.1) * 300);
    ray.closePath();
    ray.fillPath();
    
    container.add(ray);
  }
  
  // 회전 애니메이션
  scene.tweens.add({
    targets: container,
    angle: 360,
    duration: 10000,
    repeat: -1,
  });
  
  return container;
}

import Phaser from 'phaser';

export enum BattleState {
  IDLE = 'idle',
  PREPARING = 'preparing',
  FIGHTING = 'fighting',
  VICTORY = 'victory',
  DEFEAT = 'defeat',
}

interface BattleUnit {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  isAlly: boolean;
  container?: Phaser.GameObjects.Container;
}

export class BattleManager {
  private scene: Phaser.Scene;
  private state: BattleState = BattleState.IDLE;
  private speed: number = 1;
  private turnTimer: number = 0;
  private turnInterval: number = 2000; // 2초마다 턴

  private allyUnits: BattleUnit[] = [];
  private enemyUnits: BattleUnit[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initUnits();
  }

  private initUnits(): void {
    // 샘플 아군
    this.allyUnits = [
      { id: '1', name: '관우', hp: 1000, maxHp: 1000, attack: 150, defense: 80, speed: 70, isAlly: true },
      { id: '2', name: '장비', hp: 800, maxHp: 800, attack: 180, defense: 60, speed: 65, isAlly: true },
      { id: '3', name: '조운', hp: 900, maxHp: 900, attack: 160, defense: 70, speed: 80, isAlly: true },
    ];

    // 샘플 적군
    this.enemyUnits = [
      { id: 'e1', name: '황건적', hp: 500, maxHp: 500, attack: 80, defense: 30, speed: 40, isAlly: false },
      { id: 'e2', name: '황건적', hp: 500, maxHp: 500, attack: 80, defense: 30, speed: 40, isAlly: false },
      { id: 'e3', name: '황건적 두목', hp: 800, maxHp: 800, attack: 100, defense: 50, speed: 50, isAlly: false },
    ];
  }

  startBattle(): void {
    this.state = BattleState.FIGHTING;
    console.log('⚔️ 전투 시작!');
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  update(delta: number): void {
    if (this.state !== BattleState.FIGHTING) return;

    this.turnTimer += delta * this.speed;

    if (this.turnTimer >= this.turnInterval) {
      this.turnTimer = 0;
      this.executeTurn();
    }
  }

  private executeTurn(): void {
    // 모든 유닛을 속도순으로 정렬
    const allUnits = [...this.allyUnits, ...this.enemyUnits]
      .filter(u => u.hp > 0)
      .sort((a, b) => b.speed - a.speed);

    for (const unit of allUnits) {
      if (unit.hp <= 0) continue;

      const targets = unit.isAlly 
        ? this.enemyUnits.filter(u => u.hp > 0)
        : this.allyUnits.filter(u => u.hp > 0);

      if (targets.length === 0) {
        this.checkBattleEnd();
        return;
      }

      // 가장 앞에 있는 적 공격
      const target = targets[0];
      this.attack(unit, target);
    }

    this.checkBattleEnd();
  }

  private attack(attacker: BattleUnit, defender: BattleUnit): void {
    // 데미지 공식: ATK * (1 - DEF/(DEF+100))
    const damageReduction = defender.defense / (defender.defense + 100);
    const damage = Math.floor(attacker.attack * (1 - damageReduction));
    
    defender.hp = Math.max(0, defender.hp - damage);

    console.log(`${attacker.name} → ${defender.name}: ${damage} 데미지! (HP: ${defender.hp}/${defender.maxHp})`);

    // 데미지 표시 애니메이션
    this.showDamageText(damage, defender.isAlly);
  }

  private showDamageText(damage: number, isAllyTarget: boolean): void {
    const x = 225 + Phaser.Math.Between(-50, 50);
    const y = isAllyTarget ? 550 : 250;

    const text = this.scene.add.text(x, y, `-${damage}`, {
      fontSize: '24px',
      color: '#ff4444',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 1000 / this.speed,
      onComplete: () => text.destroy(),
    });
  }

  private checkBattleEnd(): void {
    const allyAlive = this.allyUnits.filter(u => u.hp > 0).length;
    const enemyAlive = this.enemyUnits.filter(u => u.hp > 0).length;

    if (enemyAlive === 0) {
      this.state = BattleState.VICTORY;
      this.showResult(true);
    } else if (allyAlive === 0) {
      this.state = BattleState.DEFEAT;
      this.showResult(false);
    }
  }

  private showResult(isVictory: boolean): void {
    const text = isVictory ? '🎉 승리!' : '💀 패배...';
    const color = isVictory ? '#ffd700' : '#ff4444';

    this.scene.add.text(225, 400, text, {
      fontSize: '48px',
      color: color,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 3초 후 메인으로
    this.scene.time.delayedCall(3000, () => {
      this.scene.scene.start('MainScene', { userId: 'guest', isGuest: true });
    });
  }
}

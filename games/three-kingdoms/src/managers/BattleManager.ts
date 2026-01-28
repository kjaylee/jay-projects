import Phaser from 'phaser';
import { Formation } from '../entities/Formation';
import { BattleUnit, createBattleUnit } from '../entities/BattleUnit';
import { SkillExecutor, SkillResult } from './SkillExecutor';
import { BuffManager } from './BuffManager';
import { RewardManager, BattleReward } from './RewardManager';
import { GameManager } from './GameManager';
import stagesData from '../data/stages.json';
import generalsData from '../data/generals.json';

export enum BattleState {
  IDLE = 'idle',
  PREPARING = 'preparing',
  FIGHTING = 'fighting',
  VICTORY = 'victory',
  DEFEAT = 'defeat',
}

/**
 * 전투 결과 인터페이스
 */
export interface BattleResult {
  state: BattleState.VICTORY | BattleState.DEFEAT;
  stageId: string;
  isFirstClear: boolean;
  reward?: BattleReward;
  survivingPlayerUnits: string[];
  turnsElapsed: number;
}

interface StageEnemy {
  generalId: string;
  level: number;
  position: { row: number; col: number };
}

interface Stage {
  id: string;
  chapter: number;
  chapterName: string;
  stageName: string;
  stageNameEn: string;
  difficulty: string;
  enemies: StageEnemy[];
  rewards: {
    gold: number;
    exp: number;
    items: Array<{ itemId: string; count: number }>;
  };
  recommendedPower: number;
  unlockCondition: { type: string; stageId: string } | null;
  storyText: string;
  isBoss?: boolean;
}

interface EnemyGeneral {
  id: string;
  name: string;
  nameEn: string;
  grade: string;
  class: string;
  faction: string;
  baseStats: {
    attack: number;
    defense: number;
    intelligence: number;
    speed: number;
    hp: number;
  };
  skillIds?: string[];
  description?: string;
}

interface General {
  id: string;
  name: string;
  nameEn: string;
  grade: string;
  class: string;
  faction: string;
  baseStats: {
    attack: number;
    defense: number;
    intelligence: number;
    speed: number;
    politics?: number;
  };
  skillIds?: string[];
  portrait?: string;
}

export class BattleManager {
  private scene: Phaser.Scene;
  private state: BattleState = BattleState.IDLE;
  private speed: number = 1;
  private turnTimer: number = 0;
  private turnInterval: number = 2000; // 2초마다 턴
  private turnsElapsed: number = 0;

  private playerUnits: BattleUnit[] = [];
  private enemyUnits: BattleUnit[] = [];

  private currentStage: Stage | null = null;
  private isFirstClear: boolean = false;
  private lastBattleResult: BattleResult | null = null;
  
  private buffManager: BuffManager;
  private gameManager: GameManager | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.buffManager = new BuffManager();
    SkillExecutor.setBuffManager(this.buffManager);
  }

  /**
   * GameManager 설정 (보상 지급용)
   */
  setGameManager(gameManager: GameManager): void {
    this.gameManager = gameManager;
  }

  /**
   * BuffManager 조회 (외부 접근용)
   */
  getBuffManager(): BuffManager {
    return this.buffManager;
  }

  /**
   * 전투 시작
   * @param playerFormation 플레이어 진형
   * @param stageId 스테이지 ID
   */
  startBattle(playerFormation: Formation, stageId: string): void {
    // 스테이지 조회
    const stage = this.findStage(stageId);
    if (!stage) {
      console.error(`Stage not found: ${stageId}`);
      return;
    }
    this.currentStage = stage;

    // 진형 유효성 검사
    if (!playerFormation.isValid()) {
      console.error('Invalid formation: at least 1 unit required');
      return;
    }

    // 유닛 변환
    this.playerUnits = this.convertFormationToUnits(playerFormation);
    this.enemyUnits = this.convertStageEnemies(stage);

    // 버프 초기화
    this.buffManager.clearAllBuffs();

    // 턴 카운터 초기화
    this.turnsElapsed = 0;
    this.lastBattleResult = null;

    // 첫 클리어 여부 확인
    this.isFirstClear = this.gameManager?.isFirstClear(stageId) ?? true;

    // 전투 시작
    this.state = BattleState.FIGHTING;
    console.log(`⚔️ 전투 시작! [${stage.stageName}] - ${stage.storyText}`);
    console.log(`아군 ${this.playerUnits.length}명 vs 적군 ${this.enemyUnits.length}명`);
    if (this.isFirstClear) {
      console.log(`🌟 첫 클리어 도전!`);
    }
  }

  /**
   * 스테이지 조회
   */
  private findStage(stageId: string): Stage | null {
    const stage = (stagesData.stages as Stage[]).find((s) => s.id === stageId);
    return stage ?? null;
  }

  /**
   * 플레이어 진형 → BattleUnit[] 변환
   */
  private convertFormationToUnits(formation: Formation): BattleUnit[] {
    const units: BattleUnit[] = [];
    const formationJson = formation.toJSON();

    for (const pos of formationJson.positions) {
      const general = this.findGeneral(pos.generalId);
      if (!general) {
        console.warn(`General not found: ${pos.generalId}`);
        continue;
      }

      const unit = createBattleUnit({
        id: `player_${pos.generalId}_${pos.row}_${pos.col}`,
        generalId: pos.generalId,
        name: general.name,
        team: 'player',
        position: { row: pos.row, col: pos.col },
        baseStats: {
          attack: general.baseStats.attack,
          defense: general.baseStats.defense,
          intelligence: general.baseStats.intelligence,
          speed: general.baseStats.speed,
          hp: this.calculateBaseHp(general),
        },
        level: 1, // TODO: 실제 장수 레벨 연동
        skills: general.skillIds ?? [],
      });

      units.push(unit);
    }

    return units;
  }

  /**
   * 스테이지 적 → BattleUnit[] 변환
   */
  private convertStageEnemies(stage: Stage): BattleUnit[] {
    const units: BattleUnit[] = [];

    for (const enemy of stage.enemies) {
      const enemyGeneral = this.findEnemyGeneral(enemy.generalId);
      if (!enemyGeneral) {
        console.warn(`Enemy general not found: ${enemy.generalId}`);
        continue;
      }

      const unit = createBattleUnit({
        id: `enemy_${enemy.generalId}_${enemy.position.row}_${enemy.position.col}`,
        generalId: enemy.generalId,
        name: enemyGeneral.name,
        team: 'enemy',
        position: enemy.position,
        baseStats: enemyGeneral.baseStats,
        level: enemy.level,
        skills: enemyGeneral.skillIds ?? [],
      });

      units.push(unit);
    }

    return units;
  }

  /**
   * 플레이어 장수 조회
   */
  private findGeneral(generalId: string): General | null {
    const general = (generalsData.generals as General[]).find((g) => g.id === generalId);
    return general ?? null;
  }

  /**
   * 적 장수 조회
   */
  private findEnemyGeneral(generalId: string): EnemyGeneral | null {
    const enemyGeneral = (stagesData.enemyGenerals as EnemyGeneral[]).find(
      (g) => g.id === generalId
    );
    return enemyGeneral ?? null;
  }

  /**
   * 기본 HP 계산 (장수 데이터에 hp가 없을 경우)
   */
  private calculateBaseHp(general: General): number {
    // 장수 데이터에 hp가 없으므로 등급과 스탯 기반으로 계산
    const gradeMultiplier: Record<string, number> = {
      N: 1.0,
      R: 1.2,
      SR: 1.5,
      SSR: 1.8,
      UR: 2.2,
    };
    const mult = gradeMultiplier[general.grade] ?? 1.0;
    // 기본 HP = (attack + defense + intelligence) * 3 * 등급배수
    const baseHp = Math.floor((general.baseStats.attack + general.baseStats.defense + general.baseStats.intelligence) * 3 * mult);
    return baseHp;
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  getState(): BattleState {
    return this.state;
  }

  getPlayerUnits(): BattleUnit[] {
    return this.playerUnits;
  }

  getEnemyUnits(): BattleUnit[] {
    return this.enemyUnits;
  }

  getCurrentStage(): Stage | null {
    return this.currentStage;
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
    // 턴 카운터 증가
    this.turnsElapsed++;
    
    // 턴 시작 시 모든 유닛의 쿨다운 감소
    const allUnitsForCooldown = [...this.playerUnits, ...this.enemyUnits];
    SkillExecutor.reduceCooldowns(allUnitsForCooldown);

    // 모든 유닛을 속도순으로 정렬 (버프 적용된 속도 사용)
    const allUnits = [...this.playerUnits, ...this.enemyUnits]
      .filter((u) => u.isAlive)
      .sort((a, b) => {
        const aSpeed = this.getModifiedStat(a, 'speed');
        const bSpeed = this.getModifiedStat(b, 'speed');
        return bSpeed - aSpeed;
      });

    for (const unit of allUnits) {
      if (!unit.isAlive) continue;

      // 스킬 발동 체크 (쿨다운 0인 스킬이 있으면 발동)
      const readySkillId = SkillExecutor.getReadySkill(unit);
      if (readySkillId) {
        const allUnitsForSkill = [...this.playerUnits, ...this.enemyUnits];
        const skillResult = SkillExecutor.executeSkill(unit, readySkillId, allUnitsForSkill);
        
        if (skillResult) {
          this.showSkillEffect(skillResult);
          // 스킬 사용 후 전투 종료 체크
          if (this.checkBattleEnd()) return;
          continue; // 스킬 사용 시 일반 공격 스킵
        }
      }

      // 스킬이 없거나 쿨다운 중이면 일반 공격
      const targets =
        unit.team === 'player'
          ? this.getTargetsByRowPriority(this.enemyUnits)
          : this.getTargetsByRowPriority(this.playerUnits);

      if (targets.length === 0) {
        this.checkBattleEnd();
        return;
      }

      const target = targets[0];
      this.attack(unit, target);
    }

    // 턴 종료 시 버프 duration 감소
    const expiredBuffs = this.buffManager.tickBuffs();
    if (expiredBuffs.length > 0) {
      for (const buff of expiredBuffs) {
        console.log(`  → ${buff.type} 만료: ${buff.stat} (${buff.skillId})`);
      }
    }

    this.checkBattleEnd();
  }

  /**
   * 버프 적용된 스탯 계산
   */
  getModifiedStat(unit: BattleUnit, stat: keyof BattleUnit['stats']): number {
    const baseStat = unit.stats[stat];
    const modifier = this.buffManager.getStatModifier(unit.id, stat);
    return Math.floor(baseStat * modifier);
  }

  /**
   * 스킬 효과 연출
   */
  private showSkillEffect(result: SkillResult): void {
    // 스킬 이름 표시
    const x = 225;
    const y = result.caster.team === 'player' ? 450 : 350;

    const skillText = this.scene.add.text(x, y, `⚡ ${result.skillName}!`, {
      fontSize: '20px',
      color: '#ffff00',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: skillText,
      alpha: 0,
      y: y - 30,
      duration: 1500 / this.speed,
      onComplete: () => skillText.destroy(),
    });

    // 데미지/회복 표시
    for (const effect of result.effects) {
      if (effect.type === 'damage' && effect.value > 0) {
        this.showDamageText(effect.value, effect.target.team === 'player');
      } else if (effect.type === 'heal' && effect.value > 0) {
        this.showHealText(effect.value, effect.target.team === 'player');
      }
    }
  }

  /**
   * 회복량 표시
   */
  private showHealText(amount: number, isAllyTarget: boolean): void {
    const x = 225 + Phaser.Math.Between(-50, 50);
    const y = isAllyTarget ? 550 : 250;

    const text = this.scene.add.text(x, y, `+${amount}`, {
      fontSize: '24px',
      color: '#44ff44',
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

  /**
   * 전열 우선 타겟팅: row 0 → 1 → 2 순서
   */
  private getTargetsByRowPriority(units: BattleUnit[]): BattleUnit[] {
    return units
      .filter((u) => u.isAlive)
      .sort((a, b) => a.position.row - b.position.row);
  }

  private attack(attacker: BattleUnit, defender: BattleUnit): void {
    // 버프가 적용된 스탯 사용
    const attackPower = this.getModifiedStat(attacker, 'attack');
    const defensePower = this.getModifiedStat(defender, 'defense');
    
    // 데미지 공식: ATK * (1 - DEF/(DEF+100))
    const damageReduction = defensePower / (defensePower + 100);
    const damage = Math.floor(attackPower * (1 - damageReduction));

    defender.stats.currentHp = Math.max(0, defender.stats.currentHp - damage);

    if (defender.stats.currentHp === 0) {
      defender.isAlive = false;
    }

    console.log(
      `${attacker.name} → ${defender.name}: ${damage} 데미지! (HP: ${defender.stats.currentHp}/${defender.stats.maxHp})`
    );

    // 데미지 표시 애니메이션
    this.showDamageText(damage, defender.team === 'player');
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

  private checkBattleEnd(): boolean {
    const allyAlive = this.playerUnits.filter((u) => u.isAlive).length;
    const enemyAlive = this.enemyUnits.filter((u) => u.isAlive).length;

    if (enemyAlive === 0) {
      this.state = BattleState.VICTORY;
      this.showResult(true);
      return true;
    } else if (allyAlive === 0) {
      this.state = BattleState.DEFEAT;
      this.showResult(false);
      return true;
    }
    return false;
  }

  private async showResult(isVictory: boolean): Promise<void> {
    const text = isVictory ? '🎉 승리!' : '💀 패배...';
    const color = isVictory ? '#ffd700' : '#ff4444';

    this.scene.add
      .text(225, 400, text, {
        fontSize: '48px',
        color: color,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // 전투 결과 생성
    if (this.currentStage) {
      const stageId = this.currentStage.id;
      
      if (isVictory) {
        // 보상 계산
        const reward = RewardManager.calculateReward(stageId, this.isFirstClear);
        
        // 전투 결과 저장
        this.lastBattleResult = {
          state: BattleState.VICTORY,
          stageId,
          isFirstClear: this.isFirstClear,
          reward,
          survivingPlayerUnits: this.playerUnits
            .filter(u => u.isAlive)
            .map(u => u.generalId),
          turnsElapsed: this.turnsElapsed,
        };

        // 보상 요약 출력
        console.log(`🎁 보상: ${RewardManager.getRewardSummary(reward)}`);

        // 보상 지급
        if (this.gameManager) {
          await RewardManager.grantReward(reward, this.gameManager);
          
          // 스테이지 클리어 기록
          await this.gameManager.recordStageClear(stageId);
        }

        // 보상 UI 표시
        this.showRewardUI(reward);
      } else {
        // 패배 결과 저장
        this.lastBattleResult = {
          state: BattleState.DEFEAT,
          stageId,
          isFirstClear: this.isFirstClear,
          survivingPlayerUnits: [],
          turnsElapsed: this.turnsElapsed,
        };
      }
    }

    // 3초 후 메인으로
    this.scene.time.delayedCall(3000, () => {
      this.scene.scene.start('MainScene', { userId: 'guest', isGuest: true });
    });
  }

  /**
   * 보상 UI 표시
   */
  private showRewardUI(reward: BattleReward): void {
    const startY = 480;
    const lineHeight = 28;
    let currentY = startY;

    // 배경
    this.scene.add.rectangle(225, startY + 50, 350, 150, 0x000000, 0.7)
      .setOrigin(0.5);

    // 기본 보상
    const goldText = this.scene.add.text(225, currentY, `💰 ${reward.gold} 골드`, {
      fontSize: '18px',
      color: '#ffd700',
    }).setOrigin(0.5);
    currentY += lineHeight;

    const expText = this.scene.add.text(225, currentY, `📈 ${reward.exp} 경험치`, {
      fontSize: '18px',
      color: '#44ff44',
    }).setOrigin(0.5);
    currentY += lineHeight;

    // 아이템
    if (reward.items.length > 0) {
      for (const item of reward.items) {
        const itemText = this.scene.add.text(225, currentY, `📦 ${item.itemId} x${item.quantity}`, {
          fontSize: '16px',
          color: '#88ccff',
        }).setOrigin(0.5);
        currentY += lineHeight;
      }
    }

    // 첫 클리어 보너스
    if (reward.firstClearBonus) {
      currentY += 5;
      const bonusHeader = this.scene.add.text(225, currentY, `⭐ 첫 클리어 보너스!`, {
        fontSize: '16px',
        color: '#ff88ff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      currentY += lineHeight;

      if (reward.firstClearBonus.gold > 0) {
        this.scene.add.text(225, currentY, `+${reward.firstClearBonus.gold} 골드`, {
          fontSize: '14px',
          color: '#ffd700',
        }).setOrigin(0.5);
        currentY += lineHeight - 4;
      }
      if (reward.firstClearBonus.gems > 0) {
        this.scene.add.text(225, currentY, `+${reward.firstClearBonus.gems} 보석`, {
          fontSize: '14px',
          color: '#ff44ff',
        }).setOrigin(0.5);
      }
    }
  }

  /**
   * 마지막 전투 결과 조회
   */
  getLastBattleResult(): BattleResult | null {
    return this.lastBattleResult;
  }
}

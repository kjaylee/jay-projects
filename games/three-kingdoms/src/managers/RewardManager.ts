import stagesData from '../data/stages.json';
import { GameManager } from './GameManager';
import { InventoryManager } from './InventoryManager';

/**
 * 전투 보상 인터페이스
 */
export interface BattleReward {
  gold: number;
  exp: number;
  items: { itemId: string; quantity: number }[];
  firstClearBonus?: {
    gold: number;
    gems: number;
    items: { itemId: string; quantity: number }[];
  };
}

/**
 * 경험치를 받을 장수 인터페이스
 */
export interface GeneralForExp {
  id: string;
  name: string;
  level: number;
  exp: number;
  addExp(amount: number): void;
}

interface StageReward {
  gold: number;
  exp: number;
  items: Array<{ itemId: string; count: number }>;
}

interface Stage {
  id: string;
  rewards: StageReward;
  difficulty: string;
  isBoss?: boolean;
}

/**
 * 보상 관리자
 * 전투 승리 시 보상 계산 및 지급을 담당
 */
export class RewardManager {
  /**
   * 스테이지 보상 계산
   * @param stageId 스테이지 ID
   * @param isFirstClear 첫 클리어 여부
   * @returns 계산된 보상
   */
  static calculateReward(stageId: string, isFirstClear: boolean): BattleReward {
    const stage = this.findStage(stageId);
    
    if (!stage) {
      console.warn(`Stage not found: ${stageId}, returning default reward`);
      return {
        gold: 0,
        exp: 0,
        items: [],
      };
    }

    const baseReward: BattleReward = {
      gold: stage.rewards.gold,
      exp: stage.rewards.exp,
      items: stage.rewards.items.map(item => ({
        itemId: item.itemId,
        quantity: item.count,
      })),
    };

    // 첫 클리어 보너스 추가
    if (isFirstClear) {
      baseReward.firstClearBonus = this.calculateFirstClearBonus(stage);
    }

    return baseReward;
  }

  /**
   * 첫 클리어 보너스 계산
   * 보스 스테이지는 추가 보너스
   */
  private static calculateFirstClearBonus(stage: Stage): {
    gold: number;
    gems: number;
    items: { itemId: string; quantity: number }[];
  } {
    const baseGoldBonus = Math.floor(stage.rewards.gold * 0.5);
    const baseGems = stage.isBoss ? 50 : 20;
    
    // 난이도에 따른 보너스 배율
    const difficultyMultiplier: Record<string, number> = {
      normal: 1.0,
      hard: 1.5,
      boss: 2.0,
    };
    const multiplier = difficultyMultiplier[stage.difficulty] ?? 1.0;

    return {
      gold: Math.floor(baseGoldBonus * multiplier),
      gems: Math.floor(baseGems * multiplier),
      items: [], // 첫 클리어 아이템 보너스는 추후 확장
    };
  }

  /**
   * 보상 지급 (GameManager + InventoryManager 연동)
   * @param reward 지급할 보상
   * @param gameManager GameManager 인스턴스
   * @param inventoryManager InventoryManager 인스턴스 (선택적)
   */
  static async grantReward(
    reward: BattleReward,
    gameManager: GameManager,
    inventoryManager?: InventoryManager,
  ): Promise<void> {
    // 기본 보상 지급
    if (reward.gold > 0) {
      await gameManager.addGold(reward.gold);
      console.log(`💰 골드 획득: +${reward.gold}`);
    }

    // 아이템 지급 (InventoryManager 연동)
    for (const item of reward.items) {
      if (inventoryManager) {
        inventoryManager.addItem(item.itemId, item.quantity);
      }
      console.log(`📦 아이템 획득: ${item.itemId} x${item.quantity}`);
    }

    // 첫 클리어 보너스 지급
    if (reward.firstClearBonus) {
      const bonus = reward.firstClearBonus;
      
      if (bonus.gold > 0) {
        await gameManager.addGold(bonus.gold);
        console.log(`⭐ 첫 클리어 보너스 골드: +${bonus.gold}`);
      }
      
      if (bonus.gems > 0) {
        await gameManager.addGems(bonus.gems);
        console.log(`💎 첫 클리어 보너스 보석: +${bonus.gems}`);
      }

      for (const item of bonus.items) {
        if (inventoryManager) {
          inventoryManager.addItem(item.itemId, item.quantity);
        }
        console.log(`🎁 첫 클리어 보너스 아이템: ${item.itemId} x${item.quantity}`);
      }
    }
  }

  /**
   * 장수 경험치 분배
   * 균등 분배 방식: 총 경험치를 참여 장수 수로 나눔
   * @param exp 총 경험치
   * @param generals 경험치를 받을 장수들
   */
  static distributeExp(exp: number, generals: GeneralForExp[]): Map<string, number> {
    const expDistribution = new Map<string, number>();
    
    if (generals.length === 0 || exp <= 0) {
      return expDistribution;
    }

    // 균등 분배 (내림 처리)
    const expPerGeneral = Math.floor(exp / generals.length);
    
    for (const general of generals) {
      general.addExp(expPerGeneral);
      expDistribution.set(general.id, expPerGeneral);
      console.log(`📈 ${general.name} 경험치 획득: +${expPerGeneral}`);
    }

    return expDistribution;
  }

  /**
   * 총 보상 요약 문자열 생성
   */
  static getRewardSummary(reward: BattleReward): string {
    const parts: string[] = [];
    
    if (reward.gold > 0) {
      parts.push(`골드 ${reward.gold}`);
    }
    if (reward.exp > 0) {
      parts.push(`경험치 ${reward.exp}`);
    }
    if (reward.items.length > 0) {
      parts.push(`아이템 ${reward.items.length}종`);
    }
    
    if (reward.firstClearBonus) {
      const bonus = reward.firstClearBonus;
      const bonusParts: string[] = [];
      if (bonus.gold > 0) bonusParts.push(`골드 ${bonus.gold}`);
      if (bonus.gems > 0) bonusParts.push(`보석 ${bonus.gems}`);
      if (bonusParts.length > 0) {
        parts.push(`첫 클리어 보너스: ${bonusParts.join(', ')}`);
      }
    }

    return parts.join(' | ');
  }

  /**
   * 스테이지 조회
   */
  private static findStage(stageId: string): Stage | null {
    const stage = (stagesData.stages as Stage[]).find((s) => s.id === stageId);
    return stage ?? null;
  }
}

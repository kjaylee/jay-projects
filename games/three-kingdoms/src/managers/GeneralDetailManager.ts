/**
 * GeneralDetailManager - 장수 상세 정보 및 관리
 * 
 * 기능:
 * - 장수 상세 정보 조회
 * - 최종 스탯 계산 (장비 포함)
 * - 레벨업
 * - 장비 장착/해제
 */

// 장수 데이터 인터페이스
export interface GeneralData {
  id: string;
  name: string;
  rarity: 'N' | 'R' | 'SR' | 'SSR' | 'UR';
  level: number;
  maxLevel: number;
  exp: number;
  expToNextLevel: number;
  stars: number;
  maxStars: number;
  class: 'warrior' | 'defender' | 'archer' | 'strategist' | 'support';
  stats: {
    attack: number;
    defense: number;
    intelligence: number;
    speed: number;
    hp: number;
    maxHp: number;
  };
  skillIds: string[];
  equipmentSlots: {
    weapon: string | null;
    armor: string | null;
    accessory: string | null;
  };
}

// 장비 데이터 인터페이스
export interface EquipmentData {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'accessory';
  rarity: 'N' | 'R' | 'SR' | 'SSR' | 'UR';
  stats: {
    attack?: number;
    defense?: number;
    intelligence?: number;
    speed?: number;
    hp?: number;
  };
}

// 레벨업 결과
export interface LevelUpResult {
  success: boolean;
  newLevel: number;
  statChanges: {
    attack: number;
    defense: number;
    intelligence: number;
    speed: number;
    hp: number;
  };
  goldCost: number;
  expMaterialCost: number;
}

// 장비 장착 결과
export interface EquipResult {
  success: boolean;
  slot: 'weapon' | 'armor' | 'accessory';
  previousEquipmentId: string | null;
  newEquipmentId: string;
  statChanges: {
    attack: number;
    defense: number;
    intelligence: number;
    speed: number;
    hp: number;
  };
}

// 성장률 타입
type GrowthRate = {
  attack: number;
  defense: number;
  intelligence: number;
  speed: number;
  hp: number;
};

/**
 * 장수 상세 정보 매니저
 */
export class GeneralDetailManager {
  private generals: Map<string, GeneralData> = new Map();
  private equipments: Map<string, EquipmentData> = new Map();
  private gold: number = 10000;
  private expMaterial: number = 1000;

  // 레어리티별 성장률 테이블
  private static readonly GROWTH_RATES: Record<GeneralData['rarity'], GrowthRate> = {
    'N': { attack: 2, defense: 2, intelligence: 1, speed: 1, hp: 20 },
    'R': { attack: 3, defense: 3, intelligence: 2, speed: 1, hp: 30 },
    'SR': { attack: 5, defense: 4, intelligence: 3, speed: 2, hp: 50 },
    'SSR': { attack: 8, defense: 6, intelligence: 5, speed: 3, hp: 80 },
    'UR': { attack: 12, defense: 10, intelligence: 8, speed: 4, hp: 120 },
  };

  constructor() {
    this.initSampleData();
  }

  /**
   * 샘플 데이터 초기화
   */
  private initSampleData(): void {
    // 샘플 장수 데이터
    this.generals.set('guan-yu', {
      id: 'guan-yu',
      name: '관우',
      rarity: 'SSR',
      level: 30,
      maxLevel: 60,
      exp: 500,
      expToNextLevel: 1000,
      stars: 3,
      maxStars: 6,
      class: 'warrior',
      stats: {
        attack: 250,
        defense: 180,
        intelligence: 120,
        speed: 100,
        hp: 3000,
        maxHp: 3000,
      },
      skillIds: ['green-dragon', 'loyalty'],
      equipmentSlots: {
        weapon: null,
        armor: null,
        accessory: null,
      },
    });

    // 샘플 장비 데이터
    this.equipments.set('green-dragon-blade', {
      id: 'green-dragon-blade',
      name: '청룡언월도',
      type: 'weapon',
      rarity: 'SSR',
      stats: { attack: 100, speed: 10 },
    });

    this.equipments.set('tiger-armor', {
      id: 'tiger-armor',
      name: '호표갑',
      type: 'armor',
      rarity: 'SR',
      stats: { defense: 80, hp: 500 },
    });

    this.equipments.set('jade-ring', {
      id: 'jade-ring',
      name: '옥반지',
      type: 'accessory',
      rarity: 'R',
      stats: { intelligence: 30, speed: 20 },
    });
  }

  /**
   * 장수 정보 조회
   * @param generalId 장수 ID
   */
  getGeneral(generalId: string): GeneralData | undefined {
    return this.generals.get(generalId);
  }

  /**
   * 장수 최종 스탯 계산 (장비 포함)
   * @param generalId 장수 ID
   */
  calculateFinalStats(generalId: string): GeneralData['stats'] | null {
    const general = this.generals.get(generalId);
    if (!general) return null;

    const stats = { ...general.stats };
    
    // 장비 스탯 추가
    for (const slot of ['weapon', 'armor', 'accessory'] as const) {
      const equipId = general.equipmentSlots[slot];
      if (equipId) {
        const equip = this.equipments.get(equipId);
        if (equip) {
          stats.attack += equip.stats.attack || 0;
          stats.defense += equip.stats.defense || 0;
          stats.intelligence += equip.stats.intelligence || 0;
          stats.speed += equip.stats.speed || 0;
          stats.hp += equip.stats.hp || 0;
          stats.maxHp += equip.stats.hp || 0;
        }
      }
    }

    return stats;
  }

  /**
   * 레벨업
   * @param generalId 장수 ID
   * @param levels 올릴 레벨 수
   */
  levelUp(generalId: string, levels: number = 1): LevelUpResult {
    const general = this.generals.get(generalId);
    
    // 장수 없음
    if (!general) {
      return this.createFailedLevelUpResult(0);
    }

    // 실제 올릴 수 있는 레벨 계산
    const actualLevels = Math.min(levels, general.maxLevel - general.level);
    if (actualLevels <= 0) {
      return this.createFailedLevelUpResult(general.level);
    }

    // 비용 계산
    const goldCost = actualLevels * 100 * general.level;
    const expMaterialCost = actualLevels * 50;

    // 자원 체크
    if (this.gold < goldCost || this.expMaterial < expMaterialCost) {
      return {
        success: false,
        newLevel: general.level,
        statChanges: { attack: 0, defense: 0, intelligence: 0, speed: 0, hp: 0 },
        goldCost,
        expMaterialCost,
      };
    }

    // 스탯 증가 계산
    const growthRate = GeneralDetailManager.GROWTH_RATES[general.rarity];
    const statChanges = {
      attack: Math.floor(actualLevels * growthRate.attack),
      defense: Math.floor(actualLevels * growthRate.defense),
      intelligence: Math.floor(actualLevels * growthRate.intelligence),
      speed: Math.floor(actualLevels * growthRate.speed),
      hp: Math.floor(actualLevels * growthRate.hp),
    };

    // 적용
    this.gold -= goldCost;
    this.expMaterial -= expMaterialCost;
    general.level += actualLevels;
    general.stats.attack += statChanges.attack;
    general.stats.defense += statChanges.defense;
    general.stats.intelligence += statChanges.intelligence;
    general.stats.speed += statChanges.speed;
    general.stats.hp += statChanges.hp;
    general.stats.maxHp += statChanges.hp;

    console.log(`⬆️ ${general.name} 레벨업: Lv.${general.level - actualLevels} → Lv.${general.level}`);

    return {
      success: true,
      newLevel: general.level,
      statChanges,
      goldCost,
      expMaterialCost,
    };
  }

  /**
   * 실패한 레벨업 결과 생성
   */
  private createFailedLevelUpResult(level: number): LevelUpResult {
    return {
      success: false,
      newLevel: level,
      statChanges: { attack: 0, defense: 0, intelligence: 0, speed: 0, hp: 0 },
      goldCost: 0,
      expMaterialCost: 0,
    };
  }

  /**
   * 장비 장착
   * @param generalId 장수 ID
   * @param equipmentId 장비 ID
   */
  equipItem(generalId: string, equipmentId: string): EquipResult {
    const general = this.generals.get(generalId);
    const equipment = this.equipments.get(equipmentId);

    if (!general || !equipment) {
      return {
        success: false,
        slot: 'weapon',
        previousEquipmentId: null,
        newEquipmentId: equipmentId,
        statChanges: { attack: 0, defense: 0, intelligence: 0, speed: 0, hp: 0 },
      };
    }

    const slot = equipment.type;
    const previousEquipmentId = general.equipmentSlots[slot];

    // 스탯 변화 계산
    const statChanges = { attack: 0, defense: 0, intelligence: 0, speed: 0, hp: 0 };

    // 이전 장비 스탯 제거
    if (previousEquipmentId) {
      const prevEquip = this.equipments.get(previousEquipmentId);
      if (prevEquip) {
        statChanges.attack -= prevEquip.stats.attack || 0;
        statChanges.defense -= prevEquip.stats.defense || 0;
        statChanges.intelligence -= prevEquip.stats.intelligence || 0;
        statChanges.speed -= prevEquip.stats.speed || 0;
        statChanges.hp -= prevEquip.stats.hp || 0;
      }
    }

    // 새 장비 스탯 추가
    statChanges.attack += equipment.stats.attack || 0;
    statChanges.defense += equipment.stats.defense || 0;
    statChanges.intelligence += equipment.stats.intelligence || 0;
    statChanges.speed += equipment.stats.speed || 0;
    statChanges.hp += equipment.stats.hp || 0;

    // 장착
    general.equipmentSlots[slot] = equipmentId;

    console.log(`⚔️ ${general.name}에게 ${equipment.name} 장착`);

    return {
      success: true,
      slot,
      previousEquipmentId,
      newEquipmentId: equipmentId,
      statChanges,
    };
  }

  /**
   * 장비 해제
   * @param generalId 장수 ID
   * @param slot 슬롯 타입
   */
  unequipItem(generalId: string, slot: 'weapon' | 'armor' | 'accessory'): EquipResult {
    const general = this.generals.get(generalId);
    
    if (!general) {
      return {
        success: false,
        slot,
        previousEquipmentId: null,
        newEquipmentId: '',
        statChanges: { attack: 0, defense: 0, intelligence: 0, speed: 0, hp: 0 },
      };
    }

    const previousEquipmentId = general.equipmentSlots[slot];
    if (!previousEquipmentId) {
      return {
        success: false,
        slot,
        previousEquipmentId: null,
        newEquipmentId: '',
        statChanges: { attack: 0, defense: 0, intelligence: 0, speed: 0, hp: 0 },
      };
    }

    const prevEquip = this.equipments.get(previousEquipmentId);
    const statChanges = { attack: 0, defense: 0, intelligence: 0, speed: 0, hp: 0 };

    if (prevEquip) {
      statChanges.attack -= prevEquip.stats.attack || 0;
      statChanges.defense -= prevEquip.stats.defense || 0;
      statChanges.intelligence -= prevEquip.stats.intelligence || 0;
      statChanges.speed -= prevEquip.stats.speed || 0;
      statChanges.hp -= prevEquip.stats.hp || 0;
    }

    general.equipmentSlots[slot] = null;

    console.log(`🔓 ${general.name}의 ${slot} 장비 해제`);

    return {
      success: true,
      slot,
      previousEquipmentId,
      newEquipmentId: '',
      statChanges,
    };
  }

  /**
   * 장비 목록 조회
   * @param slot 슬롯 타입 (옵션)
   */
  getAvailableEquipments(slot?: 'weapon' | 'armor' | 'accessory'): EquipmentData[] {
    const equips = Array.from(this.equipments.values());
    if (slot) {
      return equips.filter(e => e.type === slot);
    }
    return equips;
  }

  /**
   * 장비 조회
   * @param equipmentId 장비 ID
   */
  getEquipment(equipmentId: string): EquipmentData | undefined {
    return this.equipments.get(equipmentId);
  }

  /**
   * 금화 조회
   */
  getGold(): number {
    return this.gold;
  }

  /**
   * 경험치 재료 조회
   */
  getExpMaterial(): number {
    return this.expMaterial;
  }

  /**
   * 금화 설정
   * @param amount 금액
   */
  setGold(amount: number): void {
    this.gold = amount;
  }

  /**
   * 경험치 재료 설정
   * @param amount 수량
   */
  setExpMaterial(amount: number): void {
    this.expMaterial = amount;
  }

  /**
   * 장수 추가
   * @param general 장수 데이터
   */
  addGeneral(general: GeneralData): void {
    this.generals.set(general.id, general);
  }

  /**
   * 장비 추가
   * @param equipment 장비 데이터
   */
  addEquipment(equipment: EquipmentData): void {
    this.equipments.set(equipment.id, equipment);
  }

  /**
   * 모든 장수 조회
   */
  getAllGenerals(): GeneralData[] {
    return Array.from(this.generals.values());
  }

  /**
   * 레어리티별 성장률 조회
   */
  getGrowthRate(rarity: GeneralData['rarity']): GrowthRate {
    return GeneralDetailManager.GROWTH_RATES[rarity];
  }
}

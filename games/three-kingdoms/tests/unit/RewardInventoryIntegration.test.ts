import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RewardManager, BattleReward, GeneralForExp } from '../../src/managers/RewardManager';
import { InventoryManager } from '../../src/managers/InventoryManager';
import { OwnedGeneralsManager } from '../../src/managers/OwnedGeneralsManager';
import { Formation } from '../../src/entities/Formation';
import generalsData from '../../src/data/generals.json';

describe('보상 → 인벤토리 연동', () => {
  let inventoryManager: InventoryManager;
  const userId = 'test_reward_inventory';

  beforeEach(() => {
    localStorage.clear();
    inventoryManager = new InventoryManager(userId);
  });

  it('아이템 보상이 인벤토리에 추가됨', async () => {
    // 1-5 스테이지: iron_sword x1 아이템 보상
    const reward = RewardManager.calculateReward('1-5', false);
    expect(reward.items.length).toBeGreaterThan(0);

    // GameManager mock
    const gameManager = {
      addGold: vi.fn(),
      addGems: vi.fn(),
    } as any;

    await RewardManager.grantReward(reward, gameManager, inventoryManager);

    // 아이템이 인벤토리에 저장됨
    for (const item of reward.items) {
      expect(inventoryManager.getItemCount(item.itemId)).toBe(item.quantity);
    }
  });

  it('인벤토리 매니저 없이도 동작 (하위 호환)', async () => {
    const reward = RewardManager.calculateReward('1-5', false);
    const gameManager = {
      addGold: vi.fn(),
      addGems: vi.fn(),
    } as any;

    // inventoryManager 없이 호출 — 에러 없이 동작해야 함
    await expect(
      RewardManager.grantReward(reward, gameManager)
    ).resolves.not.toThrow();
  });

  it('첫 클리어 보너스 아이템도 인벤토리에 추가', async () => {
    const reward: BattleReward = {
      gold: 100,
      exp: 50,
      items: [{ itemId: 'sword', quantity: 1 }],
      firstClearBonus: {
        gold: 50,
        gems: 20,
        items: [{ itemId: 'rare_gem', quantity: 2 }],
      },
    };

    const gameManager = {
      addGold: vi.fn(),
      addGems: vi.fn(),
    } as any;

    await RewardManager.grantReward(reward, gameManager, inventoryManager);

    expect(inventoryManager.getItemCount('sword')).toBe(1);
    expect(inventoryManager.getItemCount('rare_gem')).toBe(2);
  });
});

describe('경험치 → 장수 레벨 연동', () => {
  const userId = 'test_exp_level';

  beforeEach(() => {
    localStorage.clear();
  });

  it('경험치 분배로 장수 레벨업', () => {
    const ownedGenerals = new OwnedGeneralsManager(userId);
    ownedGenerals.acquireGeneral('guan_yu', 'SR');
    ownedGenerals.acquireGeneral('zhang_fei', 'SR');

    // GeneralForExp 어댑터 생성
    const generals: GeneralForExp[] = [
      {
        id: 'guan_yu',
        name: '관우',
        level: 1,
        exp: 0,
        addExp: (amount: number) => {
          ownedGenerals.addExp('guan_yu', amount);
        },
      },
      {
        id: 'zhang_fei',
        name: '장비',
        level: 1,
        exp: 0,
        addExp: (amount: number) => {
          ownedGenerals.addExp('zhang_fei', amount);
        },
      },
    ];

    // 200 EXP → 100 each → 각각 레벨 2
    const distribution = RewardManager.distributeExp(200, generals);

    expect(distribution.get('guan_yu')).toBe(100);
    expect(distribution.get('zhang_fei')).toBe(100);
    expect(ownedGenerals.getGeneralLevel('guan_yu')).toBe(2);
    expect(ownedGenerals.getGeneralLevel('zhang_fei')).toBe(2);
  });

  it('불균등 경험치 분배 (내림)', () => {
    const ownedGenerals = new OwnedGeneralsManager(userId);
    ownedGenerals.acquireGeneral('guan_yu', 'SR');
    ownedGenerals.acquireGeneral('zhang_fei', 'SR');
    ownedGenerals.acquireGeneral('zhao_yun', 'SR');

    const generals: GeneralForExp[] = ['guan_yu', 'zhang_fei', 'zhao_yun'].map(id => ({
      id,
      name: id,
      level: 1,
      exp: 0,
      addExp: (amount: number) => ownedGenerals.addExp(id, amount),
    }));

    // 50 EXP / 3 = 16 each (내림)
    const distribution = RewardManager.distributeExp(50, generals);

    expect(distribution.get('guan_yu')).toBe(16);
    expect(distribution.get('zhang_fei')).toBe(16);
    expect(distribution.get('zhao_yun')).toBe(16);
    // 아직 레벨업 안 됨 (100 필요)
    expect(ownedGenerals.getGeneralLevel('guan_yu')).toBe(1);
    expect(ownedGenerals.getGeneralExp('guan_yu')).toBe(16);
  });
});

describe('BattleManager 장수 레벨 연동', () => {
  const userId = 'test_battle_level';

  beforeEach(() => {
    localStorage.clear();
  });

  it('OwnedGeneralsManager에서 레벨 조회', () => {
    const ownedGenerals = new OwnedGeneralsManager(userId);
    ownedGenerals.acquireGeneral('guan_yu', 'SR');
    ownedGenerals.addExp('guan_yu', 250); // Lv1→Lv3 (100+150)

    expect(ownedGenerals.getGeneralLevel('guan_yu')).toBe(3);

    // BattleManager에서 사용하는 것과 동일한 패턴
    const level = ownedGenerals.getGeneralLevel('guan_yu');
    expect(level).toBe(3);
  });

  it('미보유 장수는 레벨 1 기본값', () => {
    const ownedGenerals = new OwnedGeneralsManager(userId);
    const level = ownedGenerals.getGeneralLevel('not_owned');
    expect(level).toBe(1);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameManager, UserData } from '../../src/managers/GameManager';

// Supabase mock
vi.mock('../../src/services/SupabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Not found' } })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
  isOnline: vi.fn(() => false), // 게스트 모드로 테스트
}));

describe('GameManager', () => {
  let gameManager: GameManager;
  const testGuestId = 'test-guest-123';

  beforeEach(() => {
    // localStorage mock
    const storage: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
      removeItem: vi.fn((key: string) => { delete storage[key]; }),
      clear: vi.fn(() => { Object.keys(storage).forEach(key => delete storage[key]); }),
    });

    // 싱글톤 인스턴스 리셋 (테스트 격리를 위해)
    // @ts-ignore - private static 접근
    GameManager['instance'] = undefined;
    
    gameManager = GameManager.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('init', () => {
    it('게스트 모드로 초기화하면 기본 데이터가 생성된다', async () => {
      await gameManager.init(testGuestId, true);

      const userData = gameManager.getUserData();
      expect(userData).not.toBeNull();
      expect(userData?.id).toBe(testGuestId);
      expect(userData?.gold).toBe(10000);
      expect(userData?.gems).toBe(100);
      expect(userData?.maxClearedStage).toBeNull();
      expect(userData?.clearedStages).toEqual([]);
    });

    it('기존 게스트 데이터가 있으면 불러온다', async () => {
      // 기존 데이터 설정
      const existingData: UserData = {
        id: testGuestId,
        nickname: '테스트 군주',
        level: 5,
        gold: 50000,
        gems: 500,
        stamina: 100,
        vipLevel: 1,
        maxClearedStage: '1-5',
        clearedStages: ['1-1', '1-2', '1-3', '1-4', '1-5'],
      };
      localStorage.setItem(`userData_${testGuestId}`, JSON.stringify(existingData));

      await gameManager.init(testGuestId, true);

      const userData = gameManager.getUserData();
      expect(userData?.gold).toBe(50000);
      expect(userData?.maxClearedStage).toBe('1-5');
      expect(userData?.clearedStages).toHaveLength(5);
    });
  });

  describe('addGold', () => {
    beforeEach(async () => {
      await gameManager.init(testGuestId, true);
    });

    it('골드를 추가한다', async () => {
      const initialGold = gameManager.getUserData()?.gold ?? 0;

      await gameManager.addGold(500);

      expect(gameManager.getUserData()?.gold).toBe(initialGold + 500);
    });

    it('0 이하의 골드는 추가하지 않는다', async () => {
      const initialGold = gameManager.getUserData()?.gold ?? 0;

      await gameManager.addGold(0);
      await gameManager.addGold(-100);

      expect(gameManager.getUserData()?.gold).toBe(initialGold);
    });
  });

  describe('addGems', () => {
    beforeEach(async () => {
      await gameManager.init(testGuestId, true);
    });

    it('보석을 추가한다', async () => {
      const initialGems = gameManager.getUserData()?.gems ?? 0;

      await gameManager.addGems(50);

      expect(gameManager.getUserData()?.gems).toBe(initialGems + 50);
    });

    it('0 이하의 보석은 추가하지 않는다', async () => {
      const initialGems = gameManager.getUserData()?.gems ?? 0;

      await gameManager.addGems(0);
      await gameManager.addGems(-50);

      expect(gameManager.getUserData()?.gems).toBe(initialGems);
    });
  });

  describe('스테이지 클리어 관리', () => {
    beforeEach(async () => {
      await gameManager.init(testGuestId, true);
    });

    it('isFirstClear - 처음 도전하는 스테이지는 true를 반환한다', () => {
      expect(gameManager.isFirstClear('1-1')).toBe(true);
      expect(gameManager.isFirstClear('1-10')).toBe(true);
    });

    it('isStageCleared - 클리어하지 않은 스테이지는 false를 반환한다', () => {
      expect(gameManager.isStageCleared('1-1')).toBe(false);
    });

    it('recordStageClear - 스테이지 클리어를 기록한다', async () => {
      await gameManager.recordStageClear('1-1');

      expect(gameManager.isStageCleared('1-1')).toBe(true);
      expect(gameManager.isFirstClear('1-1')).toBe(false);
      expect(gameManager.getUserData()?.maxClearedStage).toBe('1-1');
    });

    it('recordStageClear - 이미 클리어한 스테이지는 중복 기록하지 않는다', async () => {
      await gameManager.recordStageClear('1-1');
      await gameManager.recordStageClear('1-1');

      expect(gameManager.getUserData()?.clearedStages).toEqual(['1-1']);
    });

    it('recordStageClear - 더 높은 스테이지를 클리어하면 maxClearedStage가 갱신된다', async () => {
      await gameManager.recordStageClear('1-1');
      await gameManager.recordStageClear('1-3');
      await gameManager.recordStageClear('1-2'); // 낮은 스테이지

      expect(gameManager.getUserData()?.maxClearedStage).toBe('1-3');
    });

    it('recordStageClear - 챕터가 더 높은 스테이지가 maxClearedStage가 된다', async () => {
      await gameManager.recordStageClear('1-10');
      await gameManager.recordStageClear('2-1');

      expect(gameManager.getUserData()?.maxClearedStage).toBe('2-1');
    });
  });

  describe('getPlayerData', () => {
    beforeEach(async () => {
      await gameManager.init(testGuestId, true);
    });

    it('플레이어 데이터를 반환한다', async () => {
      await gameManager.addGold(5000);
      await gameManager.addGems(50);
      await gameManager.recordStageClear('1-5');

      const playerData = gameManager.getPlayerData();

      expect(playerData).not.toBeNull();
      expect(playerData?.gold).toBe(15000); // 10000 + 5000
      expect(playerData?.gems).toBe(150); // 100 + 50
      expect(playerData?.maxClearedStage).toBe('1-5');
    });
  });

  describe('스태미나 관리', () => {
    beforeEach(async () => {
      await gameManager.init(testGuestId, true);
    });

    it('addStamina - 스태미나를 추가한다', async () => {
      const initialStamina = gameManager.getUserData()?.stamina ?? 0;

      await gameManager.addStamina(10);

      expect(gameManager.getUserData()?.stamina).toBe(initialStamina + 10);
    });

    it('addStamina - 최대 스태미나(200)를 초과하지 않는다', async () => {
      await gameManager.addStamina(500);

      expect(gameManager.getUserData()?.stamina).toBe(200);
    });

    it('useStamina - 스태미나를 소모한다', async () => {
      const initialStamina = gameManager.getUserData()?.stamina ?? 0;

      const result = await gameManager.useStamina(10);

      expect(result).toBe(true);
      expect(gameManager.getUserData()?.stamina).toBe(initialStamina - 10);
    });

    it('useStamina - 스태미나가 부족하면 false 반환하고 소모하지 않는다', async () => {
      const initialStamina = gameManager.getUserData()?.stamina ?? 0;

      const result = await gameManager.useStamina(initialStamina + 100);

      expect(result).toBe(false);
      expect(gameManager.getUserData()?.stamina).toBe(initialStamina);
    });

    it('hasStamina - 스태미나 보유 여부 확인', () => {
      expect(gameManager.hasStamina(10)).toBe(true);
      expect(gameManager.hasStamina(1000)).toBe(false);
    });

    it('getStamina - 현재 스태미나 조회', () => {
      expect(gameManager.getStamina()).toBe(50); // 초기값
    });
  });

  describe('자원 소모 (CRUD)', () => {
    beforeEach(async () => {
      await gameManager.init(testGuestId, true);
    });

    it('spendGold - 골드를 소모한다', async () => {
      const initialGold = gameManager.getUserData()?.gold ?? 0;

      const result = await gameManager.spendGold(1000);

      expect(result).toBe(true);
      expect(gameManager.getUserData()?.gold).toBe(initialGold - 1000);
    });

    it('spendGold - 골드가 부족하면 false 반환', async () => {
      const result = await gameManager.spendGold(99999999);

      expect(result).toBe(false);
    });

    it('spendGems - 보석을 소모한다', async () => {
      const initialGems = gameManager.getUserData()?.gems ?? 0;

      const result = await gameManager.spendGems(50);

      expect(result).toBe(true);
      expect(gameManager.getUserData()?.gems).toBe(initialGems - 50);
    });

    it('spendGems - 보석이 부족하면 false 반환', async () => {
      const result = await gameManager.spendGems(99999999);

      expect(result).toBe(false);
    });

    it('hasGold - 골드 보유 여부 확인', () => {
      expect(gameManager.hasGold(1000)).toBe(true);
      expect(gameManager.hasGold(99999999)).toBe(false);
    });

    it('hasGems - 보석 보유 여부 확인', () => {
      expect(gameManager.hasGems(50)).toBe(true);
      expect(gameManager.hasGems(99999999)).toBe(false);
    });
  });

  describe('이벤트 발행', () => {
    beforeEach(async () => {
      await gameManager.init(testGuestId, true);
    });

    it('on/emit - 골드 변경 이벤트를 발행한다', async () => {
      const callback = vi.fn();
      gameManager.on('goldChanged', callback);

      await gameManager.addGold(100);

      expect(callback).toHaveBeenCalledWith({ 
        previous: 10000, 
        current: 10100, 
        delta: 100 
      });
    });

    it('on/emit - 보석 변경 이벤트를 발행한다', async () => {
      const callback = vi.fn();
      gameManager.on('gemsChanged', callback);

      await gameManager.spendGems(50);

      expect(callback).toHaveBeenCalledWith({
        previous: 100,
        current: 50,
        delta: -50
      });
    });

    it('on/emit - 스태미나 변경 이벤트를 발행한다', async () => {
      const callback = vi.fn();
      gameManager.on('staminaChanged', callback);

      await gameManager.useStamina(10);

      expect(callback).toHaveBeenCalledWith({
        previous: 50,
        current: 40,
        delta: -10
      });
    });

    it('off - 이벤트 리스너를 제거한다', async () => {
      const callback = vi.fn();
      gameManager.on('goldChanged', callback);
      gameManager.off('goldChanged', callback);

      await gameManager.addGold(100);

      expect(callback).not.toHaveBeenCalled();
    });
  });
});

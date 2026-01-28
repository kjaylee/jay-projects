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
});

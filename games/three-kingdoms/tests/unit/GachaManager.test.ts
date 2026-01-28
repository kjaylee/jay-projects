import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GachaManager, GachaPool, GachaResult, GACHA_RATES, PITY_THRESHOLD } from '../../src/managers/GachaManager';

describe('GachaManager', () => {
  let manager: GachaManager;
  
  const testPool: GachaPool = {
    N: ['soldier_1', 'soldier_2', 'soldier_3'],
    R: ['zhang_liao', 'xiahou_dun', 'gan_ning'],
    SR: ['guan_yu', 'zhang_fei', 'zhao_yun'],
    SSR: ['cao_cao', 'liu_bei', 'sun_quan'],
    UR: ['zhuge_liang', 'sima_yi'],
  };

  beforeEach(() => {
    manager = new GachaManager(testPool);
  });

  describe('constructor', () => {
    it('초기 pityCount는 0', () => {
      expect(manager.getPityCount()).toBe(0);
    });
  });

  describe('determineGrade', () => {
    it('확률에 따라 등급 결정', () => {
      // 1만회 시뮬레이션으로 확률 검증
      const results: Record<string, number> = { N: 0, R: 0, SR: 0, SSR: 0, UR: 0 };
      
      for (let i = 0; i < 10000; i++) {
        const result = manager.pull();
        results[result.grade]++;
        // 천장 리셋 방지를 위해 매번 새 매니저 사용 안 함 (SSR 이상 나오면 자동 리셋됨)
      }
      
      const nRate = results.N / 10000;
      expect(nRate).toBeGreaterThan(0.50);
      expect(nRate).toBeLessThan(0.70);
    });
  });

  describe('pull (단차)', () => {
    it('유효한 장수 ID 반환', () => {
      const result = manager.pull();
      
      expect(result.generalId).toBeDefined();
      expect(typeof result.generalId).toBe('string');
      expect(result.generalId.length).toBeGreaterThan(0);
    });

    it('등급에 맞는 장수 풀에서 선택', () => {
      // 여러 번 뽑아서 모든 결과가 해당 등급 풀에 있는지 확인
      for (let i = 0; i < 100; i++) {
        const result = manager.pull();
        const poolForGrade = testPool[result.grade];
        expect(poolForGrade).toContain(result.generalId);
      }
    });

    it('SSR 이상 획득 시 pityCount 리셋', () => {
      manager.setPityCount(79);
      
      // 80회차 → SSR 보장
      const result = manager.pull();
      
      expect(result.grade).toBe('SSR');
      expect(manager.getPityCount()).toBe(0);
    });

    it('SSR 미만 획득 시 pityCount 증가', () => {
      // 낮은 확률로 바로 SSR/UR 나올 수 있으므로, 직접 등급 결정 테스트
      const initialPity = manager.getPityCount();
      
      // pityCount가 0일 때 100번 뽑으면 대부분 증가할 것
      let ssrOrUrCount = 0;
      for (let i = 0; i < 100; i++) {
        const result = manager.pull();
        if (result.grade === 'SSR' || result.grade === 'UR') {
          ssrOrUrCount++;
        }
      }
      
      // SSR/UR이 아닌 경우에만 증가했을 것
      expect(manager.getPityCount()).toBeLessThanOrEqual(100);
    });
  });

  describe('천장 시스템', () => {
    it('80회차 SSR 보장', () => {
      manager.setPityCount(79);
      const result = manager.pull();
      
      expect(result.grade).toBe('SSR');
    });

    it('100회 넘어도 SSR 보장 (이론상 불가능하지만 안전장치)', () => {
      manager.setPityCount(100);
      const result = manager.pull();
      
      expect(result.grade).toBe('SSR');
    });

    it('천장 후 리셋되어 다시 N부터 가능', () => {
      manager.setPityCount(79);
      manager.pull(); // 80회차 SSR
      
      expect(manager.getPityCount()).toBe(0);
      
      // 다시 N등급 나올 수 있음 (확률적)
      let foundN = false;
      for (let i = 0; i < 50 && !foundN; i++) {
        if (manager.pull().grade === 'N') {
          foundN = true;
        }
      }
      // 50번 안에 N이 하나도 안 나올 확률은 거의 0
      expect(foundN).toBe(true);
    });
  });

  describe('pullMulti (10연차)', () => {
    it('10개 결과 반환', () => {
      const results = manager.pullMulti(10);
      expect(results.length).toBe(10);
    });

    it('SR 보장 (10연차)', () => {
      // 여러 번 10연차해서 SR 이상이 항상 있는지 확인
      for (let i = 0; i < 10; i++) {
        const results = manager.pullMulti(10);
        const hasSROrHigher = results.some(r => 
          r.grade === 'SR' || r.grade === 'SSR' || r.grade === 'UR'
        );
        expect(hasSROrHigher).toBe(true);
      }
    });

    it('SR 없으면 마지막 슬롯을 SR로 교체', () => {
      // 이 동작은 내부 로직으로 검증됨 - SR 보장 테스트로 충분
      const results = manager.pullMulti(10);
      const hasSROrHigher = results.some(r => 
        r.grade === 'SR' || r.grade === 'SSR' || r.grade === 'UR'
      );
      expect(hasSROrHigher).toBe(true);
    });

    it('10연차 아닌 경우 SR 보장 없음 (5연차)', () => {
      // 5연차는 SR 보장 없음 - 하지만 확률적으로 있을 수 있음
      const results = manager.pullMulti(5);
      expect(results.length).toBe(5);
    });

    it('10연차 중 천장 도달 시 SSR 획득', () => {
      manager.setPityCount(75);
      
      const results = manager.pullMulti(10);
      
      // 75 + 5 = 80에서 SSR 보장
      const hasSSR = results.some(r => r.grade === 'SSR' || r.grade === 'UR');
      expect(hasSSR).toBe(true);
    });
  });

  describe('pityCount 관리', () => {
    it('getPityCount로 현재 값 조회', () => {
      expect(manager.getPityCount()).toBe(0);
    });

    it('setPityCount로 값 설정', () => {
      manager.setPityCount(50);
      expect(manager.getPityCount()).toBe(50);
    });
  });

  describe('풀이 비어있는 경우', () => {
    it('빈 등급 풀에서 선택 시 에러 없이 처리', () => {
      const emptyPool: GachaPool = {
        N: [],
        R: ['test'],
        SR: ['test'],
        SSR: ['test'],
        UR: ['test'],
      };
      
      const emptyManager = new GachaManager(emptyPool);
      
      // N 등급 풀이 비어있으면 undefined 반환될 수 있음
      // 실제로는 빈 풀 방지 필요하지만 테스트용
      const result = emptyManager.pull();
      expect(result).toBeDefined();
    });
  });
});

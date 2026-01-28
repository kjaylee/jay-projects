import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormationManager, FormationSlot } from '../../src/managers/FormationManager';
import { Formation, Position } from '../../src/entities/Formation';

// LocalStorage 모킹
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('FormationManager', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('초기화', () => {
    it('5개의 빈 슬롯으로 초기화', () => {
      const manager = new FormationManager('user-1');
      
      expect(manager.userId).toBe('user-1');
      expect(manager.getAllSlots()).toHaveLength(5);
      expect(manager.getActiveSlotId()).toBe(0);
    });

    it('각 슬롯에 기본 이름이 설정됨', () => {
      const manager = new FormationManager('user-1');
      const slots = manager.getAllSlots();
      
      expect(slots[0].slotName).toBe('진형 1');
      expect(slots[1].slotName).toBe('진형 2');
      expect(slots[4].slotName).toBe('진형 5');
    });

    it('각 슬롯은 빈 진형을 가짐', () => {
      const manager = new FormationManager('user-1');
      
      for (let i = 0; i < 5; i++) {
        const slot = manager.getSlot(i);
        expect(slot).not.toBeNull();
        expect(slot!.formation.getUnitCount()).toBe(0);
      }
    });
  });

  describe('슬롯 조회', () => {
    it('특정 슬롯 조회', () => {
      const manager = new FormationManager('user-1');
      
      const slot = manager.getSlot(2);
      expect(slot).not.toBeNull();
      expect(slot!.slotId).toBe(2);
    });

    it('범위 밖 슬롯 조회 시 null', () => {
      const manager = new FormationManager('user-1');
      
      expect(manager.getSlot(-1)).toBeNull();
      expect(manager.getSlot(5)).toBeNull();
    });

    it('현재 활성 슬롯 조회', () => {
      const manager = new FormationManager('user-1');
      
      const activeSlot = manager.getActiveSlot();
      expect(activeSlot.slotId).toBe(0);
    });
  });

  describe('슬롯 전환', () => {
    it('활성 슬롯 변경 성공', () => {
      const manager = new FormationManager('user-1');
      
      const result = manager.setActiveSlot(3);
      expect(result).toBe(true);
      expect(manager.getActiveSlotId()).toBe(3);
    });

    it('범위 밖으로 변경 불가', () => {
      const manager = new FormationManager('user-1');
      
      expect(manager.setActiveSlot(-1)).toBe(false);
      expect(manager.setActiveSlot(5)).toBe(false);
      expect(manager.getActiveSlotId()).toBe(0); // 변경되지 않음
    });
  });

  describe('슬롯 이름 변경', () => {
    it('슬롯 이름 변경 성공', () => {
      const manager = new FormationManager('user-1');
      
      const result = manager.setSlotName(0, '공격 진형');
      expect(result).toBe(true);
      expect(manager.getSlot(0)!.slotName).toBe('공격 진형');
    });

    it('빈 이름으로 변경 불가', () => {
      const manager = new FormationManager('user-1');
      
      expect(manager.setSlotName(0, '')).toBe(false);
      expect(manager.setSlotName(0, '   ')).toBe(false);
    });

    it('20자 초과 이름 불가', () => {
      const manager = new FormationManager('user-1');
      
      const longName = 'a'.repeat(21);
      expect(manager.setSlotName(0, longName)).toBe(false);
    });

    it('범위 밖 슬롯 이름 변경 불가', () => {
      const manager = new FormationManager('user-1');
      
      expect(manager.setSlotName(-1, '테스트')).toBe(false);
      expect(manager.setSlotName(5, '테스트')).toBe(false);
    });
  });

  describe('진형 관리', () => {
    it('특정 슬롯의 진형 조회', () => {
      const manager = new FormationManager('user-1');
      
      const formation = manager.getFormation(0);
      expect(formation).not.toBeNull();
      expect(formation!.userId).toBe('user-1');
    });

    it('활성 진형 조회', () => {
      const manager = new FormationManager('user-1');
      manager.setActiveSlot(2);
      
      const activeFormation = manager.getActiveFormation();
      expect(activeFormation).toBe(manager.getSlot(2)!.formation);
    });

    it('특정 슬롯에 진형 설정', () => {
      const manager = new FormationManager('user-1');
      const newFormation = new Formation('user-1', [
        { row: 0, col: 0, generalId: 'guan-yu' },
      ]);
      
      const result = manager.setFormation(1, newFormation);
      expect(result).toBe(true);
      expect(manager.getFormation(1)!.getUnitAt(0, 0)).toBe('guan-yu');
    });

    it('슬롯 초기화', () => {
      const manager = new FormationManager('user-1');
      manager.getFormation(0)!.placeUnit('test', 0, 0);
      
      const result = manager.clearSlot(0);
      expect(result).toBe(true);
      expect(manager.getFormation(0)!.getUnitCount()).toBe(0);
    });
  });

  describe('슬롯 복사', () => {
    it('슬롯 간 복사 성공', () => {
      const manager = new FormationManager('user-1');
      manager.getFormation(0)!.placeUnit('guan-yu', 1, 1);
      manager.getFormation(0)!.placeUnit('zhang-fei', 2, 1);
      
      const result = manager.copySlot(0, 2);
      expect(result).toBe(true);
      expect(manager.getFormation(2)!.getUnitAt(1, 1)).toBe('guan-yu');
      expect(manager.getFormation(2)!.getUnitAt(2, 1)).toBe('zhang-fei');
    });

    it('같은 슬롯으로 복사 불가', () => {
      const manager = new FormationManager('user-1');
      
      expect(manager.copySlot(0, 0)).toBe(false);
    });

    it('범위 밖 슬롯 복사 불가', () => {
      const manager = new FormationManager('user-1');
      
      expect(manager.copySlot(-1, 0)).toBe(false);
      expect(manager.copySlot(0, 5)).toBe(false);
    });
  });

  describe('유효한 슬롯 수', () => {
    it('초기에는 유효한 슬롯 0개', () => {
      const manager = new FormationManager('user-1');
      
      expect(manager.getValidSlotCount()).toBe(0);
    });

    it('유닛 배치 시 유효한 슬롯 증가', () => {
      const manager = new FormationManager('user-1');
      
      manager.getFormation(0)!.placeUnit('unit-1', 0, 0);
      manager.getFormation(2)!.placeUnit('unit-2', 1, 1);
      
      expect(manager.getValidSlotCount()).toBe(2);
    });
  });

  describe('직렬화', () => {
    it('JSON 변환', () => {
      const manager = new FormationManager('user-1');
      manager.setSlotName(0, '테스트 진형');
      manager.getFormation(0)!.placeUnit('guan-yu', 0, 0);
      manager.setActiveSlot(2);
      
      const json = manager.toJSON();
      
      expect(json.userId).toBe('user-1');
      expect(json.activeSlotId).toBe(2);
      expect(json.slots).toHaveLength(5);
      expect(json.slots[0].slotName).toBe('테스트 진형');
    });

    it('JSON에서 복원', () => {
      const json = {
        userId: 'user-1',
        activeSlotId: 1,
        slots: [
          {
            slotId: 0,
            slotName: '공격 진형',
            formation: {
              userId: 'user-1',
              positions: [{ row: 0, col: 0, generalId: 'guan-yu' }],
            },
          },
          ...Array(4).fill(null).map((_, i) => ({
            slotId: i + 1,
            slotName: `진형 ${i + 2}`,
            formation: { userId: 'user-1', positions: [] },
          })),
        ],
      };
      
      const manager = FormationManager.fromJSON(json);
      
      expect(manager.userId).toBe('user-1');
      expect(manager.getActiveSlotId()).toBe(1);
      expect(manager.getSlot(0)!.slotName).toBe('공격 진형');
      expect(manager.getFormation(0)!.getUnitAt(0, 0)).toBe('guan-yu');
    });
  });

  describe('LocalStorage 저장/로드', () => {
    it('저장 후 로드', () => {
      const manager = new FormationManager('user-1');
      manager.setSlotName(0, '저장 테스트');
      manager.getFormation(0)!.placeUnit('test-unit', 1, 1);
      manager.setActiveSlot(3);
      
      manager.save();
      
      const loaded = FormationManager.load('user-1');
      
      expect(loaded.getSlot(0)!.slotName).toBe('저장 테스트');
      expect(loaded.getFormation(0)!.getUnitAt(1, 1)).toBe('test-unit');
      expect(loaded.getActiveSlotId()).toBe(3);
    });

    it('저장된 데이터 없으면 빈 매니저 반환', () => {
      const loaded = FormationManager.load('new-user');
      
      expect(loaded.userId).toBe('new-user');
      expect(loaded.getAllSlots()).toHaveLength(5);
      expect(loaded.getValidSlotCount()).toBe(0);
    });

    it('기존 단일 진형 마이그레이션', () => {
      // 기존 형식으로 저장
      const legacyFormation = {
        userId: 'user-1',
        positions: [{ row: 2, col: 1, generalId: 'legacy-unit' }],
      };
      localStorage.setItem('formation_user-1', JSON.stringify(legacyFormation));
      
      const loaded = FormationManager.load('user-1');
      
      expect(loaded.getFormation(0)!.getUnitAt(2, 1)).toBe('legacy-unit');
      expect(loaded.getSlot(0)!.slotName).toBe('기본 진형');
    });
  });

  describe('최대 슬롯 수', () => {
    it('최대 슬롯 수는 5', () => {
      expect(FormationManager.getMaxSlots()).toBe(5);
    });
  });
});

/**
 * Toast 알림 컴포넌트 테스트
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToastManager } from '../../src/managers/ToastManager';

describe('ToastManager', () => {
  let manager: ToastManager;

  beforeEach(() => {
    manager = new ToastManager();
  });

  describe('기본 기능', () => {
    it('toast 표시 시 고유 ID 반환', () => {
      const id1 = manager.show({ message: 'Hello' });
      const id2 = manager.show({ message: 'World' });

      expect(id1).toBe('toast_1');
      expect(id2).toBe('toast_2');
    });

    it('기본 타입은 info', () => {
      manager.show({ message: 'Test' });
      const toasts = manager.getToasts();

      expect(toasts[0].type).toBe('info');
      expect(toasts[0].icon).toBe('ℹ️');
    });

    it('기본 duration은 3000ms', () => {
      manager.show({ message: 'Test' });
      const toasts = manager.getToasts();

      expect(toasts[0].duration).toBe(3000);
    });

    it('커스텀 설정 적용', () => {
      manager.show({
        message: 'Custom',
        type: 'success',
        duration: 5000,
        icon: '🎉',
      });
      const toasts = manager.getToasts();

      expect(toasts[0].message).toBe('Custom');
      expect(toasts[0].type).toBe('success');
      expect(toasts[0].duration).toBe(5000);
      expect(toasts[0].icon).toBe('🎉');
    });
  });

  describe('타입별 아이콘', () => {
    it('success → ✅', () => {
      manager.success('Done!');
      expect(manager.getToasts()[0].icon).toBe('✅');
    });

    it('error → ❌', () => {
      manager.error('Failed!');
      expect(manager.getToasts()[0].icon).toBe('❌');
    });

    it('warning → ⚠️', () => {
      manager.warning('Careful!');
      expect(manager.getToasts()[0].icon).toBe('⚠️');
    });

    it('info → ℹ️', () => {
      manager.info('FYI');
      expect(manager.getToasts()[0].icon).toBe('ℹ️');
    });
  });

  describe('toast 관리', () => {
    it('dismiss()로 특정 toast 제거', () => {
      const id = manager.show({ message: 'Test' });
      expect(manager.getToasts().length).toBe(1);

      const result = manager.dismiss(id);
      expect(result).toBe(true);
      expect(manager.getToasts().length).toBe(0);
    });

    it('존재하지 않는 toast dismiss 시 false 반환', () => {
      const result = manager.dismiss('nonexistent');
      expect(result).toBe(false);
    });

    it('dismissAll()로 모든 toast 제거', () => {
      manager.show({ message: 'A' });
      manager.show({ message: 'B' });
      manager.show({ message: 'C' });
      expect(manager.getToasts().length).toBe(3);

      manager.dismissAll();
      expect(manager.getToasts().length).toBe(0);
    });

    it('getToastById()로 특정 toast 조회', () => {
      const id = manager.show({ message: 'Find me' });
      const toast = manager.getToastById(id);

      expect(toast?.message).toBe('Find me');
    });
  });

  describe('최대 개수 제한', () => {
    it('기본 최대 5개', () => {
      for (let i = 0; i < 7; i++) {
        manager.show({ message: `Toast ${i}` });
      }

      const toasts = manager.getToasts();
      expect(toasts.length).toBe(5);
      // 가장 오래된 것이 제거됨
      expect(toasts[0].message).toBe('Toast 2');
    });

    it('커스텀 maxToasts 설정', () => {
      const customManager = new ToastManager(3);
      for (let i = 0; i < 5; i++) {
        customManager.show({ message: `Toast ${i}` });
      }

      expect(customManager.getToasts().length).toBe(3);
    });
  });

  describe('자동 만료', () => {
    it('cleanup()이 만료된 toast 제거', () => {
      vi.useFakeTimers();

      manager.show({ message: 'Short', duration: 1000 });
      manager.show({ message: 'Long', duration: 5000 });

      // 2초 경과
      vi.advanceTimersByTime(2000);

      const expired = manager.cleanup();
      expect(expired.length).toBe(1);
      expect(manager.getToasts().length).toBe(1);
      expect(manager.getToasts()[0].message).toBe('Long');

      vi.useRealTimers();
    });
  });

  describe('게임 이벤트 toast', () => {
    it('레벨업 toast', () => {
      const id = manager.success('🎖️ 관우 레벨 10 달성!');
      const toast = manager.getToastById(id);

      expect(toast?.type).toBe('success');
      expect(toast?.message).toContain('레벨');
    });

    it('장수 획득 toast', () => {
      const id = manager.success('🌟 SSR 제갈량 획득!');
      const toast = manager.getToastById(id);

      expect(toast?.type).toBe('success');
    });

    it('재화 부족 toast', () => {
      const id = manager.warning('💎 보석이 부족합니다');
      const toast = manager.getToastById(id);

      expect(toast?.type).toBe('warning');
    });

    it('네트워크 에러 toast', () => {
      const id = manager.error('🔌 연결이 끊어졌습니다');
      const toast = manager.getToastById(id);

      expect(toast?.type).toBe('error');
    });
  });
});

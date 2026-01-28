import { describe, it, expect, beforeEach } from 'vitest';

// FormationGuide 유틸리티
import { FormationGuide, ClassPlacementRecommendation, PlacementWarning } from '../../src/utils/FormationGuide';

/**
 * AC-FRM-10: 클래스 배치 권장
 * GIVEN 클래스별 권장 위치가 있을 때
 * WHEN 권장 위치가 아닌 곳에 배치하면
 * THEN 경고 메시지가 표시된다 (배치는 허용)
 */
describe('FormationGuide', () => {
  describe('클래스별 권장 위치', () => {
    it('맹장(warrior)은 전열/중열 권장', () => {
      const recommendation = FormationGuide.getRecommendation('warrior');
      expect(recommendation.recommendedRows).toContain(0); // 전열
      expect(recommendation.recommendedRows).toContain(1); // 중열
      expect(recommendation.recommendedRows).not.toContain(2); // 후열 비권장
    });

    it('방장(guardian)은 전열 권장', () => {
      const recommendation = FormationGuide.getRecommendation('guardian');
      expect(recommendation.recommendedRows).toEqual([0]); // 전열만
    });

    it('궁장(archer)은 후열 권장', () => {
      const recommendation = FormationGuide.getRecommendation('archer');
      expect(recommendation.recommendedRows).toEqual([2]); // 후열만
    });

    it('책사(strategist)는 후열 권장', () => {
      const recommendation = FormationGuide.getRecommendation('strategist');
      expect(recommendation.recommendedRows).toEqual([2]); // 후열만
    });

    it('기장(cavalry)은 중열 권장', () => {
      const recommendation = FormationGuide.getRecommendation('cavalry');
      expect(recommendation.recommendedRows).toEqual([1]); // 중열만
    });
  });

  describe('배치 검증', () => {
    it('권장 위치에 배치하면 경고 없음', () => {
      const warning = FormationGuide.validatePlacement('guardian', 0, 1);
      expect(warning).toBeNull();
    });

    it('방장을 후열에 배치하면 경고', () => {
      const warning = FormationGuide.validatePlacement('guardian', 2, 1);
      expect(warning).not.toBeNull();
      expect(warning!.severity).toBe('warning');
      expect(warning!.message).toContain('방장');
      expect(warning!.message).toContain('전열');
    });

    it('책사를 전열에 배치하면 경고', () => {
      const warning = FormationGuide.validatePlacement('strategist', 0, 1);
      expect(warning).not.toBeNull();
      expect(warning!.severity).toBe('warning');
      expect(warning!.message).toContain('책사');
      expect(warning!.message).toContain('후열');
    });

    it('궁장을 전열에 배치하면 경고', () => {
      const warning = FormationGuide.validatePlacement('archer', 0, 0);
      expect(warning).not.toBeNull();
      expect(warning!.message).toContain('궁장');
    });

    it('기장을 후열에 배치하면 경고', () => {
      const warning = FormationGuide.validatePlacement('cavalry', 2, 0);
      expect(warning).not.toBeNull();
      expect(warning!.message).toContain('기장');
    });

    it('맹장을 후열에 배치하면 경고', () => {
      const warning = FormationGuide.validatePlacement('warrior', 2, 1);
      expect(warning).not.toBeNull();
      expect(warning!.message).toContain('맹장');
    });

    it('맹장을 중열에 배치하면 경고 없음', () => {
      const warning = FormationGuide.validatePlacement('warrior', 1, 1);
      expect(warning).toBeNull();
    });
  });

  describe('진형 전체 검증', () => {
    it('올바른 진형은 경고 없음', () => {
      const placements = [
        { generalId: 'g1', className: 'guardian', row: 0, col: 0 },
        { generalId: 'g2', className: 'warrior', row: 0, col: 1 },
        { generalId: 'g3', className: 'guardian', row: 0, col: 2 },
        { generalId: 'g4', className: 'cavalry', row: 1, col: 1 },
        { generalId: 'g5', className: 'strategist', row: 2, col: 1 },
      ];
      
      const warnings = FormationGuide.validateFormation(placements);
      expect(warnings).toHaveLength(0);
    });

    it('잘못된 진형은 경고 반환', () => {
      const placements = [
        { generalId: 'g1', className: 'strategist', row: 0, col: 0 }, // 책사가 전열
        { generalId: 'g2', className: 'guardian', row: 2, col: 1 },   // 방장이 후열
      ];
      
      const warnings = FormationGuide.validateFormation(placements);
      expect(warnings.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('권장 위치 하이라이트', () => {
    it('클래스에 따른 권장 그리드 위치 반환', () => {
      const positions = FormationGuide.getHighlightedPositions('guardian');
      
      // 전열의 모든 열
      expect(positions).toContainEqual({ row: 0, col: 0 });
      expect(positions).toContainEqual({ row: 0, col: 1 });
      expect(positions).toContainEqual({ row: 0, col: 2 });
      
      // 중열, 후열은 포함하지 않음
      expect(positions).not.toContainEqual({ row: 1, col: 1 });
      expect(positions).not.toContainEqual({ row: 2, col: 1 });
    });

    it('기장은 중열 3칸 하이라이트', () => {
      const positions = FormationGuide.getHighlightedPositions('cavalry');
      expect(positions).toHaveLength(3);
      expect(positions.every(p => p.row === 1)).toBe(true);
    });

    it('맹장은 전열+중열 6칸 하이라이트', () => {
      const positions = FormationGuide.getHighlightedPositions('warrior');
      expect(positions).toHaveLength(6);
      expect(positions.filter(p => p.row === 0)).toHaveLength(3);
      expect(positions.filter(p => p.row === 1)).toHaveLength(3);
    });
  });

  describe('클래스 이름 한글 매핑', () => {
    it('영문 클래스명을 한글로 변환', () => {
      expect(FormationGuide.getClassName('warrior')).toBe('맹장');
      expect(FormationGuide.getClassName('guardian')).toBe('방장');
      expect(FormationGuide.getClassName('archer')).toBe('궁장');
      expect(FormationGuide.getClassName('strategist')).toBe('책사');
      expect(FormationGuide.getClassName('cavalry')).toBe('기장');
    });

    it('알 수 없는 클래스는 그대로 반환', () => {
      expect(FormationGuide.getClassName('unknown')).toBe('unknown');
    });
  });
});

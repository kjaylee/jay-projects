/**
 * 클래스 배치 권장 정보
 */
export interface ClassPlacementRecommendation {
  className: string;
  classNameKr: string;
  recommendedRows: number[];
  description: string;
}

/**
 * 배치 경고 메시지
 */
export interface PlacementWarning {
  generalId: string;
  className: string;
  actualRow: number;
  recommendedRows: number[];
  severity: 'warning' | 'info';
  message: string;
}

/**
 * 진형 배치 정보 (검증용)
 */
interface PlacementInfo {
  generalId: string;
  className: string;
  row: number;
  col: number;
}

/**
 * 그리드 위치
 */
interface GridPosition {
  row: number;
  col: number;
}

/**
 * 클래스별 권장 배치 정의
 * row: 0=전열, 1=중열, 2=후열
 */
const CLASS_RECOMMENDATIONS: Record<string, ClassPlacementRecommendation> = {
  warrior: {
    className: 'warrior',
    classNameKr: '맹장',
    recommendedRows: [0, 1], // 전열, 중열
    description: '물리 딜러 - 전열/중열 권장',
  },
  guardian: {
    className: 'guardian',
    classNameKr: '방장',
    recommendedRows: [0], // 전열만
    description: '탱커 - 전열 권장',
  },
  archer: {
    className: 'archer',
    classNameKr: '궁장',
    recommendedRows: [2], // 후열만
    description: '원거리 딜러 - 후열 권장',
  },
  strategist: {
    className: 'strategist',
    classNameKr: '책사',
    recommendedRows: [2], // 후열만
    description: '계략/지원 - 후열 권장',
  },
  cavalry: {
    className: 'cavalry',
    classNameKr: '기장',
    recommendedRows: [1], // 중열만
    description: '기병 돌격 - 중열 권장',
  },
};

/**
 * 행 이름 매핑
 */
const ROW_NAMES: Record<number, string> = {
  0: '전열',
  1: '중열',
  2: '후열',
};

/**
 * 진형 배치 가이드 유틸리티
 * AC-FRM-10: 클래스별 권장 위치가 아닌 곳에 배치하면 경고 표시 (배치는 허용)
 */
export class FormationGuide {
  /**
   * 클래스별 권장 배치 정보 조회
   */
  static getRecommendation(className: string): ClassPlacementRecommendation {
    const recommendation = CLASS_RECOMMENDATIONS[className];
    if (!recommendation) {
      return {
        className,
        classNameKr: className,
        recommendedRows: [0, 1, 2], // 모든 행 허용
        description: '권장 배치 정보 없음',
      };
    }
    return recommendation;
  }

  /**
   * 단일 배치 검증
   * @returns 경고 메시지 (권장 위치면 null)
   */
  static validatePlacement(
    className: string,
    row: number,
    col: number
  ): PlacementWarning | null {
    const recommendation = this.getRecommendation(className);

    if (recommendation.recommendedRows.includes(row)) {
      return null; // 권장 위치 - 경고 없음
    }

    // 권장 위치 이름 생성
    const recommendedRowNames = recommendation.recommendedRows
      .map((r) => ROW_NAMES[r])
      .join('/');

    return {
      generalId: '', // validateFormation에서 채움
      className,
      actualRow: row,
      recommendedRows: recommendation.recommendedRows,
      severity: 'warning',
      message: `${recommendation.classNameKr}은(는) ${recommendedRowNames}에 배치하는 것이 좋습니다.`,
    };
  }

  /**
   * 진형 전체 검증
   * @returns 경고 메시지 배열
   */
  static validateFormation(placements: PlacementInfo[]): PlacementWarning[] {
    const warnings: PlacementWarning[] = [];

    for (const placement of placements) {
      const warning = this.validatePlacement(
        placement.className,
        placement.row,
        placement.col
      );

      if (warning) {
        warning.generalId = placement.generalId;
        warnings.push(warning);
      }
    }

    return warnings;
  }

  /**
   * 클래스에 따른 권장 그리드 위치 반환 (하이라이트용)
   */
  static getHighlightedPositions(className: string): GridPosition[] {
    const recommendation = this.getRecommendation(className);
    const positions: GridPosition[] = [];

    for (const row of recommendation.recommendedRows) {
      for (let col = 0; col < 3; col++) {
        positions.push({ row, col });
      }
    }

    return positions;
  }

  /**
   * 영문 클래스명을 한글로 변환
   */
  static getClassName(className: string): string {
    const recommendation = CLASS_RECOMMENDATIONS[className];
    return recommendation?.classNameKr ?? className;
  }

  /**
   * 모든 클래스 권장 정보 조회
   */
  static getAllRecommendations(): ClassPlacementRecommendation[] {
    return Object.values(CLASS_RECOMMENDATIONS);
  }

  /**
   * 행 번호를 이름으로 변환
   */
  static getRowName(row: number): string {
    return ROW_NAMES[row] ?? `행 ${row}`;
  }
}

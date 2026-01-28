export interface Position {
  row: number;
  col: number;
  generalId: string;
}

export interface FormationJSON {
  userId: string;
  positions: Position[];
}

export interface SynergyResult {
  attackBonus: number;
  defenseBonus: number;
  classBonus: number;
  factionBonus: number;
  details: SynergyDetail[];
}

export interface SynergyDetail {
  type: 'faction' | 'class';
  name: string;
  count: number;
  bonus: number;
  description: string;
}

const GRID_SIZE = 3;

/**
 * 세력 시너지 보너스 테이블
 * 2명: 5%, 3명: 12%, 4명: 20%, 5명+: 30%
 */
const FACTION_SYNERGY_TABLE: Record<number, { bonus: number; desc: string }> = {
  2: { bonus: 0.05, desc: '공격력 +5%' },
  3: { bonus: 0.12, desc: '공격력 +12%' },
  4: { bonus: 0.20, desc: '공격력 +20%' },
  5: { bonus: 0.30, desc: '공격력 +30%' },
};

/**
 * 클래스 시너지 보너스 테이블
 */
const CLASS_SYNERGY_TABLE: Record<string, Record<number, { bonus: number; stat: string; desc: string }>> = {
  warrior: {
    2: { bonus: 0.08, stat: 'attack', desc: '공격력 +8%' },
    3: { bonus: 0.15, stat: 'attack', desc: '공격력 +15%' },
  },
  cavalry: {
    2: { bonus: 0.06, stat: 'speed', desc: '속도 +6%' },
    3: { bonus: 0.12, stat: 'speed', desc: '속도 +12%' },
  },
  strategist: {
    2: { bonus: 0.08, stat: 'intelligence', desc: '지력 +8%' },
    3: { bonus: 0.15, stat: 'intelligence', desc: '지력 +15%' },
  },
  archer: {
    2: { bonus: 0.05, stat: 'attack', desc: '공격력 +5%, 치명타 +5%' },
    3: { bonus: 0.10, stat: 'attack', desc: '공격력 +10%, 치명타 +10%' },
  },
  shield: {
    2: { bonus: 0.10, stat: 'defense', desc: '방어력 +10%' },
    3: { bonus: 0.20, stat: 'defense', desc: '방어력 +20%' },
  },
};

/**
 * 진형 클래스 (3x3 그리드)
 */
export class Formation {
  public readonly userId: string;
  private grid: (string | null)[][];

  constructor(userId: string, positions?: Position[]) {
    this.userId = userId;
    this.grid = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(null));

    if (positions) {
      for (const pos of positions) {
        this.placeUnit(pos.generalId, pos.row, pos.col);
      }
    }
  }

  /**
   * 그리드 크기
   */
  getSize(): number {
    return GRID_SIZE * GRID_SIZE;
  }

  /**
   * 배치된 유닛 수
   */
  getUnitCount(): number {
    let count = 0;
    for (const row of this.grid) {
      for (const cell of row) {
        if (cell !== null) count++;
      }
    }
    return count;
  }

  /**
   * 유닛 배치
   */
  placeUnit(generalId: string, row: number, col: number): boolean {
    // 범위 검사
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
      return false;
    }

    // 이미 점유된 위치
    if (this.grid[row][col] !== null) {
      return false;
    }

    // 같은 장수 중복 배치 검사
    if (this.hasUnit(generalId)) {
      return false;
    }

    this.grid[row][col] = generalId;
    return true;
  }

  /**
   * 특정 장수가 이미 배치되어 있는지
   */
  hasUnit(generalId: string): boolean {
    for (const row of this.grid) {
      if (row.includes(generalId)) return true;
    }
    return false;
  }

  /**
   * 특정 위치의 유닛 조회
   */
  getUnitAt(row: number, col: number): string | null {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
      return null;
    }
    return this.grid[row][col];
  }

  /**
   * 유닛 제거
   */
  removeUnit(row: number, col: number): string | null {
    const unit = this.getUnitAt(row, col);
    if (unit !== null) {
      this.grid[row][col] = null;
    }
    return unit;
  }

  /**
   * 유닛 이동 (빈 위치면 이동, 점유되면 스왑)
   */
  moveUnit(fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    const fromUnit = this.getUnitAt(fromRow, fromCol);
    if (fromUnit === null) return false;

    if (toRow < 0 || toRow >= GRID_SIZE || toCol < 0 || toCol >= GRID_SIZE) {
      return false;
    }

    const toUnit = this.getUnitAt(toRow, toCol);

    // 스왑 또는 이동
    this.grid[fromRow][fromCol] = toUnit;
    this.grid[toRow][toCol] = fromUnit;

    return true;
  }

  /**
   * 특정 행의 모든 유닛 조회
   */
  getRow(row: number): string[] {
    if (row < 0 || row >= GRID_SIZE) return [];
    return this.grid[row].filter((cell): cell is string => cell !== null);
  }

  /**
   * 특정 열의 모든 유닛 조회
   */
  getColumn(col: number): string[] {
    if (col < 0 || col >= GRID_SIZE) return [];
    return this.grid.map((row) => row[col]).filter((cell): cell is string => cell !== null);
  }

  /**
   * 모든 유닛 조회
   */
  getAllUnits(): string[] {
    const units: string[] = [];
    for (const row of this.grid) {
      for (const cell of row) {
        if (cell !== null) units.push(cell);
      }
    }
    return units;
  }

  /**
   * 진형이 가득 찼는지
   */
  isFull(): boolean {
    return this.getUnitCount() === GRID_SIZE * GRID_SIZE;
  }

  /**
   * 진형 유효성 검사 (최소 1명 필요)
   */
  isValid(): boolean {
    return this.getUnitCount() > 0;
  }

  /**
   * 시너지 계산 (2/3/4/5명 단계별)
   */
  calculateSynergy(
    factions: Record<string, string> = {},
    classes: Record<string, string> = {}
  ): SynergyResult {
    const units = this.getAllUnits();
    let attackBonus = 0;
    let defenseBonus = 0;
    let factionBonus = 0;
    let classBonus = 0;
    const details: SynergyDetail[] = [];

    // 세력 시너지 계산
    const factionCounts: Record<string, number> = {};
    for (const unitId of units) {
      const faction = factions[unitId];
      if (faction) {
        factionCounts[faction] = (factionCounts[faction] || 0) + 1;
      }
    }

    for (const [factionName, count] of Object.entries(factionCounts)) {
      // 가장 높은 단계 보너스 적용
      const tier = Math.min(count, 5);
      const synergyData = FACTION_SYNERGY_TABLE[tier];
      if (synergyData) {
        attackBonus += synergyData.bonus;
        factionBonus += synergyData.bonus;
        details.push({
          type: 'faction',
          name: factionName,
          count,
          bonus: synergyData.bonus,
          description: synergyData.desc,
        });
      }
    }

    // 클래스 시너지 계산
    const classCounts: Record<string, number> = {};
    for (const unitId of units) {
      const cls = classes[unitId];
      if (cls) {
        classCounts[cls] = (classCounts[cls] || 0) + 1;
      }
    }

    for (const [className, count] of Object.entries(classCounts)) {
      const classData = CLASS_SYNERGY_TABLE[className];
      if (!classData) continue;
      
      // 가장 높은 단계 보너스 적용
      const tier = Math.min(count, 3);
      const synergyData = classData[tier];
      if (synergyData) {
        if (synergyData.stat === 'attack') {
          attackBonus += synergyData.bonus;
        } else if (synergyData.stat === 'defense') {
          defenseBonus += synergyData.bonus;
        }
        classBonus += synergyData.bonus;
        
        details.push({
          type: 'class',
          name: className,
          count,
          bonus: synergyData.bonus,
          description: synergyData.desc,
        });
      }
    }

    return {
      attackBonus,
      defenseBonus,
      classBonus,
      factionBonus,
      details,
    };
  }

  /**
   * JSON 변환
   */
  toJSON(): FormationJSON {
    const positions: Position[] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const generalId = this.grid[row][col];
        if (generalId !== null) {
          positions.push({ row, col, generalId });
        }
      }
    }
    return { userId: this.userId, positions };
  }

  /**
   * JSON에서 복원
   */
  static fromJSON(json: FormationJSON): Formation {
    return new Formation(json.userId, json.positions);
  }
}

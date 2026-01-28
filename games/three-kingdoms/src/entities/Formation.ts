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
}

const GRID_SIZE = 3;
const FACTION_SYNERGY_THRESHOLD = 3;
const CLASS_SYNERGY_THRESHOLD = 3;
const FACTION_BONUS = 0.1;
const CLASS_BONUS = 0.1;

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
   * 시너지 계산
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

    // 세력 시너지 계산
    const factionCounts: Record<string, number> = {};
    for (const unitId of units) {
      const faction = factions[unitId];
      if (faction) {
        factionCounts[faction] = (factionCounts[faction] || 0) + 1;
      }
    }

    for (const count of Object.values(factionCounts)) {
      if (count >= FACTION_SYNERGY_THRESHOLD) {
        attackBonus += FACTION_BONUS;
        factionBonus += FACTION_BONUS;
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

    for (const count of Object.values(classCounts)) {
      if (count >= CLASS_SYNERGY_THRESHOLD) {
        classBonus += CLASS_BONUS;
      }
    }

    return {
      attackBonus,
      defenseBonus,
      classBonus,
      factionBonus,
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

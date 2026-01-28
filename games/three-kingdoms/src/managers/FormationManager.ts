import { Formation, FormationJSON, Position } from '../entities/Formation';

export interface FormationSlot {
  slotId: number;       // 0-4
  slotName: string;     // 사용자 지정 이름
  formation: Formation;
}

export interface FormationManagerJSON {
  userId: string;
  activeSlotId: number;
  slots: Array<{
    slotId: number;
    slotName: string;
    formation: FormationJSON;
  }>;
}

const MAX_SLOTS = 5;
const DEFAULT_SLOT_NAMES = ['진형 1', '진형 2', '진형 3', '진형 4', '진형 5'];
const STORAGE_KEY_PREFIX = 'formationSlots_';

/**
 * 다중 진형 슬롯 관리 클래스
 * - 5개의 진형 프리셋 슬롯 관리
 * - LocalStorage 저장/로드
 * - 슬롯 간 전환
 */
export class FormationManager {
  public readonly userId: string;
  private slots: FormationSlot[];
  private activeSlotId: number;

  constructor(userId: string) {
    this.userId = userId;
    this.slots = [];
    this.activeSlotId = 0;
    
    // 빈 슬롯들 초기화
    for (let i = 0; i < MAX_SLOTS; i++) {
      this.slots.push({
        slotId: i,
        slotName: DEFAULT_SLOT_NAMES[i],
        formation: new Formation(userId),
      });
    }
  }

  /**
   * 최대 슬롯 수
   */
  static getMaxSlots(): number {
    return MAX_SLOTS;
  }

  /**
   * 모든 슬롯 조회
   */
  getAllSlots(): FormationSlot[] {
    return [...this.slots];
  }

  /**
   * 특정 슬롯 조회
   */
  getSlot(slotId: number): FormationSlot | null {
    if (slotId < 0 || slotId >= MAX_SLOTS) {
      return null;
    }
    return this.slots[slotId];
  }

  /**
   * 현재 활성 슬롯 조회
   */
  getActiveSlot(): FormationSlot {
    return this.slots[this.activeSlotId];
  }

  /**
   * 현재 활성 슬롯 ID
   */
  getActiveSlotId(): number {
    return this.activeSlotId;
  }

  /**
   * 활성 슬롯 변경
   */
  setActiveSlot(slotId: number): boolean {
    if (slotId < 0 || slotId >= MAX_SLOTS) {
      return false;
    }
    this.activeSlotId = slotId;
    return true;
  }

  /**
   * 슬롯 이름 변경
   */
  setSlotName(slotId: number, name: string): boolean {
    if (slotId < 0 || slotId >= MAX_SLOTS) {
      return false;
    }
    const trimmedName = name.trim();
    if (trimmedName.length === 0 || trimmedName.length > 20) {
      return false;
    }
    this.slots[slotId].slotName = trimmedName;
    return true;
  }

  /**
   * 특정 슬롯의 진형 가져오기
   */
  getFormation(slotId: number): Formation | null {
    const slot = this.getSlot(slotId);
    return slot ? slot.formation : null;
  }

  /**
   * 현재 활성 진형 가져오기
   */
  getActiveFormation(): Formation {
    return this.slots[this.activeSlotId].formation;
  }

  /**
   * 특정 슬롯에 진형 설정
   */
  setFormation(slotId: number, formation: Formation): boolean {
    if (slotId < 0 || slotId >= MAX_SLOTS) {
      return false;
    }
    this.slots[slotId].formation = formation;
    return true;
  }

  /**
   * 슬롯 초기화 (빈 진형으로)
   */
  clearSlot(slotId: number): boolean {
    if (slotId < 0 || slotId >= MAX_SLOTS) {
      return false;
    }
    this.slots[slotId].formation = new Formation(this.userId);
    return true;
  }

  /**
   * 슬롯 간 복사
   */
  copySlot(fromSlotId: number, toSlotId: number): boolean {
    if (fromSlotId < 0 || fromSlotId >= MAX_SLOTS) return false;
    if (toSlotId < 0 || toSlotId >= MAX_SLOTS) return false;
    if (fromSlotId === toSlotId) return false;

    const sourceFormation = this.slots[fromSlotId].formation;
    const copiedFormation = Formation.fromJSON({
      ...sourceFormation.toJSON(),
      userId: this.userId,
    });
    this.slots[toSlotId].formation = copiedFormation;
    return true;
  }

  /**
   * 유효한 슬롯 수 (1명 이상 배치된)
   */
  getValidSlotCount(): number {
    return this.slots.filter(slot => slot.formation.isValid()).length;
  }

  /**
   * JSON 직렬화
   */
  toJSON(): FormationManagerJSON {
    return {
      userId: this.userId,
      activeSlotId: this.activeSlotId,
      slots: this.slots.map(slot => ({
        slotId: slot.slotId,
        slotName: slot.slotName,
        formation: slot.formation.toJSON(),
      })),
    };
  }

  /**
   * JSON에서 복원
   */
  static fromJSON(json: FormationManagerJSON): FormationManager {
    const manager = new FormationManager(json.userId);
    manager.activeSlotId = json.activeSlotId;

    json.slots.forEach((slotData, index) => {
      if (index < MAX_SLOTS) {
        manager.slots[index] = {
          slotId: slotData.slotId,
          slotName: slotData.slotName,
          formation: Formation.fromJSON(slotData.formation),
        };
      }
    });

    return manager;
  }

  /**
   * LocalStorage에 저장
   */
  save(): void {
    const key = STORAGE_KEY_PREFIX + this.userId;
    const json = JSON.stringify(this.toJSON());
    localStorage.setItem(key, json);
  }

  /**
   * LocalStorage에서 로드
   */
  static load(userId: string): FormationManager {
    const key = STORAGE_KEY_PREFIX + userId;
    const saved = localStorage.getItem(key);

    if (saved) {
      try {
        const json = JSON.parse(saved) as FormationManagerJSON;
        return FormationManager.fromJSON(json);
      } catch (e) {
        console.error('Failed to load formation slots:', e);
      }
    }

    // 기존 단일 진형 마이그레이션
    const legacyKey = `formation_${userId}`;
    const legacySaved = localStorage.getItem(legacyKey);
    
    const manager = new FormationManager(userId);
    
    if (legacySaved) {
      try {
        const legacyJson = JSON.parse(legacySaved) as FormationJSON;
        manager.slots[0].formation = Formation.fromJSON(legacyJson);
        manager.slots[0].slotName = '기본 진형';
        // 마이그레이션 후 새 형식으로 저장
        manager.save();
      } catch (e) {
        console.error('Failed to migrate legacy formation:', e);
      }
    }

    return manager;
  }

  /**
   * 기존 단일 진형 저장 형식과의 호환을 위한 메서드
   * (다른 씬에서 사용할 수 있도록)
   */
  saveActiveFormationLegacy(): void {
    const legacyKey = `formation_${this.userId}`;
    const activeFormation = this.getActiveFormation();
    localStorage.setItem(legacyKey, JSON.stringify(activeFormation.toJSON()));
  }
}

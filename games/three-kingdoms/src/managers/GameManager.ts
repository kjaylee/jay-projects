import { supabase, isOnline } from '../services/SupabaseClient';

export interface UserData {
  id: string;
  nickname: string;
  level: number;
  gold: number;
  gems: number;
  stamina: number;
  vipLevel: number;
  maxClearedStage: string | null;
  clearedStages: string[];
}

export interface ResourceChangeEvent {
  previous: number;
  current: number;
  delta: number;
}

export type GameEventType = 'goldChanged' | 'gemsChanged' | 'staminaChanged';
export type GameEventCallback = (event: ResourceChangeEvent) => void;

const MAX_STAMINA = 200;

export class GameManager {
  private static instance: GameManager;
  private userData: UserData | null = null;
  private isGuest: boolean = false;
  private eventListeners: Map<GameEventType, Set<GameEventCallback>> = new Map();

  private constructor() {}

  static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  async init(userId: string, isGuest: boolean): Promise<void> {
    this.isGuest = isGuest;

    if (isGuest) {
      this.userData = this.loadGuestData(userId);
    } else if (isOnline()) {
      await this.loadUserData(userId);
    }
  }

  private loadGuestData(guestId: string): UserData {
    const saved = localStorage.getItem(`userData_${guestId}`);
    if (saved) {
      return JSON.parse(saved);
    }

    const newUser: UserData = {
      id: guestId,
      nickname: '무명의 군주',
      level: 1,
      gold: 10000,
      gems: 100,
      stamina: 50,
      vipLevel: 0,
      maxClearedStage: null,
      clearedStages: [],
    };

    this.saveGuestData(guestId, newUser);
    return newUser;
  }

  private saveGuestData(guestId: string, data: UserData): void {
    localStorage.setItem(`userData_${guestId}`, JSON.stringify(data));
  }

  private async loadUserData(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      // 새 유저 생성
      await this.createNewUser(userId);
    } else {
      this.userData = {
        id: data.id,
        nickname: data.nickname,
        level: data.level,
        gold: data.gold,
        gems: data.gems,
        stamina: data.stamina,
        vipLevel: data.vip_level,
        maxClearedStage: data.max_cleared_stage ?? null,
        clearedStages: data.cleared_stages ?? [],
      };
    }
  }

  private async createNewUser(userId: string): Promise<void> {
    const newUser = {
      id: userId,
      nickname: '무명의 군주',
      level: 1,
      gold: 10000,
      gems: 100,
      stamina: 50,
      vip_level: 0,
      max_cleared_stage: null,
      cleared_stages: [],
      last_login: new Date().toISOString(),
    };

    await supabase.from('users').insert(newUser);
    this.userData = {
      id: newUser.id,
      nickname: newUser.nickname,
      level: newUser.level,
      gold: newUser.gold,
      gems: newUser.gems,
      stamina: newUser.stamina,
      vipLevel: newUser.vip_level,
      maxClearedStage: newUser.max_cleared_stage,
      clearedStages: newUser.cleared_stages,
    };
  }

  getUserData(): UserData | null {
    return this.userData;
  }

  async updateGold(amount: number): Promise<void> {
    if (!this.userData) return;
    
    this.userData.gold += amount;
    
    if (this.isGuest) {
      this.saveGuestData(this.userData.id, this.userData);
    } else {
      await supabase
        .from('users')
        .update({ gold: this.userData.gold })
        .eq('id', this.userData.id);
    }
  }

  /**
   * 골드 추가
   * @param amount 추가할 골드 양 (양수)
   */
  async addGold(amount: number): Promise<void> {
    if (!this.userData || amount <= 0) return;

    const previous = this.userData.gold;
    this.userData.gold += amount;

    if (this.isGuest) {
      this.saveGuestData(this.userData.id, this.userData);
    } else {
      await supabase
        .from('users')
        .update({ gold: this.userData.gold })
        .eq('id', this.userData.id);
    }

    this.emit('goldChanged', { previous, current: this.userData.gold, delta: amount });
  }

  /**
   * 보석 추가
   * @param amount 추가할 보석 양 (양수)
   */
  async addGems(amount: number): Promise<void> {
    if (!this.userData || amount <= 0) return;

    const previous = this.userData.gems;
    this.userData.gems += amount;
    
    if (this.isGuest) {
      this.saveGuestData(this.userData.id, this.userData);
    } else {
      await supabase
        .from('users')
        .update({ gems: this.userData.gems })
        .eq('id', this.userData.id);
    }

    this.emit('gemsChanged', { previous, current: this.userData.gems, delta: amount });
  }

  /**
   * 스테이지가 이미 클리어되었는지 확인
   * @param stageId 확인할 스테이지 ID
   */
  isStageCleared(stageId: string): boolean {
    if (!this.userData) return false;
    return this.userData.clearedStages.includes(stageId);
  }

  /**
   * 첫 클리어인지 확인
   * @param stageId 확인할 스테이지 ID
   */
  isFirstClear(stageId: string): boolean {
    return !this.isStageCleared(stageId);
  }

  /**
   * 스테이지 클리어 기록
   * @param stageId 클리어한 스테이지 ID
   */
  async recordStageClear(stageId: string): Promise<void> {
    if (!this.userData) return;
    
    // 이미 클리어한 스테이지면 스킵
    if (this.userData.clearedStages.includes(stageId)) return;

    // 클리어 기록 추가
    this.userData.clearedStages.push(stageId);
    
    // maxClearedStage 업데이트 (스테이지 ID 비교로 최고 기록 갱신)
    if (!this.userData.maxClearedStage || this.compareStageId(stageId, this.userData.maxClearedStage) > 0) {
      this.userData.maxClearedStage = stageId;
    }

    if (this.isGuest) {
      this.saveGuestData(this.userData.id, this.userData);
    } else {
      await supabase
        .from('users')
        .update({
          cleared_stages: this.userData.clearedStages,
          max_cleared_stage: this.userData.maxClearedStage,
        })
        .eq('id', this.userData.id);
    }
  }

  /**
   * 스테이지 ID 비교 (챕터-스테이지 형식: "1-5")
   * @returns 양수면 a가 더 높은 스테이지, 음수면 b가 더 높음
   */
  private compareStageId(a: string, b: string): number {
    const parseStage = (id: string) => {
      const parts = id.split('-');
      return {
        chapter: parseInt(parts[0], 10) || 0,
        stage: parseInt(parts[1], 10) || 0,
      };
    };

    const stageA = parseStage(a);
    const stageB = parseStage(b);

    if (stageA.chapter !== stageB.chapter) {
      return stageA.chapter - stageB.chapter;
    }
    return stageA.stage - stageB.stage;
  }

  /**
   * 플레이어 데이터 조회 (보상 시스템용)
   */
  getPlayerData(): { gold: number; gems: number; maxClearedStage: string | null } | null {
    if (!this.userData) return null;
    return {
      gold: this.userData.gold,
      gems: this.userData.gems,
      maxClearedStage: this.userData.maxClearedStage,
    };
  }

  // ============ 스태미나 관리 ============

  /**
   * 현재 스태미나 조회
   */
  getStamina(): number {
    return this.userData?.stamina ?? 0;
  }

  /**
   * 스태미나 보유 여부 확인
   */
  hasStamina(amount: number): boolean {
    return (this.userData?.stamina ?? 0) >= amount;
  }

  /**
   * 스태미나 추가 (최대 200 제한)
   */
  async addStamina(amount: number): Promise<void> {
    if (!this.userData || amount <= 0) return;

    const previous = this.userData.stamina;
    this.userData.stamina = Math.min(this.userData.stamina + amount, MAX_STAMINA);
    const delta = this.userData.stamina - previous;

    if (delta > 0) {
      if (this.isGuest) {
        this.saveGuestData(this.userData.id, this.userData);
      } else {
        await supabase
          .from('users')
          .update({ stamina: this.userData.stamina })
          .eq('id', this.userData.id);
      }
      this.emit('staminaChanged', { previous, current: this.userData.stamina, delta });
    }
  }

  /**
   * 스태미나 소모
   * @returns 성공 여부
   */
  async useStamina(amount: number): Promise<boolean> {
    if (!this.userData || amount <= 0) return false;
    if (this.userData.stamina < amount) return false;

    const previous = this.userData.stamina;
    this.userData.stamina -= amount;

    if (this.isGuest) {
      this.saveGuestData(this.userData.id, this.userData);
    } else {
      await supabase
        .from('users')
        .update({ stamina: this.userData.stamina })
        .eq('id', this.userData.id);
    }

    this.emit('staminaChanged', { previous, current: this.userData.stamina, delta: -amount });
    return true;
  }

  // ============ 자원 소모 CRUD ============

  /**
   * 골드 보유 여부 확인
   */
  hasGold(amount: number): boolean {
    return (this.userData?.gold ?? 0) >= amount;
  }

  /**
   * 골드 소모
   * @returns 성공 여부
   */
  async spendGold(amount: number): Promise<boolean> {
    if (!this.userData || amount <= 0) return false;
    if (this.userData.gold < amount) return false;

    const previous = this.userData.gold;
    this.userData.gold -= amount;

    if (this.isGuest) {
      this.saveGuestData(this.userData.id, this.userData);
    } else {
      await supabase
        .from('users')
        .update({ gold: this.userData.gold })
        .eq('id', this.userData.id);
    }

    this.emit('goldChanged', { previous, current: this.userData.gold, delta: -amount });
    return true;
  }

  /**
   * 보석 보유 여부 확인
   */
  hasGems(amount: number): boolean {
    return (this.userData?.gems ?? 0) >= amount;
  }

  /**
   * 보석 소모
   * @returns 성공 여부
   */
  async spendGems(amount: number): Promise<boolean> {
    if (!this.userData || amount <= 0) return false;
    if (this.userData.gems < amount) return false;

    const previous = this.userData.gems;
    this.userData.gems -= amount;

    if (this.isGuest) {
      this.saveGuestData(this.userData.id, this.userData);
    } else {
      await supabase
        .from('users')
        .update({ gems: this.userData.gems })
        .eq('id', this.userData.id);
    }

    this.emit('gemsChanged', { previous, current: this.userData.gems, delta: -amount });
    return true;
  }

  // ============ 이벤트 시스템 ============

  /**
   * 이벤트 리스너 등록
   */
  on(eventType: GameEventType, callback: GameEventCallback): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(callback);
  }

  /**
   * 이벤트 리스너 제거
   */
  off(eventType: GameEventType, callback: GameEventCallback): void {
    this.eventListeners.get(eventType)?.delete(callback);
  }

  /**
   * 이벤트 발행
   */
  private emit(eventType: GameEventType, event: ResourceChangeEvent): void {
    this.eventListeners.get(eventType)?.forEach(callback => callback(event));
  }

  // ============ 기존 메소드 이벤트 보강 ============

  /**
   * 골드 변경 (이벤트 발행 버전)
   */
  async updateGoldWithEvent(amount: number): Promise<void> {
    if (!this.userData) return;

    const previous = this.userData.gold;
    this.userData.gold += amount;

    if (this.isGuest) {
      this.saveGuestData(this.userData.id, this.userData);
    } else {
      await supabase
        .from('users')
        .update({ gold: this.userData.gold })
        .eq('id', this.userData.id);
    }

    this.emit('goldChanged', { previous, current: this.userData.gold, delta: amount });
  }
}

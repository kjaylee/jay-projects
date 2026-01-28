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

export class GameManager {
  private static instance: GameManager;
  private userData: UserData | null = null;
  private isGuest: boolean = false;

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
    await this.updateGold(amount);
  }

  /**
   * 보석 추가
   * @param amount 추가할 보석 양 (양수)
   */
  async addGems(amount: number): Promise<void> {
    if (!this.userData || amount <= 0) return;
    
    this.userData.gems += amount;
    
    if (this.isGuest) {
      this.saveGuestData(this.userData.id, this.userData);
    } else {
      await supabase
        .from('users')
        .update({ gems: this.userData.gems })
        .eq('id', this.userData.id);
    }
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
}

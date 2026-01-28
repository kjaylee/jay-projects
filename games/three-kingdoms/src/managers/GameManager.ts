import { supabase, isOnline } from '../services/SupabaseClient';

export interface UserData {
  id: string;
  nickname: string;
  level: number;
  gold: number;
  gems: number;
  stamina: number;
  vipLevel: number;
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
}

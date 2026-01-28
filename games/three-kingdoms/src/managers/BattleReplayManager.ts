/**
 * BattleReplayManager - 전투 리플레이 시스템
 * 
 * 기능:
 * - 전투 행동 기록 (녹화)
 * - 리플레이 저장/로드
 * - 리플레이 재생 (단계별)
 * - JSON 내보내기/가져오기
 */

// 행동 타입 정의
export type ActionType = 
  | 'attack' 
  | 'skill' 
  | 'buff' 
  | 'debuff' 
  | 'heal' 
  | 'death' 
  | 'turn_start' 
  | 'turn_end' 
  | 'battle_start' 
  | 'battle_end';

// 행동 기록 인터페이스
export interface BattleAction {
  turnNumber: number;
  actionType: ActionType;
  actorId: string;
  targetIds: string[];
  skillId?: string;
  damage?: number;
  heal?: number;
  buffId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// 리플레이 데이터 인터페이스
export interface BattleReplayData {
  id: string;
  stageId: string;
  startTime: number;
  endTime?: number;
  result?: 'victory' | 'defeat' | 'draw';
  allyFormation: { generalId: string; position: { row: number; col: number } }[];
  enemyUnits: { unitId: string; name: string; position: { row: number; col: number } }[];
  actions: BattleAction[];
  version: string;
}

// 리플레이 통계 인터페이스
export interface ReplayStats {
  totalTurns: number;
  totalActions: number;
  duration: number;
}

/**
 * 전투 리플레이 매니저
 */
export class BattleReplayManager {
  private currentReplay: BattleReplayData | null = null;
  private isRecording: boolean = false;
  private savedReplays: Map<string, BattleReplayData> = new Map();
  private playbackIndex: number = 0;
  private isPlaying: boolean = false;

  private static readonly VERSION = '1.0.0';
  private static readonly STORAGE_KEY = 'battle_replays';

  /**
   * 녹화 시작
   * @param stageId 스테이지 ID
   * @param allyFormation 아군 진형 정보
   * @param enemyUnits 적군 유닛 정보
   * @returns 리플레이 ID
   */
  startRecording(
    stageId: string, 
    allyFormation: BattleReplayData['allyFormation'], 
    enemyUnits: BattleReplayData['enemyUnits']
  ): string {
    const replayId = `replay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentReplay = {
      id: replayId,
      stageId,
      startTime: Date.now(),
      allyFormation,
      enemyUnits,
      actions: [],
      version: BattleReplayManager.VERSION,
    };
    
    this.isRecording = true;
    console.log(`🎬 전투 녹화 시작: ${replayId}`);
    
    return replayId;
  }

  /**
   * 녹화 중지 및 저장
   * @param result 전투 결과
   * @returns 저장된 리플레이 데이터 (녹화 중이 아니면 null)
   */
  stopRecording(result: 'victory' | 'defeat' | 'draw'): BattleReplayData | null {
    if (!this.currentReplay || !this.isRecording) {
      return null;
    }

    this.currentReplay.endTime = Date.now();
    this.currentReplay.result = result;
    this.isRecording = false;
    
    // 저장
    this.savedReplays.set(this.currentReplay.id, { ...this.currentReplay });
    
    console.log(`🎬 전투 녹화 완료: ${this.currentReplay.id} (${result})`);
    
    const replay = this.currentReplay;
    this.currentReplay = null;
    return replay;
  }

  /**
   * 행동 기록
   * @param action 기록할 행동 (timestamp 제외)
   * @returns 성공 여부
   */
  recordAction(action: Omit<BattleAction, 'timestamp'>): boolean {
    if (!this.currentReplay || !this.isRecording) {
      return false;
    }

    this.currentReplay.actions.push({
      ...action,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * 녹화 중인지 확인
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * 현재 리플레이 데이터 가져오기
   */
  getCurrentReplay(): BattleReplayData | null {
    return this.currentReplay;
  }

  /**
   * 저장된 리플레이 가져오기
   * @param replayId 리플레이 ID
   */
  getReplay(replayId: string): BattleReplayData | undefined {
    return this.savedReplays.get(replayId);
  }

  /**
   * 모든 저장된 리플레이 ID 가져오기
   */
  getAllReplayIds(): string[] {
    return Array.from(this.savedReplays.keys());
  }

  /**
   * 리플레이 삭제
   * @param replayId 삭제할 리플레이 ID
   * @returns 삭제 성공 여부
   */
  deleteReplay(replayId: string): boolean {
    return this.savedReplays.delete(replayId);
  }

  /**
   * 리플레이 재생 시작
   * @param replayId 재생할 리플레이 ID
   * @returns 성공 여부
   */
  startPlayback(replayId: string): boolean {
    const replay = this.savedReplays.get(replayId);
    if (!replay) {
      return false;
    }

    this.currentReplay = replay;
    this.playbackIndex = 0;
    this.isPlaying = true;
    
    console.log(`▶️ 리플레이 재생 시작: ${replayId}`);
    
    return true;
  }

  /**
   * 다음 행동 가져오기
   * @returns 다음 행동 (재생 종료 시 null)
   */
  getNextAction(): BattleAction | null {
    if (!this.isPlaying || !this.currentReplay) {
      return null;
    }

    if (this.playbackIndex >= this.currentReplay.actions.length) {
      this.isPlaying = false;
      return null;
    }

    return this.currentReplay.actions[this.playbackIndex++];
  }

  /**
   * 특정 턴의 행동들 가져오기
   * @param turnNumber 턴 번호
   */
  getActionsForTurn(turnNumber: number): BattleAction[] {
    if (!this.currentReplay) {
      return [];
    }
    return this.currentReplay.actions.filter(a => a.turnNumber === turnNumber);
  }

  /**
   * 재생 중인지 확인
   */
  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * 재생 중지
   */
  stopPlayback(): void {
    this.isPlaying = false;
    this.playbackIndex = 0;
    this.currentReplay = null;
  }

  /**
   * 재생 진행률 (0~1)
   */
  getPlaybackProgress(): number {
    if (!this.currentReplay || this.currentReplay.actions.length === 0) {
      return 0;
    }
    return this.playbackIndex / this.currentReplay.actions.length;
  }

  /**
   * 리플레이 JSON 내보내기
   * @param replayId 내보낼 리플레이 ID
   * @returns JSON 문자열 (없으면 null)
   */
  exportReplay(replayId: string): string | null {
    const replay = this.savedReplays.get(replayId);
    if (!replay) {
      return null;
    }
    return JSON.stringify(replay);
  }

  /**
   * 리플레이 JSON 가져오기
   * @param jsonData JSON 문자열
   * @returns 가져온 리플레이 ID (실패 시 null)
   */
  importReplay(jsonData: string): string | null {
    try {
      const replay: BattleReplayData = JSON.parse(jsonData);
      
      // 필수 필드 검증
      if (!replay.id || !replay.stageId || !replay.actions) {
        return null;
      }
      
      this.savedReplays.set(replay.id, replay);
      console.log(`📥 리플레이 가져오기 완료: ${replay.id}`);
      
      return replay.id;
    } catch {
      console.error('리플레이 가져오기 실패: 잘못된 JSON');
      return null;
    }
  }

  /**
   * 리플레이 통계
   * @param replayId 리플레이 ID
   */
  getReplayStats(replayId: string): ReplayStats | null {
    const replay = this.savedReplays.get(replayId);
    if (!replay) {
      return null;
    }

    const totalTurns = replay.actions.length > 0 
      ? Math.max(...replay.actions.map(a => a.turnNumber))
      : 0;

    return {
      totalTurns,
      totalActions: replay.actions.length,
      duration: (replay.endTime || Date.now()) - replay.startTime,
    };
  }

  /**
   * LocalStorage에 모든 리플레이 저장
   */
  saveToLocalStorage(): void {
    try {
      const data = Array.from(this.savedReplays.entries());
      localStorage.setItem(BattleReplayManager.STORAGE_KEY, JSON.stringify(data));
      console.log(`💾 ${data.length}개 리플레이 저장됨`);
    } catch (e) {
      console.error('리플레이 저장 실패:', e);
    }
  }

  /**
   * LocalStorage에서 리플레이 로드
   */
  loadFromLocalStorage(): void {
    try {
      const raw = localStorage.getItem(BattleReplayManager.STORAGE_KEY);
      if (raw) {
        const data: [string, BattleReplayData][] = JSON.parse(raw);
        this.savedReplays = new Map(data);
        console.log(`📂 ${data.length}개 리플레이 로드됨`);
      }
    } catch (e) {
      console.error('리플레이 로드 실패:', e);
    }
  }

  /**
   * 오래된 리플레이 정리 (최근 N개만 유지)
   * @param keepCount 유지할 리플레이 수
   */
  cleanupOldReplays(keepCount: number = 20): number {
    const replays = Array.from(this.savedReplays.entries())
      .sort((a, b) => (b[1].startTime || 0) - (a[1].startTime || 0));

    let deletedCount = 0;
    for (let i = keepCount; i < replays.length; i++) {
      this.savedReplays.delete(replays[i][0]);
      deletedCount++;
    }

    if (deletedCount > 0) {
      console.log(`🗑️ ${deletedCount}개 오래된 리플레이 삭제됨`);
    }

    return deletedCount;
  }
}

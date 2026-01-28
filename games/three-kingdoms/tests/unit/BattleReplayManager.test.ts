import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  BattleReplayManager, 
  BattleReplayData, 
  BattleAction, 
  ActionType 
} from '../../src/managers/BattleReplayManager';

describe('BattleReplayManager', () => {
  let manager: BattleReplayManager;

  beforeEach(() => {
    manager = new BattleReplayManager();
  });

  describe('녹화 시작/중지', () => {
    it('녹화를 시작하면 replayId가 반환된다', () => {
      const replayId = manager.startRecording('stage-1-1', [], []);
      expect(replayId).toMatch(/^replay_\d+_[a-z0-9]+$/);
      expect(manager.isCurrentlyRecording()).toBe(true);
    });

    it('녹화 중지 시 결과가 기록된다', () => {
      manager.startRecording('stage-1-1', [], []);
      const replay = manager.stopRecording('victory');
      
      expect(replay).not.toBeNull();
      expect(replay!.result).toBe('victory');
      expect(replay!.endTime).toBeDefined();
      expect(manager.isCurrentlyRecording()).toBe(false);
    });

    it('녹화 중이 아닐 때 중지하면 null 반환', () => {
      const replay = manager.stopRecording('victory');
      expect(replay).toBeNull();
    });

    it('초기 진형 정보가 저장된다', () => {
      const allyFormation = [
        { generalId: 'guan-yu', position: { row: 0, col: 1 } },
        { generalId: 'zhang-fei', position: { row: 1, col: 1 } },
      ];
      const enemyUnits = [
        { unitId: 'enemy-1', name: '황건적', position: { row: 0, col: 1 } },
      ];

      manager.startRecording('stage-1-1', allyFormation, enemyUnits);
      const replay = manager.getCurrentReplay();

      expect(replay!.allyFormation).toEqual(allyFormation);
      expect(replay!.enemyUnits).toEqual(enemyUnits);
    });
  });

  describe('행동 기록', () => {
    beforeEach(() => {
      manager.startRecording('stage-1-1', [], []);
    });

    it('공격 행동을 기록한다', () => {
      const result = manager.recordAction({
        turnNumber: 1,
        actionType: 'attack',
        actorId: 'guan-yu',
        targetIds: ['enemy-1'],
        damage: 150,
      });

      expect(result).toBe(true);
      const replay = manager.getCurrentReplay();
      expect(replay!.actions).toHaveLength(1);
      expect(replay!.actions[0].damage).toBe(150);
    });

    it('스킬 사용을 기록한다', () => {
      manager.recordAction({
        turnNumber: 1,
        actionType: 'skill',
        actorId: 'zhuge-liang',
        targetIds: ['enemy-1', 'enemy-2', 'enemy-3'],
        skillId: 'fire-attack',
        damage: 300,
      });

      const replay = manager.getCurrentReplay();
      expect(replay!.actions[0].skillId).toBe('fire-attack');
      expect(replay!.actions[0].targetIds).toHaveLength(3);
    });

    it('회복 행동을 기록한다', () => {
      manager.recordAction({
        turnNumber: 2,
        actionType: 'heal',
        actorId: 'hua-tuo',
        targetIds: ['guan-yu', 'zhang-fei'],
        heal: 200,
      });

      const replay = manager.getCurrentReplay();
      expect(replay!.actions[0].heal).toBe(200);
    });

    it('사망 이벤트를 기록한다', () => {
      manager.recordAction({
        turnNumber: 3,
        actionType: 'death',
        actorId: 'enemy-1',
        targetIds: [],
      });

      const replay = manager.getCurrentReplay();
      expect(replay!.actions[0].actionType).toBe('death');
    });

    it('녹화 중이 아니면 기록 실패', () => {
      manager.stopRecording('victory');
      const result = manager.recordAction({
        turnNumber: 1,
        actionType: 'attack',
        actorId: 'test',
        targetIds: [],
      });

      expect(result).toBe(false);
    });

    it('타임스탬프가 자동으로 추가된다', () => {
      const before = Date.now();
      manager.recordAction({
        turnNumber: 1,
        actionType: 'attack',
        actorId: 'guan-yu',
        targetIds: ['enemy-1'],
      });
      const after = Date.now();

      const replay = manager.getCurrentReplay();
      expect(replay!.actions[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(replay!.actions[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('리플레이 저장/로드', () => {
    it('녹화 완료 후 자동 저장된다', () => {
      const replayId = manager.startRecording('stage-1-1', [], []);
      manager.recordAction({
        turnNumber: 1,
        actionType: 'attack',
        actorId: 'guan-yu',
        targetIds: ['enemy-1'],
      });
      manager.stopRecording('victory');

      const savedReplay = manager.getReplay(replayId);
      expect(savedReplay).toBeDefined();
      expect(savedReplay!.actions).toHaveLength(1);
    });

    it('저장된 모든 리플레이 ID를 조회할 수 있다', () => {
      const id1 = manager.startRecording('stage-1-1', [], []);
      manager.stopRecording('victory');

      const id2 = manager.startRecording('stage-1-2', [], []);
      manager.stopRecording('defeat');

      const ids = manager.getAllReplayIds();
      expect(ids).toContain(id1);
      expect(ids).toContain(id2);
      expect(ids).toHaveLength(2);
    });

    it('리플레이를 삭제할 수 있다', () => {
      const replayId = manager.startRecording('stage-1-1', [], []);
      manager.stopRecording('victory');

      expect(manager.deleteReplay(replayId)).toBe(true);
      expect(manager.getReplay(replayId)).toBeUndefined();
    });

    it('존재하지 않는 리플레이 삭제 시 false 반환', () => {
      expect(manager.deleteReplay('non-existent')).toBe(false);
    });
  });

  describe('리플레이 재생', () => {
    let replayId: string;

    beforeEach(() => {
      replayId = manager.startRecording('stage-1-1', [], []);
      manager.recordAction({ turnNumber: 1, actionType: 'turn_start', actorId: '', targetIds: [] });
      manager.recordAction({ turnNumber: 1, actionType: 'attack', actorId: 'guan-yu', targetIds: ['enemy-1'], damage: 100 });
      manager.recordAction({ turnNumber: 1, actionType: 'attack', actorId: 'enemy-1', targetIds: ['guan-yu'], damage: 50 });
      manager.recordAction({ turnNumber: 1, actionType: 'turn_end', actorId: '', targetIds: [] });
      manager.recordAction({ turnNumber: 2, actionType: 'turn_start', actorId: '', targetIds: [] });
      manager.recordAction({ turnNumber: 2, actionType: 'skill', actorId: 'zhuge-liang', targetIds: ['enemy-1'], skillId: 'fire-attack', damage: 200 });
      manager.stopRecording('victory');
    });

    it('재생을 시작할 수 있다', () => {
      expect(manager.startPlayback(replayId)).toBe(true);
      expect(manager.isCurrentlyPlaying()).toBe(true);
    });

    it('존재하지 않는 리플레이 재생 시 false', () => {
      expect(manager.startPlayback('non-existent')).toBe(false);
    });

    it('순차적으로 행동을 가져올 수 있다', () => {
      manager.startPlayback(replayId);

      const action1 = manager.getNextAction();
      expect(action1!.actionType).toBe('turn_start');

      const action2 = manager.getNextAction();
      expect(action2!.actionType).toBe('attack');
      expect(action2!.actorId).toBe('guan-yu');
    });

    it('모든 행동 재생 후 null 반환', () => {
      manager.startPlayback(replayId);
      
      for (let i = 0; i < 6; i++) {
        manager.getNextAction();
      }
      
      expect(manager.getNextAction()).toBeNull();
      expect(manager.isCurrentlyPlaying()).toBe(false);
    });

    it('특정 턴의 행동만 가져올 수 있다', () => {
      manager.startPlayback(replayId);
      
      const turn1Actions = manager.getActionsForTurn(1);
      expect(turn1Actions).toHaveLength(4);
      
      const turn2Actions = manager.getActionsForTurn(2);
      expect(turn2Actions).toHaveLength(2);
    });

    it('재생 진행률을 확인할 수 있다', () => {
      manager.startPlayback(replayId);
      
      expect(manager.getPlaybackProgress()).toBe(0);
      
      manager.getNextAction();
      manager.getNextAction();
      manager.getNextAction();
      
      expect(manager.getPlaybackProgress()).toBe(0.5);
    });

    it('재생을 중지할 수 있다', () => {
      manager.startPlayback(replayId);
      manager.getNextAction();
      
      manager.stopPlayback();
      
      expect(manager.isCurrentlyPlaying()).toBe(false);
      expect(manager.getPlaybackProgress()).toBe(0);
    });
  });

  describe('내보내기/가져오기', () => {
    it('리플레이를 JSON으로 내보낼 수 있다', () => {
      const replayId = manager.startRecording('stage-1-1', 
        [{ generalId: 'guan-yu', position: { row: 0, col: 1 } }],
        [{ unitId: 'enemy-1', name: '황건적', position: { row: 0, col: 1 } }]
      );
      manager.recordAction({ turnNumber: 1, actionType: 'attack', actorId: 'guan-yu', targetIds: ['enemy-1'] });
      manager.stopRecording('victory');

      const json = manager.exportReplay(replayId);
      expect(json).not.toBeNull();
      
      const parsed = JSON.parse(json!);
      expect(parsed.stageId).toBe('stage-1-1');
      expect(parsed.result).toBe('victory');
    });

    it('JSON에서 리플레이를 가져올 수 있다', () => {
      const replayData: BattleReplayData = {
        id: 'imported-replay',
        stageId: 'stage-2-1',
        startTime: Date.now() - 60000,
        endTime: Date.now(),
        result: 'defeat',
        allyFormation: [],
        enemyUnits: [],
        actions: [
          { turnNumber: 1, actionType: 'attack', actorId: 'a', targetIds: ['b'], timestamp: Date.now() },
        ],
        version: '1.0.0',
      };

      const importedId = manager.importReplay(JSON.stringify(replayData));
      expect(importedId).toBe('imported-replay');
      
      const replay = manager.getReplay('imported-replay');
      expect(replay).toBeDefined();
      expect(replay!.result).toBe('defeat');
    });

    it('잘못된 JSON은 가져오기 실패', () => {
      expect(manager.importReplay('invalid json')).toBeNull();
      expect(manager.importReplay('{}')).toBeNull();
    });
  });

  describe('리플레이 통계', () => {
    it('리플레이 통계를 조회할 수 있다', () => {
      const replayId = manager.startRecording('stage-1-1', [], []);
      manager.recordAction({ turnNumber: 1, actionType: 'attack', actorId: 'a', targetIds: [] });
      manager.recordAction({ turnNumber: 2, actionType: 'attack', actorId: 'b', targetIds: [] });
      manager.recordAction({ turnNumber: 3, actionType: 'attack', actorId: 'c', targetIds: [] });
      manager.stopRecording('victory');

      const stats = manager.getReplayStats(replayId);
      expect(stats).not.toBeNull();
      expect(stats!.totalTurns).toBe(3);
      expect(stats!.totalActions).toBe(3);
      expect(stats!.duration).toBeGreaterThanOrEqual(0);
    });

    it('존재하지 않는 리플레이 통계 조회 시 null', () => {
      expect(manager.getReplayStats('non-existent')).toBeNull();
    });
  });
});

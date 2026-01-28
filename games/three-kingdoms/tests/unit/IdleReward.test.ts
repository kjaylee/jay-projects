import { describe, it, expect } from 'vitest';

interface IdleConfig {
  goldPerMinute: number;  // 정치 합계 * 0.5
  expPerMinute: number;   // 클리어 스테이지 * 2
  maxHours: number;       // 최대 12시간
}

function calculateIdleReward(
  lastClaimAt: Date,
  now: Date,
  config: IdleConfig
): { gold: number; exp: number; minutes: number } {
  const diffMs = now.getTime() - lastClaimAt.getTime();
  let minutes = Math.floor(diffMs / 60000);
  
  // 최대 시간 제한
  const maxMinutes = config.maxHours * 60;
  minutes = Math.min(minutes, maxMinutes);

  return {
    gold: Math.floor(minutes * config.goldPerMinute),
    exp: Math.floor(minutes * config.expPerMinute),
    minutes,
  };
}

describe('IdleReward', () => {
  const config: IdleConfig = {
    goldPerMinute: 100,  // 정치 200 가정
    expPerMinute: 20,    // 스테이지 10 가정
    maxHours: 12,
  };

  it('1시간 방치 보상', () => {
    const lastClaim = new Date('2026-01-28T10:00:00');
    const now = new Date('2026-01-28T11:00:00');
    
    const reward = calculateIdleReward(lastClaim, now, config);
    
    expect(reward.minutes).toBe(60);
    expect(reward.gold).toBe(6000);
    expect(reward.exp).toBe(1200);
  });

  it('12시간 최대 보상', () => {
    const lastClaim = new Date('2026-01-28T00:00:00');
    const now = new Date('2026-01-28T12:00:00');
    
    const reward = calculateIdleReward(lastClaim, now, config);
    
    expect(reward.minutes).toBe(720); // 12 * 60
    expect(reward.gold).toBe(72000);
    expect(reward.exp).toBe(14400);
  });

  it('24시간 방치해도 12시간 캡', () => {
    const lastClaim = new Date('2026-01-27T00:00:00');
    const now = new Date('2026-01-28T00:00:00');
    
    const reward = calculateIdleReward(lastClaim, now, config);
    
    expect(reward.minutes).toBe(720); // 최대 12시간
  });

  it('0분 방치 → 보상 0', () => {
    const now = new Date();
    const reward = calculateIdleReward(now, now, config);
    
    expect(reward.gold).toBe(0);
    expect(reward.exp).toBe(0);
  });
});

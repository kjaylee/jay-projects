-- ==========================================
-- 삼국지 패왕전 DB 스키마
-- ==========================================

-- 유저 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname VARCHAR(20) NOT NULL DEFAULT '무명의 군주',
  level INT NOT NULL DEFAULT 1,
  gold BIGINT NOT NULL DEFAULT 10000,
  gems INT NOT NULL DEFAULT 100,
  stamina INT NOT NULL DEFAULT 50,
  vip_level INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 장수 마스터 테이블
CREATE TABLE generals (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  grade VARCHAR(10) NOT NULL CHECK (grade IN ('N', 'R', 'SR', 'SSR', 'UR')),
  class VARCHAR(20) NOT NULL CHECK (class IN ('warrior', 'tank', 'archer', 'strategist', 'cavalry')),
  faction VARCHAR(20), -- 위, 촉, 오, 군벌
  base_attack INT NOT NULL DEFAULT 100,
  base_defense INT NOT NULL DEFAULT 100,
  base_intelligence INT NOT NULL DEFAULT 100,
  base_politics INT NOT NULL DEFAULT 100,
  base_charm INT NOT NULL DEFAULT 100,
  base_speed INT NOT NULL DEFAULT 100,
  skill_ids TEXT[] DEFAULT '{}',
  description TEXT
);

-- 유저 보유 장수
CREATE TABLE user_generals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  general_id VARCHAR(50) NOT NULL REFERENCES generals(id),
  level INT NOT NULL DEFAULT 1,
  stars INT NOT NULL DEFAULT 1 CHECK (stars BETWEEN 1 AND 5),
  exp INT NOT NULL DEFAULT 0,
  equipment JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, general_id)
);

-- 진형 테이블
CREATE TABLE formations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot INT NOT NULL CHECK (slot BETWEEN 1 AND 5),
  positions UUID[] DEFAULT ARRAY[NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL]::UUID[],
  is_active BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, slot)
);

-- 스테이지 마스터
CREATE TABLE stages (
  id VARCHAR(50) PRIMARY KEY,
  chapter INT NOT NULL,
  stage_num INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  enemy_formation JSONB NOT NULL,
  rewards JSONB NOT NULL,
  stamina_cost INT NOT NULL DEFAULT 5,
  required_stage VARCHAR(50),
  is_boss BOOLEAN NOT NULL DEFAULT false
);

-- 유저 스테이지 진행
CREATE TABLE user_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage_id VARCHAR(50) NOT NULL REFERENCES stages(id),
  stars INT NOT NULL DEFAULT 0 CHECK (stars BETWEEN 0 AND 3),
  best_time INT, -- 초 단위
  cleared_at TIMESTAMPTZ,
  UNIQUE(user_id, stage_id)
);

-- 전투 기록
CREATE TABLE battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_id UUID NOT NULL REFERENCES users(id),
  defender_id UUID REFERENCES users(id), -- PvE면 NULL
  stage_id VARCHAR(50) REFERENCES stages(id),
  winner_id UUID,
  replay_data JSONB,
  battle_type VARCHAR(20) NOT NULL CHECK (battle_type IN ('pve', 'pvp')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 방치 보상
CREATE TABLE idle_rewards (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_claim_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accumulated_gold BIGINT NOT NULL DEFAULT 0,
  accumulated_exp BIGINT NOT NULL DEFAULT 0
);

-- 가챠 기록
CREATE TABLE gacha_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  banner_id VARCHAR(50) NOT NULL,
  result_general_id VARCHAR(50) NOT NULL REFERENCES generals(id),
  pity_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 랭킹 뷰
CREATE VIEW pvp_rankings AS
SELECT 
  u.id,
  u.nickname,
  u.level,
  COUNT(CASE WHEN b.winner_id = u.id THEN 1 END) AS wins,
  COUNT(b.id) AS total_battles,
  RANK() OVER (ORDER BY COUNT(CASE WHEN b.winner_id = u.id THEN 1 END) DESC) AS rank
FROM users u
LEFT JOIN battles b ON (b.attacker_id = u.id OR b.defender_id = u.id) AND b.battle_type = 'pvp'
GROUP BY u.id;

-- ==========================================
-- Row Level Security
-- ==========================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_generals ENABLE ROW LEVEL SECURITY;
ALTER TABLE formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE idle_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE gacha_history ENABLE ROW LEVEL SECURITY;

-- Users: 본인만 읽기/쓰기
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

-- User Generals: 본인만 수정, 타인 읽기 가능 (PvP용)
CREATE POLICY "Anyone can view generals" ON user_generals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own generals" ON user_generals FOR ALL USING (auth.uid() = user_id);

-- Formations: 본인만 수정, 타인 읽기 가능 (PvP용)
CREATE POLICY "Anyone can view formations" ON formations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own formations" ON formations FOR ALL USING (auth.uid() = user_id);

-- Battles: 참여자만 읽기
CREATE POLICY "Battle participants can view" ON battles FOR SELECT 
  USING (auth.uid() = attacker_id OR auth.uid() = defender_id);
CREATE POLICY "Users can insert battles" ON battles FOR INSERT 
  WITH CHECK (auth.uid() = attacker_id);

-- ==========================================
-- 인덱스
-- ==========================================

CREATE INDEX idx_user_generals_user ON user_generals(user_id);
CREATE INDEX idx_formations_user ON formations(user_id);
CREATE INDEX idx_user_stages_user ON user_stages(user_id);
CREATE INDEX idx_battles_attacker ON battles(attacker_id);
CREATE INDEX idx_battles_created ON battles(created_at DESC);

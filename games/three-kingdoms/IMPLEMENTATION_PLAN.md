# Implementation Plan

## 현재 상태
엔티티(General, Skill, Equipment, Formation)와 전투 시스템 기본 구조 완료. 5개 씬(Boot, Preload, Login, Main, Battle) 구현됨. 단위 테스트 기반 구축됨. **핵심 게임플레이 연동과 실제 게임 데이터가 필요한 단계.**

## TODO (우선순위순)

### High Priority (Core Gameplay)

#### 데이터 레이어 (모든 시스템의 기반)
- [x] **장수 마스터 데이터 JSON 생성** - 30명 장수 완료 (2026-01-28)
- [x] **스킬 데이터 JSON 생성** - 8개 계략 완료 (2026-01-28)
- [x] **스테이지 데이터 JSON 생성** - 10개 스테이지 완료 (2026-01-28)

#### 전투 시스템 핵심 연동
- [x] **DamageCalculator 모듈 분리** - src/utils/DamageCalculator.ts 완료 (2026-01-28)
- [x] **Formation → BattleManager 연동** - startBattle(formation, stageId) 완료 (2026-01-28)
- [x] **BattleUnit 인터페이스 정의** - src/entities/BattleUnit.ts 완료 (2026-01-28)
- [x] **전열 우선 타겟팅 구현** - row 0→1→2 완료 (2026-01-28)
- [x] **스킬 전투 연동 (기본)** - SkillExecutor 완료, 테스트 136개 (2026-01-28)
- [x] **버프/디버프 매니저** - BuffManager 완료, 테스트 157개 (2026-01-28)
- [x] **전투 승리 시 보상 지급** - RewardManager 완료, 테스트 186개 (2026-01-28)

### Medium Priority (Features)

#### 매니저 클래스 구현
- [x] **GachaManager 클래스 생성** - 테스트 함수를 서비스 레이어로 분리, 테스트 223개 (2026-01-28)
- [x] **GachaManager 장수 풀 연동** - 등급별 장수 ID 목록에서 실제 장수 반환, 10연차 SR 보장 (2026-01-28)
- [x] **IdleManager 클래스 생성** - 테스트 함수를 서비스 레이어로 분리, VIP 보너스 포함 (2026-01-28)
- [x] **IdleManager 정치 스탯 연동** - Formation → General → politics 합계 계산 (2026-01-28)
- [x] **RewardManager 테스트 추가** - 16개 테스트, 난이도별 첫 클리어 보너스 검증 (2026-01-28)
- [ ] **GameManager 자원 관리** - 금화/보석/스태미나 CRUD 및 이벤트 발행 `specs/gacha-system.md`

#### 장수/장비 시스템
- [ ] **General.equipItem() 구현** - Equipment 슬롯별 장착 및 스탯 반영 `specs/general-system.md`
- [ ] **General.loadSkills() 구현** - skillIds → Skill 객체 배열 로드 `specs/general-system.md`
- [ ] **장수 상세 정보 조합** - calculateStats()에 장비 보너스 포함 `specs/general-system.md`

#### UI 씬 구현
- [ ] **공통 Button 컴포넌트** - 재사용 가능한 버튼 클래스 `specs/ui-scenes.md`
- [ ] **공통 Modal/Popup 컴포넌트** - 오버레이 팝업 시스템 `specs/ui-scenes.md`
- [ ] **FormationScene 기본 UI** - 3x3 그리드, 장수 목록 표시 `specs/ui-scenes.md`
- [ ] **FormationScene 드래그앤드롭** - 장수 카드 → 그리드 배치 `specs/formation-system.md`
- [ ] **GeneralListScene 기본 UI** - 보유 장수 목록, 등급/레벨 표시 `specs/ui-scenes.md`
- [ ] **GachaScene 기본 UI** - 단차/10연차 버튼, 재화 표시, 천장 카운터 `specs/ui-scenes.md`
- [ ] **MainScene 자원 바 연동** - GameManager에서 실시간 자원 표시 `specs/ui-scenes.md`
- [ ] **MainScene 방치 보상 팝업** - 접속 시 누적 보상 표시 및 수령 `specs/idle-system.md`
- [ ] **하단 네비게이션 씬 전환** - 탭 클릭 시 해당 씬으로 이동 `specs/ui-scenes.md`

#### 데이터 연동
- [ ] **일일 무료 가챠 구현** - lastFreeGachaDate 체크, 하루 1회 무료 `specs/gacha-system.md`
- [ ] **재화 소모 가챠** - 보석 160개 차감 후 뽑기 `specs/gacha-system.md`
- [ ] **Formation LocalStorage 저장** - 오프라인 모드 진형 저장 `specs/formation-system.md`
- [ ] **UserData maxClearedStage 추가** - 방치 보상 경험치 계산용 `specs/idle-system.md`

### Low Priority (Polish)

#### 가챠 시스템 고도화
- [ ] **10연차 SR 보장 로직** - 10회 중 SR 이상 없으면 마지막을 SR로 교체 `specs/gacha-system.md`
- [ ] **천장 카운터 저장** - pityCount LocalStorage/DB 저장 `specs/gacha-system.md`
- [ ] **중복 장수 → 조각 변환** - 보유 장수 뽑기 시 승급 재료 지급 `specs/gacha-system.md`
- [ ] **가챠 연출 애니메이션** - 등급별 이펙트 (SSR/UR 특별 연출) `specs/gacha-system.md`

#### 진형 시스템 고도화
- [ ] **다중 진형 슬롯 (5개)** - 프리셋 저장/로드 `specs/formation-system.md`
- [ ] **시너지 상세화** - 2/3/4/5명 단계별 보너스 테이블 `specs/formation-system.md`
- [ ] **클래스 배치 가이드** - 권장 위치 하이라이트 표시 `specs/formation-system.md`

#### 스킬/전투 고도화
- [ ] **스킬 연출** - 발동 시 이름 표시 + 이펙트 애니메이션 `specs/skill-system.md`
- [ ] **특수 효과 구현** - 스턴(행동불가), 선제 기습, 쿨다운 초기화 `specs/skill-system.md`
- [ ] **전투 리플레이** - 행동 기록 저장 및 재생 `specs/battle-system.md`
- [ ] **턴 제한 시스템** - N턴 초과 시 승패 판정 `specs/battle-system.md`

#### 장수 시스템 고도화
- [ ] **각성 시스템** - UR 전용, 외형 변경 + 신규 스킬 해금 `specs/general-system.md`
- [ ] **스킬 레벨업** - 재료 소모하여 스킬 효과 강화 `specs/skill-system.md`

#### 추가 UI
- [ ] **StageSelectScene** - 챕터/스테이지 선택 화면 `specs/ui-scenes.md`
- [ ] **GeneralDetailScene** - 장수 상세, 레벨업, 장비 장착 `specs/ui-scenes.md`
- [ ] **Toast 알림 컴포넌트** - 획득/레벨업 등 알림 표시 `specs/ui-scenes.md`
- [ ] **VIP 보너스 시스템** - 방치 보상/가챠 배율 적용 `specs/idle-system.md`

## IN PROGRESS
(없음)

## DONE
- [x] 엔티티 기본 구조 (General, Skill, Equipment, Formation)
- [x] 전투 시스템 기본 (BattleManager, 속도순 행동, 배속)
- [x] 데미지 계산 공식 (물리/계략) - 테스트로 검증됨
- [x] 가챠 확률 로직 + 천장 시스템 - 테스트로 검증됨
- [x] 방치 보상 계산 로직 - 테스트로 검증됨
- [x] 씬 흐름 (5개 씬: Boot, Preload, Login, Main, Battle)
- [x] 테스트 기반 구축 (Vitest)
- [x] Formation 시너지 계산 (세력/클래스)
- [x] General 레벨업/승급 스탯 공식
- [x] **GachaManager 클래스** - 단차/10연차, 천장 80회, SR 보장 (2026-01-28)
- [x] **IdleManager 클래스** - 방치 보상 계산, VIP 보너스, 정치 스탯 연동 (2026-01-28)
- [x] **RewardManager 테스트 완료** - 16개 테스트, 전투 보상/경험치 분배 검증 (2026-01-28)

## DISCOVERIES
- **기획서 vs 구현 불일치**: 방치 보상 공식이 테스트(×0.5, ×2)와 기획서(×10, ×5)에서 다름 - 확인 필요
- **스탯 구조**: 기획서는 통솔/무력/지력/정치/매력이나 구현은 attack/defense/intelligence/speed/politics - 일관성 검토 필요
- **기술 부채**: 데미지 계산 로직이 테스트 파일에만 존재 → 공용 모듈로 분리 필요
- **HP 바 업데이트**: BattleScene에서 HP 바가 정적임 (전투 중 변경 안됨)

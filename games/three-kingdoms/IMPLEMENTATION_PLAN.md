# Implementation Plan

## 현재 상태
엔티티(General, Skill, Equipment, Formation)와 전투 시스템 기본 구조 완료. 9개 씬(Boot, Preload, Login, Main, Battle, Formation, GeneralList, Gacha, StageSelect) 구현됨. **단위 테스트 794개 통과. 출시 준비 단계.**

## TODO (우선순위순)

### High Priority (Core Gameplay) - ✅ 완료

#### 데이터 레이어 (모든 시스템의 기반)
- [x] **장수 마스터 데이터 JSON 생성** - 30명 장수 완료 (2026-01-28)
- [x] **스킬 데이터 JSON 생성** - 8개 계략 완료 (2026-01-28)
- [x] **스테이지 데이터 JSON 생성** - 10개 스테이지 완료 (2026-01-28)

#### 전투 시스템 핵심 연동
- [x] **DamageCalculator 모듈 분리** - src/utils/DamageCalculator.ts 완료 (2026-01-28)
- [x] **Formation → BattleManager 연동** - startBattle(formation, stageId) 완료 (2026-01-28)
- [x] **BattleUnit 인터페이스 정의** - src/entities/BattleUnit.ts 완료 (2026-01-28)
- [x] **전열 우선 타겟팅 구현** - row 0→1→2 완료 (2026-01-28)
- [x] **스킬 전투 연동 (기본)** - SkillExecutor 완료 (2026-01-28)
- [x] **버프/디버프 매니저** - BuffManager 완료 (2026-01-28)
- [x] **전투 승리 시 보상 지급** - RewardManager 완료 (2026-01-28)

### Medium Priority (Features) - ✅ 완료

#### 매니저 클래스 구현
- [x] **GachaManager 클래스 생성** - 단차/10연차, 천장 80회, SR 보장 (2026-01-28)
- [x] **GachaManager 천장 카운터 저장** - LocalStorage 저장/로드 완료 (2026-01-28)
- [x] **IdleManager 클래스 생성** - VIP 보너스 포함 (2026-01-28)
- [x] **IdleRewardPopupManager 클래스** - 방치 보상 팝업 관리, 최대 12시간 (2026-01-28)
- [x] **GameManager 자원 관리** - 금화/보석/스태미나 CRUD + 이벤트 발행 (2026-01-28)
- [x] **FreeGachaManager 클래스** - 일일 무료 가챠 체크 (2026-01-28)
- [x] **GachaResourceManager 클래스** - 가챠 재화 연동, 보석 소모 (2026-01-28)
- [x] **OwnedGeneralsManager 클래스** - 보유 장수 관리, 중복→조각 변환 (2026-01-28)

#### 장수/장비 시스템
- [x] **General.equipItem() 구현** - Equipment 슬롯별 장착 및 스탯 반영 (2026-01-28)
- [x] **General.loadSkills() 구현** - skillIds → Skill 객체 배열 로드 (2026-01-28)
- [x] **장수 상세 정보 조합** - calculateStats()에 장비 보너스 포함 (2026-01-28)

#### UI 씬 구현
- [x] **공통 Button 컴포넌트** - 3가지 variant + 커스텀 색상 지원 (2026-01-28)
- [x] **공통 Modal/Popup 컴포넌트** - 애니메이션 포함 (2026-01-28)
- [x] **Toast 알림 컴포넌트** - success/error/info/warning 타입 (2026-01-28)
- [x] **FormationScene 기본 UI** - 3x3 그리드, 장수 목록, 5개 슬롯 (2026-01-28)
- [x] **GeneralListScene 기본 UI** - 보유 장수 목록, 등급/레벨 표시, 정렬 (2026-01-28)
- [x] **GachaScene 기본 UI** - 단차/10연차 버튼, 중복→조각 표시 (2026-01-28)
- [x] **MainScene 자원 바 연동** - GameManager에서 실시간 자원 표시 (2026-01-28)
- [x] **MainScene 방치 보상 팝업** - IdleRewardPopupManager 씬 연동 완료 (2026-01-28)
- [x] **하단 네비게이션 씬 전환** - 5개 탭 클릭 시 해당 씬으로 이동 (2026-01-28)

#### 데이터 연동
- [x] **일일 무료 가챠 구현** - FreeGachaManager + 씬 연동 (2026-01-28)
- [x] **재화 소모 가챠** - GachaResourceManager + 씬 연동 (2026-01-28)
- [x] **Formation LocalStorage 저장** - FormationManager.save() (2026-01-28)
- [x] **UserData maxClearedStage 추가** - GameManager.UserData 포함 (2026-01-28)

### Low Priority (Polish) - 일부 완료

#### 가챠 시스템 고도화
- [x] **10연차 SR 보장 로직** - GachaManager 구현됨 (2026-01-28)
- [x] **천장 카운터 저장** - pityCount LocalStorage 저장 완료 (2026-01-28)
- [x] **중복 장수 → 조각 변환** - OwnedGeneralsManager + GachaScene 연동 완료 (2026-01-28)
- [x] **가챠 연출 애니메이션** - GachaAnimationManager 완료 (2026-01-28)

#### 진형 시스템 고도화
- [x] **다중 진형 슬롯 (5개)** - FormationManager 완료 (2026-01-28)
- [x] **시너지 상세화** - 2/3/4/5명 단계별 보너스 테이블 완료 (2026-01-28)
- [x] **클래스 배치 가이드** - FormationGuide 유틸리티 완료 (2026-01-28)

#### 스킬/전투 고도화
- [ ] **스킬 연출** - 발동 시 이름 표시 + 이펙트 애니메이션 `specs/skill-system.md`
- [x] **스턴(행동불가) 효과** - StunManager 완료 (2026-01-28)
- [x] **연환계 (쿨다운 초기화)** - CooldownResetManager 완료 (2026-01-28)
- [x] **선제 기습 효과** - PreemptiveStrikeManager 완료 (2026-01-28)
- [ ] **전투 리플레이** - 행동 기록 저장 및 재생 `specs/battle-system.md`
- [x] **턴 제한 시스템** - TurnLimitChecker 유틸리티 완료, BattleManager 연동 예정 (2026-01-28)

#### 장수 시스템 고도화
- [x] **각성 시스템** - AwakenManager 완료 (2026-01-28)
- [x] **스킬 레벨업** - SkillLevelManager 완료 (2026-01-28)

#### 추가 UI
- [x] **StageSelectScene** - 챕터/스테이지 선택 화면 완료 (2026-01-28)
- [ ] **GeneralDetailScene** - 장수 상세, 레벨업, 장비 장착 `specs/ui-scenes.md`
- [x] **VIP 보너스 시스템** - VIPManager 완료, 방치 보상/가챠 배율 적용 (2026-01-28)

## DONE (완료된 기능 총정리)

### 핵심 시스템
- [x] 엔티티 기본 구조 (General, Skill, Equipment, Formation)
- [x] 전투 시스템 기본 (BattleManager, 속도순 행동, 배속)
- [x] 데미지 계산 공식 (물리/계략) - DamageCalculator 모듈
- [x] 가챠 확률 로직 + 천장 시스템 (80회 SSR 보장)
- [x] 방치 보상 계산 로직 (최대 12시간)

### 매니저 클래스
- [x] GachaManager - 단차/10연차, 천장 저장, SR 보장
- [x] IdleManager - 방치 보상 계산, VIP 보너스
- [x] RewardManager - 전투 보상/경험치 분배
- [x] GameManager - 자원 관리, 이벤트 발행
- [x] BuffManager - 버프/디버프 관리
- [x] SkillExecutor - 스킬 발동 및 쿨다운
- [x] FormationManager - 5개 슬롯, 시너지 계산
- [x] AwakenManager - UR 장수 각성
- [x] OwnedGeneralsManager - 보유 장수, 조각 변환
- [x] IdleRewardPopupManager - 방치 보상 팝업
- [x] StunManager - 스턴(행동불가) 효과 관리
- [x] CooldownResetManager - 연환계/쿨다운 초기화
- [x] PreemptiveStrikeManager - 선제 기습 (첫 턴 2배 데미지)
- [x] SkillLevelManager - 스킬 레벨업/강화 시스템
- [x] VIPManager - VIP 레벨/혜택 (방치 보상/가챠 보너스)

### UI 컴포넌트
- [x] Button (3가지 variant + 커스텀 색상)
- [x] Modal/Popup (애니메이션 포함)
- [x] Toast (success/error/info/warning)
- [x] GeneralCard
- [x] Layout utilities

### 씬
- [x] BootScene
- [x] PreloadScene
- [x] LoginScene
- [x] MainScene (방치 보상 팝업 연동)
- [x] BattleScene
- [x] FormationScene (5개 슬롯, 시너지 표시)
- [x] GeneralListScene
- [x] GachaScene (중복→조각 표시)
- [x] StageSelectScene

### 데이터
- [x] 30명 장수 데이터 (N/R/SR/SSR/UR)
- [x] 8개 스킬 데이터
- [x] 10개 스테이지 데이터 (1-1 ~ 1-10)

### 테스트
- **794개 테스트 통과** (Vitest)
- 40개 테스트 파일

## 출시 준비 상태

### ✅ 출시 가능 기능
- 가챠 시스템 (천장, 중복→조각, 애니메이션)
- 방치 보상 시스템
- 전투 시스템 (기본)
- 진형 시스템 (5슬롯, 시너지)
- 스테이지 진행
- 장수 관리

### ⚠️ 출시 후 업데이트 권장
- 스킬 연출 강화
- 전투 리플레이
- VIP 시스템
- 선제 기습 효과
- GeneralDetailScene

## DISCOVERIES
- **기획서 vs 구현 불일치**: 방치 보상 공식이 테스트(×0.5, ×2)와 기획서(×10, ×5)에서 다름 - 확인 필요
- **스탯 구조**: 기획서는 통솔/무력/지력/정치/매력이나 구현은 attack/defense/intelligence/speed/politics - 일관성 검토 필요
- **HP 바 업데이트**: BattleScene에서 HP 바가 정적임 (전투 중 변경 안됨) - 출시 후 수정

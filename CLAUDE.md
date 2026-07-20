# 취준일기 익스텐션 — Claude Code 프로젝트 컨텍스트

## 프로젝트 소개
취준일기 웹앱의 짝꿍 크롬 익스텐션. 사람인·원티드·잡코리아 지원현황 페이지에서 버튼 한 번으로 지원 내역(회사명·공고명·상태·지원일)을 수집해 취준일기 웹앱으로 전달한다.

**핵심 원칙**: 유저 로그인 정보를 받지 않는다. 유저가 이미 로그인해서 보고 있는 페이지 화면만 읽는다.

## 기술 스택
- Manifest V3
- CRXJS + Vite
- React + TypeScript
- chrome.storage

## 개발 단계 (중요)
현재: 사람인 수집부터 검증. 사람인 1개를 끝까지 완성(파싱→저장→전달)한 뒤 잡코리아, 원티드로 복제.

## 검증 완료
3개 사이트 HTML 실제 분석해 전부 수집 가능 확인. 셀렉터는 docs/SELECTORS.md에 정리됨. **개발 시 반드시 SELECTORS.md 참조.**

## 폴더 구조 핵심
- `src/content/{site}.ts` — 사이트별 content script (파싱)
- `src/content/selectors/{site}.ts` — 사이트별 셀렉터 상수
- `src/background/index.ts` — service worker (저장, 매핑, 중복제거)
- `src/popup/` — popup UI (React)
- `src/lib/statusMapping.ts` — 상태 원문 → Status
- `src/lib/dateNormalize.ts` — 날짜 정규화
- `src/types/application.ts` — ScrapedApplication (웹앱과 공유)

## 데이터 구조
```typescript
interface ScrapedApplication {
  company: string;     // 회사명
  position: string;    // 공고명
  platform: 'saramin' | 'wanted' | 'jobkorea';
  appliedAt: string;   // 지원일 (원문)
  status: string;      // 상태 (원문)
  externalId?: string; // 사이트 고유 ID (중복 방지)
}
```

## 셀렉터 요약 (상세는 SELECTORS.md)
- **사람인**: 컨테이너 `.row._apply_list`, 회사명 `data-company_nm`, 공고명 `data-rec_division`, 지원일 `.col_date`, 상태 `.txt_status`
- **잡코리아**: 회사명 `data-memname`, 공고명 `data-gititle`, 지원일 `data-applydate`, 상태 `.apply-status .item.status`
- **원티드**: 부분매칭 필수 — 회사명 `[class*="company_name"]`, 공고명 `[class*="position"]`, 지원일 `[class*="create_time"]`, 상태 `[class*="status"]`

## 상태 매핑
"취소" 포함(부분 일치)→canceled, "불합격"/"탈락"→rejected, 그 외(지원완료/접수 등)→applied(기본값). screening/interview/interviewed/offer는 3개 사이트 모두 원문으로 제공하지 않아 매핑 대상이 아니며, 유저가 웹앱 칸반에서 직접 관리한다. 상세 매핑 테이블은 docs/INTEGRATION.md를 단일 진실로 참조.

부분 일치(.includes) 순서 주의: 더 구체적인 문자열을 먼저 검사해야 오분류를 막는다. 예: "면접완료"는 "면접"을 포함하므로, 향후 interview/interviewed를 매핑 대상에 추가하게 되면 "면접완료"(interviewed)를 "면접"(interview)보다 먼저 검사해야 한다.

## 코딩 규칙
- named export, 함수형, TypeScript
- 셀렉터는 상수로 분리 (하드코딩 금지, SELECTORS.md 기준)
- 사이트별 파서는 동일 인터페이스 ScrapedApplication[] 반환
- Atomic 커밋 (한 커밋 하나의 작업, 빌드 가능 상태, 명확한 메시지)
- MV3: service worker에서 전역변수 대신 chrome.storage, inline script 금지

## MV3 주의
- service worker 항상 안 떠있음 → chrome.storage 사용
- 비동기 메시지 응답 → listener에서 return true
- 권한 최소화 (host_permissions만)

## 브랜치 전략
- main: 배포
- dev: 개발 통합
- feat/fix/chore/*: 작업 브랜치
- dev에서 작업 → PR → 병합
# 취준일기 크롬 익스텐션 — Codex 작업 지침

## 프로젝트 개요

취준일기 웹앱과 연동하는 Chrome 확장 프로그램이다. 사람인·잡코리아·원티드의 지원현황 페이지에서 지원 내역을 읽어 저장하고, 사용자가 복사하거나 웹앱으로 전달할 수 있게 한다.

- Manifest V3, CRXJS, Vite, React, TypeScript를 사용한다.
- 사용자의 로그인 정보나 비밀번호를 받지 않는다. 사용자가 로그인해 보고 있는 지원현황 페이지의 DOM만 읽는다.
- 필요한 권한만 유지한다. 현재 `storage` 권한과 사이트별 `host_permissions`가 설정되어 있으므로, 권한을 바꿀 때 `manifest.config.ts`와 `docs/STORE_PERMISSIONS_JUSTIFICATION.md`를 함께 확인한다.

## 작업 전 참고 문서

변경하려는 기능과 맞닿은 문서를 먼저 읽고, 문서와 코드가 다르면 실제 구현 및 더 구체적인 최신 설계 문서를 확인한다.

- `docs/SELECTORS.md`: 사이트별 DOM 구조와 파싱 셀렉터의 기준
- `docs/ARCHITECTURE.md`: 컴포넌트 역할과 데이터 흐름
- `docs/INTEGRATION.md`: 웹앱 전달 형식, 상태·날짜 변환, 연동 제약
- `docs/PLANNING.md`: 진행 계획과 확정/미확정 결정
- `docs/PRIVACY_POLICY.md`, `docs/STORE_PERMISSIONS_JUSTIFICATION.md`: 개인정보 및 권한 관련 변경
- `CLAUDE.md`: Claude Code를 위해 작성된 기존 프로젝트 메모. 참고용이며, 현재 코드와 위의 세부 문서가 우선한다.

기능 상태나 설계가 문서마다 다르게 적혀 있으면, 작업에 직접 해당하는 상세 문서와 실제 코드를 확인하고 필요하면 관련 문서도 함께 갱신한다. 미확정 사항을 임의로 확정된 것처럼 취급하지 않는다.

## 주요 코드 위치

- `manifest.config.ts`: MV3 매니페스트, 권한, content script 주입 경로
- `src/content/{saramin,jobkorea,wanted}.ts`: 사이트별 수집 진입점과 파싱
- `src/content/selectors/`: 사이트별 셀렉터 상수
- `src/background/index.ts`: 확장 메시지 처리와 백그라운드 작업
- `src/popup/`: React 팝업 UI
- `src/lib/statusMapping.ts`: 사이트 상태 원문 변환
- `src/lib/dateNormalize.ts`: 날짜 및 시각 정규화
- `src/lib/storage.ts`: `chrome.storage.local` 데이터 저장·조회·초기화
- `src/types/application.ts`: 수집·연동 데이터 타입

실제 파일 구성은 변경될 수 있으므로 수정 전 저장소를 확인한다.

## 데이터와 책임 경계

- 사이트 파서는 공통 데이터 타입을 사용하고, DOM 셀렉터는 사이트별 상수로 관리한다. 셀렉터를 바꾸기 전 `docs/SELECTORS.md`와 실제 페이지 구조를 확인한다.
- 수집 결과는 `chrome.storage.local`의 사이트별 슬롯에 저장한다. 같은 사이트를 다시 수집하면 해당 슬롯을 교체한다. 복사만으로 저장 데이터가 지워지지 않으며 초기화 동작만 전체 슬롯을 비운다.
- 익스텐션은 사이트별 수집·저장·복사·전달을 담당한다. 애플리케이션 간 실질적인 중복 판별은 웹앱의 `addApplicationsFromExtension` 책임이다. 중복 판별 로직을 추가하기 전 `docs/PLANNING.md`와 `docs/INTEGRATION.md`를 확인한다.
- 사이트 상태 원문 매핑의 상세 규칙은 `docs/INTEGRATION.md`를 기준으로 한다. 부분 문자열 매칭은 더 구체적인 상태를 먼저 판별해 오분류를 막는다.
- 웹앱으로 보내는 메시지의 실행 컨텍스트와 수신 검증 조건을 지킨다. 전달 방식을 바꾸기 전 `docs/INTEGRATION.md`의 전달 제약과 수신부 검증 계약을 확인한다.

## 구현 규칙

- TypeScript와 함수형 코드를 사용하고, 기존 모듈의 export·명명 방식에 맞춘다.
- 공통 동작은 재사용하되 사이트별 파싱 차이는 사이트별 모듈에 둔다.
- Manifest V3 service worker의 실행 상태를 영구적으로 유지된다고 가정하지 않는다. 지속 데이터는 `chrome.storage`에 저장한다.
- 비동기 메시지 응답은 Chrome 메시징 규약에 맞춰 처리한다. inline script를 추가하지 않는다.
- 권한은 최소화한다. `host_permissions`, `content_scripts.matches`, 런타임 URL 검사 간의 역할을 혼동하지 말고 주입 범위 변경 시 `manifest.config.ts`와 `src/lib/platformDetect.ts`를 함께 확인한다.
- 저장 형식, 외부 메시지, 매니페스트 권한을 바꾸면 관련 문서와 사용처를 함께 갱신한다.
- 사용자가 요청하지 않은 범위로 리팩터링하거나 기능 동작을 바꾸지 않는다.

## 빌드와 테스트

`package.json`에 정의된 명령을 사용한다.

- 빌드: `npm run build`
- 테스트: `npm test`

사용자가 검증을 요청했거나 변경 사항을 확인하는 데 꼭 필요한 경우에만 실행한다. 실행하지 않았다면 완료 보고에 그 사실을 적는다.

## 브랜치와 커밋

- 브랜치 전략은 `main`(배포), `dev`(통합), `feat/*`, `fix/*`, `chore/*` 작업 브랜치다.
- 커밋이 요청된 경우 한 커밋에는 한 작업만 담고, 프로젝트의 기존 커밋 메시지 관례를 따른다.

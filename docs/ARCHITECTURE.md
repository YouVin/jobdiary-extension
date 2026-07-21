# 🏗️ 아키텍처

## 1. Manifest V3 구조

크롬 익스텐션은 4가지 요소로 구성된다.

```
manifest.json      익스텐션 설정 (권한, 진입점)
content script     지원현황 페이지에 주입 → DOM 파싱 (사이트별)
service worker     백그라운드 로직 (저장, 메시지 중계)
popup              아이콘 클릭 시 뜨는 UI (React)
```

## 2. 데이터 흐름

```
[지원현황 페이지]
   content script (사이트별 파서)
      ↓ 지원 목록 파싱 (SELECTORS.md 기준)
   ScrapedApplication[] 생성
      ↓ chrome.runtime.sendMessage
   service worker
      ↓ chrome.storage.local에 사이트별 슬롯으로 누적 저장 (saramin/jobkorea/wanted,
      ↓ 같은 사이트 재수집 시 해당 슬롯만 덮어씀)
   [popup] 전체 복사(TSV+HTML) | 웹앱 전달
```

> 상태 매핑 + 날짜 정규화(Application 변환)를 저장 시점에 할지 전달 시점에 할지는 미확정이다. 변환은 한 곳에서만 수행한다는 원칙만 확정돼 있고, 정확한 위치는 실제 연동 구현(E-5)에서 정한다. 익스텐션은 웹앱 함수를 직접 호출할 수 없어 메시지 전달 경로를 거치며, 최종 중복 판별 + 저장은 웹앱의 `addApplicationsFromExtension`이 담당한다 (상세: [INTEGRATION.md](./INTEGRATION.md)).
>
> 전체 복사 출구는 웹앱을 거치지 않으므로 `addApplicationsFromExtension`도, 중복 판별도 적용되지 않는다 — 익스텐션은 두 출구 모두에서 사이트별 슬롯 덮어쓰기 이상의 중복 판별 로직을 갖지 않는다 (상세: [PLANNING.md](./PLANNING.md#7-데이터-정합성--저장-전략)).

## 3. 폴더 구조

```
jobdiary-extension/
├── src/
│   ├── manifest.ts              # manifest 정의 (CRXJS)
│   │
│   ├── content/                 # content scripts (사이트별)
│   │   ├── saramin.ts
│   │   ├── jobkorea.ts
│   │   ├── wanted.ts
│   │   ├── selectors/           # 셀렉터 상수 (SELECTORS.md 반영)
│   │   │   ├── saramin.ts
│   │   │   ├── jobkorea.ts
│   │   │   └── wanted.ts
│   │   └── injectButton.ts      # "가져오기" 버튼 삽입 공통
│   │
│   ├── background/
│   │   └── index.ts             # service worker
│   │
│   ├── popup/                   # popup UI (React)
│   │   ├── index.html
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── lib/
│   │   ├── statusMapping.ts     # 상태 원문 → Status
│   │   ├── dateNormalize.ts     # 날짜 정규화
│   │   └── storage.ts           # chrome.storage.local 사이트별 슬롯 저장/조회/초기화
│   │
│   └── types/
│       └── application.ts       # ScrapedApplication 등 (웹앱과 공유)
│
├── docs/
├── public/                      # 아이콘 등
└── package.json
```

## 4. 컴포넌트 역할

| 요소 | 역할 |
|------|------|
| content/{site}.ts | 해당 사이트에서 파싱 실행, 버튼 삽입 |
| content/selectors/ | 사이트별 셀렉터 상수 (깨지면 여기만 수정) |
| background/index.ts | 메시지 수신, chrome.storage 저장·전달 (Application 변환을 이 단계에서 할지는 미확정 — INTEGRATION.md 참고). 중복 판별은 하지 않음 — 웹앱 전담 |
| popup/App.tsx | 수집 현황 표시, 웹앱 열기 |
| lib/statusMapping.ts | "지원완료" → applied, "취소" 포함 → canceled 등 |
| lib/dateNormalize.ts | 각 사이트 날짜 → 자정 기준 ISO (시분 버림) |
| lib/storage.ts | chrome.storage.local 사이트별 슬롯(saramin/jobkorea/wanted) 누적 저장·조회. 재수집 시 해당 슬롯만 덮어씀, "초기화" 버튼 호출 시에만 전체 비움 |

## 5. MV3 주의사항

- **service worker는 항상 떠있지 않음** → 전역변수 대신 chrome.storage 사용
- **inline script 금지** → 모든 스크립트 파일 분리
- **비동기 메시지 응답** → listener에서 `return true`
- **권한 최소화** → 필요한 host_permissions만 (심사 통과 위해)

## 6. manifest.json 핵심

```json
{
  "manifest_version": 3,
  "name": "취준일기",
  "version": "0.1.0",
  "permissions": ["storage"],
  "host_permissions": [
    "https://*.saramin.co.kr/*",
    "https://*.jobkorea.co.kr/*",
    "https://*.wanted.co.kr/*"
  ],
  "background": {
    "service_worker": "src/background/index.ts",
    "type": "module"
  },
  "content_scripts": [
    { "matches": ["https://*.saramin.co.kr/*"], "js": ["src/content/saramin.ts"] },
    { "matches": ["https://*.jobkorea.co.kr/*"], "js": ["src/content/jobkorea.ts"] },
    { "matches": ["https://*.wanted.co.kr/*"], "js": ["src/content/wanted.ts"] }
  ],
  "action": { "default_popup": "src/popup/index.html" }
}
```

> `permissions`의 `"storage"`는 **chrome.storage.local 접근(사이트별 슬롯 누적 저장)에만** 필요한 권한이다. 전체 복사(`navigator.clipboard.write`/`writeText`)는 별도 manifest 권한이 필요 없다 — 사용자 클릭(user gesture) 맥락의 확장 팝업에서 호출되는 표준 Clipboard API라 그 자체로 동작한다(실제로 복사 기능은 이미 권한 추가 없이 동작 중). 실제 `manifest.config.ts`는 아직 누적 저장 기능을 구현하기 전이라 `permissions`가 빈 배열이며, 누적 저장 구현 시 `"storage"`만 추가할 예정이다.

## 7. 개발 규칙 (웹앱과 동일)

- named export, 함수형, TypeScript
- 셀렉터는 상수로 분리 (하드코딩 금지)
- Atomic 커밋 (한 커밋 하나의 작업)
- 사이트별 파서는 동일 인터페이스(ScrapedApplication[]) 반환
- 사람인 1개 완성 후 나머지 복제
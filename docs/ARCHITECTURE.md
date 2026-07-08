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
      ↓ 상태 매핑 + 중복 제거 + 정규화
   chrome.storage.local 저장
      ↓
   [popup] 수집 결과 표시 / [웹앱] 데이터 전달
```

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
│   │   └── storage.ts           # chrome.storage 헬퍼
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
| background/index.ts | 메시지 수신, 매핑/중복제거, 저장 |
| popup/App.tsx | 수집 현황 표시, 웹앱 열기 |
| lib/statusMapping.ts | "지원완료" → applied 등 |
| lib/dateNormalize.ts | 각 사이트 날짜 → ISO |
| lib/storage.ts | chrome.storage 래퍼 |

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

## 7. 개발 규칙 (웹앱과 동일)

- named export, 함수형, TypeScript
- 셀렉터는 상수로 분리 (하드코딩 금지)
- Atomic 커밋 (한 커밋 하나의 작업)
- 사이트별 파서는 동일 인터페이스(ScrapedApplication[]) 반환
- 사람인 1개 완성 후 나머지 복제
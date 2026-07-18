# 🔗 웹앱 연동 (Integration)

> **이 문서는 "보내는 쪽(익스텐션)" 변환 로직을 정의한다.** "받는 쪽" 계약(`Application` 타입, `addApplicationsFromExtension` 시그니처, 최종 중복 판정 로직)의 진실은 웹앱 레포의 `docs/INTEGRATION.md`이며, 이 문서 내용이 웹앱 문서와 어긋나면 웹앱 문서를 따른다.

익스텐션이 수집한 데이터를 취준일기 웹앱으로 전달하기 위해 필요한 변환(어댑터) 로직과, 구조상 확정된 전달 제약, 전달 방식 후보를 정리한다.

---

## status 매핑

각 사이트의 상태 원문 → 웹앱 `Status` 타입으로 변환한다. 매핑은 익스텐션의 `mapStatus()`가 수행한다.

| 원문 (사이트)                                | status         |
| --------------------------------------------- | -------------- |
| 사람인 "지원완료"                             | `applied`      |
| 잡코리아 "지원완료"                           | `applied`      |
| 원티드 "접수"                                 | `applied`      |
| 사람인 / 잡코리아 "불합격", "탈락"            | `rejected`     |
| 원티드 "불합격"                               | `rejected`     |
| "취소" 포함 텍스트 (사람인 "지원취소완료", 잡코리아 "지원취소") | `canceled` |
| 그 외 매핑 실패                               | `applied` (기본값) |

- "취소" 판정은 **부분 일치**다. 원문에 "취소"라는 문자열이 포함되면 `canceled`로 매핑한다.
- `screening` / `interview` / `interviewed` / `offer`는 매핑 대상이 아니다. 3개 사이트 모두 실제 DOM 검증 결과 이 상태들을 원문으로 제공하지 않는다 — 유저가 웹앱에서 직접 상태를 변경해 관리한다. (기획 초기에는 "서류통과→screening" 등도 매핑 대상으로 가정했으나 실제 구현 단계에서 제외됨.)

---

## 날짜 변환 (normalizeDate)

각 사이트 원본 날짜 텍스트에서 **연·월·일만** 추출해 **자정(00:00:00.000) 기준 UTC ISO 문자열**로 변환한다. 시·분·초는 버린다.

```text
"2026.06.09 20:27" (사람인)        → "2026-06-09T00:00:00.000Z"
"20260601235538" (잡코리아, data)  → "2026-06-01T00:00:00.000Z"
"2026. 7. 11" (원티드)             → "2026-07-11T00:00:00.000Z"
```

사이트마다 시분 표기 유무가 들쭉날쭉하고 timezone도 명확하지 않으므로, 애초에 날짜 단위로만 다뤄 timezone 문제를 원천 제거한다. 3사이트 모두 동일 규칙을 적용한다.

---

## 중복 방지 전략

- **판별 키: `platform` + `externalId` 조합.** `externalId`는 사이트별로 독립 발급되는 값이라, `platform`이 다르면 값이 같아도 다른 지원 건으로 취급한다.
  - 사람인: `recruitapply_idx`
  - 잡코리아: `data-idx`
- **원티드는 `externalId`가 없음** → `platform` + `company` + `position` + `appliedAt`(날짜, 시분 버린 값) 조합으로 유사 판별한다.
- 판별과 저장은 **웹앱의 `addApplicationsFromExtension` 내부**에서 처리한다. 익스텐션은 중복 판별 로직을 갖지 않는다.

---

## 데이터 변환 (ScrapedApplication → Application)

역할 분리:

- **익스텐션**: `ScrapedApplication[]`을 `Application` 형식으로 변환한다(어댑터). `id`, `updatedAt`은 웹앱이 채우므로 익스텐션은 만들지 않는다.
- **웹앱**: 변환된 배열을 `addApplicationsFromExtension(apps)`로 받아 중복 판별과 저장까지 전부 처리한다.

```typescript
function convertToApplication(
  scraped: ScrapedApplication
): Omit<Application, "id" | "updatedAt"> {
  return {
    company: scraped.company,
    position: scraped.position,
    platform: scraped.platform, // 'saramin' | 'wanted' | 'jobkorea'
    status: mapStatus(scraped.status), // 원문 → Status (canceled 포함)
    appliedAt: normalizeDate(scraped.appliedAt), // → 자정 기준 ISO
    externalId: scraped.externalId, // 원티드는 undefined
  };
}
```

> `apps`가 웹앱에 닿기까지의 구체적 경로(직접 호출이 불가능한 이유 포함)는 아래 "전달 제약"과 "전달 방식" 참고.

> `Application` 타입 정의와 `addApplicationsFromExtension` 시그니처의 최종 진실은 웹앱 레포 `docs/INTEGRATION.md`다.

---

## 전달 제약 (확정)

아래는 미확정이 아니라 실행 컨텍스트 구조상 확정된 제약이다.

- content script는 웹앱 페이지에 주입되더라도 **격리된 별도 JS 실행 컨텍스트(isolated world)**에서 돈다. 웹앱 페이지의 main world에 정의된 `addApplicationsFromExtension` 같은 함수를 **직접 호출할 수 없다.**
- 따라서 전달은 반드시 **메시지 전달 경로**를 거친다: 익스텐션이 `window.postMessage` 또는 DOM 커스텀 이벤트(`CustomEvent`)로 변환된 데이터를 웹앱 페이지에 보내고, 웹앱이 그 message/event 리스너 **안에서** `addApplicationsFromExtension`을 호출한다.
- 이 문서에서 "`addApplicationsFromExtension` 호출"이라고 쓴 부분은 전부 이 경로를 거친 뒤 **웹앱 쪽 리스너가** 호출한다는 뜻이며, 익스텐션이 직접 호출한다는 뜻이 아니다.

---

## 전달 방식 (미확정)

> ⚠️ 아직 실제 연동 구현으로 검증되지 않았다. 아래 후보는 위 "전달 제약"을 만족하는 안들이며, 다음 사항은 실제 연동 구현(E-5)에서 확정한다:
>
> - chrome.storage.local에 **원본 `ScrapedApplication`을 저장하고 전달 시점에 변환**할지, **변환된 `Application`을 저장**할지. (변환은 한 곳에서만 수행한다는 원칙만 확정, 정확한 위치는 E-5에서 결정)
> - 구체적 전달 경로(`postMessage` vs DOM 커스텀 이벤트 vs `chrome.runtime.sendMessage` 조합)와 웹앱 수신 지점의 정확한 위치

### 후보 1단계: localStorage 공유 방식 (MVP)

웹앱이 아직 localStorage 기반이므로, 익스텐션도 이에 맞추는 안. 두 방식 모두 "전달 제약"에 따라 메시지 전달 경로를 거친다 — content script가 웹앱 함수를 직접 부르지 않는다.

#### 방식 A: window.postMessage

```text
1. 익스텐션이 수집 → chrome.storage.local에 저장 (원본/변환본 여부는 E-5 확정)
2. popup에서 "취준일기 열기" 클릭 → 웹앱 탭 열림/포커스
3. 익스텐션이 웹앱 페이지(jobdiary.vercel.app)에 content script 주입
4. content script가 저장된 데이터를 준비해 window.postMessage로 웹앱 페이지에 전송
5. 웹앱이 message 이벤트 리스너 안에서 addApplicationsFromExtension 호출
6. 웹앱이 칸반에 반영
```

#### 방식 B: DOM 커스텀 이벤트

```text
1~3. 방식 A와 동일
4. content script가 저장된 데이터를 담은 CustomEvent를 document에 dispatch
5. 웹앱이 해당 이벤트 리스너 안에서 addApplicationsFromExtension 호출
6. 웹앱이 칸반에 반영
```

### 후보 2단계: 서버 연동 방식 (로그인 후)

Supabase 도입 후.

```text
1. 웹앱 로그인 → 토큰 발급
2. 익스텐션이 웹앱과 토큰 공유 (또는 별도 로그인)
3. 변환된 데이터를 웹앱 API로 직접 POST
4. DB 저장 → 여러 기기 동기화
```

---

## 연동 개발 순서

```text
1. 익스텐션: 사람인 수집 → chrome.storage 저장까지
2. 익스텐션: convertToApplication 어댑터 구현 (status/날짜 매핑 포함)
3. 웹앱: addApplicationsFromExtension 수신 로직 구현 (판별 + 저장)
4. 익스텐션: 웹앱으로 전달 (전달 방식은 E-5에서 확정)
5. 실제 연동 테스트 (사람인 → 웹앱 칸반 반영 확인)
6. 잡코리아, 원티드 확장
```

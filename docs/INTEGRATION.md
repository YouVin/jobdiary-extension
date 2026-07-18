# 🔗 웹앱 연동 (Integration)

> **이 문서는 "보내는 쪽(익스텐션)" 변환 로직을 정의한다.** "받는 쪽" 계약(`Application` 타입, `addApplicationsFromExtension` 시그니처, 최종 중복 판정 로직)의 진실은 웹앱 레포의 `docs/INTEGRATION.md`이며, 이 문서 내용이 웹앱 문서와 어긋나면 웹앱 문서를 따른다.

익스텐션이 수집한 데이터를 취준일기 웹앱으로 전달하기 위해 필요한 변환(어댑터) 로직과, 전달 방식 후보를 정리한다.

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

전달 시:

```typescript
const apps = scraped.map(convertToApplication);
addApplicationsFromExtension(apps); // 웹앱 쪽 API. 중복 판별 + 저장은 웹앱 책임
```

> `Application` 타입 정의와 `addApplicationsFromExtension` 시그니처의 최종 진실은 웹앱 레포 `docs/INTEGRATION.md`다.

---

## 전달 방식 (미확정)

> ⚠️ 아직 실제 연동 구현으로 검증되지 않았다. **전달 방식은 실제 연동 구현(E-5) 시 확정한다.** 아래는 후보일 뿐 어느 쪽도 확정된 것이 아니다.

### 후보 1단계: localStorage 공유 방식 (MVP)

웹앱이 아직 localStorage 기반이므로, 익스텐션도 이에 맞추는 안.

#### 방식 A: 웹앱 페이지에 직접 주입

```text
1. 익스텐션이 수집 → chrome.storage.local에 임시 저장
2. popup에서 "취준일기 열기" 클릭 → 웹앱 탭 열림/포커스
3. 익스텐션이 웹앱 페이지(jobdiary.vercel.app)에도 content script 주입
4. 그 content script가 chrome.storage의 수집 데이터를 읽어
   convertToApplication으로 변환한 뒤 addApplicationsFromExtension 호출
5. 웹앱이 새로고침/감지해서 칸반에 반영
```

#### 방식 B: postMessage 통신

```text
1. 익스텐션 content script가 웹앱 페이지에 window.postMessage로 변환된 데이터 전송
2. 웹앱이 message 이벤트 리스너로 받아 addApplicationsFromExtension 호출
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

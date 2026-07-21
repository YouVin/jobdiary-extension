# 🔗 웹앱 연동 (Integration)

> **이 문서는 "보내는 쪽(익스텐션)" 변환 로직을 정의한다.** "받는 쪽" 계약(`Application` 타입, `addApplicationsFromExtension` 시그니처, 최종 중복 판정 로직)의 진실은 웹앱 레포의 `docs/INTEGRATION.md`이며, 이 문서 내용이 웹앱 문서와 어긋나면 웹앱 문서를 따른다.

익스텐션이 수집한 데이터를 취준일기 웹앱으로 전달하기 위해 필요한 변환(어댑터) 로직과, 구조상 확정된 전달 제약, 전달 방식 후보를 정리한다. 누적 저장된 데이터가 클립보드 복사와 웹앱 전달, 두 출구로 나가는 것도 함께 정리한다.

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
- 이 판별은 **웹앱 전달 경로에만 적용**된다. 클립보드 복사 경로와 익스텐션의 로컬 누적 저장(사이트별 슬롯 덮어쓰기)에는 적용되지 않는다 — 아래 "두 출구" 참고.

---

## 두 출구: 클립보드 복사 vs 웹앱 전달

익스텐션은 chrome.storage.local에 사이트별 슬롯(`{ saramin, jobkorea, wanted }`)으로 수집 결과를 누적 저장한다(같은 사이트 재수집 시 그 슬롯만 덮어씀, 상세: docs/PLANNING.md "데이터 정합성 / 저장 전략"). 이 누적 데이터가 밖으로 나가는 경로는 두 가지다.

1. **클립보드 복사(E-6, 확정)**: "전체 복사" 버튼이 누적된 3사이트 슬롯을 합쳐 TSV + HTML로 클립보드에 쓴다. 이 경로는 웹앱을 거치지 않는다 — `addApplicationsFromExtension`도 호출되지 않고, 웹앱의 중복 판별도 적용되지 않는다. 유저가 직접 어딘가(노션/시트 등)에 붙여넣는 대상이라 판별이 필요 없다.
2. **웹앱 전달(E-5, 미확정)**: 아래 "전달 제약"·"전달 방식" 참고. `addApplicationsFromExtension`을 거치는 경로는 이것뿐이고, 중복 판별도 이 경로에서만 일어난다.

두 출구 모두에서 **익스텐션은 중복 판별 로직을 갖지 않는다.** 익스텐션이 하는 일은 사이트별 슬롯 덮어쓰기로 최신 상태를 유지하는 것뿐이며, 진짜 중복 지원 판별은 오직 웹앱 전달 경로에서 `addApplicationsFromExtension`이 수행한다.

---

## 데이터 변환 (ScrapedApplication → Application)

역할 분리 (확정 — E-5에서도 바뀌지 않는다):

- **익스텐션**: `ScrapedApplication[]`을 `Application` 형식으로 변환한다(어댑터). **변환은 오직 익스텐션에서만, 한 곳에서만 일어나며 이중 변환은 없다.** `id`, `updatedAt`은 웹앱이 채우므로 익스텐션은 만들지 않는다.
- **웹앱**: 이미 변환이 끝난 `Application[]`을 `addApplicationsFromExtension(apps)`로 받아 중복 판별과 저장만 수행한다. **웹앱은 변환하지 않는다.**

즉 웹앱 경계를 넘어가는 payload는 항상 변환이 끝난 `Application` 형식이다. 이 경계 규칙과 변환 주체는 미확정이 아니다 — E-5에서 정하는 것은 저장 표현과 전송 경로의 세부일 뿐이다 (아래 "전달 방식" 참고).

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
- 메시지로 건너가는 데이터는 **익스텐션이 이미 변환을 마친 `Application` 형식**이다 (변환 주체: 위 "데이터 변환" 참고). 웹앱 쪽 리스너는 변환하지 않고 `addApplicationsFromExtension`으로 판별·저장만 한다.

---

## 전달 방식 (미확정)

> ⚠️ 아직 실제 연동 구현으로 검증되지 않았다. 아래 후보는 위 "전달 제약"을 만족하는 안들이다. **변환 주체(익스텐션)와 웹앱 경계 payload 형식(변환 완료된 `Application`)은 이미 확정**이며 (위 "데이터 변환" 참고), 실제 연동 구현(E-5)에서 정하는 것은 다음 두 가지뿐이다:
>
> - **저장 표현**: chrome.storage.local에 원본 `ScrapedApplication`을 저장해뒀다가 웹앱 전송 직전에 변환할지, 변환된 `Application`을 미리 저장해둘지. 어느 쪽이든 **변환은 익스텐션이 수행**하며 웹앱으로 나가는 payload는 항상 변환 완료 상태다.
> - **전송 경로**: 구체적 전달 경로(`postMessage` vs DOM 커스텀 이벤트 vs `chrome.runtime.sendMessage` 조합)와 웹앱 수신 지점의 정확한 위치.

### 후보 1단계: localStorage 공유 방식 (MVP)

웹앱이 아직 localStorage 기반이므로, 익스텐션도 이에 맞추는 안. 두 방식 모두 "전달 제약"에 따라 메시지 전달 경로를 거친다 — content script가 웹앱 함수를 직접 부르지 않는다.

#### 방식 A: window.postMessage

```text
1. 익스텐션이 수집 → chrome.storage.local에 저장 (원본 ScrapedApplication으로 저장할지,
   변환된 Application으로 저장할지는 E-5 확정 — 어느 쪽이든 변환은 익스텐션이 수행)
2. popup에서 "취준일기 열기" 클릭 → 웹앱 탭 열림/포커스
3. 익스텐션이 웹앱 페이지(jobdiary.vercel.app)에 content script 주입
4. content script가 저장된 데이터를 (변환 전이면 convertToApplication으로 변환한 뒤)
   window.postMessage로 웹앱 페이지에 전송
5. 웹앱이 message 이벤트 리스너 안에서 addApplicationsFromExtension 호출 (판별·저장만, 변환 없음)
6. 웹앱이 칸반에 반영
```

#### 방식 B: DOM 커스텀 이벤트

```text
1~3. 방식 A와 동일
4. content script가 저장된 데이터를 (변환 전이면 convertToApplication으로 변환한 뒤)
   CustomEvent에 담아 document에 dispatch
5. 웹앱이 해당 이벤트 리스너 안에서 addApplicationsFromExtension 호출 (판별·저장만, 변환 없음)
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
4. 익스텐션: 웹앱으로 전달 (저장 표현/전송 경로는 E-5에서 확정, 변환은 항상 익스텐션이 사전에 완료)
5. 실제 연동 테스트 (사람인 → 웹앱 칸반 반영 확인)
6. 잡코리아, 원티드 확장
```

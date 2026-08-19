# 🎯 셀렉터 명세 (Selectors)

실제 지원현황 페이지 HTML을 분석해 도출한 셀렉터. **익스텐션 개발의 핵심 자료.**
사이트 개편 시 이 문서만 업데이트하면 됨.

> ⚠️ 셀렉터는 사이트 구조 변경으로 깨질 수 있음. content script에서 이 값들을 상수로 모아 관리한다.

---

## 공통 수집 데이터

각 사이트에서 아래 4개(+보너스)를 추출한다.

```typescript
interface ScrapedApplication {
  company: string; // 회사명
  position: string; // 공고명/포지션
  appliedAt: string; // 지원일
  status: string; // 지원 상태 (원문)
  externalId?: string; // 사이트 고유 ID (중복 방지용)
  viewed?: boolean; // 열람 여부. 원티드는 없음
  appliedAtExact?: string; // 지원일 (시각 포함 원문). 시각 정보가 없으면 없음
  url?: string; // 공고 절대 URL. 원티드는 없음
}
```

수집한 status 원문은 웹앱의 Status 타입으로 매핑한다 (매핑 규칙: [INTEGRATION.md](./INTEGRATION.md) 참고).

---

## 1. 사람인 (saramin.co.kr)

**난이도: 쉬움** — `data-` 속성에 데이터가 직접 있음

### 지원현황 페이지

```text
https://www.saramin.co.kr/zf_user/persons/apply-status-list
```

### 컨테이너 (지원 1건)

```text
.row._apply_list
```

### DOM 검증 노트 (실물 HTML 분석 결과)

- **점핏(Jumpit) 연동 공고는 `rec_division`이 빈 문자열로 옴**: `data-jumpit_rec_idx`에 값이 있는 행(점핏 경유 공고)은 `data-rec_division=""`이고, 화면에도 `.division` span 자체가 없다. 이 경우 `data-recruittitle` 속성에 공고 제목(예: "프론트엔드 개발자 (React)")이 대신 들어있어 이걸로 폴백한다. `rec_division`이 정상 값인 일반 공고(대다수)는 폴백을 타지 않고 그대로 쓴다.

### 셀렉터

| 데이터   | 셀렉터                                              | 비고                                                                |
| -------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| 회사명   | `[data-company_nm]` 속성값                          | `row.dataset.company_nm`                                            |
| 공고명   | `[data-rec_division]` 속성값, 비어있으면 `[data-recruittitle]` 폴백 | `row.dataset.rec_division \|\| row.dataset.recruittitle`. 점핏 연동 공고는 전자가 빈 문자열 |
| 지원일   | `.col_date` 텍스트                                  | "2026.06.09 20:27"                                                   |
| 상태     | `.txt_status` 텍스트                                | "지원완료" 등                                                        |
| 세부상태 | `.txt_sub` 텍스트                                   | "미열람" 등. ★주의: 지원취소완료 행에선 이 칸에 취소일시("2026.07.12 19:33")가 들어온다. 텍스트가 정확히 '열람'/'미열람'일 때만 viewed로 쓰고, 아니면 undefined |
| 고유ID   | `[data-recruitapply_idx]`                           | 중복 방지                                                            |
| 공고 URL | `.recruit a` 의 `href`                              | 상대경로 — `new URL(href, location.origin)`로 절대화                |

### 예시 코드

```javascript
document.querySelectorAll(".row._apply_list").forEach((row) => {
  const company = row.dataset.company_nm;
  // 점핏 연동 공고는 rec_division이 빈 문자열이라 recruittitle로 폴백한다.
  const position = row.dataset.rec_division || row.dataset.recruittitle;
  const appliedAt = row.querySelector(".col_date")?.textContent?.trim(); // "2026.06.09 20:27"
  const appliedAtExact = appliedAt; // 이미 시각까지 포함돼 있어 그대로 exact로도 쓴다
  const status = row.querySelector(".txt_status")?.textContent?.trim();
  const externalId = row.dataset.recruitapply_idx;

  // ★주의: 지원취소완료 행에선 .txt_sub에 취소일시("2026.07.12 19:33")가 들어온다.
  // 텍스트가 정확히 '열람'/'미열람'일 때만 viewed로 쓰고, 아니면 undefined.
  const subStatusText = row.querySelector(".txt_sub")?.textContent?.trim();
  const viewed =
    subStatusText === "열람" ? true : subStatusText === "미열람" ? false : undefined;

  // .recruit a의 href는 상대경로라 절대화해서 쓴다.
  const href = row.querySelector(".recruit a")?.getAttribute("href");
  const url = href ? new URL(href, location.origin).toString() : undefined;
});
```

---

## 2. 잡코리아 (jobkorea.co.kr)

**난이도: 쉬움** — `data-` 속성 + 명확한 class

### 지원현황 페이지

```text
마이페이지 → 입사지원현황
```

### 컨테이너 (지원 1건)

```text
지원 목록의 각 <tr> (테이블 행)
```

### DOM 검증 노트 (실물 HTML 분석 결과, 최초 문서 대비 정정)

- **버튼 class로 필터하면 안 됨**: 지원취소한 건은 `.devBtnDel`, 진행중인 건은 `.devBtnCancel`(+`.devBtnOddInfo`)을 쓴다. 특정 class로 골라내면 케이스가 누락된다. 대신 **`[data-applydate]` 등 data 속성 존재 여부로 필터**한다. 두 버튼 모두 `memname`/`gititle`/`applydate`/`idx` data 속성을 동일하게 가진다.
- **빈 `<tr></tr>`가 데이터 행 사이에 존재**: data 속성 기반 필터를 쓰면 자연히 스킵된다.
- **지원일은 텍스트보다 `data-applydate`가 안정적**: `.item.date` 텍스트는 "2026.06.13 00:43"처럼 시분이 있는 것도 있고 "2026.06.01"처럼 없는 것도 있어 들쭉날쭉하다. `data-applydate`는 항상 14자리 "20260601235538"(YYYYMMDDHHmmss) 풀 포맷이므로 이걸 파싱해 `YYYY.MM.DD HH:mm`으로 변환해 쓴다.
- **회사명 원본 데이터가 깨진 사례 있음**: 예) `data-memname="아타드㈜(ATAD Corp."` 처럼 여는 괄호만 있고 닫는 괄호가 없는 경우가 있다. 잡코리아 원본 DB 이슈로 우리가 고칠 수 없으니 원문 그대로 저장한다.
- **오래된 지원(`.devBtnOldDel` 등)은 버튼 data가 없어 본문 텍스트로 폴백**: 최신 지원은 `.devBtnDel`/`.devBtnCancel` 버튼에 `memname`/`gititle`/`applydate`/`idx`가 다 있지만, 오래된 지원은 `.devBtnOldDel` 버튼에 `data-idx`/`data-year`만 있고 `memname`/`gititle`/`applydate`가 없다. `[data-applydate]`로 필터하면(위 항목) 이 행들이 전부 스킵돼 지원 건수가 실제보다 적게 잡힌다. `[data-applydate]`가 없으면 회사명은 `.company a`, 공고명은 `.description a`, 지원일은 `.apply-status .date` 텍스트로 대신 읽는다. externalId는 오래된 버튼의 `data-idx`를 그대로 쓴다(최신 행과 같은 기준). 공고 자체가 삭제된 행(`<td colspan="2">삭제된 채용공고입니다.</td>`처럼 진행상태 칸이 합쳐짐)도 `.company`/`.description`은 본문에 남아있어 같은 폴백으로 수집된다.

### 셀렉터

| 데이터   | 셀렉터                              | 비고                                                                                            |
| -------- | ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| 회사명   | `[data-memname]`, 없으면 `.company a` | "㈜플레이웍스". 드물게 원본 데이터 자체가 깨져 있음(위 노트 참고)                             |
| 공고명   | `[data-gititle]`, 없으면 `.description a` | 마감일 없이 깔끔한 버전                                                                    |
| 지원일   | `[data-applydate]`, 없으면 `.apply-status .date` | 버튼 데이터는 "20260601235538"(YYYYMMDDHHmmss) 고정 포맷. 본문 폴백은 "2026.04.01"(YYYY.MM.DD) |
| 상태     | `.apply-status .item.status` 텍스트 | "지원취소", "지원완료" 등. 버튼 유무와 무관하게 항상 본문에서 읽음                              |
| 진행상태 | `.apply-progress .status` 텍스트    | "진행중" 등                                                                                     |
| 열람여부 | `.reading` 텍스트                   | "미열람"/"열람". 클래스(`read-not`)가 아니라 텍스트로 판별한다                                   |
| 고유ID   | `[data-idx]`                        | 중복 방지. `.devBtnDel`/`.devBtnCancel`(최신) 또는 `.devBtnOldDel`(오래된 지원) 버튼에서 읽음   |
| 공고 URL | `.description a` 의 `href`          | 상대경로 — `new URL(href, location.origin)`로 절대화                                            |

### 예시 코드

```javascript
document.querySelectorAll("tr").forEach((row) => {
  // 버튼 class(.devBtnDel/.devBtnCancel)로 필터하지 않는다 — 상태별로 class가 다르다.
  const dataBtn = row.querySelector("[data-applydate]");
  const status = row
    .querySelector(".apply-status .item.status")
    ?.textContent?.trim();

  // url/viewed는 버튼 유무와 무관하게 두 분기(최신/오래된) 모두 행 본문에서 공통으로 읽는다.
  const href = row.querySelector(".description a")?.getAttribute("href");
  const url = href ? new URL(href, location.origin).toString() : undefined;
  const readingText = row.querySelector(".reading")?.textContent?.trim();
  const viewed =
    readingText === "열람" ? true : readingText === "미열람" ? false : undefined;

  if (dataBtn) {
    // 최신 지원: 버튼 data 속성 그대로 사용.
    const company = dataBtn.dataset.memname; // 드물게 괄호 등 원본 데이터가 깨져 있을 수 있음
    const position = dataBtn.dataset.gititle; // 깔끔한 버전
    const appliedAtRaw = dataBtn.dataset.applydate; // "20260601235538" (YYYYMMDDHHmmss) → "2026.06.01 23:55"로 변환해 appliedAt에 씀
    const appliedAtExact = dataBtn.dataset.applydate; // 같은 원본을 초까지 살려 "2026.06.01 23:55:38"로 변환해 씀
    const externalId = dataBtn.dataset.idx;
    return;
  }

  // 오래된 지원(.devBtnOldDel 등)이거나 공고가 삭제된 행: 버튼에 memname/gititle/applydate가
  // 없어 본문 텍스트로 폴백한다. data-idx도 회사명도 둘 다 없으면 빈 tr 등 지원 행이 아니므로 스킵.
  const oldBtn = row.querySelector("[data-idx]");
  const company = row.querySelector(".company a")?.textContent?.trim();
  if (!oldBtn && !company) return;

  const position = row.querySelector(".description a")?.textContent?.trim();
  const appliedAtRaw = row.querySelector(".apply-status .date")?.textContent?.trim(); // "2026.04.01"
  const appliedAtExact = undefined; // 폴백 경로는 시각 정보 자체가 없어 exact로 쓸 게 없음
  const externalId = oldBtn?.dataset.idx;
});
```

---

## 3. 원티드 (wanted.co.kr)

**난이도: 보통** — class에 해시가 붙어서 부분매칭 필요

### 지원현황 페이지

```text
https://www.wanted.co.kr/status/applications/applied (쿼리 파라미터로 필터/페이지)
```

### 컨테이너 (지원 1건)

```text
li[class*="table_tr"]   (해시 무시하고 부분매칭)
```

### DOM 검증 노트 (실물 HTML 분석 결과, 최초 문서 대비 정정/보완)

- **`li` 명시로 헤더 행 자동 제외**: 헤더도 `table_tr` class를 갖지만 `<div class="table-header ...">`로 렌더된다. 컨테이너 셀렉터를 `li[class*="table_tr"]`로 태그까지 명시하면 헤더 `<div>`는 매칭되지 않고 데이터 행(`<li>`)만 잡힌다.
- **externalId(고유ID) 없음**: `<li>` 안에 지원건을 식별할 data 속성이나 상세 링크가 없다. 회사 로고 이미지 URL이 있긴 하지만 회사 단위로만 구분되고 지원건 단위 식별에는 쓸 수 없다. 원티드는 `externalId`를 빈 값(`undefined`)으로 둔다.
- **React SPA 렌더링 주의**: class에 `wds-` 접두사와 해시 접미사가 붙은 것으로 보아 클라이언트 사이드 렌더링이다. 페이지 로드 직후에는 목록이 비어 있을 수 있어, content script가 즉시 파싱하면 0건이 잡힐 위험이 있다. 실제 파싱 트리거 시점(버튼 클릭 등) 또는 목록 렌더 완료 감지가 필요한지 검증 시 확인해야 한다.
- **지원일 포맷 정규화 필요**: "2026. 7. 11"처럼 마침표+공백 구분이고 월/일이 한 자리로 나올 수 있다. 공백 제거 + 0 채움으로 "2026.07.11" 형태로 정규화해서 쓴다.

### 셀렉터 (부분매칭 필수)

| 데이터 | 셀렉터                              | 비고                                                                 |
| ------ | ------------------------------------ | -------------------------------------------------------------------- |
| 회사명 | `[class*="td_company_name"]` 텍스트 | "무론". `td_` 프리픽스까지 좁혀 오매칭 방지                          |
| 공고명 | `[class*="td_position"]` 텍스트     | "프론트엔드 개발자"                                                  |
| 지원일 | `[class*="td_create_time"]` 텍스트  | "2026. 7. 11" (정규화: "2026.07.11")                                 |
| 상태   | `[class*="td_status"]` 텍스트       | "불합격", "진행중" 등                                                |
| 고유ID | 없음                                 | `<li>` 안에 지원건 식별 data 속성/링크 없음. `externalId` 빈 값 처리 |
| 공고 URL | 없음                               | 행에 공고 링크 없음 → `undefined`                                    |
| 열람여부 | 없음                               | 원티드 DOM에 열람 정보 없음 → `undefined`                            |

### ⚠️ 주의: 해시 클래스

원티드 class는 `List_List_table_td_company_name__u5tEF`처럼 뒤에 해시(`__u5tEF`)가 붙는다. 이 해시는 사이트 빌드 시 바뀔 수 있으므로 **전체 class를 쓰지 말고 `[class*="td_company_name"]` 부분매칭**을 사용한다. `td_` 프리픽스까지 포함해야 다른 영역(헤더 등)의 동일 접미사 class와 오매칭되지 않는다.

### 페이지네이션 (실물 HTML 분석 결과)

사람인/잡코리아처럼 URL만 바꿔 fetch로 페이지를 순회하는 방식은 원티드에서 안 통한다 — React SPA라 fetch로 받은 원문 HTML엔 목록이 서버 렌더링돼 있지 않다(검증됨). 내부 JSON API(`/api/v1/applications`)도 시도했으나 로그인 세션 인증이 필요해 401로 막혔고, 그 인증 토큰을 코드로 읽는 건 "로그인 정보 미수집" 원칙 위반이라 포기했다. 대신 화면의 실제 "다음 페이지" 버튼을 클릭하고 DOM 갱신을 기다리는 방식을 쓴다.

```text
<div data-role="pagination-wrapper">
  <button data-role="pagination-prev-button" disabled aria-disabled="true">...</button>
  <ul>
    <li><button data-role="pagination-item-page" aria-current="page" aria-label="Page 1"><span>1</span></button></li>
  </ul>
  <button data-role="pagination-next-button" disabled aria-disabled="true">...</button>
</div>
```

| 데이터 | 셀렉터 | 비고 |
| ------ | ------ | ---- |
| 다음 페이지 버튼 | `[data-role="pagination-next-button"]` | 마지막 페이지에서는 `disabled` 속성 + `aria-disabled="true"`가 붙음. 이걸로 종료 판정 |
| 활성 페이지 번호 | `[data-role="pagination-item-page"][aria-current="page"]` | 안의 `<span>` 텍스트가 "1", "2" 등 숫자. 클릭 후 이 값이 바뀌는 걸 React 리렌더 완료 신호로 씀 |

### 예시 코드

```javascript
// React SPA라 페이지 로드 직후엔 목록이 비어 있을 수 있음 — 파싱 시점 확인 필요
document.querySelectorAll('li[class*="table_tr"]').forEach((row) => {
  const company = row
    .querySelector('[class*="td_company_name"]')
    ?.textContent?.trim();
  const position = row
    .querySelector('[class*="td_position"]')
    ?.textContent?.trim();
  const appliedAtRaw = row
    .querySelector('[class*="td_create_time"]')
    ?.textContent?.trim(); // "2026. 7. 11" → 정규화 필요 ("2026.07.11")
  const status = row.querySelector('[class*="td_status"]')?.textContent?.trim();
  const externalId = undefined; // 원티드는 지원건 고유 ID가 없음
  const url = undefined; // 행에 공고 링크 없음
  const viewed = undefined; // 원티드 DOM에 열람 정보 없음
});
```

---

## 상태 매핑 / 날짜 정규화

상태 원문 → Status 매핑 규칙, 날짜 → ISO 변환 규칙은 [INTEGRATION.md](./INTEGRATION.md)를 참조. (이 문서는 셀렉터 정보에 집중하고, 매핑/변환 규칙은 INTEGRATION.md를 단일 진실로 둔다.)

---

## 유지보수 노트

- 셀렉터가 깨지면 이 문서를 먼저 업데이트하고 content script 상수 수정
- 각 사이트별 셀렉터는 `src/content/selectors/{site}.ts` 에 상수로 관리
- 수동 저장 버튼(백업)은 항상 제공 — 자동 파싱 실패 시 대비

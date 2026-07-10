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
}
```

수집한 status 원문은 웹앱의 Status 타입으로 매핑한다 (STATUS_MAPPING 참고).

---

## 1. 사람인 (saramin.co.kr)

**난이도: 쉬움** — `data-` 속성에 데이터가 직접 있음

### 지원현황 페이지

```
https://www.saramin.co.kr/zf_user/mypage/apply-status (예상)
```

### 컨테이너 (지원 1건)

```
.row._apply_list
```

### 셀렉터

| 데이터   | 셀렉터                       | 비고                      |
| -------- | ---------------------------- | ------------------------- |
| 회사명   | `[data-company_nm]` 속성값   | `row.dataset.company_nm`  |
| 공고명   | `[data-rec-division]` 속성값 | `row.dataset.recDivision` |
| 지원일   | `.col_date` 텍스트           | "2026.06.09 20:27"        |
| 상태     | `.txt_status` 텍스트         | "지원완료" 등             |
| 세부상태 | `.txt_sub` 텍스트            | "미열람" 등               |
| 고유ID   | `[data-recruitapply_idx]`    | 중복 방지                 |

### 예시 코드

```javascript
document.querySelectorAll(".row._apply_list").forEach((row) => {
  const company = row.dataset.company_nm;
  const position = row.dataset.recDivision;
  const appliedAt = row.querySelector(".col_date")?.textContent?.trim();
  const status = row.querySelector(".txt_status")?.textContent?.trim();
  const externalId = row.dataset.recruitapply_idx;
});
```

---

## 2. 잡코리아 (jobkorea.co.kr)

**난이도: 쉬움** — `data-` 속성 + 명확한 class

### 지원현황 페이지

```
마이페이지 → 입사지원현황
```

### 컨테이너 (지원 1건)

```
지원 목록의 각 <tr> (테이블 행)
```

### DOM 검증 노트 (실물 HTML 분석 결과, 최초 문서 대비 정정)

- **버튼 class로 필터하면 안 됨**: 지원취소한 건은 `.devBtnDel`, 진행중인 건은 `.devBtnCancel`(+`.devBtnOddInfo`)을 쓴다. 특정 class로 골라내면 케이스가 누락된다. 대신 **`[data-applydate]` 등 data 속성 존재 여부로 필터**한다. 두 버튼 모두 `memname`/`gititle`/`applydate`/`idx` data 속성을 동일하게 가진다.
- **빈 `<tr></tr>`가 데이터 행 사이에 존재**: data 속성 기반 필터를 쓰면 자연히 스킵된다.
- **지원일은 텍스트보다 `data-applydate`가 안정적**: `.item.date` 텍스트는 "2026.06.13 00:43"처럼 시분이 있는 것도 있고 "2026.06.01"처럼 없는 것도 있어 들쭉날쭉하다. `data-applydate`는 항상 14자리 "20260601235538"(YYYYMMDDHHmmss) 풀 포맷이므로 이걸 파싱해 `YYYY.MM.DD HH:mm`으로 변환해 쓴다.
- **회사명 원본 데이터가 깨진 사례 있음**: 예) `data-memname="아타드㈜(ATAD Corp."` 처럼 여는 괄호만 있고 닫는 괄호가 없는 경우가 있다. 잡코리아 원본 DB 이슈로 우리가 고칠 수 없으니 원문 그대로 저장한다.

### 셀렉터

| 데이터   | 셀렉터                              | 비고                                                                                            |
| -------- | ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| 회사명   | `[data-memname]`                    | "㈜플레이웍스". 드물게 원본 데이터 자체가 깨져 있음(위 노트 참고)                               |
| 공고명   | `[data-gititle]`                    | 마감일 없이 깔끔한 버전                                                                         |
| 지원일   | `[data-applydate]`                  | "20260601235538"(YYYYMMDDHHmmss) 고정 포맷. `.item.date` 텍스트는 시분 유무가 들쭉날쭉해 비권장 |
| 상태     | `.apply-status .item.status` 텍스트 | "지원취소", "지원완료" 등                                                                       |
| 진행상태 | `.apply-progress .status` 텍스트    | "진행중" 등                                                                                     |
| 열람여부 | `.reading .read-not`                | "미열람"                                                                                        |
| 고유ID   | `[data-idx]`                        | 중복 방지. data 속성을 가진 버튼(`.devBtnDel` 또는 `.devBtnCancel`)에서 읽음                    |

### 예시 코드

```javascript
document.querySelectorAll("tr").forEach((row) => {
  // 버튼 class(.devBtnDel/.devBtnCancel)로 필터하지 않는다 — 상태별로 class가 다르다.
  // data-applydate 존재 여부로 필터하면 지원취소/진행중 행 모두 잡히고, 빈 <tr>도 자연히 스킵된다.
  const dataBtn = row.querySelector("[data-applydate]");
  if (!dataBtn) return; // 지원 행이 아니면 스킵

  const company = dataBtn.dataset.memname; // 드물게 괄호 등 원본 데이터가 깨져 있을 수 있음
  const position = dataBtn.dataset.gititle; // 깔끔한 버전
  const appliedAtRaw = dataBtn.dataset.applydate; // "20260601235538" (YYYYMMDDHHmmss)
  const status = row
    .querySelector(".apply-status .item.status")
    ?.textContent?.trim();
  const externalId = dataBtn.dataset.idx;
});
```

---

## 3. 원티드 (wanted.co.kr)

**난이도: 보통** — class에 해시가 붙어서 부분매칭 필요

### 지원현황 페이지

```
마이페이지 → 지원 현황
```

### 컨테이너 (지원 1건)

```
li[class*="table_tr"]   (해시 무시하고 부분매칭)
```

### 셀렉터 (부분매칭 필수)

| 데이터 | 셀렉터                           | 비고                  |
| ------ | -------------------------------- | --------------------- |
| 회사명 | `[class*="company_name"]` 텍스트 | "무론"                |
| 공고명 | `[class*="position"]` 텍스트     | "프론트엔드 개발자"   |
| 지원일 | `[class*="create_time"]` 텍스트  | "2026. 3. 31"         |
| 상태   | `[class*="status"]` 텍스트       | "불합격", "진행중" 등 |

### ⚠️ 주의: 해시 클래스

원티드 class는 `List_List_table_td_company_name__u5tEF`처럼 뒤에 해시(`__u5tEF`)가 붙는다. 이 해시는 사이트 빌드 시 바뀔 수 있으므로 **전체 class를 쓰지 말고 `[class*="company_name"]` 부분매칭**을 사용한다.

### 예시 코드

```javascript
document.querySelectorAll('li[class*="table_tr"]').forEach((row) => {
  const company = row
    .querySelector('[class*="company_name"]')
    ?.textContent?.trim();
  const position = row
    .querySelector('[class*="position"]')
    ?.textContent?.trim();
  const appliedAt = row
    .querySelector('[class*="create_time"]')
    ?.textContent?.trim();
  const status = row.querySelector('[class*="status"]')?.textContent?.trim();
});
```

---

## 상태 매핑 (STATUS_MAPPING)

각 사이트의 상태 원문 → 취준일기 Status 타입으로 변환.

| 사이트 원문        | 취준일기 Status        |
| ------------------ | ---------------------- |
| 지원완료           | applied                |
| 지원취소           | (제외 or applied 유지) |
| 서류통과, 서류합격 | screening              |
| 면접, 면접예정     | interview              |
| 면접완료           | interviewed            |
| 최종합격, 합격     | offer                  |
| 불합격, 탈락       | rejected               |
| 진행중             | applied (기본)         |

> 매핑 안 되는 원문은 일단 applied로 두고, 유저가 웹앱에서 수정.

---

## 날짜 정규화

각 사이트 날짜 형식이 다름 → ISO 형식으로 통일.

| 사이트   | 원문 형식               | 변환  |
| -------- | ----------------------- | ----- |
| 사람인   | "2026.06.09 20:27"      | → ISO |
| 잡코리아 | "20260601235538" (data) | → ISO |
| 원티드   | "2026. 3. 31"           | → ISO |

utils에 각 사이트별 파서 함수를 둔다.

---

## 유지보수 노트

- 셀렉터가 깨지면 이 문서를 먼저 업데이트하고 content script 상수 수정
- 각 사이트별 셀렉터는 `src/content/selectors/{site}.ts` 에 상수로 관리
- 수동 저장 버튼(백업)은 항상 제공 — 자동 파싱 실패 시 대비

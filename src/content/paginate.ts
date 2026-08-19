// 공통 안전장치 — 페이지 번호 기반 순회(collectAllPages)와 버튼 클릭 기반 순회(원티드,
// src/content/wanted.ts) 양쪽에서 재사용한다.
export const MAX_PAGE_CAP = 100;
export const PAGE_DELAY_MS = 250;

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 같은 오리진 페이지를 fetch로 받아 DOMParser로 파싱한다. 비200/네트워크 실패는 에러를
// 던지지 않고 null로 알려준다 — 호출자가 "여기서 중단, 지금까지 것만 반환"으로 처리하도록.
async function fetchPageDocument(url: string): Promise<Document | null> {
  try {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) return null;
    const html = await res.text();
    return new DOMParser().parseFromString(html, 'text/html');
  }
  catch {
    return null;
  }
}

function rowSetKey<T>(rows: T[], getRowKey: (row: T) => string | undefined): string {
  return rows.map(getRowKey).join('|');
}

interface PaginateOptions<T> {
  // page 1은 이미 파싱된 결과를 그대로 받는다 — 기존 경로(현재 document 파싱) 그대로 유지.
  page1Rows: T[];
  // location 기준 URL에 페이지 파라미터만 바꿔 넣은 절대 URL을 만든다. 나머지 쿼리(유저 필터)는
  // 절대 건드리지 않는다 — 호출자(사이트별 파일)의 책임.
  buildPageUrl: (pageNum: number) => string;
  // 기존 "행→레코드" 파서를 그대로 재사용한다 (root만 document가 아니라 파싱된 Document로).
  parseRows: (doc: Document) => T[];
  // 중복/클램프 판별용 행 식별 키. externalId가 없으면 호출자가 다른 필드 조합으로 폴백한다.
  getRowKey: (row: T) => string | undefined;
  // 사이트별 종료 조건 (예: 사람인의 "1페이지로 클램프됨", 잡코리아/원티드의 "유효행 0개").
  // true를 반환하면 이번 페이지는 버리고 순회를 중단한다.
  isSiteTerminal: (rows: T[], prevRows: T[]) => boolean;
}

interface PaginateResult<T> {
  rows: T[];
  pageCount: number;
}

// page 1(현재 document, 이미 파싱됨) 이후 2..N 페이지를 same-origin fetch로 순회하며
// 기존 행 파서를 재사용해 누적한다. 안전장치(공통): 최대 100페이지, 페이지 간 250ms 딜레이,
// fetch 실패 시 그 페이지에서 중단(지금까지 것 반환), 직전 페이지와 유효행 집합이 완전히
// 같으면 중단(무한 방지).
export async function collectAllPages<T>({
  page1Rows,
  buildPageUrl,
  parseRows,
  getRowKey,
  isSiteTerminal,
}: PaginateOptions<T>): Promise<PaginateResult<T>> {
  const allRows = [...page1Rows];
  let prevRows = page1Rows;
  let pageCount = 1;

  for (let pageNum = 2; pageNum <= MAX_PAGE_CAP; pageNum++) {
    await delay(PAGE_DELAY_MS);

    const doc = await fetchPageDocument(buildPageUrl(pageNum));
    if (!doc) break; // fetch 실패(비200/네트워크) → 이 페이지에서 중단, 지금까지 것 반환

    const rows = parseRows(doc);

    if (isSiteTerminal(rows, prevRows)) break; // 사이트별 종료 조건 → 이 페이지는 버리고 중단
    if (rows.length === 0) break; // 사이트별 조건에서 안 걸렸어도 빈 페이지면 자연 종료

    // 공통 안전장치: 직전 페이지와 유효행 집합이 완전히 동일하면 무한 순회 방지를 위해 중단.
    if (rowSetKey(rows, getRowKey) === rowSetKey(prevRows, getRowKey)) break;

    allRows.push(...rows);
    prevRows = rows;
    pageCount++;
  }

  return { rows: allRows, pageCount };
}

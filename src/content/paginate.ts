// 공통 안전장치 — 페이지 번호 기반 순회(collectAllPages)와 버튼 클릭 기반 순회(원티드,
// src/content/wanted.ts) 양쪽에서 재사용한다.
export const MAX_PAGE_CAP = 100;
export const PAGE_DELAY_MS = 250;
const FETCH_TIMEOUT_MS = 10000;

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 같은 오리진 페이지를 fetch로 받아 DOMParser로 파싱한다. 비200/네트워크 실패는 에러를
// 던지지 않고 null로 알려준다 — 호출자가 "여기서 중단, 지금까지 것만 반환"으로 처리하도록.
// AbortController로 타임아웃을 걸어둔다 — 없으면 요청이 멈췄을 때 수집 전체가, 나아가
// 팝업의 응답 대기까지 무한정 걸릴 수 있다. 타임아웃도 fetch 실패와 동일하게 null로 처리되므로
// 호출자 쪽 truncated 판정(collectAllPages)이 그대로 적용된다.
export async function fetchPageDocument(url: string): Promise<Document | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { credentials: 'same-origin', signal: controller.signal });
    if (!res.ok) return null;
    const html = await res.text();
    return new DOMParser().parseFromString(html, 'text/html');
  }
  catch {
    return null;
  }
  finally {
    clearTimeout(timer);
  }
}

// 행 집합을 비교용 문자열로 직렬화한다. sort()로 DOM 순서가 달라도 같은 집합이면 같은 키가
// 나오게 하고, join('|') 대신 JSON.stringify(배열)를 써서 값 안에 구분자로 쓰일 문자(|, 콤마 등)가
// 섞여 있어도 서로 다른 행 집합이 우연히 같은 문자열로 충돌하지 않게 한다.
export function rowSetKey<T>(rows: T[], getRowKey: (row: T) => string | undefined): string {
  return JSON.stringify(rows.map(getRowKey).sort());
}

// URL의 페이지 파라미터(예: 사람인 "page", 잡코리아 "Page")를 읽어 현재 페이지 번호를 구한다.
// 파라미터가 없거나 파싱 불가/1 미만이면 1페이지로 간주한다.
export function getCurrentPageNumber(paramName: string): number {
  const raw = new URL(location.href).searchParams.get(paramName);
  const parsed = raw ? Number(raw) : 1;
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

interface PaginateOptions<T> {
  // 유저가 지금 실제로 있는 페이지 번호 (getCurrentPageNumber 결과). 1이 아니면 앞쪽 페이지가
  // 누락되지 않도록 진짜 1페이지를 따로 fetch해 시작점으로 삼는다 — "현재 페이지"를 1페이지로
  // 착각하면 그 앞 페이지들이 통째로 빠지고, 뒤에서 같은 페이지를 다시 fetch해 중복도 생긴다.
  currentPageNumber: number;
  // currentPageNumber가 1일 때만 쓰는, 이미 파싱된 현재 문서 결과(불필요한 재요청 방지용 최적화).
  currentPageRows: T[];
  // location 기준 URL에 페이지 파라미터만 바꿔 넣은 절대 URL을 만든다. 나머지 쿼리(유저 필터)는
  // 절대 건드리지 않는다 — 호출자(사이트별 파일)의 책임.
  buildPageUrl: (pageNum: number) => string;
  // 기존 "행→레코드" 파서를 그대로 재사용한다 (root만 document가 아니라 파싱된 Document로).
  parseRows: (doc: Document) => T[];
  // 중복/클램프 판별용 행 식별 키. externalId가 없으면 호출자가 다른 필드 조합으로 폴백한다.
  getRowKey: (row: T) => string | undefined;
  // 사이트별 종료 조건 (예: 사람인의 "1페이지로 클램프됨", 잡코리아의 "유효행 0개"). page1Rows는
  // 항상 "진짜 1페이지" 결과라 클램프 판정 등에 안전하게 기준으로 쓸 수 있다.
  // true를 반환하면 이번 페이지는 버리고 순회를 중단한다.
  isSiteTerminal: (rows: T[], prevRows: T[], page1Rows: T[]) => boolean;
}

interface PaginateResult<T> {
  rows: T[];
  pageCount: number;
  // false면 사이트별 종료 조건(클램프/빈 페이지)으로 정상 종료된 것. true면 1페이지 fetch 실패,
  // 이후 페이지 fetch 실패, 예상 밖 반복 감지, 또는 최대 페이지 상한 도달로 "더 있을 수 있는데
  // 못 받았다"는 뜻이라 호출자가 유저에게 "일부만 수집됐을 수 있음"을 알려야 한다.
  truncated: boolean;
}

// 진짜 1페이지부터(유저가 1페이지가 아닌 곳에서 눌렀으면 그것부터 따로 받아와서) 2..N 페이지를
// same-origin fetch로 순회하며 기존 행 파서를 재사용해 누적한다. 안전장치(공통): 최대 100페이지,
// 페이지 간 250ms 딜레이, fetch 실패 시 그 페이지에서 중단(지금까지 것 반환), 직전 페이지와
// 유효행 집합이 완전히 같으면 중단(무한 방지). 이 경우들(+상한 도달)은 "정상 종료"와 구분해
// truncated로 표시한다.
export async function collectAllPages<T>({
  currentPageNumber,
  currentPageRows,
  buildPageUrl,
  parseRows,
  getRowKey,
  isSiteTerminal,
}: PaginateOptions<T>): Promise<PaginateResult<T>> {
  let truncated = false;
  let page1Rows: T[];

  if (currentPageNumber <= 1) {
    page1Rows = currentPageRows;
  }
  else {
    const doc = await fetchPageDocument(buildPageUrl(1));
    if (!doc) {
      truncated = true; // 1페이지조차 못 받아왔으니 이후 순회도 신뢰할 수 없다
      page1Rows = [];
    }
    else {
      page1Rows = parseRows(doc);
    }
  }

  const allRows = [...page1Rows];
  let prevRows = page1Rows;
  let pageCount = 1;

  for (let pageNum = 2; pageNum <= MAX_PAGE_CAP; pageNum++) {
    await delay(PAGE_DELAY_MS);

    const doc = await fetchPageDocument(buildPageUrl(pageNum));
    if (!doc) {
      truncated = true; // fetch 실패(비200/네트워크) → 이 페이지에서 중단, 지금까지 것 반환
      break;
    }

    const rows = parseRows(doc);

    if (isSiteTerminal(rows, prevRows, page1Rows)) break; // 사이트별 종료 조건 → 정상 종료, 이 페이지는 버림
    if (rows.length === 0) break; // 사이트별 조건에서 안 걸렸어도 빈 페이지면 정상 종료

    // 공통 안전장치: 직전 페이지와 유효행 집합이 완전히 동일하면 무한 순회 방지를 위해 중단.
    // 정상적인 마지막 페이지라면 보통 위 두 조건에서 먼저 걸리므로, 여기까지 왔다는 건
    // 예상 밖 상황(사이트별 종료 조건이 못 잡아낸 반복)이라 완전한 수집이라 확신할 수 없다.
    if (rowSetKey(rows, getRowKey) === rowSetKey(prevRows, getRowKey)) {
      truncated = true;
      break;
    }

    allRows.push(...rows);
    prevRows = rows;
    pageCount++;

    if (pageNum === MAX_PAGE_CAP) truncated = true; // 최대 페이지 상한 도달 — 더 있을 수 있음
  }

  return { rows: allRows, pageCount, truncated };
}

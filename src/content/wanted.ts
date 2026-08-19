console.log('[JobDiary] 원티드 파서 로드됨');
import { WANTED_PAGINATION_SELECTORS, WANTED_SELECTORS } from './selectors/wanted';
import type { ScrapedApplication } from '../types/application';
import { delay, MAX_PAGE_CAP, PAGE_DELAY_MS, rowSetKey } from './paginate';
import { waitForElement } from './waitForElement';
import { registerCollectHandler } from './collectHandler';
import { buildRowKey } from './rowKey';

// "2026. 7. 11" (마침표+공백 구분, 월/일 한 자리 가능) → "2026.07.11" (사람인/잡코리아 포맷과 통일)
// 형식이 예상과 다르면 원문을 그대로 반환, 값이 없으면 빈 문자열 반환
function normalizeAppliedAt(raw: string | undefined): string {
  if (!raw) return '';

  const match = raw.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})$/);
  if (!match) return raw;

  const [, year, month, day] = match;
  return `${year}.${month.padStart(2, '0')}.${day.padStart(2, '0')}`;
}

export function parseWanted(root: ParentNode = document): ScrapedApplication[] {
  const rows = root.querySelectorAll<HTMLElement>(WANTED_SELECTORS.container);
  const results: ScrapedApplication[] = [];

  rows.forEach((row) => {
    const company = row.querySelector(WANTED_SELECTORS.company)?.textContent?.trim() ?? '';
    const position = row.querySelector(WANTED_SELECTORS.position)?.textContent?.trim() ?? '';
    const appliedAtRaw = row.querySelector(WANTED_SELECTORS.appliedAt)?.textContent?.trim();
    const status = row.querySelector(WANTED_SELECTORS.status)?.textContent?.trim() ?? '';

    results.push({
      company,
      position,
      platform: 'wanted',
      appliedAt: normalizeAppliedAt(appliedAtRaw),
      status,
      externalId: undefined, // 원티드는 지원건 고유 ID가 없음
      viewed: undefined, // 원티드 DOM에 열람 정보 없음
      appliedAtExact: undefined, // 날짜만 제공되고 시각이 없어 exact로 쓸 게 없음
      url: undefined, // 행에 공고 링크 없음
    });
  });

  return results;
}

function getActivePageLabel(): string | null {
  return document.querySelector(WANTED_PAGINATION_SELECTORS.activePage)?.textContent?.trim() ?? null;
}

function isPaginationButtonDisabled(button: Element): boolean {
  return button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true';
}

// buttonSelector(다음/이전 페이지 버튼)를 클릭하고, 활성 페이지 번호가 바뀔 때까지(React
// 리렌더 완료 신호로 씀) 짧게 폴링해서 기다린다. 버튼이 없거나 비활성이면 'no-next'(정상 —
// 그 방향으로 더 갈 페이지가 없음). 클릭 후 시간 안에 페이지 번호가 안 바뀌면 'timeout'(렌더
// 실패 등 이상 상황 — 더 있을 수 있는데 못 넘어간 것이라 정상 종료와 구분해야 한다).
// 성공하면 'moved'.
type PageMoveResult = 'moved' | 'no-next' | 'timeout';

async function clickPaginationButtonAndWait(buttonSelector: string, timeoutMs = 4000, intervalMs = 150): Promise<PageMoveResult> {
  const button = document.querySelector<HTMLButtonElement>(buttonSelector);
  if (!button || isPaginationButtonDisabled(button)) return 'no-next';

  const prevLabel = getActivePageLabel();
  button.click();

  const startedAt = Date.now();
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      const currentLabel = getActivePageLabel();
      if (currentLabel !== null && currentLabel !== prevLabel) {
        clearInterval(timer);
        resolve('moved');
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        clearInterval(timer);
        resolve('timeout');
      }
    }, intervalMs);
  });
}

// 유저가 1페이지가 아닌 곳(필터/기간 등으로 넘겨보다가)에서 수집을 눌렀을 수 있다. 그대로
// "다음 페이지"만 눌러가며 수집하면 지금 위치보다 앞의 페이지들이 통째로 빠지므로, 먼저
// "이전 페이지" 버튼을 눌러 1페이지로 되돌아간다(필터/기간 조건은 페이지 이동으로 바뀌지
// 않으므로 그대로 유지된다). 활성 페이지 표시가 없으면(페이지네이션 자체가 없는 목록 1페이지
// 분량) 이미 1페이지인 것으로 본다.
async function goToFirstPage(): Promise<boolean> {
  for (let i = 0; i < MAX_PAGE_CAP; i++) {
    const label = getActivePageLabel();
    if (label === null || label === '1') return true;

    const result = await clickPaginationButtonAndWait(WANTED_PAGINATION_SELECTORS.prevButton);
    if (result !== 'moved') return false; // 이전 버튼이 없는데 아직 1페이지가 아니거나, 렌더 타임아웃 — 이상 상황
    await delay(PAGE_DELAY_MS);
  }
  return false; // 상한 도달까지 1페이지로 못 돌아옴 — 이상 상황
}

// 화면에 실제로 렌더링된 DOM만 읽는다 — fetch나 내부 API는 쓰지 않는다(로그인 세션 인증이
// 필요해 시도했으나 401로 막혔고, 그 인증 토큰을 코드로 읽는 건 원칙 위반이라 포기했다).
// 호출 전 goToFirstPage로 이미 1페이지에 와 있다고 가정하고, 여기선 "다음 페이지" 버튼만
// 클릭해서 사람이 하는 것과 동일하게 순회한다.
// 안전장치: 최대 100페이지, 페이지 간 250ms 딜레이, 페이지 전환 실패(버튼 없음/비활성/
// 렌더 타임아웃) 시 중단, 직전 페이지와 유효행 집합이 같으면 무한 방지 중단. 이 중
// "버튼 없음/비활성"만 정상 종료이고, 나머지는 truncated로 표시해 유저에게 알린다.
async function collectWantedAllPages(): Promise<{ rows: ScrapedApplication[], truncated: boolean }> {
  const allRows: ScrapedApplication[] = [];
  let prevRows: ScrapedApplication[] = [];
  let pageCount = 0;
  let truncated = false;

  for (let i = 0; i < MAX_PAGE_CAP; i++) {
    if (i > 0) {
      const nextResult = await clickPaginationButtonAndWait(WANTED_PAGINATION_SELECTORS.nextButton);
      if (nextResult === 'no-next') break; // 정상 종료 — 진짜 마지막 페이지
      if (nextResult === 'timeout') {
        truncated = true; // 렌더 실패/타임아웃 — 더 있을 수 있는데 못 넘어감
        break;
      }
      await delay(PAGE_DELAY_MS);
    }

    const rows = parseWanted(document);
    pageCount++;

    if (rows.length === 0) break; // 정상 종료 — 빈 페이지

    if (rowSetKey(rows, buildRowKey) === rowSetKey(prevRows, buildRowKey)) {
      truncated = true; // 예상 밖 반복 감지 — 완전한 수집이라 확신할 수 없음
      break;
    }

    allRows.push(...rows);
    prevRows = rows;

    if (i === MAX_PAGE_CAP - 1) truncated = true; // 최대 페이지 상한 도달 — 더 있을 수 있음
  }

  console.log(`[원티드 파서] 총 ${pageCount}페이지, ${allRows.length}건 수집${truncated ? ' (일부 중단됨)' : ''}`);
  return { rows: allRows, truncated };
}

// React SPA라 페이지 로드 직후엔 화면이 아직 준비 안 됐을 수 있다. 컨테이너가 나타날 때까지
// 짧게 폴링하고, 끝내 안 나타나면(null) 진행하지 않고 truncated로 응답한다 — 안 그러면
// parseWanted가 그냥 0건을 반환해 "정상적으로 지원내역이 없다"와 구분되지 않는다.
// 컨테이너 확인 후엔 goToFirstPage로 1페이지부터 시작하도록 되돌린 뒤 페이지 순회를 시작한다.
registerCollectHandler('wanted', async () => {
  const container = await waitForElement(WANTED_SELECTORS.container);
  if (!container) return { rows: [], truncated: true };

  const movedToFirstPage = await goToFirstPage();
  const { rows, truncated } = await collectWantedAllPages();
  return { rows, truncated: truncated || !movedToFirstPage };
});

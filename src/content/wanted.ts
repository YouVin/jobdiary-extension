console.log('[JobDiary] 원티드 파서 로드됨');
import { WANTED_PAGINATION_SELECTORS, WANTED_SELECTORS } from './selectors/wanted';
import type { ScrapedApplication } from '../types/application';
import { convertToApplication } from '../lib/adapter';
import { COLLECT_MESSAGE_TYPE, type CollectMessage, type CollectResponse } from '../lib/messages';
import { delay, MAX_PAGE_CAP, PAGE_DELAY_MS } from './paginate';
import { waitForElement } from './waitForElement';

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

function logParsedApplications(applications: ScrapedApplication[]): void {
  console.log(`[원티드 파서] ${applications.length}건 파싱됨`);
  console.table(applications);
}

function wantedRowKey(row: ScrapedApplication): string {
  return `${row.company}|${row.position}|${row.appliedAt}`;
}

function getActivePageLabel(): string | null {
  return document.querySelector(WANTED_PAGINATION_SELECTORS.activePage)?.textContent?.trim() ?? null;
}

function isNextButtonDisabled(button: Element): boolean {
  return button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true';
}

// "다음 페이지" 버튼을 클릭하고, 활성 페이지 번호가 바뀔 때까지(React 리렌더 완료 신호로 씀)
// 짧게 폴링해서 기다린다. 버튼이 없거나 비활성(마지막 페이지)이면 false. 클릭 후 시간 안에
// 페이지 번호가 안 바뀌면(렌더 실패/타임아웃) false — 호출자가 "여기서 중단"으로 처리한다.
async function goToNextPageAndWait(timeoutMs = 4000, intervalMs = 150): Promise<boolean> {
  const nextButton = document.querySelector<HTMLButtonElement>(WANTED_PAGINATION_SELECTORS.nextButton);
  if (!nextButton || isNextButtonDisabled(nextButton)) return false;

  const prevLabel = getActivePageLabel();
  nextButton.click();

  const startedAt = Date.now();
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      const currentLabel = getActivePageLabel();
      if (currentLabel !== null && currentLabel !== prevLabel) {
        clearInterval(timer);
        resolve(true);
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        clearInterval(timer);
        resolve(false);
      }
    }, intervalMs);
  });
}

// 화면에 실제로 렌더링된 DOM만 읽는다 — fetch나 내부 API는 쓰지 않는다(로그인 세션 인증이
// 필요해 시도했으나 401로 막혔고, 그 인증 토큰을 코드로 읽는 건 원칙 위반이라 포기했다).
// 페이지 이동은 실제 "다음 페이지" 버튼을 클릭해서 사람이 하는 것과 동일하게 한다.
// 안전장치: 최대 100페이지, 페이지 간 250ms 딜레이, 페이지 전환 실패(버튼 없음/비활성/
// 렌더 타임아웃) 시 중단, 직전 페이지와 유효행 집합이 같으면 무한 방지 중단.
async function collectWantedAllPages(): Promise<ScrapedApplication[]> {
  const allRows: ScrapedApplication[] = [];
  let prevRowSetKey = '';
  let pageCount = 0;

  for (let i = 0; i < MAX_PAGE_CAP; i++) {
    if (i > 0) {
      const moved = await goToNextPageAndWait();
      if (!moved) break; // 다음 페이지 없음(버튼 비활성/없음) 또는 렌더 대기 타임아웃 → 종료
      await delay(PAGE_DELAY_MS);
    }

    const rows = parseWanted(document);
    pageCount++;

    const rowSetKey = rows.map(wantedRowKey).join('|');
    if (rows.length === 0 || rowSetKey === prevRowSetKey) break; // 빈 페이지 또는 무한 방지

    allRows.push(...rows);
    prevRowSetKey = rowSetKey;
  }

  console.log(`[원티드 파서] 총 ${pageCount}페이지, ${allRows.length}건 수집`);
  return allRows;
}

chrome.runtime.onMessage.addListener((message: CollectMessage, _sender, sendResponse) => {
  if (message.type !== COLLECT_MESSAGE_TYPE) return;

  // React SPA라 페이지 로드 직후엔 화면이 아직 준비 안 됐을 수 있다. 컨테이너가 나타날
  // 때까지 짧게 폴링한 뒤 페이지 순회(클릭 기반)를 시작한다.
  waitForElement(WANTED_SELECTORS.container).then(async () => {
    const scraped = await collectWantedAllPages();
    logParsedApplications(scraped);

    const applications = scraped.map(convertToApplication);
    const response: CollectResponse = { applications, count: applications.length };
    sendResponse(response);
  });

  return true; // 비동기 응답이므로 메시지 채널을 열어둔다 (MV3 규약)
});

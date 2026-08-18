console.log('[JobDiary] 잡코리아 파서 로드됨');
import { JOBKOREA_SELECTORS } from './selectors/jobkorea';
import type { ScrapedApplication } from '../types/application';
import { convertToApplication } from '../lib/adapter';
import { COLLECT_MESSAGE_TYPE, type CollectMessage, type CollectResponse } from '../lib/messages';
import { toSafeUrl } from '../lib/url';

// "20260601235538" (YYYYMMDDHHmmss, 14자리 숫자) → "2026.06.01 23:55" (사람인 포맷과 통일)
function formatApplyDate(raw: string | undefined): string {
  if (!raw || !/^\d{14}$/.test(raw)) return '';
  const year = raw.slice(0, 4);
  const month = raw.slice(4, 6);
  const day = raw.slice(6, 8);
  const hour = raw.slice(8, 10);
  const minute = raw.slice(10, 12);
  return `${year}.${month}.${day} ${hour}:${minute}`;
}

// formatApplyDate와 같은 원본이지만 초까지 살려 exact용으로 쓴다. "2026.06.01 23:55:38"
function formatApplyDateExact(raw: string | undefined): string | undefined {
  if (!raw || !/^\d{14}$/.test(raw)) return undefined;
  const year = raw.slice(0, 4);
  const month = raw.slice(4, 6);
  const day = raw.slice(6, 8);
  const hour = raw.slice(8, 10);
  const minute = raw.slice(10, 12);
  const second = raw.slice(12, 14);
  return `${year}.${month}.${day} ${hour}:${minute}:${second}`;
}

// '.reading'은 열람 행에서 "열람\n2026.04.03"처럼 열람일자가 함께 붙어 완전일치가 실패한다.
// 시작 문자로 판별한다 — "미열람"이 "열람"을 포함하므로 반드시 미열람을 먼저 검사한다.
function parseViewed(readingText: string | undefined): boolean | undefined {
  if (!readingText) return undefined;
  if (readingText.startsWith('미열람')) return false;
  if (readingText.startsWith('열람')) return true;
  return undefined;
}

export function parseJobkorea(): ScrapedApplication[] {
  const rows = document.querySelectorAll<HTMLElement>(JOBKOREA_SELECTORS.container);
  const results: ScrapedApplication[] = [];

  rows.forEach((row) => {
    const dataButton = row.querySelector<HTMLElement>(JOBKOREA_SELECTORS.dataButton);
    // url/viewed는 버튼 유무와 무관하게 행 본문에서 읽는다(두 형식 모두 동일 위치).
    const href = row.querySelector<HTMLAnchorElement>(JOBKOREA_SELECTORS.url)?.getAttribute('href');
    const url = toSafeUrl(href, location.origin);
    const viewed = parseViewed(row.querySelector(JOBKOREA_SELECTORS.viewed)?.textContent?.trim());

    if (dataButton) {
      // 최신 형식(devBtnDel/devBtnCancel): 버튼 data 속성 그대로 사용 — 기존 동작 그대로 유지.
      results.push({
        company: dataButton.dataset[JOBKOREA_SELECTORS.companyAttr] ?? '',
        position: dataButton.dataset[JOBKOREA_SELECTORS.positionAttr] ?? '',
        platform: 'jobkorea',
        appliedAt: formatApplyDate(dataButton.dataset[JOBKOREA_SELECTORS.appliedAtAttr]),
        status: row.querySelector(JOBKOREA_SELECTORS.status)?.textContent?.trim() ?? '',
        externalId: dataButton.dataset[JOBKOREA_SELECTORS.externalIdAttr],
        viewed,
        appliedAtExact: formatApplyDateExact(dataButton.dataset[JOBKOREA_SELECTORS.appliedAtAttr]),
        url,
      });
      return;
    }

    // 오래된 형식(devBtnOldDel 등) 또는 공고가 삭제된 행: 버튼에 memname/gititle/applydate가
    // 없어 본문 텍스트로 폴백한다. data-idx를 가진 요소도, 회사명 텍스트도 둘 다 없으면
    // 빈 tr 등 지원 행이 아닌 것으로 보고 스킵한다.
    const oldDataButton = row.querySelector<HTMLElement>(JOBKOREA_SELECTORS.oldDataButton);
    const company = row.querySelector(JOBKOREA_SELECTORS.companyFallback)?.textContent?.trim() ?? '';
    if (!oldDataButton && !company) return;

    results.push({
      company,
      position: row.querySelector(JOBKOREA_SELECTORS.positionFallback)?.textContent?.trim() ?? '',
      platform: 'jobkorea',
      appliedAt: row.querySelector(JOBKOREA_SELECTORS.appliedAtFallback)?.textContent?.trim() ?? '',
      status: row.querySelector(JOBKOREA_SELECTORS.status)?.textContent?.trim() ?? '',
      externalId: oldDataButton?.dataset[JOBKOREA_SELECTORS.externalIdAttr],
      viewed,
      // 폴백 경로의 appliedAt은 시각이 없는 날짜 텍스트("2026.04.01")라 exact로 쓸 게 없다.
      appliedAtExact: undefined,
      url,
    });
  });

  return results;
}

function logParsedApplications(applications: ScrapedApplication[]): void {
  console.log(`[잡코리아 파서] ${applications.length}건 파싱됨`);
  console.table(applications);
}

chrome.runtime.onMessage.addListener((message: CollectMessage, _sender, sendResponse) => {
  if (message.type !== COLLECT_MESSAGE_TYPE) return;

  const scraped = parseJobkorea();
  logParsedApplications(scraped);

  const applications = scraped.map(convertToApplication);
  const response: CollectResponse = { applications, count: applications.length };
  sendResponse(response);
});

console.log('[JobDiary] 잡코리아 파서 로드됨');
import { JOBKOREA_SELECTORS } from './selectors/jobkorea';
import type { ScrapedApplication } from '../types/application';
import { convertToApplication } from '../lib/adapter';
import { COLLECT_MESSAGE_TYPE, type CollectMessage, type CollectResponse } from '../lib/messages';

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

export function parseJobkorea(): ScrapedApplication[] {
  const rows = document.querySelectorAll<HTMLElement>(JOBKOREA_SELECTORS.container);
  const results: ScrapedApplication[] = [];

  rows.forEach((row) => {
    // 각 행에서 data 속성을 담은 버튼을 찾는다. 없으면 지원내역 행이 아니므로 스킵.
    const dataButton = row.querySelector<HTMLElement>(JOBKOREA_SELECTORS.dataButton);
    if (!dataButton) return;

    const company = dataButton.dataset[JOBKOREA_SELECTORS.companyAttr] ?? '';
    const position = dataButton.dataset[JOBKOREA_SELECTORS.positionAttr] ?? '';
    const appliedAt = formatApplyDate(dataButton.dataset[JOBKOREA_SELECTORS.appliedAtAttr]);
    const status = row.querySelector(JOBKOREA_SELECTORS.status)?.textContent?.trim() ?? '';
    const externalId = dataButton.dataset[JOBKOREA_SELECTORS.externalIdAttr];

    results.push({
      company,
      position,
      platform: 'jobkorea',
      appliedAt,
      status,
      externalId,
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

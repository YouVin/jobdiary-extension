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
    const dataButton = row.querySelector<HTMLElement>(JOBKOREA_SELECTORS.dataButton);

    if (dataButton) {
      // 최신 형식(devBtnDel/devBtnCancel): 버튼 data 속성 그대로 사용 — 기존 동작 그대로 유지.
      results.push({
        company: dataButton.dataset[JOBKOREA_SELECTORS.companyAttr] ?? '',
        position: dataButton.dataset[JOBKOREA_SELECTORS.positionAttr] ?? '',
        platform: 'jobkorea',
        appliedAt: formatApplyDate(dataButton.dataset[JOBKOREA_SELECTORS.appliedAtAttr]),
        status: row.querySelector(JOBKOREA_SELECTORS.status)?.textContent?.trim() ?? '',
        externalId: dataButton.dataset[JOBKOREA_SELECTORS.externalIdAttr],
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

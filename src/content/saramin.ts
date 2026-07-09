console.log('[JobDiary] 사람인 파서 로드됨');
import { SARAMIN_SELECTORS } from './selectors/saramin';
import type { ScrapedApplication } from '../types/application';

export function parseSaramin(): ScrapedApplication[] {
  const rows = document.querySelectorAll<HTMLElement>(SARAMIN_SELECTORS.container);

  return Array.from(rows).map((row) => {
    const company = row.dataset[SARAMIN_SELECTORS.companyAttr] ?? '';
    const position = row.dataset[SARAMIN_SELECTORS.positionAttr] ?? '';
    const appliedAt = row.querySelector(SARAMIN_SELECTORS.appliedAt)?.textContent?.trim() ?? '';
    const status = row.querySelector(SARAMIN_SELECTORS.status)?.textContent?.trim() ?? '';
    const externalId = row.dataset[SARAMIN_SELECTORS.externalIdAttr];

    return {
      company,
      position,
      platform: 'saramin',
      appliedAt,
      status,
      externalId,
    };
  });
}

function logParsedApplications(applications: ScrapedApplication[]): void {
  console.log(`[사람인 파서] ${applications.length}건 파싱됨`);
  console.table(applications);
}

logParsedApplications(parseSaramin());

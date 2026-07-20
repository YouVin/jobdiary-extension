import type { Application, ScrapedApplication } from '@/types/application';
import { normalizeDate } from './dateNormalize';
import { mapStatus } from './statusMapping';

// docs/INTEGRATION.md의 어댑터. 변환은 이 함수(익스텐션)에서만 일어난다.
// id/updatedAt은 웹앱이 채우므로 여기서는 만들지 않는다.
export function convertToApplication(
  scraped: ScrapedApplication,
): Omit<Application, 'id' | 'updatedAt'> {
  return {
    company: scraped.company,
    position: scraped.position,
    platform: scraped.platform,
    status: mapStatus(scraped.status),
    appliedAt: normalizeDate(scraped.appliedAt),
    externalId: scraped.externalId,
  };
}

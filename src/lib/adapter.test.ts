import type { ScrapedApplication } from '@/types/application';
import { describe, expect, it } from 'vitest';
import { convertToApplication } from './adapter';

function scraped(overrides: Partial<ScrapedApplication> = {}): ScrapedApplication {
  return {
    company: '취준일기',
    position: '프론트엔드 개발자',
    platform: 'saramin',
    appliedAt: '2026.06.09 20:27',
    status: '지원완료',
    externalId: '12345',
    viewed: true,
    appliedAtExact: '2026.06.09 20:27',
    url: 'https://example.com/job/1',
    ...overrides,
  };
}

describe('convertToApplication', () => {
  it('status/appliedAt/appliedAtExact을 각각의 규칙으로 변환한다', () => {
    const result = convertToApplication(scraped());

    expect(result.status).toBe('applied');
    expect(result.appliedAt).toBe('2026-06-09T00:00:00.000Z');
    expect(result.appliedAtExact).toBe('2026-06-09T11:27:00.000Z');
  });

  it('company/position/platform/externalId/viewed/url은 그대로 옮긴다', () => {
    const result = convertToApplication(scraped());

    expect(result.company).toBe('취준일기');
    expect(result.position).toBe('프론트엔드 개발자');
    expect(result.platform).toBe('saramin');
    expect(result.externalId).toBe('12345');
    expect(result.viewed).toBe(true);
    expect(result.url).toBe('https://example.com/job/1');
  });

  it('원티드처럼 externalId/appliedAtExact/url이 없는 경우 undefined를 그대로 유지한다', () => {
    const result = convertToApplication(scraped({
      platform: 'wanted',
      externalId: undefined,
      viewed: undefined,
      appliedAtExact: undefined,
      url: undefined,
    }));

    expect(result.externalId).toBeUndefined();
    expect(result.viewed).toBeUndefined();
    expect(result.appliedAtExact).toBeUndefined();
    expect(result.url).toBeUndefined();
  });

  it('id/updatedAt 필드는 만들지 않는다', () => {
    const result = convertToApplication(scraped());

    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('updatedAt');
  });
});

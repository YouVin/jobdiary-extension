import type { ScrapedApplication } from '@/types/application';
import { describe, expect, it } from 'vitest';
import { buildRowKey } from './rowKey';

function scraped(overrides: Partial<ScrapedApplication> = {}): ScrapedApplication {
  return {
    company: '취준일기',
    position: '프론트엔드 개발자',
    platform: 'saramin',
    appliedAt: '2026.06.09 20:27',
    status: '지원완료',
    ...overrides,
  };
}

describe('buildRowKey', () => {
  it('행이 없으면 undefined를 반환한다', () => {
    expect(buildRowKey(undefined)).toBeUndefined();
  });

  it('externalId가 있으면 그것만으로 키를 만든다', () => {
    expect(buildRowKey(scraped({ externalId: '123' }))).toBe('id:123');
  });

  it('externalId가 없으면(원티드 등) 회사/공고명/상태/지원일/URL을 모두 묶어 키를 만든다', () => {
    const key = buildRowKey(scraped({ externalId: undefined }));
    expect(key).toBe(JSON.stringify(['취준일기', '프론트엔드 개발자', '지원완료', '2026.06.09 20:27', undefined, undefined]));
  });

  it('같은 회사에 같은 날 지원한 서로 다른 공고는 서로 다른 키를 만든다(회귀 방지)', () => {
    const first = buildRowKey(scraped({ position: '프론트엔드 개발자', externalId: undefined }));
    const second = buildRowKey(scraped({ position: '백엔드 개발자', externalId: undefined }));
    expect(first).not.toBe(second);
  });
});

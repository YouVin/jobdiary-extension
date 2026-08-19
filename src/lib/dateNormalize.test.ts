import { describe, expect, it } from 'vitest';
import { normalizeDate, normalizeDateExact } from './dateNormalize';

describe('normalizeDate', () => {
  it('날짜만 있는 문자열을 자정 기준 UTC ISO로 변환한다', () => {
    expect(normalizeDate('2026.06.09')).toBe('2026-06-09T00:00:00.000Z');
  });

  it('시분이 붙어 있어도 날짜만 취하고 자정으로 정규화한다', () => {
    expect(normalizeDate('2026.06.09 20:27')).toBe('2026-06-09T00:00:00.000Z');
  });

  it('형식이 예상과 다르면 빈 문자열을 반환한다', () => {
    expect(normalizeDate('2026-06-09')).toBe('');
    expect(normalizeDate('')).toBe('');
    expect(normalizeDate('알 수 없음')).toBe('');
  });
});

describe('normalizeDateExact', () => {
  it('KST(UTC+9) 벽시계 시각을 실제 UTC ISO로 변환한다', () => {
    // 2026.06.09 20:27 KST = 2026.06.09 11:27 UTC
    expect(normalizeDateExact('2026.06.09 20:27')).toBe('2026-06-09T11:27:00.000Z');
  });

  it('초까지 있으면 초도 함께 변환한다', () => {
    // 2026.06.01 23:55:38 KST = 2026.06.01 14:55:38 UTC
    expect(normalizeDateExact('2026.06.01 23:55:38')).toBe('2026-06-01T14:55:38.000Z');
  });

  it('자정 근처 KST 시각은 UTC로 변환하며 날짜가 하루 앞으로 밀린다', () => {
    // 2026.06.09 00:30 KST = 2026.06.08 15:30 UTC
    expect(normalizeDateExact('2026.06.09 00:30')).toBe('2026-06-08T15:30:00.000Z');
  });

  it('값이 없으면 undefined를 반환한다', () => {
    expect(normalizeDateExact(undefined)).toBeUndefined();
  });

  it('형식이 예상과 다르면 undefined를 반환한다', () => {
    expect(normalizeDateExact('2026.06.09')).toBeUndefined();
    expect(normalizeDateExact('알 수 없음')).toBeUndefined();
  });

  it('자릿수는 맞지만 실존하지 않는 날짜/시각은 undefined로 거부한다', () => {
    // Date.UTC는 2월 31일을 3월 3일로 조용히 이월시키므로, 왕복 비교로 걸러내야 한다.
    expect(normalizeDateExact('2026.02.31 12:00')).toBeUndefined();
    expect(normalizeDateExact('2026.06.09 25:61')).toBeUndefined();
  });

  it('유효한 경계값(자정, 23:59:59)은 정상적으로 변환한다', () => {
    expect(normalizeDateExact('2026.06.09 00:00:00')).toBe('2026-06-08T15:00:00.000Z');
    expect(normalizeDateExact('2026.06.09 23:59:59')).toBe('2026-06-09T14:59:59.000Z');
  });
});

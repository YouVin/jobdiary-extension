import { describe, expect, it } from 'vitest';
import { toSafeUrl } from './url';

describe('toSafeUrl', () => {
  it('http/https 절대 URL은 그대로 통과시킨다', () => {
    expect(toSafeUrl('https://example.com/job/1')).toBe('https://example.com/job/1');
  });

  it('base가 주어지면 상대경로를 절대 URL로 만든다', () => {
    expect(toSafeUrl('/zf_user/jobs/1', 'https://www.saramin.co.kr')).toBe('https://www.saramin.co.kr/zf_user/jobs/1');
  });

  it('href가 없으면 undefined를 반환한다', () => {
    expect(toSafeUrl(undefined)).toBeUndefined();
    expect(toSafeUrl(null)).toBeUndefined();
    expect(toSafeUrl('')).toBeUndefined();
  });

  it('javascript:/data: 등 위험한 스킴은 undefined로 막는다', () => {
    expect(toSafeUrl('javascript:alert(1)')).toBeUndefined();
    expect(toSafeUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined();
  });

  it('파싱할 수 없는 URL은 undefined를 반환한다', () => {
    expect(toSafeUrl('not a url')).toBeUndefined();
  });
});

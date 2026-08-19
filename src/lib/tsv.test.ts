import type { Application } from '@/types/application';
import { describe, expect, it } from 'vitest';
import { applicationsToHtml, applicationsToTsv } from './tsv';

function app(overrides: Partial<Omit<Application, 'id' | 'updatedAt'>> = {}): Omit<Application, 'id' | 'updatedAt'> {
  return {
    company: '취준일기',
    position: '프론트엔드 개발자',
    platform: 'saramin',
    status: 'applied',
    appliedAt: '2026-06-09T00:00:00.000Z',
    viewed: true,
    ...overrides,
  };
}

describe('applicationsToTsv', () => {
  it('헤더와 함께 탭으로 구분된 행을 만든다', () => {
    const tsv = applicationsToTsv([app()]);
    const [header, row] = tsv.split('\n');

    expect(header).toBe('회사\t포지션\t상태\t지원일\t플랫폼\t열람');
    expect(row).toBe('취준일기\t프론트엔드 개발자\t지원완료\t2026-06-09\tsaramin\t열람');
  });

  it('viewed가 false/undefined면 각각 미열람/빈 칸으로 표시한다', () => {
    const [, notViewedRow] = applicationsToTsv([app({ viewed: false })]).split('\n');
    const [, unknownRow] = applicationsToTsv([app({ viewed: undefined })]).split('\n');

    expect(notViewedRow).toContain('\t미열람');
    expect(unknownRow.split('\t')).toHaveLength(6);
    expect(unknownRow.split('\t')[5]).toBe('');
  });

  it('셀 안의 탭/개행은 공백으로 치환해 TSV 구조를 지킨다', () => {
    const [, row] = applicationsToTsv([app({ company: '취준\t일기\n(주)' })]).split('\n');
    expect(row.split('\t')[0]).toBe('취준 일기 (주)');
  });
});

describe('applicationsToHtml', () => {
  it('url이 있으면 회사 셀만 <a href>로 감싼다', () => {
    const html = applicationsToHtml([app({ url: 'https://example.com/job/1' })]);
    expect(html).toContain('<td><a href="https://example.com/job/1">취준일기</a></td>');
  });

  it('url이 없으면 회사 셀은 일반 <td>다', () => {
    const html = applicationsToHtml([app({ url: undefined })]);
    expect(html).toContain('<td>취준일기</td>');
    expect(html).not.toContain('<a href');
  });

  it('회사명에 HTML 특수문자가 있으면 이스케이프해 마크업이 깨지지 않게 한다', () => {
    const html = applicationsToHtml([app({ company: '<script>alert(1)</script>&"\'' })]);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;&amp;&quot;&#39;');
  });

  it('javascript: 등 위험한 스킴의 url은 <a href>로 감싸지 않는다', () => {
    const html = applicationsToHtml([app({ url: 'javascript:alert(1)' })]);
    expect(html).not.toContain('<a href');
  });
});

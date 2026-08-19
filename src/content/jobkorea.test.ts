import { describe, expect, it } from 'vitest';
import { parseJobkorea } from './jobkorea';

function fixture(html: string): HTMLDivElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

describe('parseJobkorea', () => {
  it('최신 형식(버튼 data 속성)을 파싱하고 applydate를 변환한다', () => {
    const root = fixture(`
      <table><tbody>
        <tr>
          <td class="company"><a href="/Recruit/GI_Read/123">㈜플레이웍스</a></td>
          <td class="description"><a href="/Recruit/GI_Read/123">프론트엔드 개발자</a></td>
          <td class="apply-status">
            <span class="item status">지원완료</span>
            <span class="date">2026.06.01</span>
            <span class="reading">미열람</span>
          </td>
          <td><button class="devBtnDel" data-memname="㈜플레이웍스" data-gititle="프론트엔드 개발자" data-applydate="20260601235538" data-idx="9001">지원취소</button></td>
        </tr>
      </tbody></table>
    `);

    const [row] = parseJobkorea(root);

    expect(row.company).toBe('㈜플레이웍스');
    expect(row.position).toBe('프론트엔드 개발자');
    expect(row.appliedAt).toBe('2026.06.01 23:55');
    expect(row.appliedAtExact).toBe('2026.06.01 23:55:38');
    expect(row.status).toBe('지원완료');
    expect(row.externalId).toBe('9001');
    expect(row.viewed).toBe(false);
    expect(row.url).toBe(`${location.origin}/Recruit/GI_Read/123`);
  });

  it('오래된 형식(devBtnOldDel)은 버튼에 memname/gititle/applydate가 없어 본문 텍스트로 폴백한다', () => {
    const root = fixture(`
      <table><tbody>
        <tr>
          <td class="company"><a href="/Recruit/GI_Read/456">오래된회사</a></td>
          <td class="description"><a href="/Recruit/GI_Read/456">백엔드 개발자</a></td>
          <td class="apply-status">
            <span class="item status">지원완료</span>
            <span class="date">2026.04.01</span>
            <span class="reading">열람\n2026.04.03</span>
          </td>
          <td><button class="devBtnOldDel" data-idx="8001">지원취소</button></td>
        </tr>
      </tbody></table>
    `);

    const [row] = parseJobkorea(root);

    expect(row.company).toBe('오래된회사');
    expect(row.position).toBe('백엔드 개발자');
    expect(row.appliedAt).toBe('2026.04.01');
    expect(row.appliedAtExact).toBeUndefined();
    expect(row.externalId).toBe('8001');
    // '.reading' 텍스트가 "열람\n2026.04.03"처럼 열람일자가 붙어 있어도 시작 문자로 true 판정.
    expect(row.viewed).toBe(true);
  });

  it('데이터 속성도 회사명도 없는 빈 행은 결과에서 제외한다', () => {
    const root = fixture('<table><tbody><tr></tr></tbody></table>');
    expect(parseJobkorea(root)).toEqual([]);
  });

  it('회사명 원본 데이터가 깨져 있어도(괄호 불일치 등) 원문 그대로 저장한다', () => {
    const root = fixture(`
      <table><tbody>
        <tr>
          <td class="company"><a href="/Recruit/GI_Read/789">아타드㈜(ATAD Corp.</a></td>
          <td class="description"><a href="/Recruit/GI_Read/789">디자이너</a></td>
          <td class="apply-status"><span class="item status">지원완료</span></td>
          <td><button class="devBtnDel" data-memname="아타드㈜(ATAD Corp." data-gititle="디자이너" data-applydate="20260101120000" data-idx="7001">지원취소</button></td>
        </tr>
      </tbody></table>
    `);

    const [row] = parseJobkorea(root);
    expect(row.company).toBe('아타드㈜(ATAD Corp.');
  });
});

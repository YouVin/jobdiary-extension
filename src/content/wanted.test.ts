import { describe, expect, it } from 'vitest';
import { parseWanted } from './wanted';

function fixture(html: string): HTMLDivElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

describe('parseWanted', () => {
  it('행을 파싱하고 지원일을 정규화한다(월/일 한 자리 → 0 채움)', () => {
    const root = fixture(`
      <ul>
        <li class="List_List_table_tr__u5tEF">
          <div class="List_List_table_td_company_name__xyz">무론</div>
          <div class="List_List_table_td_position__xyz">프론트엔드 개발자</div>
          <div class="List_List_table_td_create_time__xyz">2026. 7. 11</div>
          <div class="List_List_table_td_status__xyz">불합격</div>
        </li>
      </ul>
    `);

    const [row] = parseWanted(root);

    expect(row.company).toBe('무론');
    expect(row.position).toBe('프론트엔드 개발자');
    expect(row.appliedAt).toBe('2026.07.11');
    expect(row.status).toBe('불합격');
    expect(row.externalId).toBeUndefined();
    expect(row.viewed).toBeUndefined();
    expect(row.appliedAtExact).toBeUndefined();
    expect(row.url).toBeUndefined();
  });

  it('월/일이 이미 두 자리면 그대로 둔다', () => {
    const root = fixture(`
      <ul>
        <li class="List_List_table_tr__u5tEF">
          <div class="List_List_table_td_company_name__xyz">무론</div>
          <div class="List_List_table_td_position__xyz">백엔드 개발자</div>
          <div class="List_List_table_td_create_time__xyz">2026. 12. 25</div>
          <div class="List_List_table_td_status__xyz">진행중</div>
        </li>
      </ul>
    `);

    const [row] = parseWanted(root);
    expect(row.appliedAt).toBe('2026.12.25');
  });

  it('헤더(div)는 li가 아니라서 컨테이너 셀렉터에 매칭되지 않는다', () => {
    const root = fixture(`
      <ul>
        <div class="List_List_table-header_wrapper__abc List_List_table_tr__abc">헤더</div>
        <li class="List_List_table_tr__u5tEF">
          <div class="List_List_table_td_company_name__xyz">무론</div>
          <div class="List_List_table_td_position__xyz">프론트엔드 개발자</div>
          <div class="List_List_table_td_create_time__xyz">2026. 1. 1</div>
          <div class="List_List_table_td_status__xyz">지원완료</div>
        </li>
      </ul>
    `);

    expect(parseWanted(root)).toHaveLength(1);
  });

  it('행이 없으면 빈 배열을 반환한다', () => {
    expect(parseWanted(fixture('<ul></ul>'))).toEqual([]);
  });
});

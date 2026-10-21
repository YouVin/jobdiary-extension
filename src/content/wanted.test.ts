import { afterEach, describe, expect, it, vi } from 'vitest';
import { clickPaginationButtonAndWait, parseWanted } from './wanted';
import { WANTED_PAGINATION_SELECTORS } from './selectors/wanted';

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

describe('원티드 페이지 전환 대기', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  function setup() {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <button data-role="pagination-next-button">다음</button>
      <button data-role="pagination-item-page" aria-current="page">1</button>
      <ul><li class="table_tr"><span class="td_company_name">이전 회사</span></li></ul>`;
    return {
      page: document.querySelector(WANTED_PAGINATION_SELECTORS.activePage)!,
      list: document.querySelector('ul')!,
    };
  }

  it('페이지 번호만 바뀌면 기다리고 실제 목록이 바뀐 뒤 완료한다', async () => {
    const { page, list } = setup();
    const done = vi.fn();
    const pending = clickPaginationButtonAndWait(WANTED_PAGINATION_SELECTORS.nextButton).then(done);
    page.textContent = '2';
    await vi.advanceTimersByTimeAsync(600);
    expect(done).not.toHaveBeenCalled();
    list.innerHTML = '';
    await vi.advanceTimersByTimeAsync(300);
    expect(done).not.toHaveBeenCalled();
    list.innerHTML = '<li class="table_tr"><span class="td_company_name">다음 회사</span></li>';
    await vi.advanceTimersByTimeAsync(150);
    await pending;
    expect(done).toHaveBeenCalledWith('moved');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('목록만 바뀌고 페이지 번호가 그대로라면 완료로 처리하지 않는다', async () => {
    const { list } = setup();
    const pending = clickPaginationButtonAndWait(WANTED_PAGINATION_SELECTORS.nextButton);
    list.innerHTML = '<li class="table_tr"><span class="td_company_name">다음 회사</span></li>';
    await vi.advanceTimersByTimeAsync(4200);
    expect(await pending).toBe('timeout');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('페이지 번호가 바뀌어도 이전 목록이 남아 있으면 timeout 처리한다', async () => {
    const { page } = setup();
    const pending = clickPaginationButtonAndWait(WANTED_PAGINATION_SELECTORS.nextButton);
    page.textContent = '2';
    await vi.advanceTimersByTimeAsync(4200);
    expect(await pending).toBe('timeout');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('마지막 페이지의 비활성 버튼은 클릭하지 않는다', async () => {
    setup();
    const button = document.querySelector<HTMLButtonElement>(WANTED_PAGINATION_SELECTORS.nextButton)!;
    button.disabled = true;
    const clicked = vi.fn();
    button.addEventListener('click', clicked);
    expect(await clickPaginationButtonAndWait(WANTED_PAGINATION_SELECTORS.nextButton)).toBe('no-next');
    expect(clicked).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

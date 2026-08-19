import { describe, expect, it } from 'vitest';
import { getCurrentPageNumber, rowSetKey } from './paginate';

describe('rowSetKey', () => {
  it('행 집합이 같으면 순서가 달라도 같은 키를 만든다', () => {
    const getKey = (row: string) => row;
    expect(rowSetKey(['a', 'b', 'c'], getKey)).toBe(rowSetKey(['c', 'a', 'b'], getKey));
  });

  it('행 집합이 다르면 다른 키를 만든다', () => {
    const getKey = (row: string) => row;
    expect(rowSetKey(['a', 'b'], getKey)).not.toBe(rowSetKey(['a', 'c'], getKey));
  });

  it('값 안에 구분자로 쓰일 문자가 섞여 있어도 서로 다른 행 집합끼리 충돌하지 않는다', () => {
    // join('|') 방식이었다면 ["a|b", "c"]와 ["a", "b|c"]가 둘 다 "a|b|c"로 충돌했을 것.
    const getKey = (row: string) => row;
    const setA = rowSetKey(['a|b', 'c'], getKey);
    const setB = rowSetKey(['a', 'b|c'], getKey);
    expect(setA).not.toBe(setB);
  });

  it('빈 배열도 안정적으로 처리한다', () => {
    const getKey = (row: string) => row;
    expect(rowSetKey([], getKey)).toBe(rowSetKey([], getKey));
  });
});

describe('getCurrentPageNumber', () => {
  it('페이지 파라미터가 없으면 1을 반환한다', () => {
    window.history.pushState({}, '', '/status-list');
    expect(getCurrentPageNumber('page')).toBe(1);
  });

  it('페이지 파라미터 값을 숫자로 읽는다', () => {
    window.history.pushState({}, '', '/status-list?page=5');
    expect(getCurrentPageNumber('page')).toBe(5);
  });

  it('파라미터 이름이 다르면(대소문자 등) 매칭하지 않고 1을 반환한다', () => {
    window.history.pushState({}, '', '/status-list?Page=5');
    expect(getCurrentPageNumber('page')).toBe(1);
  });

  it('숫자가 아니거나 1 미만이면 1로 취급한다', () => {
    window.history.pushState({}, '', '/status-list?page=abc');
    expect(getCurrentPageNumber('page')).toBe(1);

    window.history.pushState({}, '', '/status-list?page=0');
    expect(getCurrentPageNumber('page')).toBe(1);
  });
});

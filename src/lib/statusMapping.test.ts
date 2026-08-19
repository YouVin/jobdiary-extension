import { describe, expect, it } from 'vitest';
import { mapStatus } from './statusMapping';

describe('mapStatus', () => {
  it('취소가 포함된 문구는 canceled로 매핑한다', () => {
    expect(mapStatus('지원취소')).toBe('canceled');
    expect(mapStatus('지원취소완료')).toBe('canceled');
  });

  it('불합격/탈락이 포함된 문구는 rejected로 매핑한다', () => {
    expect(mapStatus('불합격')).toBe('rejected');
    expect(mapStatus('서류탈락')).toBe('rejected');
  });

  it('최종합격이 포함된 문구는 offer로 매핑한다', () => {
    expect(mapStatus('최종합격')).toBe('offer');
  });

  it('서류합격/서류통과가 포함된 문구는 screening으로 매핑한다', () => {
    expect(mapStatus('서류합격')).toBe('screening');
    expect(mapStatus('서류통과')).toBe('screening');
  });

  it('면접완료가 포함된 문구는 interviewed로 매핑한다', () => {
    expect(mapStatus('면접완료')).toBe('interviewed');
  });

  it('면접만 포함되고 완료가 없으면 interview로 매핑한다', () => {
    expect(mapStatus('면접')).toBe('interview');
    expect(mapStatus('면접예정')).toBe('interview');
  });

  it('매핑 대상이 아닌 원문(예: 지원완료)은 기본값 applied로 매핑한다', () => {
    expect(mapStatus('지원완료')).toBe('applied');
    expect(mapStatus('접수')).toBe('applied');
    expect(mapStatus('')).toBe('applied');
  });

  it('최종합격은 서류합격보다 먼저 검사돼야 한다(우선순위 회귀 방지)', () => {
    // "최종합격"엔 "서류합격"이 부분 문자열로 포함되지 않지만, 실제 사이트 원문이
    // 두 키워드를 함께 담을 가능성(예: "서류합격 → 최종합격")을 대비해 최종합격이 이긴다.
    expect(mapStatus('서류합격 후 최종합격')).toBe('offer');
  });

  it('면접완료는 면접보다 먼저 검사돼야 한다(우선순위 회귀 방지)', () => {
    expect(mapStatus('면접완료')).not.toBe('interview');
  });

  it('취소는 불합격/탈락보다 먼저 검사돼야 한다(우선순위 회귀 방지)', () => {
    expect(mapStatus('불합격 후 지원취소')).toBe('canceled');
  });
});

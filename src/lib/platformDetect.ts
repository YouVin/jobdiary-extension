import type { Platform } from '@/types/application';

// manifest.config.ts의 host_permissions/content_scripts matches와 반드시 같은 사이트·경로
// 범위를 유지한다 (그쪽이 바뀌면 여기도 같이 바꿔야 한다):
//   사람인:   https://*.saramin.co.kr/*
//   잡코리아: https://(www.)jobkorea.co.kr/User/*
//   원티드:   https://(www.)wanted.co.kr/status/*
export function detectPlatform(url: string | undefined): Platform | undefined {
  if (!url) return undefined;

  let hostname: string;
  let pathname: string;
  try {
    ({ hostname, pathname } = new URL(url));
  } catch {
    return undefined;
  }

  if (hostname === 'saramin.co.kr' || hostname.endsWith('.saramin.co.kr')) {
    return 'saramin';
  }
  if ((hostname === 'jobkorea.co.kr' || hostname === 'www.jobkorea.co.kr') && pathname.startsWith('/User/')) {
    return 'jobkorea';
  }
  if ((hostname === 'wanted.co.kr' || hostname === 'www.wanted.co.kr') && pathname.startsWith('/status/')) {
    return 'wanted';
  }

  return undefined;
}

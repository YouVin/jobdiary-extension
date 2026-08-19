import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest((env) => ({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  // 익스텐션 ID 고정용 공개키 (extension-key.pem에서 추출, 비공개키는 커밋 금지)
  key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwjbQ+wlOc1avVpmoj7lW7RuDOSrYnmkETZu6drwlRj0N9bT3ewkJANADaA9stXG+p0zHyvh5wCh3WrCjysPCz37tGkq8NKuG1/Di3VBvTsXJLBlZSSARIAexoDBUafokkFqwIRGvxGHP4gNM4uuWmaCIWz8sGXOUd48sIP61vQXtMblp46SlRt1qlvKt5Iomc1XZixHrkYZVci9kuF91lnKZ2kfPdPHcy3E4+RlMYbpbcaxMx5fXvezmNvnZ5iKkT3NbgyShv8YpyOYrbg58xkFz5SXFCxFMOoZ3Hx4bs8qFpMcPrvp1fdwwgpix9klQO1g2E2aS8ELnRriigFchSQIDAQAB',
  icons: {
    48: 'public/logo.png',
  },
  action: {
    default_icon: {
      48: 'public/logo.png',
    },
    default_popup: 'src/popup/index.html',
  },
  // 웹앱이 chrome.runtime.sendMessage(익스텐션ID, ...)로 pull 요청을 보낼 수 있는 origin.
  // src/background/index.ts의 ALLOWED_ORIGINS와 반드시 같은 목록을 유지한다.
  externally_connectable: {
    // 프로덕션 빌드에는 localhost를 포함하지 않는다 (개발 편의를 위해 dev 빌드에서만 허용)
    matches: env.mode === 'production'
      ? ['https://jobdiary.vercel.app/*']
      : ['http://localhost:3000/*', 'https://jobdiary.vercel.app/*'],
  },
  permissions: ['storage'],
  // host_permissions는 스킴+호스트 단위로만 권한을 부여한다 — 경로(path)는 문법상
  // 받아들여지긴 해도 Chrome이 실제 권한 범위 판정에는 반영하지 않는다. 즉 아래는
  // 각 사이트 "오리진 전체"에 대한 host access이고, 경로로 좁힌 게 아니다(좁힌 것처럼
  // 경로를 적어두면 실제 권한 범위를 오해하게 만들 뿐이라 오리진만 남긴다).
  // 실제 경로 제한은 host_permissions가 아니라 아래 두 곳이 담당한다:
  //   1) content_scripts.matches — 어느 경로에 스크립트를 주입할지 (경로까지 실제로 강제됨)
  //   2) src/lib/platformDetect.ts — 런타임에 pathname을 검사해 지원 플랫폼인지 판정
  host_permissions: [
    'https://*.saramin.co.kr/*',
    'https://www.jobkorea.co.kr/*',
    'https://jobkorea.co.kr/*',
    'https://www.wanted.co.kr/*',
    'https://wanted.co.kr/*',
  ],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [{
    // 실제 경로 제한은 여기서 이뤄진다. src/lib/platformDetect.ts의 saramin 분기(pathname
    // 검사)와 경로가 문자 그대로 동일해야 한다 — host_permissions는 오리진만 봐서 대상 아님.
    js: ['src/content/saramin.ts'],
    matches: ['https://*.saramin.co.kr/zf_user/persons/apply-status-list*'],
  }, {
    js: ['src/content/jobkorea.ts'],
    matches: [
      'https://www.jobkorea.co.kr/User/*',
      'https://jobkorea.co.kr/User/*',
    ],
  }, {
    js: ['src/content/wanted.ts'],
    matches: [
      'https://www.wanted.co.kr/status/*',
      'https://wanted.co.kr/status/*',
    ],
  }],
}))

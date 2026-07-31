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
  externally_connectable: {
    // 프로덕션 빌드에는 localhost를 포함하지 않는다 (개발 편의를 위해 dev 빌드에서만 허용)
    matches: env.mode === 'production'
      ? ['https://jobdiary.vercel.app/*']
      : ['http://localhost:3000/*', 'https://jobdiary.vercel.app/*'],
  },
  permissions: ['storage'],
  host_permissions: [
    'https://*.saramin.co.kr/*',
    'https://www.jobkorea.co.kr/User/*',
    'https://jobkorea.co.kr/User/*',
    'https://www.wanted.co.kr/status/*',
    'https://wanted.co.kr/status/*',
  ],
  content_scripts: [{
    js: ['src/content/saramin.ts'],
    matches: ['https://*.saramin.co.kr/*'],
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

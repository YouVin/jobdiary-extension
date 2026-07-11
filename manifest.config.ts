import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  icons: {
    48: 'public/logo.png',
  },
  action: {
    default_icon: {
      48: 'public/logo.png',
    },
    default_popup: 'src/popup/index.html',
  },
  permissions: [
    'sidePanel',
    'contentSettings',
  ],
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
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
})

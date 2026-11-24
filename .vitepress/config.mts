import { defineConfig } from 'vitepress'
import { sidebar } from './site.mjs'

// skapi-py documentation: the Skapi API for Python. Compact on purpose: only the methods
// skapi-py provides (accounts, sign-in, database, files, users). Browser, dashboard, admin,
// hosting, newsletter and realtime features live in the skapi-js documentation.
export default defineConfig({
  title: 'Skapi for Python',
  description: 'Skapi backend for Python. Sign users in and use your project database.',
  lang: 'en-US',
  cleanUrls: false,
  lastUpdated: false,
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico', sizes: 'any' }],
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
  ],
  themeConfig: {
    logo: '/logo.png',
    siteTitle: 'Skapi Python',
    search: { provider: 'local' },
    nav: [
      { text: 'Getting Started', link: '/introduction/getting-started' },
      { text: 'API Reference', link: '/api-reference/' },
      { text: 'Version History', link: '/versionlog/versions' },
      { text: 'skapi.com', link: 'https://www.skapi.com' },
    ],
    sidebar,
    socialLinks: [{ icon: 'github', link: 'https://github.com/broadwayinc/skapi-py' }],
    footer: { message: 'skapi-py 2.5.0', copyright: 'broadway Inc.' },
  },
  vite: {
    server: {
      allowedHosts: ['seoul.broadwayinc.computer', 'us.broadwayinc.computer', 'us-dev.broadwayinc.computer', 'dev.broadwayinc.computer'],
    },
  },
})

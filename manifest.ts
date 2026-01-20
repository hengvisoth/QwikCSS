import type { ManifestV3Export } from '@crxjs/vite-plugin'

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: 'QwikCSS',
  version: '0.0.1',
  permissions: ['storage'],
  host_permissions: ['<all_urls>'],

  // Content script = inject UI + later do element picking / CSS patching
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/main.ts'],
      run_at: 'document_idle',
    },
  ],

  // Allow the injected iframe to load its HTML/JS/CSS from the extension origin
  web_accessible_resources: [
    {
      resources: ['src/ui/panel.html', 'src/ui/*', 'assets/*'],
      matches: ['<all_urls>'],
    },
  ],
}

export default manifest

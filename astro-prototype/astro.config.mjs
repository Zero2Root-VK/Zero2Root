import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://zero2root.com',
  output: 'static',
  integrations: [
    react(),
    starlight({
      title: 'Zero2Root',
      description: 'A connected cybersecurity knowledge and research platform.',
      customCss: ['./src/styles/starlight.css'],
      sidebar: [
        {
          label: 'Start here',
          items: [{ slug: 'intro' }],
        },
        {
          label: 'Tools & Automation',
          items: [{ autogenerate: { directory: 'tools' } }],
        },
      ],
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/Zero2Root-VK/Zero2Root',
        },
      ],
    }),
  ],
});

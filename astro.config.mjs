// @ts-check
import { defineConfig } from 'astro/config';

// 部署到 GitHub Pages：https://minfang-lin.github.io/newpuzzlewiki/
// 如果以后绑定自己的域名，把 site 改成域名、删掉 base 即可。
export default defineConfig({
  site: 'https://minfang-lin.github.io',
  base: '/newpuzzlewiki',
  trailingSlash: 'always',
});

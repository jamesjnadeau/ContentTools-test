// @ts-check
import {defineConfig} from 'astro/config';

// A PROJECT page, not a user page, so everything is served under the
// repository name. `base` has to be set for asset URLs to resolve; without
// it the CSS and images 404 on Pages while working perfectly in `dev`,
// which is the one failure shape worth guarding against here.
export default defineConfig({
    site: 'https://jamesjnadeau.github.io',
    base: '/ContentTools-test'
});

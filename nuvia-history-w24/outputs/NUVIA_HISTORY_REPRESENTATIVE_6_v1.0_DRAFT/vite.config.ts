import {defineConfig} from 'vite';
export default defineConfig({base:'./',build:{assetsInlineLimit:0,lib:{entry:'src/index.ts',formats:['es'],fileName:'nuvia-common-engine'},rollupOptions:{external:['react','react/jsx-runtime']}}});

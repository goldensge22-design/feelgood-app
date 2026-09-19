import {defineConfig} from 'vite';
export default defineConfig({base:'./',build:{outDir:'dist-app',assetsInlineLimit:0},server:{host:'127.0.0.1',port:5187,strictPort:true}});

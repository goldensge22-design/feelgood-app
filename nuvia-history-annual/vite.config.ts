import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
const file=(p:string)=>fileURLToPath(new URL(p,import.meta.url));
export default defineConfig({base:'./',publicDir:file('../nuvia-history-w24/outputs/NUVIA_HISTORY_REPRESENTATIVE_6_v1.0_DRAFT/public'),resolve:{dedupe:['react','react-dom']},build:{manifest:true,outDir:'dist',assetsInlineLimit:0,rollupOptions:{input:{index:file('./index.html'),w24:file('./w24.html')}}},server:{host:'0.0.0.0',port:5195,strictPort:true}});

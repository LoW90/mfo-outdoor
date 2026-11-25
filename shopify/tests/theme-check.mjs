/** Runs Shopify's Theme Check (the same checks as `shopify theme check`) on theme/. Exits 1 on any error. */
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {themeCheckRun} from '@shopify/theme-check-node';

export async function runThemeCheck(){
 const theme=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','theme');
 const result=await themeCheckRun(theme,undefined,()=>{});
 return (result.offenses||result).map(o=>({severity:['error','warning','info'][o.severity]??String(o.severity),check:o.check,file:o.uri.split('/theme/')[1],line:(o.start?.line??0)+1,message:o.message}));
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const offenses=await runThemeCheck();
 for(const o of offenses)console.log(`${o.severity.toUpperCase()} ${o.check} ${o.file}:${o.line} ${o.message}`);
 console.log(`${offenses.length} offense(s)`);
 process.exit(offenses.some(o=>o.severity==='error')?1:0);
}

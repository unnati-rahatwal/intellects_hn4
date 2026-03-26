const fs=require('fs');
const txt=fs.readFileSync('models_utf8.json','utf8');
const rx=/[^"\s]*(?:vision|vl)[^"\s]*/gi;
const matches = [...txt.matchAll(rx)].map(m=>m[0]);
console.log(Array.from(new Set(matches)).join('\n'));

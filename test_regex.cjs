const fs = require('fs');
let content = fs.readFileSync('src/lib/prompts.ts', 'utf8');
let replaced = content.replace(/\n────────────────────────────\nGLOBAL RULE — STAGE CONTRACT\n────────────────────────────[\s\S]*?(?=# OUTPUT FORMAT|# ТРЕБОВАНИЯ К ФОРМАТУ|# ТРЕБОВАНИЯ К ОФОРМЛЕНИЮ|# REQUIRED OUTPUT FORMAT|# ТРЕБОВАНИЯ К БЛОКАМ|# REQUIRED FORMAT PER SCENE|КАК ПИСАТЬ ТЕКСТ СЦЕНАРИЯ)/g, "\n\n");
console.log("Original size:", content.length);
console.log("Replaced size:", replaced.length);
fs.writeFileSync('src/lib/prompts.ts.bak', replaced);

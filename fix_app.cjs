const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Remove niche selection and romantic paths
app = app.replace(/\{currentNiche === "manga-romantic" && \([\s\S]*?\)\}/g, '');
app = app.replace(/\$\{currentNiche === "manga-romantic" \? "bg-\[#111113\]\/40" : "bg-\[#111113\]"\}/g, 'bg-[#111113]');
app = app.replace(/\$\{currentNiche === "manga-romantic" \? "bg-black\/40" : "bg-gradient-to-br from-\[#0D0D0F\] to-\[#0A0A0B\]"\}/g, 'bg-gradient-to-br from-[#0D0D0F] to-[#0A0A0B]');
app = app.replace(/\$\{currentNiche === "manga-romantic" \? "bg-black\/20" : "bg-black\/10"\}/g, 'bg-black/10');
app = app.replace(/<option value="manga-romantic".*?<\/option>\n/g, '');

const replacers = [
  [/const exampleTemplate = currentNiche === "manga-romantic" \? STAGE1_EXAMPLE_ROMANTIC : STAGE1_EXAMPLE;/, 'const exampleTemplate = STAGE1_EXAMPLE;'],
  [/const promptTemplate = currentNiche === "manga-romantic" \? STAGE1_PROMPT_ROMANTIC : STAGE1_PROMPT_STRATEGY;/, 'const promptTemplate = STAGE1_PROMPT_STRATEGY;'],
  
  [/const exampleTemplate = currentNiche === "manga-romantic" \? STAGE2_EXAMPLE_ROMANTIC : STAGE2_EXAMPLE_STRATEGY;/, 'const exampleTemplate = STAGE2_EXAMPLE_STRATEGY;'],
  [/const promptTemplate = currentNiche === "manga-romantic" \? STAGE2_PROMPT_ROMANTIC : STAGE2_PROMPT_STRATEGY;/, 'const promptTemplate = STAGE2_PROMPT_STRATEGY;'],
  
  [/const exampleTemplate = currentNiche === "manga-romantic" \? STAGE3_EXAMPLE_ROMANTIC : STAGE3_EXAMPLE_STRATEGY;/, 'const exampleTemplate = STAGE3_EXAMPLE_STRATEGY;'],
  [/const promptTemplate = currentNiche === "manga-romantic" \? STAGE3_PROMPT_ROMANTIC : STAGE3_PROMPT_STRATEGY;/, 'const promptTemplate = STAGE3_PROMPT_STRATEGY;'],
  
  [/const exampleTemplate = currentNiche === "manga-romantic" \? STAGE4_EXAMPLE_ROMANTIC : STAGE4_EXAMPLE_STRATEGY;/, 'const exampleTemplate = STAGE4_EXAMPLE_STRATEGY;'],
  [/const promptTemplate = currentNiche === "manga-romantic" \? STAGE4_PROMPT_ROMANTIC : STAGE4_PROMPT_STRATEGY;/, 'const promptTemplate = STAGE4_PROMPT_STRATEGY;'],

  [/const exampleTemplate = currentNiche === "manga-romantic" \? STAGE5_EXAMPLE_ROMANTIC : STAGE5_EXAMPLE_STRATEGY;/, 'const exampleTemplate = STAGE5_EXAMPLE_STRATEGY;'],
  [/const promptTemplate = currentNiche === "manga-romantic" \? STAGE5_PROMPT_ROMANTIC : STAGE5_PROMPT_STRATEGY;/, 'const promptTemplate = STAGE5_PROMPT_STRATEGY;'],

  [/const promptTemplate = currentNiche === "manga-romantic" \? STAGE6_PROMPT_ROMANTIC : STAGE6_PROMPT;/, 'const promptTemplate = STAGE6_PROMPT;'],
  [/const exampleTemplate = currentNiche === "manga-romantic" \? STAGE6_EXAMPLE_ROMANTIC : STAGE6_EXAMPLE;/, 'const exampleTemplate = STAGE6_EXAMPLE;'],

  [/const promptTemplate = currentNiche === "manga-romantic" \? STAGE7_PROMPT_ROMANTIC : STAGE7_PROMPT;/, 'const promptTemplate = STAGE7_PROMPT;'],
  [/const stylePrefix = currentNiche === "manga-romantic" \? "" : `\$\{STYLE_MASTER_PROMPT\}\\n\\n`;/, 'const stylePrefix = `${STYLE_MASTER_PROMPT}\\n\\n`;'],
  [/const exampleTemplate = currentNiche === "manga-romantic" \? STAGE7_EXAMPLE_ROMANTIC : "";/, 'const exampleTemplate = "";'],
];

for (const [search, replace] of replacers) {
  app = app.replace(search, replace);
}

fs.writeFileSync('src/App.tsx', app);

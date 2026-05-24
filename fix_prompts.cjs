const fs = require('fs');
let prompts = fs.readFileSync('src/lib/prompts.ts', 'utf8');

// Global replacements to remove ROMANTIC constants
prompts = prompts.replace(/export const GLOBAL_STYLE_LOCK_ROMANTIC[\s\S]*?(?=export const)/, '');
prompts = prompts.replace(/export const STAGE1_EXAMPLE_ROMANTIC[\s\S]*?(?=export const)/, '');
prompts = prompts.replace(/export const STAGE1_PROMPT_ROMANTIC[\s\S]*?(?=export const)/, '');
prompts = prompts.replace(/export const STAGE2_EXAMPLE_ROMANTIC[\s\S]*?(?=export const)/, '');
prompts = prompts.replace(/export const STAGE2_PROMPT_ROMANTIC[\s\S]*?(?=export const)/, '');
prompts = prompts.replace(/export const STAGE3_EXAMPLE_ROMANTIC[\s\S]*?(?=export const)/, '');
prompts = prompts.replace(/export const STAGE3_PROMPT_ROMANTIC[\s\S]*?(?=export const)/, '');
prompts = prompts.replace(/export const STAGE4_EXAMPLE_ROMANTIC[\s\S]*?(?=export const)/, '');
prompts = prompts.replace(/export const STAGE4_PROMPT_ROMANTIC[\s\S]*?(?=export const)/, '');
prompts = prompts.replace(/export const STAGE5_EXAMPLE_ROMANTIC[\s\S]*?(?=export const)/, '');
prompts = prompts.replace(/export const STAGE5_PROMPT_ROMANTIC[\s\S]*?(?=export const)/, '');
prompts = prompts.replace(/export const STAGE6_EXAMPLE_ROMANTIC[\s\S]*?(?=export const)/, '');
prompts = prompts.replace(/export const STAGE6_PROMPT_ROMANTIC[\s\S]*?(?=export const)/, '');
prompts = prompts.replace(/export const STAGE7_PROMPT_ROMANTIC[\s\S]*?(?=export const)/, '');

fs.writeFileSync('src/lib/prompts.ts', prompts);

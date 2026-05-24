const fs = require('fs');

const PROMPT_FILE = './src/lib/prompts.ts';

let promptsContent = fs.readFileSync(PROMPT_FILE, 'utf8');

const STAGE5_EXAMPLE_ROMANTIC = fs.readFileSync('./stage5_example_romantic.txt', 'utf8');

promptsContent = promptsContent.replace(
  'export const STAGE5_EXAMPLE_ROMANTIC = `[ПРИМЕР ОЖИДАЕТСЯ]`;', 
  'export const STAGE5_EXAMPLE_ROMANTIC = `' + STAGE5_EXAMPLE_ROMANTIC.replace(/\`/g, '\\\`').replace(/\$\{/g, '\\\$\\{') + '`;'
);

fs.writeFileSync(PROMPT_FILE, promptsContent);
console.log('Patched prompts.ts');

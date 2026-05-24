const fs = require('fs');

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

// Also import STAGE7_EXAMPLE_ROMANTIC
if (!appContent.includes('STAGE7_EXAMPLE_ROMANTIC')) {
    appContent = appContent.replace(
        "import { STAGE1_PROMPT_STRATEGY",
        "import { STAGE7_EXAMPLE_ROMANTIC } from './lib/stage7_example_romantic';\nimport { STAGE1_PROMPT_STRATEGY"
    );
}

// Update finalPrompt for step 7
appContent = appContent.replace(
    'const stylePrefix = currentNiche === "manga-romantic" ? "" : `\\n\\n`;',
    'const stylePrefix = currentNiche === "manga-romantic" ? "" : `\\n\\n`;'
); // Just a dummy replace

const targetFinalPrompt = '        const finalPrompt = `${stylePrefix}${promptTemplate}\\n\\nЯДРО ИДЕИ:\\n${coreIdea}\\n\\nWORLD BIBLE:\\n${worldBible}\\n\\nPROGRESSION LADDER:\\n${ladder}\\n\\nSOCIAL MAP:\\n${characters}\\n\\nMACRO OUTLINE:\\n${outline}\\n\\nSCENE CARDS:\\n${sceneCards}\\n\\nCURRENT SCENARIO MEMORY:\\n${currentMemory}\\n\\nКАКУЮ ЧАСТЬ ПИСАТЬ:\\n${targetBlock}`;';
const replacementPrompt = `        const exampleTemplate = currentNiche === "manga-romantic" ? STAGE7_EXAMPLE_ROMANTIC : "";
        const exampleBlock = exampleTemplate ? \`\\n\\nПРИМЕРЫ СЦЕНАРИЕВ КОНКУРЕНТОВ (ОРИЕНТИРУЙСЯ НА ИХ СТИЛЬ):\\n\${exampleTemplate}\` : "";
        const finalPrompt = \`\${stylePrefix}\${promptTemplate}\${exampleBlock}\\n\\nЯДРО ИДЕИ:\\n\${coreIdea}\\n\\nWORLD BIBLE:\\n\${worldBible}\\n\\nPROGRESSION LADDER:\\n\${ladder}\\n\\nSOCIAL MAP:\\n\${characters}\\n\\nMACRO OUTLINE:\\n\${outline}\\n\\nSCENE CARDS:\\n\${sceneCards}\\n\\nCURRENT SCENARIO MEMORY:\\n\${currentMemory}\\n\\nКАКУЮ ЧАСТЬ ПИСАТЬ:\\n\${targetBlock}\`;`;

appContent = appContent.replace(targetFinalPrompt, replacementPrompt);

fs.writeFileSync('src/App.tsx', appContent);

const fs = require('fs');

let file = fs.readFileSync('src/lib/prompts.ts', 'utf8');

const contractStr = `
────────────────────────────
GLOBAL RULE — STAGE CONTRACT
────────────────────────────

После каждого этапа софт должен создавать и сохранять Stage Contract. Следующий этап обязан читать этот контракт (который передается в виде лога предыдущего этапа) и не имеет права ему противоречить.

Перед генерацией любого нового этапа или блока, ты должен сначала про себя проверить:
"Does this output contradict the locked contract formed by previous answers?"
Если да — ты обязан переписать ответ до финального вывода.
`;

const st1Rules = `
────────────────────────────
STAGE 1 — RAW IDEA / CORE HOOK (INTEGRITY RULE)
────────────────────────────
В конце твоего ответа добавь обязательный блок:
LOCKED CORE PREMISE
Он должен отвечать на вопросы:
- кто главный герой;
- откуда он попадает в новый мир;
- куда он попадает;
- в какой роли он оказывается;
- какая главная проблема;
- какая главная система/база;
- какие ключевые персонажи;
- какой тип финала;
- что нельзя менять на следующих этапах (DO NOT CHANGE rules).

Правило: После Stage 1 нельзя менять старт, сеттинг, конфигурацию ключевых персонажей, центральную систему и тип финала.
`;

const st2Rules = `
────────────────────────────
STAGE 2 — WORLD BIBLE (INTEGRITY RULE)
────────────────────────────
На этапе World Bible зафиксируй границы допустимого. Добавь в конец ответа разделы:

WORLD CONSTRAINTS:
Для WWII-inspired историй (или любых других, адаптируй под сеттинг):
- это альтернативный фронт, но не точная реконструкция;
- не использовать реальные запрещённые символы или экстремистские эмблемы;
- фокус на выживании, логистике, инженерии, укреплениях и цене решений;
- насилие может быть, но без gore, torture или инструкций по оружию.

TECHNOLOGY LIMIT:
- Ограничение по технологиям уровня эпохи (например 1940-х). Никаких лазеров, дронов или смартфонов, если это не обосновано сеттингом напрямую;
- Знания героя — главный ресурс, обойтись без "роялей в кустах" или современной магии.

SAFE WAR CONTENT RULE:
Сценарий может содержать войну, укрепления и стратегию, но не должен содержать пошаговых инструкций по созданию оружия, взрывчатки, боеприпасов, опасных устройств или саботажа.
Разрешено: ремонт, эвакуация, инженерная логика, медицина, обман и баррикады.
Запрещено: точные инструкции изготовления, пропорции химикатов, рецепты.
`;

const st3Rules = `
────────────────────────────
STAGE 3 — PROGRESSION LADDER (INTEGRITY RULE)
────────────────────────────
Добавь в конец ответа блок PROGRESSION LADDER LOCK.
Каждый крупный апгрейд должен быть заработан в правильном порядке.
(Пример: survival -> shelter -> information -> medicine -> civilians -> communication -> defense -> production -> final trap).
Правило: Нельзя вводить финальное решение раньше своего этапа. Early setup is allowed. Full reveal is forbidden.
Например: можно показать трещины перед водоемом, но нельзя писать "это станет главной ловушкой для танков до самого финала".
`;

const st4Rules = `
────────────────────────────
STAGE 4 — CHARACTER / SOCIAL MAP (INTEGRITY RULE)
────────────────────────────
Добавь в ответ CHARACTER FUNCTION LOCK.
Каждый named character должен получить:
- fixed first appearance
- fixed initial loyalty
- fixed skill
- fixed reason to help
- fixed trust turning point
- fixed role in the base/system
- fixed risk

Правило: Модель не может менять функцию персонажа позже. Модель не может сделать персонажа лояльным до его trust turning point. Нельзя вводить персонажа повторно, если он уже введен.

PRISONER ETHICS RULE (если есть пленные):
Captured people / women must not be sexualized as helpless trophies.
Tension exists through danger, wounds, distrust. No humiliation, coercive romance, forced intimacy. Chemistry must be slow, restrained, based on survival and respect.
`;

const st5Rules = `
────────────────────────────
STAGE 5 — MACRO OUTLINE (INTEGRITY RULE)
────────────────────────────
Добавь в ответ BLOCK FUNCTION TABLE для всех 9 блоков.
Для каждого блока сохрани:
- exact block number & title;
- main function;
- allowed events;
- forbidden events;
- final beat;
- transition to next block;
- protagonist status shift;
- resource gained/lost;
- cost paid;
- new problem created.

Правило: Macro Outline после утверждения становится locked. Сцены позже не имеют права менять функции этих блоков.
`;

const st6Rules = `
────────────────────────────
STAGE 6 — SCENE CARDS (INTEGRITY RULE)
────────────────────────────
MACRO-TO-SCENE CONSISTENCY GATE: Строго соблюдай функции блоков из Stage 5. Не добавляй отсебятины и не смещай события на более ранние этапы.
DUPLICATE EVENT CHECK: Выведи в конце список важных событий. Если одно крупное событие (например, захват пленного) происходит дважды — перепиши так, чтобы дублей не было.
FORESHADOWING VS REVEAL RULE: Foreshadowing may show details. Reveal explains function. Строго разделяй.
SCENE CARD FORMAT CHECK: В каждой сцене проверяй наличие пунктов:
Function, Event, Problem, What the protagonist notices, Resource, Decision, Cost, Result, New problem, Status shift, Character development, Strategic pillar, Transition. (Если нет Cost или New problem — перепиши сцену).
`;

const st7Rules = `
────────────────────────────
STAGE 7 / SCRIPT DRAFT & REWRITE / POLISH (INTEGRITY RULES & LINTERS)
────────────────────────────
Ты должен выступать также как LINTER.
DRAFTING LOCK: Не меняй структуру, концовку, события между блоками. Не раскрывай секреты досрочно.
SCENE EXPANSION RULE: Покажи sensory pressure, dialogue, action, consequences. Запрещено: AI морали в конце сцен ("Это было не просто... В этот момент всё изменилось навсегда."). Показывать смысл через физические последствия.
REWRITE CHECKLIST LINTER:
- Исключить флуд AI ("Это доказало силу...", "Судьба решила иначе", "Это было не просто...").
- Запрет на duplicate events/scene functions.
- Запрет на face-slap без контекста. Face-slap должен иметь setup и payoff (враг смеется над матрасом -> матрас ловит осколки и спасает его). 
- RESOURCE CONTINUITY RULE: каждый ресурс должен иметь понятный источник, цену и последствия (никаких бесконечных патронов, еды из воздуха).
- ANTAGONIST ADAPTATION RULE: После каждой крупной победы враг должен адаптироваться (менять коды, прислать саперов, сменить тактику).
- WAR SAFETY LINTER: никаких инструкций по бомбам;
- FINAL QA: перед выводом убедись, что финал 1в1 соответствует самому начальному плану (LOCKED CORE PREMISE). Никаких изменений концовки! Никаких продолжений на 2 сезон, если должен быть четкий финал.
- AVATAR RULES: Формат строго [Avatar] text. Avatar не должен пересказывать действие героя. Должен говорить со зрителем, давать инсайт. Максимум 3-5 таких вставок.

FINAL QA TABLE: 
Для каждого блока убедись: function preserved, no duplicates, protagonist status changed, new resource/cost exist, no magic drift, ending remains locked.
`;

file = file.replace(/(export const STAGE1_PROMPT_STRATEGY = `[\s\S]*?)(# OUTPUT FORMAT)/, "$1 \n" + contractStr + "\n" + st1Rules + "\n$2");
file = file.replace(/(export const STAGE2_PROMPT_STRATEGY = `[\s\S]*?)(# ТРЕБОВАНИЯ К ФОРМАТУ)/, "$1 \n" + contractStr + "\n" + st2Rules + "\n$2");
file = file.replace(/(export const STAGE3_PROMPT_STRATEGY = `[\s\S]*?)(# ТРЕБОВАНИЯ К ОФОРМЛЕНИЮ)/, "$1 \n" + contractStr + "\n" + st3Rules + "\n$2");
file = file.replace(/(export const STAGE4_PROMPT_STRATEGY = `[\s\S]*?)(# REQUIRED OUTPUT FORMAT)/, "$1 \n" + contractStr + "\n" + st4Rules + "\n$2");
file = file.replace(/(export const STAGE5_PROMPT_STRATEGY = `[\s\S]*?)(# ТРЕБОВАНИЯ К БЛОКАМ)/, "$1 \n" + contractStr + "\n" + st5Rules + "\n$2");
file = file.replace(/(export const STAGE6_PROMPT_STRATEGY = `[\s\S]*?)(# REQUIRED FORMAT PER SCENE)/, "$1 \n" + contractStr + "\n" + st6Rules + "\n$2");
file = file.replace(/(export const STAGE7_PROMPT_STRATEGY = `[\s\S]*?)(КАК ПИСАТЬ ТЕКСТ СЦЕНАРИЯ)/, "$1 \n" + contractStr + "\n" + st7Rules + "\n$2");

fs.writeFileSync('src/lib/prompts.ts', file);
console.log('Done replacing integrity rules.');

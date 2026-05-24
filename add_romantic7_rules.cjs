const fs = require('fs');

let content = fs.readFileSync('src/lib/prompts.ts', 'utf8');

const RULES_TO_ADD = `
==================================================
САМОЕ ВАЖНОЕ ПРАВИЛО СТИЛЯ
==================================================
Не пытайся сделать текст “красивым и мрачным”. Делай его “понятным, наглым и дофаминовым”.

То есть герой не должен звучать как демон из тёмного триллера. Он должен звучать как человек, который уже видел этот цирк, понял правила игры и теперь спокойно ставит врагов на место.

Пример разницы:

Плохо:
A terrifying darkness filled my dead eyes as the brutal corporate guillotine prepared to fall.

Хорошо:
Ye Chen smiled at the cameras like he owned the building. Cute. His access card was already dead in our system.

==================================================
FIRST-PERSON POV LOCK
==================================================

The script must be written in FIRST-PERSON DOMINANT POV.

The main narration voice is the hero:
- I saw...
- I knew...
- I didn't answer...
- I let them keep talking...
- I had already prepared the evidence...
- In the original plot...
- In my past life...
- This idiot still thought...

Do NOT write the main story in third person:
- Do NOT write: "Haruto walked", "Haruto thought", "Haruto smiled".
- Write: "I walked", "I thought", "I smiled".

Short third-person cutaways are allowed only when:
- the hero is not physically present;
- enemy panic must be shown;
- public/media reaction must be shown;
- social consequences happen outside the hero's view.

After a cutaway, return immediately to first-person narration.

==================================================
TONE CALIBRATION — DRAMA RECAP, NOT DARK THRILLER
==================================================

Write in fast Chinese/Korean drama recap style:
- sarcastic;
- simple;
- direct;
- addictive;
- emotionally sharp;
- focused on status, money, public humiliation, evidence, regret, jealousy, and consequences.

Do NOT write like a dark psychological thriller unless the plan explicitly requires it.

Avoid excessive horror / thriller language:
- terrifying aura
- dead as a morgue
- predator / prey spam
- blood-curdling
- absolute darkness
- violent destiny
- freezing silence
- brutal truth
- dark god
- soul left his body

Replace dark atmosphere with concrete drama:
- a card gets declined;
- a contract appears;
- a recording plays;
- a security badge stops working;
- the crowd changes sides;
- the white lotus loses control;
- the fake rich guy panics;
- the family realizes they insulted the real owner.

==================================================
ANTI-AI PHRASE FILTER
==================================================

Avoid generic AI phrases and overused dramatic templates.

Forbidden or heavily restricted phrases:
- "not X, but Y"
- "little did he know"
- "everything changed forever"
- "this was only the beginning"
- "in that moment"
- "as if the world stopped"
- "he had no idea what was coming"
- "a storm was brewing"
- "his smile didn't reach his eyes"
- "the mask finally cracked"
- "the room fell into dead silence" repeated too often
- "everyone gasped" repeated too often
- "color drained from his face" repeated too often
- "jaw dropped" repeated too often

If a sentence sounds like generic dramatic narration, rewrite it into:
- action;
- money;
- status;
- evidence;
- public reaction;
- legal consequence;
- sarcastic internal comment.

==================================================
WORD SPAM CONTROL
==================================================

Do not overuse intensity words.

Limit these words:
absolute, absolutely, terrifying, brutal, massive, violently, freezing, glacial, dark, predator, prey, monster, nightmare, deadly, merciless, ruthless, cold smile, smirk.

Use them rarely, only when they create real impact.

Preferred replacements:
- "He stopped talking."
- "His hand slipped on the card."
- "The manager looked at the screen twice."
- "The crowd suddenly stopped defending him."
- "She deleted the post in front of everyone."
- "The security gate flashed red."
- "That was when his fake status died."

==================================================
DOPAMINE DRAMA ENGINE
==================================================

Every major scene should follow this rhythm:

1. Enemy acts arrogant.
2. Enemy publicly overcommits.
3. Hero stays calm.
4. Evidence or system consequence appears.
5. Enemy loses control physically or socially.
6. Public reaction shifts.
7. Hero gives one short cold line or says nothing.
8. New problem or next trap opens.

Face-slap must be based on evidence, money, status, public proof, law, company rules, social media, or witness reaction.
Do NOT make face-slap only a clever insult.

==================================================
AVATAR RULE — SHORT VIEWER ADDRESS
==================================================

The [Avatar] paragraph must be short.

Length: 120–280 characters.

It must sound like a YouTube host talking to viewers, not like a long essay.

Avatar should:
- address viewers directly;
- quickly explain the power dynamic;
- point to the next hook;
- avoid long psychological lectures.

Good Avatar style:
[Avatar]: Guys, this is why you never flex with borrowed status. Ye Chen thought the card made him powerful, but the card was the leash. Next, Linda’s family walks into the same trap.

Bad Avatar style:
Long philosophical explanation, too many metaphors, too much "absolute brutal freezing revenge" language.
`;

const lines = content.split('\n');
const startIdx = lines.findIndex(l => l.includes('export const STAGE7_PROMPT_ROMANTIC'));

if (startIdx !== -1) {
    let oldAvatarStart = -1;
    let oldAvatarEnd = -1;

    for (let i = startIdx; i < lines.length; i++) {
        if (lines[i] === '==================================================' && lines[i+1] === 'AVATAR RULE' && lines[i+2] === '==================================================') {
            oldAvatarStart = i;
        }
        if (oldAvatarStart !== -1 && lines[i] === 'Если Avatar не указан для этой части — не добавляй его.') {
            oldAvatarEnd = i;
            break;
        }
    }

    if (oldAvatarStart !== -1 && oldAvatarEnd !== -1) {
        lines.splice(oldAvatarStart, oldAvatarEnd - oldAvatarStart + 1, RULES_TO_ADD);
        fs.writeFileSync('src/lib/prompts.ts', lines.join('\n'));
        console.log('Replaced successfully.');
    } else {
        console.log('Could not find AVATAR RULE inside STAGE7_PROMPT_ROMANTIC.');
    }
} else {
    console.log('Could not find STAGE7_PROMPT_ROMANTIC.');
}

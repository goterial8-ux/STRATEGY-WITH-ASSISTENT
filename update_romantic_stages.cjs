const fs = require('fs');
let content = fs.readFileSync('src/lib/prompts.ts', 'utf8');

const s1_lock = `
==================================================
STAGE 01 EXTRA LOCK — NICHE / POV / DOPAMINE DIAGNOSIS
==================================================
In this stage, do NOT write the story plan yet.
Your job is to diagnose the raw idea and lock the correct narrative mode.

You must identify:

1. Niche Mode:
Choose the natural subniche of the raw idea:
- CEO / corporate regret
- campus rebirth revenge
- true heir / fake heir
- family regret
- ex regret
- transmigration into a novel
- time-loop moral regret
- white lotus exposure
- fake rich / true rich
- social media humiliation
- engagement betrayal
- other, if more accurate

Do NOT force every idea into CEO drama.
Do NOT force every idea into revenge if the raw idea is moral regret, time-loop, romance, or psychological drama.

2. Narration Mode:
Decide whether the story should be:
- first-person dominant POV;
- third-person recap;
- mixed POV.

Default should be FIRST-PERSON DOMINANT unless the idea clearly requires otherwise.

3. Core Dopamine Engine:
Define what keeps viewers watching:
- public face-slaps;
- hidden identity reveals;
- regret escalation;
- enemy panic;
- social humiliation;
- moral cost;
- repeated timeline changes;
- white lotus exposure;
- status reversal.

4. Hidden Card Engine:
Identify what the hero knows or controls that others do not:
- money;
- status;
- future knowledge;
- original plot knowledge;
- evidence;
- contracts;
- true identity;
- time-loop memory;
- social leverage.

5. Forbidden Drift:
List what the system must NOT turn this idea into.
Examples:
- do not turn time-loop moral drama into CEO revenge;
- do not turn campus revenge into dungeon progression;
- do not turn emotional regret into dark horror thriller;
- do not rename characters;
- do not change the core premise.

6. Tone Target:
Define the tone:
fast drama recap, sarcastic, simple, sharp, emotionally clear.
If the idea is darker, allow tension, but avoid excessive dark-thriller language.

Output must include:
- Niche Mode
- Narration Mode
- Core Hook
- Core Dopamine Engine
- Hidden Card Engine
- Face-Slap / Regret Potential
- Tone Target
- Forbidden Drift
`;

const s2_lock = `
==================================================
STAGE 02 EXTRA LOCK — SOCIAL WORLD BIBLE
==================================================
Build a SOCIAL WORLD BIBLE, not a survival world bible.

The world must explain how status, reputation, public pressure, money, family power, school hierarchy, corporate systems, media, and evidence work.

For this story, define:

1. Public Arenas:
Where can humiliation / face-slap happen?
Examples:
office lobby, boardroom, family banquet, classroom, mall, group chat, livestream, court, restaurant, engagement party, shareholder meeting.

2. Status Rules:
What gives people power in this world?
Examples:
family name, money, black card, job title, inheritance, beauty, grades, social media support, company shares, school popularity, original plot role.

3. Proof System:
What counts as undeniable proof?
Examples:
security footage, transaction logs, bank freeze, contract, DNA test, patent, chat record, police report, livestream, shareholder vote, access badge failure.

4. Consequence System:
What happens when someone loses status?
Examples:
public mockery, expulsion, firing, frozen account, family rejection, cancelled engagement, police investigation, online backlash, loss of investors.

5. Trope-Specific Rules:
Adapt the world to the selected niche:
- CEO: board, HR, audit, PR, contracts, shares.
- Campus: class group, mall, rumors, livestream, school office.
- Family regret: inheritance, elders, DNA, family banquet.
- Rebirth: past-life knowledge and prevention.
- Transmigration: original plot logic and plot correction.
- Time-loop: repeated day rules, memory rules, cost of changes.

6. Tone Boundary:
The world may be dramatic, but it must not become generic dark thriller unless the raw idea requires it.
Focus on social consequences, proof, status, regret, and public reversals.

Do NOT add fantasy, monsters, dungeons, military survival, kingdom-building, or base-building unless present in the raw idea.
`;

const s3_lock = `
==================================================
STAGE 03 EXTRA LOCK — DRAMA PROGRESSION LADDER
==================================================
Build a progression ladder for drama / regret / face-slapping stories.

Do NOT use survival progression unless the raw idea requires it.

The progression must track:

1. Hero Control Growth:
How the hero moves from being underestimated to controlling the situation.

2. Hidden Card Ladder:
Small card → medium card → major card → final checkmate.

3. Face-Slap Ladder:
Private refusal → small public embarrassment → evidence reveal → financial/legal/status reversal → final public checkmate.

4. Regret / Panic Ladder:
Enemy arrogance → irritation → denial → anxiety → jealousy → panic → desperation → regret → collapse.

5. Status Ladder:
How the hero’s public status changes after each major event.

6. Consequence Ladder:
Every victory must create a new problem, cost, risk, or enemy reaction.

For each progression step, include:

- Step number
- What changes
- Hero action
- Enemy false belief
- Hidden card status
- Proof / evidence involved
- Public reaction
- Regret / panic shift
- Status shift
- Cost or new problem
- What must NOT be revealed yet

If the story is time-loop / moral regret:
Track emotional cost instead of money/status only:
- what the hero changes;
- who pays the price;
- what only the hero remembers;
- what reality damage appears;
- what moral line gets crossed.
`;

const s4_lock = `
==================================================
STAGE 04 EXTRA LOCK — CHARACTER SOCIAL MAP
==================================================
For every major character, define their public mask, private motive, and collapse path.

Each character profile must include:

1. Role:
Hero, main enemy, white lotus, fake rich, true heir, ex, family member, friend, rival, ally, witness, crowd leader.

2. Public Mask:
How this person looks in front of others.
Examples:
kind girlfriend, generous young master, loyal friend, innocent victim, perfect son, respected manager.

3. Private Motive:
What they really want.
Examples:
money, status, control, attention, safety, revenge, love, validation, avoiding shame.

4. Why They Underestimate the Hero:
Be specific.
Do they think the hero is poor, weak, emotional, replaceable, socially isolated, dependent, or ignorant?

5. Manipulation Style:
How they attack.
Examples:
public pity, fake tears, soft insults, group pressure, fake generosity, moral kidnapping, online rumors.

6. Regret Trigger:
What first makes them doubt their superiority?

7. Panic Trigger:
What makes them lose control?

8. Face-Slap Exposure:
Where and how they will be exposed.

9. Final Collapse:
What they lose by the end:
money, family, love, reputation, job, freedom, social status, future.

10. Relationship to Hero:
What the hero wanted from them at first, and what he learns by the end.

For the hero, include:

- First-person voice style
- Internal wound
- Main fear
- Main temptation
- Moral boundary
- Cold reply style
- What he must never do unless the plan requires it
`;

const s5_lock = `
==================================================
STAGE 05 EXTRA LOCK — MACRO OUTLINE DRAMA RECAP STRUCTURE
==================================================
The 9-part outline must be built for drama recap, not survival progression.

Each part must include a clear dopamine function:
undervaluation → arrogance → hidden preparation → proof → face-slap → regret/panic → status shift → next trap.

For every part, include these additional fields:

1. POV Mode:
Confirm how this part should be narrated.
Default: first-person dominant from hero POV.

2. Public Arena:
Where does the main pressure happen?
Examples:
classroom, office, mall, banquet, boardroom, family home, livestream, group chat, police station.

3. Enemy False Belief:
What wrong belief drives the enemy’s arrogance in this part?

4. Hidden Card Status:
Hidden / hinted / activated / revealed / protected for later.

5. Main Proof:
What concrete proof or system consequence appears?
Examples:
card decline, footage, contract, recording, audit, police report, post, shareholder vote.

6. Face-Slap Type:
Micro / social / financial / legal / romantic / family / status / moral / final checkmate.

7. Regret / Panic Stage:
Where is each enemy emotionally in this part?
Do not make them regret too early.

8. Status Shift:
Who rises, who falls, and who changes sides?

9. Crowd Reaction:
How the public, class, family, office, media, or witnesses react.

10. Cost / Consequence:
What new problem appears because of the hero’s win?

11. Anti-AI Tone Warning:
What must be avoided in this part?
Examples:
avoid dark thriller language, avoid long monologues, avoid "everyone gasped", avoid third-person drift.

12. Forbidden Early Reveal:
What must not be revealed yet?

13. Part Ending:
End with a concrete cliffhanger, not philosophy.

Do NOT make the outline generic.
Every part must have a different type of pressure and a different type of face-slap or regret movement.
`;

const s6_lock = `
==================================================
STAGE 06 EXTRA LOCK — SCENE CARDS WITH POV LENS
==================================================
Every scene card must prepare the final writer for FIRST-PERSON DRAMA RECAP.

For each scene, include these fields:

1. Scene Number / Scene Title

2. Location

3. Characters Present

4. POV Lens:
Write how the scene should be narrated.
Default:
First-person from hero POV.

Use phrasing like:
- I saw...
- I knew...
- I let him talk...
- I had already prepared...
- I remembered this from my past life...
- I didn't correct them yet...

If the hero is absent, mark:
Short third-person cutaway allowed.
Return to first-person immediately after.

5. Scene Purpose:
What this scene must accomplish.

6. Enemy Arrogance Peak:
What the enemy does or says to overcommit publicly.

7. Hero’s Internal Sarcastic Angle:
What the hero privately understands or mocks.

8. Concrete Proof / System Consequence:
What fact, document, card, video, transaction, rule, or public result drives the scene.

9. Face-Slap Mechanics:
- false belief;
- public arena;
- proof;
- visible reaction;
- consequence.

10. Hidden Card Status:
Hidden / hinted / activated / revealed / protected.

11. Regret / Panic Movement:
What emotional stage changes in this scene.

12. Public / Crowd Reaction:
Concrete behavior, not "everyone was shocked."

13. Micro-Punchline Ending:
How the scene ends with a sharp beat.

14. Forbidden Replacements:
What Stage 7 must not change.

15. Forbidden Tone:
What style must not appear.
Examples:
no dark thriller metaphors, no horror language, no long philosophy, no third-person cinematic narration.

Important:
Do NOT write scene cards as full prose.
Do NOT write final script.
Do NOT make the scene card so vague that Stage 7 has to invent the proof or face-slap.
`;

const s7_lock = `
==================================================
STAGE 07 EXTRA LOCK — FINAL WRITING POV / TONE / ANTI-AI
==================================================
The final script must be written in ENGLISH.

The main narration must be FIRST-PERSON DOMINANT.

Write as if the hero is telling the story directly:
- I saw...
- I knew...
- I let them talk...
- I had already prepared...
- In my past life...
- In the original plot...
- This idiot still thought...

Do NOT write the main story in third person.
Do NOT write:
- Haruto walked...
- Kai thought...
- Shen Yi smiled...
- Lu Yan stared...

Write:
- I walked...
- I thought...
- I smiled...
- I watched him panic...

Third-person cutaways are allowed only if Scene Cards allow them and only for:
- enemy reaction;
- public/media reaction;
- consequences outside hero’s view.

After a cutaway, return immediately to first-person narration.

Tone:
fast Chinese/Korean drama recap.
Simple, sarcastic, sharp, direct, emotionally clear.

Do NOT write like dark psychological thriller unless required.

Avoid excessive words:
absolute, terrifying, brutal, massive, violently, freezing, glacial, dark, predator, prey, monster, nightmare, merciless, dead silence, cold smile, smirk.

Avoid generic AI phrases:
- little did he know
- everything changed forever
- this was only the beginning
- not X, but Y
- as if the world stopped
- a storm was brewing
- his smile didn’t reach his eyes
- the mask finally cracked
- everyone gasped
- color drained from his face
- jaw dropped

Replace generic drama with concrete action:
- card declined;
- screen changed;
- contract appeared;
- badge flashed red;
- phone buzzed;
- group chat exploded;
- security stepped forward;
- reporters lifted microphones;
- mother deleted the post;
- class stopped laughing.

Paragraphs:
Usually 80–180 characters with spaces.
Shorter allowed for impact.
No huge blocks.

Face-slap must be concrete:
It needs false belief, public arena, proof, visible reaction, and consequence.

Avatar:
Use only if Scene Cards require it.
Format: [Avatar]:
Length: 120–220 characters.
Speak directly to viewers.
Short, sharp, not a lecture.

After the script, add SCENARIO MEMORY UPDATE with:
1. Written Part
2. Events completed
3. Hidden cards revealed / hinted / protected
4. Face-slaps executed
5. Regret / panic changes
6. Status changes
7. New proof / legal / financial / social consequences
8. Open hooks for next part
9. Forbidden for next part
`;

const allow_no_improv = `
==================================================
DO NOT LET THE WRITER IMPROVISE THE STORY
==================================================
The writer may improve:
- pacing;
- sarcasm;
- paragraph rhythm;
- emotional sharpness;
- micro-reactions;
- public reaction;
- punchlines.

The writer may NOT change:
- canon;
- scene order;
- hidden card timing;
- who knows what;
- face-slap outcome;
- regret stage;
- character names;
- cliffhanger;
- final consequence.
`;

function injectBeforeEnd(content, stage, textToInsert) {
    const startStr = `export const STAGE${stage}_PROMPT_ROMANTIC =`;
    const endStr = '`;';
    let idx = content.indexOf(startStr);
    if (idx === -1) return content;
    
    let nextEndIdx = content.indexOf(endStr, idx + startStr.length);
    if (nextEndIdx !== -1) {
        return content.slice(0, nextEndIdx) + "\n" + textToInsert + "\n" + content.slice(nextEndIdx);
    }
    return content;
}

content = injectBeforeEnd(content, 1, s1_lock);
content = injectBeforeEnd(content, 2, s2_lock);
content = injectBeforeEnd(content, 3, s3_lock);
content = injectBeforeEnd(content, 4, s4_lock);

content = injectBeforeEnd(content, 5, s5_lock + "\n" + allow_no_improv);
content = injectBeforeEnd(content, 6, s6_lock + "\n" + allow_no_improv);
content = injectBeforeEnd(content, 7, s7_lock + "\n" + allow_no_improv);

fs.writeFileSync('src/lib/prompts.ts', content);
console.log('Successfully injected all extra locks into stages 1-7 for ROMANTIC.');

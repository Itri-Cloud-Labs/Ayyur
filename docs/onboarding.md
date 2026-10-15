# Onboarding: product spec

> **Frontend note (2026-10-15).** The founder's onboarding brief of 14 October overrides parts of this spec, and the UI follows the brief where they differ: gender is skippable; madhhab is asked, with each madhhab's Asr time shown and a separate Asr choice only for "No preference"; born Muslim or embraced Islam later is asked (optional) on the practice screen; three independent AI and privacy choices (encrypted sync, AI may use profile context, proactive check-ins) are in onboarding, all off by default; Quran translation, Hijri convention with a one-day adjustment, and per-prayer minute fine-tuning are in onboarding as follow-ups on their parent screens; Ayyur's voice has three options; an optional "anything else" note comes last.
>
> After a design critique the flow was merged from 36 screens to 22 definitions (16 to 20 shown, depending on answers). Sign-in sits on the welcome screen as in this spec. Asr, fine-tuning, translation and Hijri are follow-ups on madhhab, method, Quran reading and fasting. Extra prayers and congregation share one screen, sleep times and "how often" share one, and voice and liveliness share one. The notification permission is asked on the reminders screen. Quran, fasting and habit screens only appear when the user's goals touch them, or when no goals were picked; the summary offers to add them. A "Use suggestions for the rest" link appears after the prayer part. In-progress answers are saved on the device so the interview resumes (rule 6); a finished interview starts fresh until there is a profile record. Product should update the spec to match.

Hand-off from Product to the Frontend/UI agent. It defines what onboarding asks, in what order, with what words, and what each answer changes. Layout, illustration, motion and component choices are yours, within `PRODUCT.md` and `DESIGN.md`.

Storage shape, sync and the prayer-time engine belong to the Backend agent. Section 7 lists what you need from them.

## 1. Decisions already made by the founder

- **Full interview upfront.** Every module is set up before the user reaches Home.
- **Sign-in is the first screen**, with continuing without an account as an equal choice.
- **Gender is asked: Male or Female.** No third option, no skip.
- **Birth year is asked**, not an age range.
- **Practice stage is asked** once, skippable, to size the starting plan.
- **Prayer times:** Sunni calculation methods, suggested from location, plus an Asr question. No sect or madhhab question.
- **Forward only.** Onboarding never asks about missed prayers, fasts owed, past sins or habits to quit. It asks what the user wants to do from today.
- **AI consent is not part of onboarding.** It is asked the first time the Ayyur tab is used, where the data actually leaves the device.

## 2. Rules for the whole flow

1. **Ayyur asks, in the first person.** The mascot hosts every screen. This is a playful zone: no worship is happening, so the calm-zone rule does not apply.
2. **One question per screen.** A screen may hold one main question and closely related follow-ups that appear only after the main answer.
3. **Required answers are few:** gender, birth year, and a location (device location or a chosen city). Everything else has a visible "Skip" and a default from section 5.
4. **Every screen has Back.** Going back keeps the answers already given.
5. **Progress is visible** as a moon filling from new to full across the six parts in section 3, not as a step count like "7 of 22".
6. **The flow resumes.** If the app closes mid-interview, it reopens on the same screen with answers intact.
7. **Nothing is final.** Every answer can be changed later in the You tab. Say so once, on the summary screen, not on every screen.
8. **No judgement in either direction.** No answer is praised more than another. "Just starting" and "Steady, want more" get the same warmth.
9. **System permissions come after an explanation.** Show Ayyur's own screen first, then trigger the system prompt from its button. If the user declines, continue without blocking.
10. **Tone of copy:** natural Muslim English, sentence case, short, no em dashes. Copy below is final wording unless marked *(draft)*.

## 3. The flow

Six parts. Screen ids are for reference between agents, not for display.

### Part 0: Arrive

**`welcome`**
- Title: "Assalamu alaykum, I'm Ayyur."
- Body: "I'll help you keep up with your prayers, Quran, fasting and good habits. Let's set things up together."
- Actions: "Sign in or create an account" and "Continue without an account". Equal visual weight. The second is not a ghost link.
- Small print under the actions: "An account lets you back up and sync. Everything works without one."
- If the user signs in and a backup exists, go to `restore` and skip the interview. If no backup exists, continue to `name`.

**`restore`** (signed-in users with a backup only)
- Title: "Welcome back."
- Body: "I found a backup. Enter your passphrase to bring your data to this phone."
- Actions: "Restore my data", "Start fresh instead".
- Wrong or lost passphrase states depend on Backend decisions that are still open. Do not design past the happy path yet.

### Part 1: You

**`name`** (skippable)
- Question: "What should I call you?"
- One text field, first name or nickname. If skipped, Ayyur never uses a name and never substitutes "friend" or "brother/sister".

**`gender`** (required)
- Question: "Are you a brother or a sister?"
- Choices: "Brother" (stores `male`), "Sister" (stores `female`).
- Helper: "This changes a few things, like Jumu'ah reminders and days when prayer isn't due."

**`birth_year`** (required)
- Question: "What year were you born?"
- A year picker, defaulting to no selection. Helper: "I use this to speak to you in the right way."
- A birth year that makes the user under 13: see open decision 8.1.

**`stage`** (skippable)
- Question: "Where are you right now?"
- Choices, single select:
  - "I'm new to Islam"
  - "Just starting to practise"
  - "Coming back after a break"
  - "Practising, but not steady"
  - "Steady, and I want more"
- Helper: "There's no wrong answer. It helps me suggest a starting point that fits."
- The answer is never displayed again as a label, badge or level.

**`intentions`** (skippable)
- Question: "What do you want most from me?"
- Multi-select, then the user marks one as most important:
  - "Pray all five, on time"
  - "Read Quran every day"
  - "Memorise Quran"
  - "Fast more often"
  - "Build good daily habits"
  - "Learn more about my deen"
  - "Get ready for Ramadan"

### Part 2: Prayer

**`location`** (required: one of the two paths)
- Question: "Where are you, so I can get your prayer times right?"
- Actions: "Use my location" (then the system prompt), "Choose a city" (search by city name).
- Helper: "Your location stays on your phone. I only use it to work out prayer times and the qibla."
- If permission is declined, go straight to the city search. Do not ask again.

**`method`** (skippable, default accepted)
- Question: "Your times will follow [suggested method]. Sound right?"
- Shows today's five times as a preview so the user can compare with their local mosque.
- Actions: "Yes, that's right", "Choose another method" (opens the list from Backend).
- Helper: "If your mosque's times are a few minutes different, you can fine-tune each prayer later."

**`asr`** (skippable)
- Question: "Which Asr time do you follow?"
- Choices: "Earlier (Shafi'i, Maliki, Hanbali)", "Later (Hanafi)", "I'm not sure".
- "I'm not sure" picks the default for the user's country and says which one was picked.

**`prayer_focus`** (skippable)
- Question: "Which prayer do you want the most help with?"
- Choices: Fajr, Dhuhr, Asr, Maghrib, Isha, "All of them equally".
- Forward-looking by design. It does not ask which prayers the user currently misses.

**`prayer_place`** (skippable; shown to brothers only)
- Question: "Do you want to keep track of praying in congregation?"
- Choices: "Yes", "Not now".

**`extra_prayers`** (skippable)
- Question: "Any extra prayers you'd like to work on?"
- Multi-select: "Sunnah before and after the five", "Witr", "Duha", "Tahajjud", "None for now".
- Not shown when stage is "I'm new to Islam" or "Just starting to practise". Default for them is none.

**`prayer_reminders`** (skippable)
- Question: "How should I remind you to pray?"
- For all five at once, with per-prayer control left to settings:
  - When: "At the time", "10 minutes before", "Both", "Don't remind me"
  - Sound: "Adhan", "A soft chime", "Silent"
- Brothers also see a switch: "Remind me for Jumu'ah" (on by default). Sisters see the same switch, off by default.

### Part 3: Quran

**`quran_reading`** (skippable)
- Question: "How comfortable are you reading Arabic?"
- Choices: "I read it easily", "I read slowly", "I can't read it yet".

**`quran_goals`** (skippable)
- Question: "What would you like to do with the Quran?"
- Multi-select: "Read regularly", "Memorise", "Revise what I know", "Understand the meaning".

**`quran_amount`** (shown if "Read regularly" was picked)
- Question: "How much would you like to read each day?"
- Choices: "A few ayat", "One page", "Two pages", "Four pages (a quarter juz)", "One juz", "By time: 5, 10, 20 or 30 minutes".
- The suggested choice is pre-highlighted from the stage (section 4).

**`quran_known`** (shown if "Memorise" or "Revise what I know" was picked)
- Question: "What do you already know by heart?"
- Choices: "Nothing yet", "A few short surahs", "Most of Juz Amma", "Several juz", "The whole Quran".
- This sets a starting point only. Exact surahs are chosen later inside the Quran tab.

**`quran_time`** (skippable)
- Question: "When suits you best for Quran?"
- Choices: "After Fajr", "During the day", "After Maghrib", "Before sleep", "No fixed time".

### Part 4: Fasting and habits

**`fasting`** (skippable)
- Question: "Would you like to work towards any voluntary fasts?"
- Multi-select: "Mondays and Thursdays", "The white days (13th, 14th, 15th)", "Arafah and Ashura", "Six days of Shawwal", "None for now".
- Follow-up switch after any pick: "Remind me the evening before".

**`habits`** (skippable)
- Question: "Pick a few good habits to start with."
- Multi-select with a soft cap of three. Picking a fourth shows: "Three is a good start. You can add more any time." and still allows it.
- Options: "Morning adhkar", "Evening adhkar", "Adhkar after prayer", "Istighfar", "Salawat on the Prophet ﷺ", "Daily dua", "Surah al-Kahf on Fridays", "Give sadaqa", "Call or visit family", "Learn something about my deen", "Sleep early", "Something of my own" (free text).

### Part 5: Your day and how Ayyur behaves

**`rhythm`** (skippable)
- Question: "When do you usually sleep and wake up?"
- Two time pickers. Helper: "I'll keep quiet between these, except for Fajr if you want it."
- Follow-up switch: "Let the Fajr reminder through" (on by default).

**`nudges`** (skippable)
- Question: "How often do you want to hear from me?"
- Choices: "Only prayer times", "A little" (prayers, plus one daily check-in), "Keep me on track" (prayers, each goal's reminder, streak encouragement).
- Then `notifications_permission`: Ayyur's explanation screen, then the system prompt. Skip this screen entirely if the user chose "Don't remind me" and "Only prayer times" together.

**`feel`** (skippable)
- Question: "How lively should I be?"
- Three switches, all on by default: "Sounds", "Haptics", "Celebrations when you reach a milestone".
- Motion is not asked. It follows the system's reduce-motion setting.

**`voice`** (skippable)
- Question: "How should I talk to you?"
- Choices: "Cheerful", "Calm and brief".
- Applies to Ayyur's interface copy now and to the companion later.

### Part 6: Your plan

**`summary`**
- Title: "Here's your plan, [name]." (No name: "Here's your plan.")
- Shows what was set, grouped by module, each line tappable to change it: prayer times and method, reminders, Quran goal, fasts, habits.
- Body: "You can change any of this later in You."
- Primary action: "Start with Ayyur". This is the one celebration moment in onboarding: the moon is full and Ayyur is joyful.
- Lands on Home.

## 4. What the answers change

| Answer | Effect |
| --- | --- |
| `name` | Used in greetings and the summary. Never in notifications on the lock screen. |
| `gender = female` | Turns on **excused days** (section 6). Jumu'ah reminder off by default. `prayer_place` is not asked. |
| `gender = male` | Jumu'ah reminder on by default. `prayer_place` is asked. |
| `birth_year` | Under 18: the companion uses simpler wording and stricter content handling (details belong to the AI consent spec, not written yet). No other feature is locked by age at 13 and over. |
| `stage` | Sets suggested amounts, never limits. New or just starting: suggest "A few ayat", no extra prayers, one habit pre-picked ("Adhkar after prayer"), and short explanations of terms on first appearance. Coming back or not steady: "One page", up to two habits suggested. Steady: "Two pages", `extra_prayers` shown with nothing pre-picked. |
| `intentions` | The most important one decides which module sits directly under the next prayer on Home, and which module Ayyur mentions first in check-ins. Home always leads with the next prayer regardless. |
| `location`, `method`, `asr` | Prayer times, qibla, Hijri date convention, fasting times. |
| `prayer_focus` | That prayer gets an earlier reminder by default and is the one Ayyur encourages by name. |
| `extra_prayers` | Adds those prayers to the prayer log as optional rows. They never count against a streak. |
| `quran_reading = can't read yet` | Quran goals default to "Understand the meaning" and listening. Depends on translation and audio sources, which are an open licensing decision. Until then, tell the user plainly what is available. |
| `quran_amount`, `quran_time` | The daily reading goal and its reminder time. |
| `quran_known` | Starting size of the revision plan. |
| `fasting` | Those fasts appear on Home on their days, with the evening-before reminder if chosen. |
| `habits` | The starting habit list in the Habits tab. |
| `rhythm` | Quiet hours for every notification. |
| `nudges` | Which notification categories are on. |
| `feel`, `voice` | Sound, haptics, celebrations, and the copy variant Ayyur uses. |

## 5. Defaults when a question is skipped

| Question | Default |
| --- | --- |
| `name` | No name used |
| `stage` | Treated as "Practising, but not steady" |
| `intentions` | "Pray all five, on time" as most important |
| `method` | The suggested method for the location |
| `asr` | The default for the user's country |
| `prayer_focus` | "All of them equally" |
| `prayer_place` | Not tracked |
| `extra_prayers` | None |
| `prayer_reminders` | "At the time", soft chime |
| `quran_reading` | "I read slowly" |
| `quran_goals` | None set; the Quran tab asks again on first open |
| `quran_time` | No fixed time, no reminder |
| `fasting` | None |
| `habits` | None; the Habits tab shows its own empty state |
| `rhythm` | Quiet from 22:00 to one hour before Fajr, Fajr reminder allowed |
| `nudges` | "A little" |
| `feel` | All on |
| `voice` | "Cheerful" |

## 6. Excused days (new state, needs UI and Backend work)

For sisters, a day or a single prayer can be marked **"Not due"**. This is a fifth occurrence state beside completed, frozen, pending and unrecorded.

- It is the user's own mark. Ayyur never predicts, schedules or asks about a cycle, and stores no cycle data.
- A "Not due" prayer or fast does not break a streak, does not use a freeze, and does not count as a completion.
- It must look different from both completed and frozen, and carry the words "Not due".
- Onboarding only mentions it in the `gender` helper line. The control itself lives where prayers and fasts are logged.
- `DESIGN.md` has four status marks today. The UI agent needs to design the fifth. `PRODUCT.md` principle 3 will be updated by Product once the founder confirms the wording "Not due".

## 7. Needed from the Backend agent

- A local profile record holding every key in section 4, plus `onboarding_completed_at` and the id of the last screen reached (for resume).
- City search that works offline, or a clear decision that it needs a connection.
- The list of Sunni calculation methods, the country-to-method suggestion, the country default for Asr, and the high-latitude rule. Product has not verified any angles or regional conventions; these must be checked against the issuing authorities before shipping.
- The Hijri date convention per country (needed for the white days, Arafah and Ashura).
- The restore path: whether a backup exists after sign-in, and the passphrase flow.

## 8. Open decisions for the founder

1. **Under 13.** The app is for 13 and over, but a birth year can say otherwise. Options: block the app with a kind message; or allow local use with no account and no companion. Not decided. Until it is, the UI should treat `birth_year` as accepted for any value and add no under-13 branch.
2. **Required answers.** This spec requires gender, birth year and location only. The founder asked for more parameters overall; whether more of them should be mandatory is not settled.
3. **"Not due" wording** for excused days, and whether the state should be offered to all sisters automatically (as written here) or only after a question.
4. **A habit to leave.** Left out of onboarding under the forward-only rule. The vision mentions helping users move away from harmful habits, so it needs a home somewhere, probably inside the Habits tab.
5. **"I can't read Arabic yet"** promises translation and listening that depend on unlicensed sources. Either the option waits, or its result is limited at launch.

## 9. Out of scope here

- The AI consent screen and what context the companion may read.
- Passphrase creation and recovery.
- Per-prayer minute adjustments, per-prayer reminder settings and manual Hijri offset. These live in You.
- Ramadan-specific setup, which should be its own short flow when Ramadan approaches.
- Family or shared features.

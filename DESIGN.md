---
name: Ayyur
description: A playful, moonlit Islamic companion. Night sky, one bright moon, a colour for every act of worship.
colors:
  night: "#090e1f"
  night-surface: "#141b2e"
  night-raised: "#202941"
  night-line: "#333c55"
  night-ink: "#f0f3fc"
  night-ink-muted: "#b5bed2"
  night-ink-subtle: "#8f98af"
  day: "#ffffff"
  day-surface: "#f1f3f9"
  day-raised: "#e4e8f0"
  day-line: "#ccd1dd"
  day-ink: "#131a2d"
  day-ink-muted: "#444d63"
  day-ink-subtle: "#5b6378"
  on-color: "#090e1f"
  moon: "#fdce3e"
  moon-deep: "#c19900"
  prayer: "#7fb3ff"
  prayer-deep: "#4c7dc6"
  quran: "#5ee38b"
  quran-deep: "#20aa5b"
  fasting: "#ffa05c"
  fasting-deep: "#c66b1d"
  habits: "#c99cfc"
  habits-deep: "#9369bf"
  tasks: "#50dfe6"
  tasks-deep: "#00a6ad"
  frozen: "#bfe9fb"
  frozen-deep: "#8bb2c2"
  danger: "#ff645f"
  danger-deep: "#be2e31"
typography:
  hero:
    fontFamily: "Rubik_800ExtraBold"
    fontSize: "44px"
    fontWeight: 800
    lineHeight: "48px"
    letterSpacing: "-0.02em"
  display:
    fontFamily: "Rubik_800ExtraBold"
    fontSize: "32px"
    fontWeight: 800
    lineHeight: "38px"
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Rubik_700Bold"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "30px"
  title:
    fontFamily: "Rubik_700Bold"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: "26px"
  body:
    fontFamily: "Rubik_400Regular"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: "24px"
  label:
    fontFamily: "Rubik_500Medium"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: "20px"
  caption:
    fontFamily: "Rubik_500Medium"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "18px"
rounded:
  control: "16px"
  card: "16px"
  sheet: "20px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  screen: "24px"
components:
  button-primary:
    backgroundColor: "{colors.moon}"
    textColor: "{colors.on-color}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    padding: "14px 24px"
    height: "56px"
  button-secondary:
    backgroundColor: "{colors.night-raised}"
    textColor: "{colors.night-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    padding: "14px 24px"
    height: "56px"
  button-disabled:
    backgroundColor: "{colors.night-raised}"
    textColor: "{colors.night-ink-subtle}"
    rounded: "{rounded.control}"
    height: "56px"
  card:
    backgroundColor: "{colors.night-surface}"
    textColor: "{colors.night-ink}"
    rounded: "{rounded.card}"
    padding: "16px"
  chip:
    backgroundColor: "{colors.night-raised}"
    textColor: "{colors.night-ink-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  input:
    backgroundColor: "{colors.night-surface}"
    textColor: "{colors.night-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "14px 16px"
    height: "56px"
  tab-bar:
    backgroundColor: "{colors.night-surface}"
    textColor: "{colors.night-ink-subtle}"
    typography: "{typography.caption}"
    rounded: "{rounded.sheet}"
    height: "70px"
---

# Design System: Ayyur

## 1. Overview

**Creative North Star: "The Bright Moon on a Clear Night"**

Ayyur is used in the dark more than most apps: before Fajr, after Isha, in bed with the Quran. The system is built for that scene. The screen is a deep, slightly blue night, and one bright, friendly moon sits in it. Every act of worship has its own clear colour, the way stars differ in colour when the sky is dark enough to see them. Night is the home theme and the one that appears in screenshots; a day theme exists for people whose phone is set to light, and the app follows the system setting.

The physical feel is soft and chunky. Controls are thick, rounded and raised on a solid lip that sinks when pressed. Illustration is flat vector with bold fills and no outlines. Motion is lively: springy presses, an animated mascot, real celebration at milestones, with sound and haptics. All of that energy belongs to progress and encouragement. Worship screens (the Quran reader, adhkar, a prayer in progress) are a calm zone: no mascot, no counters, no celebration, one module colour used quietly, and generous type.

This system rejects cluttered legacy apps with ads, dense menus, stock mosque photos and green-and-gold gradients. It rejects looking like a kids' app, a generic AI chatbot with purple gradients and sparkle icons, and anything solemn and heavy with ornate dark luxury. It also rejects guilt: no flames, no loss warnings, no sad mascot.

**Key Characteristics:**
- Night-first: deep blue-black canvas, bright flat colour on top.
- One moon: Moonlight Gold belongs to Ayyur, streaks and the primary action.
- A colour per module: prayer, Quran, fasting, habits and tasks are recognisable at a glance.
- Soft and chunky: 16px corners, 4px lips, 56px controls, no blurred shadows.
- Two tempos: playful for progress, still for worship.
- Heritage as accent: the khatam star, the Tifinagh wordmark and an Amazigh weave, used sparingly.

**Layout and motion.** Screens use a 24px side margin and a 4px spacing grid. Lists are rows on the canvas, separated by space, not stacks of cards. Touch targets are at least 48px. Standard transitions run 150 to 250ms with an ease-out-quart curve; presses use a short spring with no overshoot beyond the lip's travel. Celebrations may run up to 1.2s and are always skippable by tap. With reduce-motion on, every animation becomes a crossfade and the mascot holds a still pose.

## 2. Colors

A dark blue night, one gold moon, and five module colours of equal brightness so none outranks another.

### Primary
- **Moonlight Gold** (`moon`): Ayyur the mascot, the Mega-Streak, completed states, and the single primary action on a screen. Text on it is always Night (`on-color`), never white.
- **Eclipse Gold** (`moon-deep`): the lip under gold controls. It never carries text.

### Secondary
The module colours. Each owns one module's icon, progress and accents, and nothing else.
- **Fajr Blue** (`prayer`): the five daily prayers and voluntary prayers.
- **Mushaf Green** (`quran`): reading, memorisation and revision.
- **Iftar Orange** (`fasting`): Ramadan and voluntary fasts.
- **Dusk Violet** (`habits`): habits and reflection.
- **Zellige Teal** (`tasks`): Islamic tasks and reminders.

Each has a `-deep` lip. In code each also has a themed `soft` tint for surfaces and a themed `text` shade for coloured text on the canvas.

### Tertiary
- **Frost** (`frozen`): a frozen occurrence. Pale on purpose, so a freeze can never be mistaken for a completion. Always paired with the snow-star icon and the word "Frozen".
- **Ember Red** (`danger`): destructive actions and real errors only. It is forbidden on missed or unrecorded worship.

### Neutral
- **Night** (`night`): the canvas in the home theme, and the colour of all text placed on a bright fill.
- **Night Surface** (`night-surface`): grouped rows, the tab bar, inputs.
- **Night Raised** (`night-raised`): secondary buttons, chips, the unlit part of a moon phase.
- **Night Line** (`night-line`): dividers and control outlines.
- **Starlight** (`night-ink`), **Haze** (`night-ink-muted`), **Mist** (`night-ink-subtle`): primary, secondary and tertiary text. Mist is the floor; nothing lighter carries text.
- **Day** set (`day`, `day-surface`, `day-raised`, `day-line`, `day-ink`, `day-ink-muted`, `day-ink-subtle`): the light theme's equivalents. Day canvas is pure white.

### Named Rules
**The One Moon Rule.** Moonlight Gold is for Ayyur, streaks, completion and the one primary action. It is never a module colour, never a background wash, never decoration.

**The Module Owns Its Colour Rule.** A module colour appears only on that module's own content. Fajr Blue on a fasting screen is a bug.

**The Night Ink Rule.** Text on any bright fill is Night. White text on a module colour fails contrast and is prohibited.

**The No Red for Worship Rule.** A missed or unrecorded prayer, fast or reading is shown in neutral Mist with an outline shape. Red, warning icons and strikethroughs are forbidden there.

## 3. Typography

**Display Font:** Rubik ExtraBold (with system sans fallback)
**Body Font:** Rubik Regular and Medium (with system sans fallback)
**Label/Mono Font:** none; labels use Rubik Medium

**Character:** One family carries everything. Rubik's softly rounded corners match the chunky controls, its heavy weights give big numbers real presence, and it covers Arabic script, so a right-to-left interface can be added later without a second brand typeface. Weight is selected by family name (`font-body`, `font-medium`, `font-heading`, `font-display`), never by `font-bold`, because static font files ignore weight on Android.

### Hierarchy
- **Hero** (ExtraBold 800, 44/48, -0.02em): the next-prayer countdown and milestone numbers. One per screen at most.
- **Display** (ExtraBold 800, 32/38, -0.01em): screen titles and celebration headlines.
- **Headline** (Bold 700, 24/30): section titles, sheet titles.
- **Title** (Bold 700, 20/26): row titles, button labels.
- **Body** (Regular 400, 17/24): explanations, companion messages. Lines cap at about 65 characters.
- **Label** (Medium 500, 15/20): chips, secondary row text, tab labels at large sizes.
- **Caption** (Medium 500, 13/18): timestamps, helper text. Never below 13px.

### Named Rules
**The Sentence Case Rule.** Buttons, titles and labels are sentence case. Uppercase is reserved for badge names of four words or fewer.

**The Quran Is Not UI Rule.** Quran text is set in an Uthmani, Madinah-style face (KFGQPC Uthmanic Hafs or an equivalent with confirmed licensing), at 28px or larger with a line height of at least 2. It is never set in Rubik, never bold, never coloured with a module colour, and never truncated. The exact font file is still to be chosen along with the Quran data source.

**The Calligraphy Is Art Rule.** Calligraphic Arabic (Bismillah, surah name plates, milestone titles) is drawn artwork, placed as an image with an accessible label. It is never used for text the user must read to operate the app.

## 4. Elevation

Ayyur has no blurred shadows. Depth comes from two things: tonal steps (Night, Night Surface, Night Raised, each one step lighter) and the lip.

The lip is a solid 4px band of the control's `-deep` colour along its bottom edge. Pressing a control moves it down 4px and collapses the lip to nothing, so the press is physical and readable without any blur. Neutral controls use Night Line as their lip.

### Shadow Vocabulary
- **Lip** (`border-bottom: 4px solid <deep>`): every pressable, filled control at rest.
- **Pressed** (`translateY(4px)`, lip 0): the same control while held.
- **Flat**: rows, text, the tab bar and everything in a worship screen.

### Named Rules
**The No Blur Rule.** `box-shadow` with a blur radius, glows around cards and glass effects are prohibited. The only glow in the product is flat: concentric discs of Night Surface and Night Raised behind the moon.

**The Lip Means Pressable Rule.** If it has a lip, it responds to a tap. Static surfaces never get one.

## 5. Components

### Buttons
Thick, friendly, obviously pressable.
- **Shape:** softly rounded (16px), 56px tall, full width in forms and sheets.
- **Primary:** Moonlight Gold fill, Night label in Title type, Eclipse Gold lip. One per screen. Inside a module, the primary action takes that module's colour and its `-deep` lip instead.
- **Secondary:** Night Raised fill, Starlight label, Night Line lip.
- **Ghost:** no fill or lip, label in the module's `text` shade; for low-emphasis actions such as "Not now".
- **Pressed:** moves down 4px, lip collapses, light haptic. **Focus:** 3px Starlight outline with 2px offset. **Disabled:** Night Raised fill, Mist label, no lip. **Loading:** label swaps for three pulsing dots; width does not change.
- Labels are verb plus object: "Log Fajr", "Freeze this fast", "Start reading".

### Chips
- **Style:** full pill, Night Raised fill, Haze label in Label type, 6px by 12px padding. In onboarding, chips are 56px tall with Body-type labels.
- **Selected:** the module's `soft` tint as fill, its `text` shade for label and icon. Selection also shows a check icon, never colour alone.

### Choices
- **Option rows** (`OptionList`): rows at least 72px tall on Night Surface with a 2px transparent outline, labels in Title type. Selected rows take the module's `soft` fill and full-colour outline, and the mark on the right fills with a Night check: a round mark for one answer, a rounded square for several.
- **Segmented control:** a Night Surface track holding equal pills at least 60px tall, labels in Body type; the selected pill is the module's bright fill with Night text. For small ordered sets only (when, how loud).
- **Tiles:** two large choices stacked, for the few moments where two or three paths carry equal weight (account or local, device location or city search, brother or sister). They grow to share the height they are given; titles in Display-weight Headline type. Night Surface with a Night Line outline; selected like option rows.
- **Switch rows:** the whole row is the switch, at least 76px tall with a Title-type title. With a long explanation, the stacked layout puts title and switch on one line and the explanation below at full width. Track 52 by 32px, Night Raised off and module colour on, with a Night thumb.
- **Steppers:** 48px round minus and plus buttons on Night Raised around a value in Display or Title type; one adjustable control for screen readers.

### Cards / Containers
Used rarely. Lists are plain rows on the canvas.
- **Corner Style:** softly rounded (16px).
- **Background:** Night Surface. A module's featured card may use that module's `soft` tint.
- **Shadow Strategy:** flat. No lip unless the whole card is one tap target.
- **Border:** none. Never a coloured stripe on one side.
- **Internal Padding:** 16px. Cards are never nested.

### Inputs / Fields
- **Style:** Night Surface fill, 2px Night Line outline, 16px corners, 56px tall, Body type. Label sits above the field in Label type.
- **Focus:** outline becomes the module colour, or Moonlight Gold outside a module.
- **Error:** outline becomes Ember Red with a short message below in the `danger` text shade, starting with what to do.
- **Disabled:** Night Raised fill, Mist text.

### Navigation
- **Tab bar:** a floating bar, inset 16px from the screen edges and sitting above the safe area. Night Surface with a 1px Night Line outline and 20px corners, at least 70px tall, capped at 480px wide on tablets. It is flat: no blur, no shadow, no lip. Five tabs in this order: Home, Quran, Ayyur, Habits, You.
- **Tabs:** a 24px Phosphor Fill icon over a Caption label. Inactive tabs are Mist. The active tab's icon and label take the moon `text` shade, the label goes Bold, and a moon `soft` pill (56 by 32px) sits behind the icon, so the state is never colour alone.
- **Ayyur tab:** a 60px moon in the centre, raised 22px above the bar's top edge on an Eclipse Gold lip, and it sinks onto the lip when pressed. It is a plain moon while another tab is open and shows its face when the companion is open.
- **Motion:** the pill fades and widens in over 200ms; changing tab gives a light haptic. The bar slides off the bottom edge when the keyboard opens and on any screen that calls `useHideTabBar()`. Worship screens must call it.
- **Icons:** one filled, rounded set everywhere: Phosphor Fill (`phosphor-react-native`).
- **Headers:** Display title aligned left, no bar background, actions as 48px icon buttons.

### Status marks
The four occurrence states, each distinct in shape as well as colour.
- **Completed:** a filled disc in the module colour with a Night check.
- **Frozen:** a Frost disc with the snow-star. Labelled "Frozen".
- **Pending:** a 2px Night Line ring, empty.
- **Unrecorded or missed:** a 2px dashed Mist ring. No red, no cross.

### Streak moon
The streak symbol is the moon's phase, never a flame. Phase assets run from new to full in five steps (`assets/brand/phases`); the lit part is Moonlight Gold and the rest is Night Raised. A frozen day adds a dotted Frost ring around the moon. The Mega-Streak number sits beside it in Hero or Display type.

### Ayyur, the mascot
A flat gold moon with craters, two eyes and a mouth. Twelve expressions ship in `assets/brand/mascot`: happy, joyful, wink, gentle, sleepy, thinking, curious, caring, protected, listening, delighted and surprised.
- **Happy** is the default. **Joyful** is for milestones. **Listening** waits for an answer, **delighted** reacts to one, **surprised** is a pleasant surprise, never alarm. **Thinking** shows while the companion is working. **Sleepy** marks quiet hours. **Protected** marks a freeze. **Gentle** and **caring** are for missed days and errors: soft, never sad.
- Ayyur is the companion's avatar in chat and the active icon of the companion tab.
- Ayyur never appears in the Quran reader, adhkar, or a prayer in progress.
- Minimum size 40px. Below that, use the plain moon mark without stars.
- **Live Ayyur** (`src/components/ayyur/live-ayyur.tsx`) stacks a faceless body with separate eye and mouth layers (`assets/brand/live`), so he blinks on an uneven rhythm, glances, tilts his head per expression, hovers, and crossfades between faces with a small lift. Use it wherever he is the host; use the flat PNGs for small or static places. With reduced motion he holds still and only his face changes.
- **Tapping him** gets a reaction (wink, delighted, surprised); many taps in a row make him playfully tired. Never a sad or disappointed face, whatever the user answers.

### Onboarding
Onboarding is one night sky and always renders in the night theme (`NightScope`), whatever the system setting, because the whole flow is a single scene. Ayyur hosts every step from the top, speaking the question himself, with any explanation centred under it in the same block. He takes whatever height the answers leave, from 88 to 150px. Steps with a few large choices (tiles, the year wheel, the constellation) stretch to fill the screen; lists and chips keep their size and sit in the middle of the remaining space; a small moon in the header waxes from new to full as the user goes, and stars come out one by one in the sky behind. The large pose (welcome, completion) adds the flat halo of Night Surface and Night Raised discs. The one celebration is at the end: stars burst out around him, then he drops into the tab bar as Home appears.

### Motifs
- **Khatam star** (eight points): sparkles around the mascot, badge frames, list bullets in celebration screens.
- **Amazigh weave** (`amazigh-weave-tile`): a tileable diamond lattice in Night Raised on Night, for onboarding and milestone backgrounds only, behind no body text.
- **Arches and tilework:** reserved for badge and milestone artwork.

## 6. Do's and Don'ts

### Do:
- **Do** design the night theme first and check every screen in the day theme before it ships.
- **Do** put Night (`on-color`) text on every bright fill; it clears 6:1 on all of them.
- **Do** pair every state with an icon or a word. Completed, frozen, pending and unrecorded must be distinguishable in greyscale.
- **Do** give each screen exactly one primary button.
- **Do** keep worship screens still: no mascot, no streak counters, no confetti, no sound.
- **Do** let sound, haptics and motion be switched off separately, and honour system reduce-motion.
- **Do** write button labels as verb plus object, in natural Muslim English.
- **Do** test layouts at the largest system font size, Quran text included.

### Don't:
- **Don't** build cluttered legacy app screens: ads, dense menus, stock mosque photos, green-and-gold gradients.
- **Don't** make it a kids' app. No extra limbs, props or costumes on Ayyur, no more than two decorative stars beside it outside a celebration, no rainbow screens.
- **Don't** make the companion a generic AI chatbot: no purple gradients, no sparkle icon standing for "AI", no chat box as the whole product.
- **Don't** go solemn and heavy: no ornate dark luxury, gold filigree or lecturing copy.
- **Don't** use a flame for streaks, show a sad or crying Ayyur, or use red on missed worship.
- **Don't** use gradients on fills or text, blurred shadows, glass effects, or a coloured stripe along one side of a card.
- **Don't** round cards beyond 16px or sheets beyond 20px.
- **Don't** use `font-bold` or other weight utilities; pick the family (`font-heading`, `font-display`).
- **Don't** set Quran text in Rubik, colour it, or truncate it.
- **Don't** show a freeze with the completed mark, or imply anywhere that worship was performed when the user has not said so.

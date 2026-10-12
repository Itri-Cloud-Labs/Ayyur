// Ayyur design tokens. DESIGN.md documents what each one is for.
// Themed colours read CSS variables defined in global.css (light by default, night in dark mode).
const themed = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

// Each hue has a bright fill, a darker lip for the pressed edge, a tinted surface and a text shade.
// Fills and lips are the same in both themes; text on a fill is always `on-color`.
const hue = (name, fill, deep) => ({
  DEFAULT: fill,
  deep,
  soft: themed(`${name}-soft`),
  text: themed(`${name}-text`),
});

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvas: themed('canvas'),
        surface: themed('surface'),
        raised: themed('raised'),
        line: themed('line'),
        ink: {
          DEFAULT: themed('ink'),
          muted: themed('ink-muted'),
          subtle: themed('ink-subtle'),
        },
        'on-color': '#090e1f',
        night: {
          DEFAULT: '#090e1f',
          surface: '#141b2e',
          raised: '#202941',
          line: '#333c55',
          ink: '#f0f3fc',
        },
        moon: hue('moon', '#fdce3e', '#c19900'),
        prayer: hue('prayer', '#7fb3ff', '#4c7dc6'),
        quran: hue('quran', '#5ee38b', '#20aa5b'),
        fasting: hue('fasting', '#ffa05c', '#c66b1d'),
        habits: hue('habits', '#c99cfc', '#9369bf'),
        tasks: hue('tasks', '#50dfe6', '#00a6ad'),
        frozen: hue('frozen', '#bfe9fb', '#8bb2c2'),
        danger: hue('danger', '#ff645f', '#be2e31'),
      },
      // Weight is chosen by family: static font files ignore fontWeight on Android.
      fontFamily: {
        body: ['Rubik_400Regular'],
        medium: ['Rubik_500Medium'],
        heading: ['Rubik_700Bold'],
        display: ['Rubik_800ExtraBold'],
      },
      fontSize: {
        caption: ['13px', { lineHeight: '18px' }],
        label: ['15px', { lineHeight: '20px' }],
        body: ['17px', { lineHeight: '24px' }],
        title: ['20px', { lineHeight: '26px' }],
        headline: ['24px', { lineHeight: '30px' }],
        display: ['32px', { lineHeight: '38px' }],
        hero: ['44px', { lineHeight: '48px' }],
      },
      borderRadius: {
        control: '16px',
        card: '16px',
        sheet: '20px',
      },
      borderWidth: {
        lip: '4px',
      },
    },
  },
  plugins: [],
};

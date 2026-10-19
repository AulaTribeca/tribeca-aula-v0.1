# Tribeca Aula | DESIGN.md

> Canonical design and interaction contract for Tribeca Aula and its educational resources.
> This documents the established identity rather than replacing it. Established routes,
> class data, educational content, forms, brand marks, and legal text are protected.

## Brand

- Product: Tribeca Aula, the teaching platform of Tribeca Academia.
- Brand primary: `#103F24` (CSS `--green`); secondary: `#0B2D1A` (`--green-2`).
- Highlight: `#A8872D` (`--gold`); pale highlight: `#E6DBC0`.
- Background: `#F6F4EE` (`--bg`); panels: `#FFFDF8` (`--panel-solid`).
- Body text: `#1F251F` (`--text`); muted: `#686B64` (`--muted`).
- Existing dark/focus/seasonal themes retain their own token overrides.
- Corner radii: `--radius-sm: 12px`, `--radius-md: 17px`, `--radius-lg: 22px`.
  Keep rounded nav buttons where already used; do not introduce arbitrary radii.
- Typography in existing code: Georgia for editorial content and Inter/system sans for controls;
  the accessible reading profile uses Verdana and mathematical glyph overrides. Do not
  require external fonts to render essential controls.
- Preserve `assets/logo-tribeca.png` (header), `assets/tribeca-academia-logo.png`
  (footer), PWA icons, branding proportions, and legal text.

## Design direction

- Functional educational product, not a marketing landing page.
- Visual reading: 5/10 design variance, 2/10 motion, 6/10 density as an overall target.
- Student content is clearer and less dense than teacher management views.
- Headings compact, purposeful, and easy to scan. Prefer short instructional copy over
  ornamental slogans, filler paragraphs, or decorative labels.
- Typography, color, rhythm, radii, and focus styling consistent within each resource unit.
- Restraint is part of the brand: no unrelated gradients, synthetic social proof,
  gratuitous carousels, oversized heroes, or animated decorations.
- Do not restyle learning progress bars as decorative marketing comparisons:
  actual progress indicators are functional and should remain.

## Component principles

1. Use semantic buttons for actions, links for navigation, and associated labels for inputs.
2. Preserve visible keyboard focus, touch targets, assistive status messaging, and
   `prefers-reduced-motion`.
3. Keep functional components, names, navigation labels and ordering; fix visual
   debt without rebuilding working flows.
4. Empty, loading, completed, incorrect, offline and failed states require clear guidance.
5. Inputs on small screens use at least 16px text to avoid unwanted iOS viewport zoom.
6. Never block navigation solely because an optional practice answer is empty.
   Correct answers and full workings remain available as specified by the activity.
7. Mathematical fractions display with numerator above denominator; preserve MathML
   or explicit vertical-fraction structures when embedded.
8. Mobile and tablet layouts must fit without horizontal scroll; maintain usable
   navigation in PWA and regular browsers.
9. Embedded HTML activities must work inside Tribeca Aula, including touch and iOS;
   keep a same-origin, full-screen fallback for materials that need it.
10. Do not modify student profiles, billing, attendance or marks as a design operation.

## Content and pedagogical interaction

- One clear learning objective per exercise or page.
- Readable prompts, concise explanation, explicit feedback, full correction on request.
- Activities and assignments grouped by class, subject, and unit, not one long mixed feed.
- Respect the focus/ADHD mode: restrained motion, fewer distractions, clear progress,
  navigable steps, immediate feedback, no forced long scrolling.
- Retain existing Galician/Spanish/international language options and literal lesson
  material when requested. Brand voice is confident, useful, direct and non-patronising.

## Engineering and QA

- Main route: `/tribeca-aula-v0.1/`; home anchor: `#inicio`. Preserve.
- Shared application: `index.html`, `styles.css`, `profile-ui.css`,
  `app.js`, `supabase-auth.js`.
- v253 visual refinement: `tribeca-ui-preserve-v253.css`, scoped to the
  `body.tribeca-preserve-v253` class; avoid invasive changes to legacy styles.
- v253 label enhancement: `tribeca-ui-accessibility-v253.js`; no form field names,
  submission formats, or state changed.
- Test keyboard, mobile/tablet, touch, reduced motion, themes, iOS/Safari/PWA,
  offline/reload, resource embeds, and teacher/student roles before declaring a
  full release validated.
- Use Vercel Web Interface Guidelines as an accessibility and UX checklist.
- Use Playwright or Playwright CLI for browser tests with representative role
  sessions; do not claim end-to-end success from static validation.
- Preserve route slugs, header nav, form names, anchor IDs, logos, legal copy,
  and stored data unless explicit permission is obtained.
- Before shipping, list every changed URL, anchor, nav label, form field name and
  brand token. Treat any unapproved change as a release blocker.

## Screenshot audit: teacher dashboard v255

Source: authenticated teacher screenshots from 19 Oct 2026.

- Teacher greeting appears at the top of the welcome panel, never vertically centered
  beside a tall list of events.
- Weekly events use compact, readable day groups; never hide a dated event.
- Teacher actions form a four-column desktop / three-column compact desktop /
  two-column tablet / one-column narrow phone grid with clear keyboard focus.
- Distinguish classes by their stored `--class-primary` and `--class-soft` values.
  For dashboard cards, use a pale tinted surface and a high-contrast dark heading
  rather than dark text on a saturated, dark classroom gradient.
- Preserve classroom colors in storage, and retain all class metadata and links.
- Empty videoconference panels remain short and expose the existing action.
- Base body content and footer descriptions remain legible at 100% zoom.
- Teacher language consistency is a continuing translation task: do not override
  a manually chosen language just to change the navigation text.
- Student class counters and basic headings follow the saved UI locale;
  educational titles, school names and uploaded resources are not auto-translated.
- Visual modifications live in `tribeca-teacher-refinement-v255.css`; the teacher
  rules do not apply to dark, seasonal or focus-mode themes.
- End-to-end browser verification remains mandatory before a full sign-off,
  including a classroom card click, its assigned subjects and resource loading.

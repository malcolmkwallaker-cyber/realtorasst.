# Plan 6 — Voice Note to Anything (mobile capture)

Implements Roadmap move #6. Do this LAST, after Plans 2-3 are live and used;
it multiplies what exists. Read `CLAUDE.md` first.

## ESCALATION NOTE (read first)

Transcription requires a speech-to-text service. Two acceptable paths, both of
which need owner sign-off per CLAUDE.md escalation rule 3:
1. **Browser-native** (free, no new service): the Web Speech API
   (`webkitSpeechRecognition`) transcribes on-device in Chrome/Safari. Quality is
   adequate for note capture; works offline-ish; zero cost. **Recommended
   default — build this first.**
2. OpenAI Whisper API or Deepgram (paid, better accuracy in a truck cab with
   road noise). Only if path 1 proves too inaccurate in real use.

This plan specifies path 1. Do not add a paid transcription service without the
owner's explicit approval.

## Goal

A mobile page: hold to talk, see the transcript, pick a target ("VA handoff",
"follow-up text", "task list", "just ask"), get the output, copy it. Keyboard
optional end to end.

## Part A — Capture page

**New file:** `nextjs/app/(dashboard)/capture/page.tsx` (client component)

1. A large press-and-hold (or tap-to-toggle) mic button. Use
   `webkitSpeechRecognition` with `continuous: true`, `interimResults: true`,
   `lang: 'en-US'`. Feature-detect; if unsupported, show a Textarea fallback
   with the message "Voice capture needs Chrome or Safari. Type your note
   instead." (complete sentence, house style).
2. Live transcript renders into an editable Textarea (user can fix mistakes
   before generating).
3. A row of target buttons: VA Handoff, Follow-up Text, Task List, Ask.
4. On target click, POST to `/api/assistant` (the existing chat endpoint — no
   new route needed) with a single user message:
   `"Turn this voice note into a <target>: <transcript>"`. For "Ask", send the
   transcript as-is.
5. Render the reply in an `OutputCard` (reuse the existing component; it has
   the copy button).
6. Sidebar entry: `{ href: '/capture', label: 'Capture', icon: Mic }`.

## Part B — Mobile ergonomics

- Buttons min 48px tall; mic button ~96px; the page must work one-handed.
- Test on a phone-width viewport (390px). The existing DashboardLayout handles
  the responsive sidebar; nothing structural needed.

## Why no new API route

The assistant endpoint already has auth, settings-personalized voice, and
max_tokens handling. Prepending an instruction to the transcript is exactly the
short-instruction pattern from `.claude/skills/write-realtor-prompts/`. Adding a
dedicated route would duplicate all of it for zero gain (see how-fable-thinks §2:
maintenance tax).

## Acceptance criteria

1. `npm run build` passes.
2. In Chrome: record a rambling 30-second note, pick "VA Handoff", confirm the
   output addresses Dan with steps and a definition of done, voice-clean.
3. Same note to "Task List": numbered actionable tasks.
4. Firefox (no Web Speech API): typed fallback path works.
5. Run `.claude/skills/ship-check/`.

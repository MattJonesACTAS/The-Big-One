// The app's version number and the "What's New" notes, in one place.
//
// EACH RELEASE:
//   1. Change APP_VERSION below.
//   2. Add an entry at the TOP of RELEASE_NOTES with that same version number.
// The version number is what triggers the What's New page: after an update, the app
// compares APP_VERSION with the last version this phone showed notes for, and if it
// is newer the page is shown once, on the welcome screen. A version with no notes
// entry shows no page.

export const APP_VERSION = 'v1.5';

// Remembers the last version whose notes were shown (so they're only shown once)
export const LAST_SEEN_VERSION_KEY = 'theBigOneLastSeenVersion';

export interface ReleaseNote {
  version: string;
  items: string[];
}

// Newest first
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: 'v1.5',
    items: [
      "New app mode 'Timers Only' added as a simpler alternative version",
      "Significant update to the tutorial, which now walks you through all three mode types separately",
      "'Delay rhythm check' button added",
      "Clearer differentiation between adrenaline and amiodarone timers to reduce confusion",
      "Screen now stays on if app is open",
    ],
  },
];

// Which notes (if any) to show now.
//   lastSeen     the last version whose notes were shown on this phone, or null
//   hadPriorUse  this phone has used the app before (the disclaimer was accepted)
// - Already seen this version: nothing.
// - A brand-new install: nothing (the notes are about changes, and there's nothing to change from).
// - An existing user from before notes existed (no record, but has used the app): this version's notes.
// - Otherwise: every entry newer than the last one seen (up to `max`), newest first.
export function pendingReleaseNotes(
  lastSeen: string | null,
  hadPriorUse: boolean,
  notes: ReleaseNote[] = RELEASE_NOTES,
  current: string = APP_VERSION,
  max = 5,
): ReleaseNote[] {
  if (lastSeen === current) return [];
  if (lastSeen == null) return hadPriorUse && notes[0]?.version === current ? [notes[0]] : [];
  const i = notes.findIndex(n => n.version === lastSeen);
  const newer = i === -1 ? notes : notes.slice(0, i);
  return newer.slice(0, max);
}

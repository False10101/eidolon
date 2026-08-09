export const CHANGELOG = [
  {
    version: '2.2',
    date: 'August 2026',
    new: [
      'Group note and transcript generation now lets the generator choose exactly which members participate',
      'Participant-based group discounts — 15% for 5–9, 25% for 10–24, 40% for 25–49, and 60% for 50+ participants',
      'Automatic rebates for existing participants when a later unlock reaches a better group discount tier',
      'Two shared individual free generations that can be used for notes, transcripts, or transcript-and-note pairs',
      'Categories for organizing notes and transcripts by course, period, and color',
      'Local fiat estimates now appear beside credit costs throughout the app',
      'Study groups can now grow without a fixed member limit',
      'Admin activity log now shows item titles directly, making unlock and support history much easier to trace',
    ],
    improved: [
      'Group owners and original generators can edit shared notes and transcripts, while note regeneration keeps the existing participant access list',
      'Group note regeneration now reserves the same maximum 37-credit hold used by first-time generation',
      'Group member selection and pricing previews now show per-person cost, total cost, and the active discount tier',
      'Category creation now blocks duplicate clicks while saving and keeps the entered values after creation',
      'Group creation, joining, leaving, kicking, member counts, and ownership transfer now follow the unlimited-group model',
      'Pricing pages now explain selected-participant billing, every discount tier, unlock rebates, and the removal of the generator-only discount',
      'Exam Prep is temporarily labeled Coming Soon and its generation and unlock actions are disabled',
      'Home activity table — rows are now clickable across the full width instead of relying on a small View button',
      'Unlock activity labels now keep the unlock context while still naming the note or exam prep that was unlocked',
      'Standard note viewer now uses the available reading width instead of stopping at an early hard cap',
      'Light mode palette tightened with stronger contrast, cleaner surface separation, and less washed-out neutrals',
    ],
    fixed: [
      'Individual note regeneration no longer risks saving a missing or empty note response',
      'Completely empty group note output is now rejected instead of being saved as a successful generation',
      'Group generation participant access is now recorded using the existing note and transcript access design',
      'Transcript unlocks now keep the transcript charge total accurate after new members join',
      'Admin balance adjustments now record valid activity entries without relying on unsupported fields',
      'Category creation can no longer be spammed while its request is in progress',
      'Removed outdated messaging that promised a separate 50% discount to the group generator',
      'Activity history no longer shows vague unlock entries like generic group-note messages when item detail is available',
      'Exam prep unlock activity now uses the correct schema field (`label`) instead of breaking activity queries',
    ],
  },
  {
    version: '2.1',
    date: 'May 2026',
    new: [
      'Sortable columns on note and exam prep lists — click any header to sort by name, style, cost, or date',
      'Edit transcript label and content directly from the viewer',
      'What\'s New panel — release notes in the navbar with a badge whenever an update lands',
    ],
    improved: [
      'Note list redesigned — group and individual notes unified into one scrollable list with search and tab filter',
      'Exam prep list redesigned — same layout as the note list',
      'Home page tour expanded — now walks through all navbar icons (Groups, Profile, Language, What\'s New) before diving into the pipeline',
      'Note and exam prep generation — Individual and Group modes now use a clear toggle instead of two separate buttons',
    ],
    fixed: [
      'Note viewer content stuck in dark mode even when light mode was active',
      'Onboarding modals clipped on tablet viewports — Skip and Next buttons were unreachable',
      'Home page tutorial tooltip going off-screen on short viewports',
      'LaTeX formulas ($$...$$) now render correctly in notes instead of showing raw code',
    ],
  },
];

export const LATEST_VERSION = CHANGELOG[0].version;

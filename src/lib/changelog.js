export const CHANGELOG = [
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
    ],
    fixed: [
      'Note viewer content stuck in dark mode even when light mode was active',
      'Onboarding modals clipped on tablet viewports — Skip and Next buttons were unreachable',
      'Home page tutorial tooltip going off-screen on short viewports',
    ],
  },
];

export const LATEST_VERSION = CHANGELOG[0].version;

// Source shape for every language pack. Korean (ko.json) is the source of truth.
export interface ChapterPack {
  kicker: string;
  title: string;
  lead: string;
  who: string;
  prepare: string;
  open: string;
  steps: string[];
  done: string;
  example: { title: string; lines: string[] };
  notes: string[];
  flow: string[];
  links: string[];
  actions: { when: string; next: string }[];
}

export interface Pack {
  meta: { title: string };
  ui: {
    skip: string;
    language: string;
    languageAria: string;
    print: string;
    printAria: string;
    toc: string;
    tocAria: string;
    chapterSelect: string;
    pagerAria: string;
    cover: string;
    prev: string;
    next: string;
    startNew: string;
    startExisting: string;
    workflowLabel: string;
    who: string;
    prepare: string;
    done: string;
    actionsLabel: string;
    when: string;
    nextAction: string;
    backToCover: string;
    chapterLabel: string;
    open: string;
    steps: string;
    example: string;
    notes: string;
    flowExample: string;
    demoLink: string;
    newTab: string;
    readTime: string;
    loading: string;
  };
  cover: { brandLine: string; title: string; subtitle: string; contents: string; caseLine: string; workflow: string[]; newLead: string; existingLead: string };
  disclaimer: string;
  compare: { title: string; left: string; leftBody: string; right: string; rightBody: string };
  chapters: ChapterPack[];
  checklist: {
    title: string;
    intro: string;
    items: string[];
    note: string;
    done: string;
    allDone: string;
    reset: string;
  };
}

// Internal only. Never rendered in UI or print.
export type TranslationStatus = 'source' | 'ai-draft' | 'incomplete';

export interface LocaleEntry {
  code: string;
  native: string;
  dir: 'ltr' | 'rtl';
  status: TranslationStatus;
}

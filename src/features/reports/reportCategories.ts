import type { ReportCategory } from './reports.ts'

/** What the four categories of SCRUM-96 look like: in the form, on the map and in the info sheet. */
export const reportCategories: Record<
  ReportCategory,
  { title: string; text: string; colour: string; icon: string }
> = {
  broken_light: {
    title: 'Broken or flickering light',
    text: 'A street light is broken, flickering or switched off.',
    colour: '#c2410c',
    icon: 'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4M3 3l18 18',
  },
  dark_area: {
    title: 'Dark or unlit area',
    text: 'A street, cycle path or footpath feels too dark because there is too little light.',
    colour: '#4338ca',
    icon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z',
  },
  unsafe: {
    title: 'Suspicious or unsafe situation',
    text: 'Harassment, intimidation or behaviour that makes you feel unsafe.',
    colour: '#be123c',
    icon: 'M12 3 3 20h18L12 3ZM12 10v4M12 17h.01',
  },
  other: {
    title: 'Other hazard',
    text: 'An obstacle, a blocked path or something else that makes the route unsafe.',
    colour: '#475569',
    icon: 'M4 20h16M7 20l2-12h6l2 12M8.5 12h7',
  },
}

export const categoryOrder: ReportCategory[] = ['broken_light', 'dark_area', 'unsafe', 'other']

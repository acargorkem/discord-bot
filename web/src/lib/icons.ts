/**
 * Inline SVG ikon seti (feather tarzı). İçerik statik ve güvenlidir; Icon.svelte
 * bunları tek bir <svg> sarmalayıcı içinde {@html} ile basar.
 * Sarmalayıcı varsayılanı: fill=none stroke=currentColor. Dolu ikonlar kendi
 * fill/stroke'unu geçersiz kılar.
 */
const F = 'fill="currentColor" stroke="none"';

export const icons: Record<string, string> = {
  logo: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  play: `<polygon points="6 4 20 12 6 20 6 4" ${F}/>`,
  pause: `<rect x="6" y="5" width="4" height="14" rx="1.2" ${F}/><rect x="14" y="5" width="4" height="14" rx="1.2" ${F}/>`,
  next: `<polygon points="5 4 15 12 5 20 5 4" ${F}/><rect x="16.5" y="4" width="2.5" height="16" rx="1" ${F}/>`,
  prev: `<polygon points="19 20 9 12 19 4 19 20" ${F}/><rect x="5" y="4" width="2.5" height="16" rx="1" ${F}/>`,
  stop: `<rect x="6" y="6" width="12" height="12" rx="2" ${F}/>`,
  shuffle:
    '<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>',
  repeat:
    '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  repeatOne: `<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><text x="9.5" y="15.5" font-size="9" ${F}>1</text>`,
  volume: `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>`,
  volumeMute: `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>`,
  grip: `<circle cx="9" cy="6" r="1.6" ${F}/><circle cx="15" cy="6" r="1.6" ${F}/><circle cx="9" cy="12" r="1.6" ${F}/><circle cx="15" cy="12" r="1.6" ${F}/><circle cx="9" cy="18" r="1.6" ${F}/><circle cx="15" cy="18" r="1.6" ${F}/>`,
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  trash:
    '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  chevron: '<polyline points="9 6 15 12 9 18"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  logout:
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  login:
    '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  alert:
    '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  refresh:
    '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  search:
    '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  hash: '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
  music:
    '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  srcSpotify:
    '<path d="M6 8.5c5-1.5 9-.5 12 2"/><path d="M6.5 12c4-1.2 7.5-.5 10.5 1.5"/><path d="M7 15.3c3-.9 5.5-.6 8 1"/>',
  srcYoutube: `<polygon points="10 8 16 12 10 16" ${F}/>`,
  srcSoundcloud:
    '<line x1="5" y1="14" x2="5" y2="16"/><line x1="8" y1="11" x2="8" y2="16"/><line x1="11" y1="9" x2="11" y2="16"/><line x1="14" y1="12" x2="14" y2="16"/><line x1="17" y1="10" x2="17" y2="16"/>',
  srcDeezer: `<rect x="4" y="13" width="3" height="3" ${F}/><rect x="8.5" y="10" width="3" height="6" ${F}/><rect x="13" y="8" width="3" height="8" ${F}/><rect x="17.5" y="11" width="3" height="5" ${F}/>`,
};

export type IconName = keyof typeof icons;

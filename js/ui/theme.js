/* أَثَر — المظهر النهاري/الليلي ولوحة ألوان الواجهة */
const ATHAR_PALETTES = {
    gold:    { label: 'ذهبي',     main: '#D4AF37', light: '#F9E076', dark: '#8F6F14', fade: 'rgba(212,175,55,.13)', line: 'rgba(212,175,55,.28)' },
    emerald: { label: 'زمردي',    main: '#36B58A', light: '#83E2BE', dark: '#147653', fade: 'rgba(54,181,138,.14)', line: 'rgba(54,181,138,.30)' },
    ocean:   { label: 'أزرق',     main: '#4C9FE8', light: '#9BCFFF', dark: '#1763A4', fade: 'rgba(76,159,232,.14)', line: 'rgba(76,159,232,.30)' },
    rose:    { label: 'وردي',     main: '#E47A9B', light: '#FFB3C9', dark: '#A83D62', fade: 'rgba(228,122,155,.14)', line: 'rgba(228,122,155,.30)' },
    violet:  { label: 'بنفسجي',   main: '#A78BFA', light: '#D0BFFF', dark: '#6841B2', fade: 'rgba(167,139,250,.15)', line: 'rgba(167,139,250,.30)' },
    teal:    { label: 'فيروزي',   main: '#48BFC2', light: '#9BE9E6', dark: '#16777A', fade: 'rgba(72,191,194,.14)', line: 'rgba(72,191,194,.30)' }
};

function applyThemeMode() {
    const isLight = store.get('theme_athr') === 'light';
    document.body.classList.toggle('light-mode', isLight);
    const sun = $('sun-icon'), moon = $('moon-icon');
    if (sun) sun.style.display = isLight ? 'none' : 'block';
    if (moon) moon.style.display = isLight ? 'block' : 'none';
    applyPalette(store.get('athar_palette') || 'gold');
}
function toggleTheme() {
    const isLight = !document.body.classList.contains('light-mode');
    document.body.classList.toggle('light-mode', isLight);
    store.set('theme_athr', isLight ? 'light' : 'dark');
    applyPalette(store.get('athar_palette') || 'gold');
    const sun = $('sun-icon'), moon = $('moon-icon');
    if (sun) sun.style.display = isLight ? 'none' : 'block';
    if (moon) moon.style.display = isLight ? 'block' : 'none';
    if (typeof renderProfileCard === 'function') renderProfileCard();
}
function applyPalette(name) {
    const key = Object.prototype.hasOwnProperty.call(ATHAR_PALETTES, name) ? name : 'gold';
    const palette = ATHAR_PALETTES[key];
    document.body.dataset.palette = key;
    document.documentElement.style.setProperty('--gold', palette.main);
    document.documentElement.style.setProperty('--gold-light', document.body.classList.contains('light-mode') ? palette.dark : palette.light);
    document.documentElement.style.setProperty('--gold-fade', palette.fade);
    document.documentElement.style.setProperty('--line', palette.line);
    document.documentElement.style.setProperty('--gold-metal', `linear-gradient(145deg, ${palette.main} 0%, ${palette.light} 50%, ${palette.main} 100%)`);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', palette.main);
    document.querySelectorAll('[data-theme-palette]').forEach(btn => {
        const active = btn.dataset.themePalette === key;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (typeof renderProfileCard === 'function') renderProfileCard();
}
function setPalette(name) {
    if (!Object.prototype.hasOwnProperty.call(ATHAR_PALETTES, name)) return;
    store.set('athar_palette', name);
    applyPalette(name);
    toast(`تم تغيير لون الواجهة إلى ${ATHAR_PALETTES[name].label}`);
}

/* أَثَر — المظهر (فاتح / داكن) */

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    $('sun-icon').style.display = isLight ? 'none' : 'block';
    $('moon-icon').style.display = isLight ? 'block' : 'none';
    store.set('theme_athr', isLight ? 'light' : 'dark');
}

/* ---------- لون صفحة القراءة (للمصحف فقط) ---------- */
const READER_THEMES = [
    { id: 'auto', name: 'تلقائي', bg: null, fg: null },
    { id: 'white', name: 'أبيض', bg: '#ffffff', fg: '#1b1b1b' },
    { id: 'paper', name: 'ورقي', bg: '#f4ecd8', fg: '#3b2f1c' },
    { id: 'sand', name: 'رملي', bg: '#e9dcc0', fg: '#2f2616' },
    { id: 'mint', name: 'نعناعي', bg: '#e3f0e1', fg: '#1d3322' },
    { id: 'gray', name: 'رمادي', bg: '#23252a', fg: '#e4e4e4' },
    { id: 'night', name: 'أزرق ليلي', bg: '#0f1b2d', fg: '#dbe7f5' },
    { id: 'forest', name: 'أخضر داكن', bg: '#0f2a1f', fg: '#e6f0e1' },
    { id: 'black', name: 'أسود', bg: '#000000', fg: '#d6d6d6' }
];
const readerThemeId = () => { const v = store.get('reader_theme'); return READER_THEMES.some(t => t.id === v) ? v : 'auto'; };
function applyReaderTheme() {
    const id = readerThemeId();
    if (id === 'auto') document.body.removeAttribute('data-rd'); else document.body.setAttribute('data-rd', id);
}
function setReaderTheme(id) {
    store.set('reader_theme', id); applyReaderTheme(); renderReaderThemes();
}
function renderReaderThemes() {
    const g = $('rdGrid'); if (!g) return;
    const cur = readerThemeId();
    g.innerHTML = READER_THEMES.map(t => {
        const st = t.bg ? `background:${t.bg};color:${t.fg}` : '';
        return `<button type="button" class="rd-opt${t.id === cur ? ' on' : ''}${t.bg ? '' : ' auto'}" role="radio" aria-checked="${t.id === cur}" onclick="setReaderTheme('${t.id}')"><span class="rd-prev" style="${st}">بِسْمِ ٱللَّهِ</span><small>${t.name}</small></button>`;
    }).join('');
}

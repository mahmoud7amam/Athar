/* أَثَر — المظهر (فاتح / داكن) */

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    $('sun-icon').style.display = isLight ? 'none' : 'block';
    $('moon-icon').style.display = isLight ? 'block' : 'none';
    store.set('theme_athr', isLight ? 'light' : 'dark');
}

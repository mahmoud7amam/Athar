/* أَثَر — قائمة الأدعية */

function renderDuasList() {
    const list = $('duasList'); if (!list) return;
    list.innerHTML = subSupplications.map(d => `
        <div class="s-card dua-card"><div class="dua-head">${d.title}</div><b>${d.content}</b></div>`).join('');
}

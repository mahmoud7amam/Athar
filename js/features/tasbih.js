/* ---------- المسبحة ---------- */
let pendingGlobal = 0, flushTimer = null;
function flushGlobal() {
    flushTimer = null;
    const n = pendingGlobal; pendingGlobal = 0;
    if (n && database) database.ref('app_stats/global_tasbih').transaction(c => (c || 0) + n);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) flushGlobal(); });

const BEAD_N = 33, TARGET = 33;
let celebTimer = null;
function buildBeads() {
    const box = $('beads'); if (!box || box.childElementCount) return;
    let h = ''; for (let i = 0; i < BEAD_N; i++) h += `<i class="bead" style="--a:${(360 / BEAD_N * i).toFixed(3)}deg"></i>`;
    box.innerHTML = h;
}
function paintBeads(count) {
    const beads = $('beads').children, lit = Math.min(BEAD_N, Math.floor(count * BEAD_N / TARGET));
    for (let i = 0; i < beads.length; i++) beads[i].classList.toggle('on', i < lit);
    return lit;
}
function hit() {
    const stage = $('tsbStage'), btn = $('tsbBtn');
    if (celebTimer) { clearTimeout(celebTimer); celebTimer = null; stage.classList.remove('done'); updateTasbihUI(); }
    localCount++; totalCount++;
    btn.classList.remove('tap'); void btn.offsetWidth; btn.classList.add('tap');
    if (localCount >= TARGET) {
        $('count-num').textContent = TARGET; paintBeads(TARGET);
        stage.classList.add('done');
        localCount = 0; currentTasbihIndex = (currentTasbihIndex + 1) % tasbihList.length;
        celebTimer = setTimeout(() => { celebTimer = null; stage.classList.remove('done'); updateTasbihUI(); }, 550);
        if (navigator.vibrate) navigator.vibrate([25, 60, 25, 60, 70]);
    } else {
        updateTasbihUI(false);
        const lit = paintBeads(localCount), b = $('beads').children[lit - 1];
        if (b) { b.classList.remove('cur'); void b.offsetWidth; b.classList.add('cur'); }
        if (navigator.vibrate) navigator.vibrate(8);
    }
    saveTasbihData();
    pendingGlobal++;
    if (!flushTimer) flushTimer = setTimeout(flushGlobal, 4000);
}
function updateTasbihUI(swap) {
    const zt = $('zikr-text'), txt = tasbihList[currentTasbihIndex];
    if (zt.textContent !== txt) {
        zt.textContent = txt;
        if (swap !== false) { zt.classList.remove('swap'); void zt.offsetWidth; zt.classList.add('swap'); }
    }
    $('count-num').textContent = localCount;
    $('total-val').textContent = totalCount;
    buildBeads(); paintBeads(localCount);
}
function changeZikr(d) {
    currentTasbihIndex = (currentTasbihIndex + d + tasbihList.length) % tasbihList.length;
    localCount = 0; updateTasbihUI(); saveTasbihData();
}
function saveTasbihData() { store.set('local_tasbih_val', localCount); store.set('total_athr', totalCount); store.set('tasbih_idx', currentTasbihIndex); }
function resetT() { localCount = 0; updateTasbihUI(); saveTasbihData(); }

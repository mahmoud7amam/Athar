/* ---------- المصحف: الجلب والكاش ---------- */
const qurl = (type, id) => `https://api.alquran.cloud/v1/${type}/${id}/quran-uthmani`;
const qLimit = type => type === 'surah' ? 114 : type === 'juz' ? 30 : type === 'hizb' ? 60 : 604;

async function buildFromSurahs(type, id, cache) {
    if (!cache) return null;
    const ayahs = [];
    for (let n = 1; n <= 114; n++) {
        let d = surahMem.get(n);
        if (!d) {
            const hit = await cache.match(qurl('surah', n));
            if (!hit) return null;
            d = (await hit.json()).data; surahMem.set(n, d);
        }
        for (const a of d.ayahs) {
            const key = type === 'juz' ? a.juz : type === 'hizb' ? Math.ceil(a.hizbQuarter / 4) : type === 'hizbQuarter' ? a.hizbQuarter : a.page;
            if (key === id) ayahs.push(Object.assign({}, a, { surah: { number: d.number, name: d.name, revelationType: d.revelationType, numberOfAyahs: d.numberOfAyahs } }));
        }
    }
    return ayahs.length ? { ayahs } : null;
}

async function fetchQuran(type, id) {
    if (type === 'surah' && surahMem.has(id)) return surahMem.get(id);
    const local = store.get('quran_downloaded') === 'true';
    if (type === 'hizb') {
        const cache = await openCache(QCACHE);
        if (local) { const built = await buildFromSurahs('hizb', id, cache); if (built) return built; }
        try {
            const parts = await Promise.all([1, 2, 3, 4].map(i => fetchQuran('hizbQuarter', (id - 1) * 4 + i)));
            return { ayahs: parts.flatMap(p => p.ayahs) };
        } catch (err) {
            const built = await buildFromSurahs('hizb', id, cache);
            if (built) return built; throw err;
        }
    }
    const url = qurl(type, id);
    const cache = await openCache(QCACHE);
    if (cache) {
        const hit = await cache.match(url, { ignoreVary: true });
        if (hit) { const j = await hit.json(); if (j && j.data) { if (type === 'surah') surahMem.set(id, j.data); return j.data; } }
        if (local && type !== 'surah') { const built = await buildFromSurahs(type, id, cache); if (built) return built; }
    }
    try {
        const res = await fetchWithTimeout(url, 25000);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const blob = await res.blob();
        const j = JSON.parse(await blob.text());
        if (!j || !j.data) throw new Error('bad data');
        if (cache) putRebuilt(cache, url, blob, 'application/json').catch(() => {});
        if (type === 'surah') surahMem.set(id, j.data);
        return j.data;
    } catch (err) {
        if (type !== 'surah') {
            const built = await buildFromSurahs(type, id, cache);
            if (built) return built;
        }
        throw err;
    }
}

function prefetchNeighbors(type, id) {
    if (navigator.connection && navigator.connection.saveData) return;
    setTimeout(() => {
        [id + 1, id - 1].forEach(n => { if (n >= 1 && n <= qLimit(type)) fetchQuran(type, n).catch(() => {}); });
    }, 1200);
}

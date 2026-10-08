/* أَثَر — أدوات عامة مشتركة */

const $ = id => document.getElementById(id);
const hasNotif = () => typeof Notification !== 'undefined';
const store = {
    get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toArabicDigits = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

const normAr = s => String(s || '')
    .replace(/[\u200B-\u200F\uFEFF]/g, '')
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');

const A = toArabicDigits;
const pad2 = n => String(n).padStart(2, '0');
const isOnline = () => navigator.onLine !== false;
async function pool(items, n, fn) {
    let i = 0;
    await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
        while (i < items.length) { const it = items[i++]; await fn(it); }
    }));
}
async function openCache(name) { try { return await caches.open(name); } catch (e) { return null; } }
async function persistStorage() { try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) {} return false; }

/* ---------- جلب + حفظ في الكاش بثبات (مهلة + إعادة محاولة + تحقق) ----------
   بنعيد بناء الـ Response قبل الحفظ: كده ما نتأثرش بـ Vary / الـ headers اللي بتخلّي cache.put يفشل بصمت. */
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function fetchWithTimeout(url, ms = 20000, opts = {}) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
    try { return await fetch(url, Object.assign({}, opts, { signal: ctl.signal })); } finally { clearTimeout(t); }
}
async function putRebuilt(cache, url, blob, type) {
    await cache.put(url, new Response(blob, { status: 200, headers: { 'Content-Type': type || blob.type || 'application/octet-stream' } }));
}
// بيرجّع true لو اتحفظ، وبيرمي خطأ لو فشل بعد كل المحاولات. validate(blob) اختياري.
async function fetchAndCache(cache, url, { tries = 3, timeout = 20000, validate = null, type = null } = {}) {
    let last;
    for (let i = 0; i < tries; i++) {
        try {
            const r = await fetchWithTimeout(url, timeout);
            if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
            const blob = await r.blob();
            if (validate && !(await validate(blob))) throw new Error('invalid');
            await putRebuilt(cache, url, blob, type);
            return true;
        } catch (e) {
            last = e;
            if (e && e.status >= 400 && e.status < 500 && e.status !== 429) break;   // خطأ دائم: مفيش فايدة من التكرار
            if (i < tries - 1) await sleep(700 * (i + 1));
        }
    }
    throw last;
}
const validJsonData = async blob => { try { const j = JSON.parse(await blob.text()); return !!(j && j.data); } catch (e) { return false; } };

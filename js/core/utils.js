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

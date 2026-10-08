/* أَثَر — معرّف الجهاز واسمه */

function getBrowserUid() {
    let uid = store.get('athar_browser_uid');
    if (!uid) {
        uid = 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        store.set('athar_browser_uid', uid);
    }
    return uid;
}

function getDeviceName() {
    const ua = navigator.userAgent;
    let device = "جهاز غير معروف";
    if (/Android/i.test(ua)) {
        device = "Android";
        const match = ua.match(/\(([^)]+)\)/);
        if (match && match[1]) {
            const parts = match[1].split(';');
            const modelPart = parts.find(p => p.includes('Build/') || /SM-|GT-|Redmi|POCO|Xiaomi|HUAWEI|CPH|RMX|V2|Infinix|TECNO|itel|Oppo|Vivo/i.test(p));
            if (modelPart) device = modelPart.split('Build/')[0].trim();
        }
    } else if (/iPhone/i.test(ua)) device = "iPhone";
    else if (/iPad/i.test(ua)) device = "iPad";
    else if (/Windows/i.test(ua)) {
        if (ua.includes("Windows NT 10.0")) device = "Windows 10/11 PC";
        else if (ua.includes("Windows NT 6.1")) device = "Windows 7 PC";
        else device = "Windows PC";
    } else if (/Mac OS X/i.test(ua)) device = "Macintosh";
    else if (/CrOS/i.test(ua)) device = "ChromeOS";
    else if (/Linux/i.test(ua)) device = "Linux System";

    let browser = "متصفح غير معروف";
    if (ua.includes("Edg")) browser = "Edge";
    else if (ua.includes("OPR") || ua.includes("Opera")) browser = "Opera";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari")) browser = "Safari";
    return `${device} (${browser})`;
}

function getDateTimeFull() {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    let h = now.getHours();
    const ampm = h >= 12 ? 'م' : 'ص';
    h = h % 12 || 12;
    return `${d}/${mo}/${now.getFullYear()} | ${h}:${String(now.getMinutes()).padStart(2, '0')} ${ampm}`;
}

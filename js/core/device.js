/* أَثَر — معرّف الجهاز واسمه */

function getBrowserUid() {
    // معرّف Firebase المجهول/المطوّر يتيح قواعد آمنة لكل جهاز دون جمع رقم هاتف أو IP.
    try { if (typeof auth !== 'undefined' && auth && auth.currentUser) return auth.currentUser.uid; } catch (e) {}
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


/* معلومات تقنية محدودة من User-Agent فقط؛ لا IP ولا GPS ولا جهات اتصال ولا أرقام تسلسلية. */
function getDeviceDetails() {
    const ua = navigator.userAgent || '';
    const details = {
        deviceType: 'جهاز غير معروف', manufacturer: 'غير معروف', model: 'غير متاح من المتصفح',
        os: 'نظام غير معروف', osVersion: 'غير معروف', browser: 'متصفح غير معروف',
        browserVersion: 'غير معروف', appShell: /[?&]twa=1/.test(location.search) || store.get('athar_twa') === '1' ? 'Android TWA' : 'Web'
    };
    const modelMatch = ua.match(/\b(SM-[A-Z0-9-]+|GT-[A-Z0-9-]+|Redmi[^;)]*|POCO[^;)]*|Mi\s?[A-Z0-9]+|RMX[A-Z0-9]+|CPH[A-Z0-9]+|V[0-9]{4}[A-Z]|TECNO[^;)]*|Infinix[^;)]*|itel[^;)]*|Pixel\s?[A-Z0-9 ]*|HUAWEI[^;)]*)\b/i);
    if (/Android/i.test(ua)) {
        details.deviceType = 'هاتف / جهاز Android'; details.os = 'Android';
        const ver = ua.match(/Android\s([0-9.]+)/i); if (ver) details.osVersion = ver[1];
        if (modelMatch) details.model = modelMatch[1].trim();
        const m = details.model.toUpperCase();
        if (/^(SM-|GT-)/.test(m)) details.manufacturer = 'Samsung';
        else if (/^(REDMI|POCO|MI\s?)/.test(m)) details.manufacturer = 'Xiaomi';
        else if (/^RMX|^CPH/.test(m)) details.manufacturer = 'OPPO / realme';
        else if (/^V[0-9]{4}/.test(m)) details.manufacturer = 'vivo';
        else if (/^TECNO/.test(m)) details.manufacturer = 'TECNO';
        else if (/^INFINIX/.test(m)) details.manufacturer = 'Infinix';
        else if (/^PIXEL/.test(m)) details.manufacturer = 'Google';
        else if (/^HUAWEI/.test(m)) details.manufacturer = 'Huawei';
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
        details.deviceType = /iPad/i.test(ua) ? 'iPad' : 'iPhone'; details.manufacturer = 'Apple'; details.model = details.deviceType;
        details.os = 'iOS'; const v = ua.match(/OS\s([0-9_]+)/i); if (v) details.osVersion = v[1].replace(/_/g,'.');
    } else if (/Windows/i.test(ua)) {
        details.deviceType = 'كمبيوتر'; details.manufacturer = 'PC'; details.model = 'Windows PC'; details.os = 'Windows';
        const v = ua.match(/Windows NT\s([0-9.]+)/i); if (v) details.osVersion = v[1] === '10.0' ? '10 / 11' : v[1];
    } else if (/Mac OS X/i.test(ua)) {
        details.deviceType = 'كمبيوتر'; details.manufacturer = 'Apple'; details.model = 'Mac'; details.os = 'macOS';
        const v = ua.match(/Mac OS X\s([0-9_]+)/i); if (v) details.osVersion = v[1].replace(/_/g,'.');
    } else if (/CrOS/i.test(ua)) {
        details.deviceType = 'Chromebook'; details.manufacturer = 'ChromeOS'; details.model = 'Chromebook'; details.os = 'ChromeOS';
    } else if (/Linux/i.test(ua)) {
        details.deviceType = 'كمبيوتر'; details.manufacturer = 'PC'; details.model = 'Linux PC'; details.os = 'Linux';
    }
    let b = ua.match(/EdgA?\/([0-9.]+)/i);
    if (b) { details.browser = 'Microsoft Edge'; details.browserVersion = b[1]; }
    else if ((b = ua.match(/SamsungBrowser\/([0-9.]+)/i))) { details.browser = 'Samsung Internet'; details.browserVersion = b[1]; }
    else if ((b = ua.match(/OPR\/([0-9.]+)/i))) { details.browser = 'Opera'; details.browserVersion = b[1]; }
    else if ((b = ua.match(/Firefox\/([0-9.]+)/i))) { details.browser = 'Firefox'; details.browserVersion = b[1]; }
    else if ((b = ua.match(/Chrome\/([0-9.]+)/i))) { details.browser = 'Chrome'; details.browserVersion = b[1]; }
    else if ((b = ua.match(/Version\/([0-9.]+).*Safari/i))) { details.browser = 'Safari'; details.browserVersion = b[1]; }
    return details;
}

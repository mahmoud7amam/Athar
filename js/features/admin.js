/* أَثَر — لوحة المطوّر: دخول Firebase وقواعد قاعدة البيانات هي الحماية الفعلية. */
let adminAttached = false;
let adminUnlocked = false;
let adminDeviceCache = { online: {}, devices: {} };
let adminBroadcastAttached = false;
let adminHeartbeatTimer = null;

async function ensureAtharUserSession() {
    if (!auth) return null;
    if (auth.currentUser) return auth.currentUser;
    try {
        const result = await auth.signInAnonymously();
        return result.user || auth.currentUser;
    } catch (error) {
        console.warn('Anonymous Firebase sign-in unavailable:', error && error.message);
        return null;
    }
}

function adminIsAllowed() {
    return !!(auth && auth.currentUser && ADMIN_UID && ADMIN_UID !== 'SET_ADMIN_UID_IN_FIREBASE_SETUP' && auth.currentUser.uid === ADMIN_UID);
}

async function loginDeveloper() {
    const email = $('adminEmail').value.trim();
    const password = $('adminPassword').value;
    const status = $('adminAuthStatus');
    if (!auth) { status.textContent = 'خدمة تسجيل الدخول غير متاحة. تحقق من اتصال Firebase.'; return; }
    if (!ADMIN_UID || ADMIN_UID === 'SET_ADMIN_UID_IN_FIREBASE_SETUP') {
        status.textContent = 'أكمل إعداد ADMIN_UID في js/config.js وانشر database.rules.json أولًا.';
        return;
    }
    if (!email || !password) { status.textContent = 'أدخل البريد الإلكتروني وكلمة المرور.'; return; }
    status.textContent = 'جارٍ التحقق من الحساب…';
    try {
        const previousUid = auth.currentUser && auth.currentUser.uid;
        if (previousUid && previousUid !== ADMIN_UID && database) {
            await database.ref('app_stats/online_users/' + previousUid).remove().catch(() => {});
        }
        const result = await auth.signInWithEmailAndPassword(email, password);
        if (!result.user || result.user.uid !== ADMIN_UID) {
            await auth.signOut();
            await ensureAtharUserSession();
            status.textContent = 'هذا الحساب ليس حساب المطوّر المصرّح له.';
            return;
        }
        adminUnlocked = true;
        $('adminLogin').hidden = true;
        $('adminDashboard').hidden = false;
        $('adminWelcome').textContent = 'تم تسجيل الدخول • ' + (result.user.email || 'المطوّر');
        $('adminHealth').textContent = 'تم التحقق من هوية المطوّر. جارٍ تحميل بيانات الأجهزة…';
        adminAttached = false; adminBroadcastAttached = false;
        setupAdminTracking();
        attachAdminStats();
    } catch (error) {
        status.textContent = error && error.code === 'auth/invalid-credential'
            ? 'بيانات الدخول غير صحيحة.'
            : 'تعذّر تسجيل الدخول: ' + (error && error.message ? error.message : 'تحقق من إعداد Firebase Authentication.');
    }
}

async function logoutDeveloper() {
    adminUnlocked = false; adminAttached = false; adminBroadcastAttached = false;
    if (adminHeartbeatTimer) { clearInterval(adminHeartbeatTimer); adminHeartbeatTimer = null; }
    if (database) {
        ['app_stats/online_users','app_stats/unique_devices','app_stats/all_logs','admin_broadcasts'].forEach(path => {
            try { database.ref(path).off(); } catch (e) {}
        });
    }
    try {
        if (auth && auth.currentUser && database) {
            await database.ref('app_stats/online_users/' + auth.currentUser.uid).remove().catch(() => {});
        }
        if (auth) await auth.signOut();
    } catch (e) {}
    $('adminDashboard').hidden = true;
    $('adminLogin').hidden = false;
    $('adminPassword').value = '';
    $('adminAuthStatus').textContent = 'تم تسجيل الخروج من لوحة المطوّر.';
    await ensureAtharUserSession();
    setupAdminTracking();
}

function setupAdminTracking() {
    if (!database || !auth || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const details = getDeviceDetails();
    const time = getDateTimeFull();
    const deviceName = `${details.manufacturer !== 'غير معروف' ? details.manufacturer + ' ' : ''}${details.model !== 'غير متاح من المتصفح' ? details.model : details.deviceType}`;
    const deviceRecord = {
        name: deviceName, deviceType: details.deviceType, manufacturer: details.manufacturer,
        model: details.model, os: details.os, osVersion: details.osVersion,
        browser: details.browser, browserVersion: details.browserVersion,
        appShell: details.appShell, lastSeen: Date.now(), lastSeenLabel: time
    };
    const onlineRef = database.ref('app_stats/online_users/' + uid);
    onlineRef.onDisconnect().remove().catch(() => {});
    onlineRef.set({ ...deviceRecord, time }).catch(error => console.warn('Online tracking blocked:', error.message));
    const uniqueRef = database.ref('app_stats/unique_devices/' + uid);
    uniqueRef.transaction(cur => {
        cur = cur || {};
        return { ...cur, ...deviceRecord, registeredAt: cur.registeredAt || time, tasbihTotal: Number(cur.tasbihTotal || 0) };
    }).catch(error => console.warn('Device registration blocked:', error.message));
    database.ref('app_stats/all_logs/' + uid).push({ ...deviceRecord, time, at: Date.now() })
        .catch(error => console.warn('Device log blocked:', error.message));

    // تحديث آخر ظهور كل دقيقة، والتوقف تلقائيًا عند تبديل هوية Firebase.
    if (adminHeartbeatTimer) clearInterval(adminHeartbeatTimer);
    adminHeartbeatTimer = setInterval(() => {
        if (!auth || !auth.currentUser || auth.currentUser.uid !== uid) {
            clearInterval(adminHeartbeatTimer); adminHeartbeatTimer = null; return;
        }
        const lastSeen = Date.now(), lastSeenLabel = getDateTimeFull();
        onlineRef.update({ lastSeen, lastSeenLabel, time: lastSeenLabel })
            .catch(error => console.warn('Online heartbeat blocked:', error.message));
        uniqueRef.update({ lastSeen, lastSeenLabel })
            .catch(error => console.warn('Device heartbeat blocked:', error.message));
    }, 60000);
}

function attachAdminStats() {
    if (adminAttached || !database || !adminIsAllowed() || !adminUnlocked) return;
    adminAttached = true;
    database.ref('app_stats/online_users').on('value', snapshot => {
        adminDeviceCache.online = snapshot.val() || {};
        $('online-users').textContent = Object.keys(adminDeviceCache.online).length;
        renderAdminDeviceLists();
        $('adminHealth').textContent = 'متصل بقاعدة البيانات • يتم تحديث الأجهزة مباشرة.';
    }, error => { $('adminHealth').textContent = 'رفضت قواعد Firebase قراءة بيانات الأجهزة: ' + error.message; });
    database.ref('app_stats/unique_devices').on('value', snapshot => {
        adminDeviceCache.devices = snapshot.val() || {};
        $('total-users').textContent = Object.keys(adminDeviceCache.devices).length;
        const totalTasbih = Object.values(adminDeviceCache.devices).reduce((sum, d) => sum + Math.max(0, Number(d && d.tasbihTotal || 0)), 0);
        $('global-tasbih').textContent = totalTasbih.toLocaleString('ar-EG');
        renderAdminDeviceLists();
    }, error => { $('adminHealth').textContent = 'تعذّرت قراءة الأجهزة المسجّلة: ' + error.message; });
    if (!adminBroadcastAttached) {
        adminBroadcastAttached = true;
        database.ref('admin_broadcasts').limitToLast(12).on('value', renderAdminBroadcasts, error => {
            $('admin-broadcast-list').textContent = 'لا يمكن قراءة سجل الإشعارات: ' + error.message;
        });
    }
}

function adminDeviceCard(device, online) {
    const d = device || {};
    const title = esc(d.name || [d.manufacturer,d.model].filter(Boolean).join(' ') || 'جهاز غير معروف');
    const fields = [
        ['النوع', d.deviceType || 'غير معروف'], ['الشركة', d.manufacturer || 'غير معروف'],
        ['الطراز', d.model || 'غير متاح'], ['النظام', `${d.os || 'غير معروف'} ${d.osVersion || ''}`.trim()],
        ['المتصفح', `${d.browser || 'غير معروف'} ${d.browserVersion || ''}`.trim()],
        ['التشغيل', d.appShell || 'Web'], ['آخر ظهور', d.lastSeenLabel || d.time || d.registeredAt || 'غير معروف']
    ];
    return `<article class="admin-device-card"><div class="device-title">${title}</div><div class="device-meta">${fields.map(([k,v]) => `<span><b>${esc(k)}:</b> ${esc(v)}</span>`).join('')}</div>${online ? '<div class="device-status">● متصل الآن</div>' : ''}</article>`;
}

function renderAdminDeviceLists() {
    if (!adminUnlocked) return;
    const online = adminDeviceCache.online || {}, all = adminDeviceCache.devices || {};
    const query = (($('adminDeviceSearch') && $('adminDeviceSearch').value) || '').trim().toLowerCase();
    const match = d => !query || JSON.stringify(d || {}).toLowerCase().includes(query);
    const activeHtml = Object.entries(online).filter(([,d]) => match(d)).map(([,d]) => adminDeviceCard(d, true)).join('');
    const allHtml = Object.entries(all).filter(([,d]) => match(d)).sort((a,b) => Number((b[1]||{}).lastSeen||0)-Number((a[1]||{}).lastSeen||0)).map(([uid,d]) => adminDeviceCard(d, !!online[uid])).join('');
    $('active-device-list').innerHTML = activeHtml || '<div class="admin-privacy-note">لا توجد أجهزة متصلة حاليًا.</div>';
    $('unique-device-list').innerHTML = allHtml || '<div class="admin-privacy-note">لا توجد أجهزة مسجّلة أو لا توجد نتائج مطابقة.</div>';
}
function filterAdminDevices() { renderAdminDeviceLists(); }
function refreshAdminDashboard() {
    if (!adminIsAllowed()) return;
    ['app_stats/online_users','app_stats/unique_devices','admin_broadcasts'].forEach(path => {
        try { database.ref(path).off(); } catch (e) {}
    });
    adminDeviceCache = { online: {}, devices: {} };
    adminAttached = false; adminBroadcastAttached = false;
    attachAdminStats();
}

function renderAdminBroadcasts(snapshot) {
    const data = snapshot && snapshot.val() || {};
    const rows = Object.values(data).sort((a,b) => Number(b.createdAt||0)-Number(a.createdAt||0));
    $('admin-broadcast-list').innerHTML = rows.length ? rows.map(item => {
        const status = item.status === 'sent' ? `تم الإرسال إلى ${Number(item.sentCount||0).toLocaleString('ar-EG')} جهاز` : item.status === 'partial' ? `إرسال جزئي • نجح ${Number(item.sentCount||0)} / فشل ${Number(item.failedCount||0)}` : item.status === 'failed' ? 'تعذّر الإرسال' : 'قيد الإرسال…';
        return `<div class="device-item"><b>${esc(item.title || 'إشعار')}</b><span>${esc(new Date(item.createdAt||0).toLocaleString('ar-EG'))} • ${esc(status)}</span></div>`;
    }).join('') : '<div class="admin-privacy-note">لا توجد إشعارات مرسلة بعد.</div>';
}

async function sendGlobalPush() {
    const title = $('adminTitle').value.trim(), msg = $('adminMsg').value.trim();
    if (!adminUnlocked || !adminIsAllowed()) return toast('سجّل دخول حساب المطوّر المصرّح به أولًا');
    if (!title || !msg) return toast('اكتب عنوان الإشعار ونصه أولًا');
    if (title.length > 60 || msg.length > 220) return toast('العنوان 60 حرفًا كحد أقصى والنص 220 حرفًا');
    if (!database) return toast('لا يوجد اتصال بقاعدة البيانات');
    try {
        const ref = database.ref('admin_broadcasts').push();
        await ref.set({ title, body: msg, createdAt: Date.now(), status: 'queued', requestedBy: auth.currentUser.uid });
        $('adminTitle').value = ''; $('adminMsg').value = '';
        toast('تم تسليم الإشعار لخدمة الإرسال. راجع حالة التوصيل في السجل.');
    } catch (error) {
        toast('فشل إرسال الإشعار: تحقق من صلاحيات Firebase ونشر Cloud Function.');
        console.warn('Admin broadcast error:', error);
    }
}

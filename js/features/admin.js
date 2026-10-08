/* ---------- لوحة المطور (الإحصائيات تتحمّل فقط عند فتح اللوحة) ---------- */
let adminAttached = false;
function attachAdminStats() {
    if (adminAttached || !database) return;
    adminAttached = true;
    const row = (name, right) => `<div class="device-item"><b>${esc(name)}</b>${right}</div>`;
    database.ref('app_stats/global_tasbih').on('value', s => { $('global-tasbih').innerText = s.val() || 0; });
    database.ref('app_stats/online_users').on('value', s => {
        const o = s.val() || {};
        $('online-users').innerText = Object.keys(o).length;
        $('active-device-list').innerHTML = Object.values(o).map(u => row(u.name, `<span style="color:var(--gold);">متصل الآن 🟢</span>`)).join('');
    });
    database.ref('app_stats/unique_devices').on('value', s => {
        const o = s.val() || {};
        $('total-users').innerText = Object.keys(o).length;
        $('unique-device-list').innerHTML = Object.values(o).map(u => row(u.name, `<span>${esc(u.registeredAt)}</span>`)).join('');
    });
    database.ref('app_stats/all_logs').limitToLast(100).on('value', s => {
        const arr = Object.values(s.val() || {}).reverse();
        $('all-log-list').innerHTML = arr.map(u => row(u.name, `<span>${esc(u.time)}</span>`)).join('');
    });
}

function setupAdminTracking() {
    if (!database) return;
    const deviceName = getDeviceName(), time = getDateTimeFull(), uid = getBrowserUid();
    const onlineRef = database.ref('app_stats/online_users/' + uid);
    onlineRef.onDisconnect().remove();
    onlineRef.set({ name: deviceName, time: time });
    database.ref('app_stats/unique_devices/' + uid).transaction(cur => cur || { name: deviceName, registeredAt: time });
    database.ref('app_stats/all_logs').push({ name: deviceName, time: time });

    let lastShown = 0;
    database.ref('notifications').on('value', snapshot => {
        const data = snapshot.val();
        if (data && data.time > Date.now() - 5000 && data.time !== lastShown) {
            lastShown = data.time;
            sendNotify(data.title, data.message);
        }
    });
}

function sendGlobalPush() {
    const title = $('adminTitle').value, msg = $('adminMsg').value;
    if (!title || !msg) return toast("اكتب العنوان والنص أولاً");
    if (!database) return toast("لا يوجد اتصال");
    database.ref('notifications').set({ title: title, message: msg, time: Date.now() });
    toast("تم بث الإشعار بنجاح 📢");
}

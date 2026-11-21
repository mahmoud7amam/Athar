package com.atharqurani.app;

import com.google.androidbrowserhelper.locationdelegation.LocationDelegationExtraCommandHandler;

/** يفوّض إذن الموقع الجغرافي من صفحة الويب (زر «موقعي بالـ GPS») إلى إذن أندرويد الأصلي، فيظهر طلب الإذن للمستخدم. */
public class DelegationService extends com.google.androidbrowserhelper.trusted.DelegationService {
    @Override
    public void onCreate() {
        super.onCreate();
        registerExtraCommandHandler(new LocationDelegationExtraCommandHandler());
    }
}

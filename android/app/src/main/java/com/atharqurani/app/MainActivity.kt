package com.atharqurani.app

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.CancellationSignal
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.media.MediaPlayer
import android.widget.Toast
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URLEncoder
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executor
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.sin

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { AtharApp() }
    }
}

private enum class AtharPage(val title: String, val icon: String) {
    PRAYERS("الصلاة", "◷"), QIBLA("القبلة", "◉"), QURAN("القرآن", "۞"), TAFSIR("التفسير", "▤"),
    TASBIH("المسبحة", "●"), HADITH("الحديث", "❞"), DUAS("الأدعية", "♡"), SETTINGS("الإعدادات", "⚙"), IQAMA("الإقامة", "◷")
}

private data class AtharPalette(
    val name: String,
    val background: Color,
    val card: Color,
    val text: Color,
    val muted: Color,
    val accent: Color,
    val line: Color
)

private val atharPalettes = listOf(
    AtharPalette("ذهبي", Color(0xFF080807), Color(0xE8171714), Color(0xFFF0EBDD), Color(0xFFA9A292), Color(0xFFD4AF37), Color(0x55D4AF37)),
    AtharPalette("زمردي", Color(0xFF07120F), Color(0xE813211C), Color(0xFFE8F3EC), Color(0xFF9DB4A7), Color(0xFF65C49B), Color(0x5565C49B)),
    AtharPalette("أزرق", Color(0xFF080F19), Color(0xE8172434), Color(0xFFE9F1FB), Color(0xFFA3B4C8), Color(0xFF77B8F2), Color(0x5577B8F2)),
    AtharPalette("عنابي", Color(0xFF170B10), Color(0xE827161E), Color(0xFFF5E9EF), Color(0xFFC1A6B2), Color(0xFFE5A0BE), Color(0x55E5A0BE)),
    AtharPalette("رملي", Color(0xFF17140D), Color(0xE8262115), Color(0xFFF7F0DD), Color(0xFFC2B69A), Color(0xFFE1BD69), Color(0x55E1BD69)),
    AtharPalette("فاتح", Color(0xFFF5F1E8), Color(0xFDFCF9F2), Color(0xFF29251D), Color(0xFF79715F), Color(0xFF99731C), Color(0x5599731C))
)

private data class SurahItem(val number: Int, val name: String, val ayahs: Int, val medinan: Boolean)
private data class HadithItem(val text: String, val source: String)
private data class DuaItem(val title: String, val content: String)
private data class ReciterItem(val id: String, val name: String, val subtitle: String)
private data class AtharData(
    val surahs: List<SurahItem>,
    val hadiths: List<HadithItem>,
    val duas: List<DuaItem>,
    val tasbih: List<String>,
    val azkar: List<String>,
    val khatmDuas: List<String>,
    val reciters: List<ReciterItem>,
    val countries: List<CountryItem>
)
private data class AyahItem(val number: Int, val text: String)
private data class PrayerBundle(val today: Map<String, String>, val schedule: String)
private data class CityItem(val english: String, val arabic: String, val lat: Double, val lon: Double)
private data class CountryCity(val english: String, val arabic: String)
private data class CountryItem(val english: String, val arabic: String, val cities: List<CountryCity>)

private val egyptCities = listOf(
    CityItem("Qena", "قنا", 26.1551, 32.7160), CityItem("Cairo", "القاهرة", 30.0444, 31.2357),
    CityItem("Giza", "الجيزة", 30.0131, 31.2089), CityItem("Alexandria", "الإسكندرية", 31.2001, 29.9187),
    CityItem("Luxor", "الأقصر", 25.6872, 32.6396), CityItem("Aswan", "أسوان", 24.0889, 32.8998),
    CityItem("Sohag", "سوهاج", 26.5591, 31.6957), CityItem("Assiut", "أسيوط", 27.1809, 31.1837),
    CityItem("Hurghada", "الغردقة", 27.2579, 33.8116), CityItem("Mansoura", "المنصورة", 31.0409, 31.3785),
    CityItem("Tanta", "طنطا", 30.7865, 31.0004), CityItem("Ismailia", "الإسماعيلية", 30.5965, 32.2715)
)

private fun loadAtharData(context: Context): AtharData {
    val root = JSONObject(context.assets.open("athar_data.json").bufferedReader().use { it.readText() })
    val names = root.getJSONArray("surahs")
    val counts = root.getJSONArray("AYAH_COUNTS")
    val medinan = root.getJSONArray("MEDINAN")
    val medSet = buildSet { for (i in 0 until medinan.length()) add(medinan.getInt(i)) }
    val surahs = (0 until names.length()).map { i -> SurahItem(i + 1, names.getString(i), counts.optInt(i + 1 - 1), (i + 1) in medSet) }
    val hadithArray = root.getJSONArray("HADITHS")
    val hadiths = (0 until hadithArray.length()).map { i ->
        val item = hadithArray.getJSONObject(i); HadithItem(item.optString("t"), item.optString("s"))
    }
    val duaArray = root.getJSONArray("subSupplications")
    val duas = (0 until duaArray.length()).map { i ->
        val item = duaArray.getJSONObject(i); DuaItem(item.optString("title"), item.optString("content"))
    }
    val tasbihArray = root.getJSONArray("tasbihList")
    val tasbih = (0 until tasbihArray.length()).map { tasbihArray.getString(it) }
    val azkarArray = root.getJSONArray("dbAzkar")
    val azkar = (0 until azkarArray.length()).map { azkarArray.getString(it) }
    val khatmArray = root.getJSONArray("duaKhatm")
    val khatmDuas = (0 until khatmArray.length()).map { khatmArray.getString(it) }
    val recitersArray = root.getJSONArray("RECITERS")
    val reciters = (0 until recitersArray.length()).map {
        val item = recitersArray.getJSONObject(it)
        ReciterItem(item.optString("id"), item.optString("name"), item.optString("sub"))
    }.distinctBy { it.id }
    val countriesObject = root.getJSONObject("arabCountries")
    val countryKeys = countriesObject.keys()
    val countries = mutableListOf<CountryItem>()
    while (countryKeys.hasNext()) {
        val key = countryKeys.next()
        val country = countriesObject.getJSONObject(key)
        val cityArray = country.getJSONArray("cities")
        val cities = (0 until cityArray.length()).map { i ->
            val city = cityArray.getJSONObject(i)
            CountryCity(city.optString("en"), city.optString("ar"))
        }
        countries.add(CountryItem(key, country.optString("ar"), cities))
    }
    return AtharData(surahs, hadiths, duas, tasbih, azkar, khatmDuas, reciters, countries)
}

@Composable
private fun AtharApp() {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("athar_native", Context.MODE_PRIVATE) }
    val data = remember { runCatching { loadAtharData(context) }.getOrElse { AtharData(emptyList(), emptyList(), emptyList(), listOf("سبحان الله"), emptyList(), emptyList(), emptyList(), emptyList()) } }
    var page by rememberSaveable { mutableStateOf(AtharPage.PRAYERS.name) }
    var isDark by rememberSaveable { mutableStateOf(prefs.getBoolean("dark", true)) }
    var paletteIndex by rememberSaveable { mutableIntStateOf(prefs.getInt("palette", 0).coerceIn(0, atharPalettes.lastIndex)) }
    var countryEnglish by rememberSaveable { mutableStateOf(prefs.getString("country", "Egypt") ?: "Egypt") }
    var cityEnglish by rememberSaveable { mutableStateOf(prefs.getString("city", "Qena") ?: "Qena") }
    var adhanOn by rememberSaveable { mutableStateOf(AdhanPrefs.on(context)) }
    var reminderOn by rememberSaveable { mutableStateOf(AdhanPrefs.lockOn(context)) }
    val colors = atharPalettes[if (!isDark) atharPalettes.lastIndex else paletteIndex]
    val currentPage = AtharPage.valueOf(page)
    val scope = rememberCoroutineScope()

    MaterialTheme(colorScheme = if (isDark) darkColorScheme(
        primary = colors.accent, background = colors.background, surface = colors.card, onPrimary = Color.Black,
        onBackground = colors.text, onSurface = colors.text
    ) else lightColorScheme(
        primary = colors.accent, background = colors.background, surface = colors.card,
        onPrimary = Color.White, onBackground = colors.text, onSurface = colors.text
    )) {
        Column(Modifier.fillMaxSize().background(colors.background).statusBarsPadding()) {
            AtharHeader(colors, currentPage, isDark, onToggleTheme = {
                isDark = !isDark; prefs.edit().putBoolean("dark", isDark).apply()
            }, onHome = { page = AtharPage.PRAYERS.name })

            Box(Modifier.weight(1f).fillMaxWidth()) {
                when (currentPage) {
                    AtharPage.PRAYERS -> PrayerScreen(colors, data.countries, countryEnglish, cityEnglish, onLocation = { country, city ->
                        countryEnglish = country; cityEnglish = city
                        prefs.edit().putString("country", country).putString("city", city).apply()
                    }, onIqama = { page = AtharPage.IQAMA.name })
                    AtharPage.IQAMA -> IqamaScreen(colors, cityEnglish, onBack = { page = AtharPage.PRAYERS.name })
                    AtharPage.QIBLA -> QiblaScreen(colors, countryEnglish, cityEnglish)
                    AtharPage.QURAN -> QuranSection(colors, data.surahs, false, data.reciters)
                    AtharPage.TAFSIR -> QuranSection(colors, data.surahs, true, data.reciters)
                    AtharPage.TASBIH -> TasbihScreen(colors, data.tasbih)
                    AtharPage.HADITH -> HadithScreen(colors, data.hadiths)
                    AtharPage.DUAS -> DuasScreen(colors, data.duas, data.azkar, data.khatmDuas)
                    AtharPage.SETTINGS -> SettingsScreen(
                        colors = colors, isDark = isDark, paletteIndex = paletteIndex,
                        onPalette = { paletteIndex = it; prefs.edit().putInt("palette", it).apply() },
                        adhanOn = adhanOn, onAdhan = { enabled ->
                            adhanOn = enabled
                            saveAdhanPreference(context, enabled, "$cityEnglish, $countryEnglish")
                            if (enabled) openAdhanPermissionFlow(context)
                        },
                        reminderOn = reminderOn, onReminder = { enabled ->
                            reminderOn = enabled
                            AdhanPrefs.setLockOn(context, enabled)
                            if (!enabled) { AdhanPrefs.clearLock(context); AdhanScheduler.cancelLockReminder(context) }
                            if (enabled) openAdhanPermissionFlow(context)
                        },
                        onTestAdhan = { AdhanService.begin(context, 1, System.currentTimeMillis()) },
                        onPermissions = { openAdhanPermissionFlow(context) }
                    )
                }
            }

            if (currentPage != AtharPage.IQAMA) {
                AtharBottomBar(colors, currentPage) { page = it.name }
            }
        }
    }
}

@Composable
private fun AtharHeader(
    colors: AtharPalette,
    page: AtharPage,
    dark: Boolean,
    onToggleTheme: () -> Unit,
    onHome: () -> Unit
) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text("◆", color = colors.accent, fontSize = 22.sp, modifier = Modifier.clickable { onHome() }.padding(6.dp))
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("أَثَر", color = colors.accent, fontSize = 27.sp, fontWeight = FontWeight.ExtraBold)
            Text(page.title, color = colors.muted, fontSize = 11.sp)
        }
        Text(if (dark) "☼" else "☾", color = colors.accent, fontSize = 23.sp,
            modifier = Modifier.clickable { onToggleTheme() }.padding(6.dp))
    }
    Divider(color = colors.line, thickness = 1.dp)
}

@Composable
private fun AtharBottomBar(colors: AtharPalette, selected: AtharPage, onSelect: (AtharPage) -> Unit) {
    val destinations = listOf(AtharPage.PRAYERS, AtharPage.QIBLA, AtharPage.QURAN, AtharPage.TAFSIR,
        AtharPage.TASBIH, AtharPage.HADITH, AtharPage.DUAS, AtharPage.SETTINGS)
    Row(
        Modifier.fillMaxWidth().navigationBarsPadding().horizontalScroll(rememberScrollState())
            .background(colors.card).padding(horizontal = 7.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(5.dp), verticalAlignment = Alignment.CenterVertically
    ) {
        destinations.forEach { destination ->
            val active = selected == destination
            Surface(
                color = if (active) colors.accent.copy(alpha = 0.16f) else Color.Transparent,
                shape = RoundedCornerShape(16.dp),
                border = if (active) BorderStroke(1.dp, colors.accent.copy(alpha = 0.45f)) else null,
                modifier = Modifier.width(67.dp).clickable { onSelect(destination) }
            ) {
                Column(Modifier.padding(vertical = 7.dp, horizontal = 3.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(destination.icon, color = if (active) colors.accent else colors.muted, fontSize = 18.sp)
                    Text(destination.title, color = if (active) colors.accent else colors.muted, fontSize = 9.sp, maxLines = 1)
                }
            }
        }
    }
}

@Composable
private fun GlassCard(colors: AtharPalette, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = colors.card,
        shape = RoundedCornerShape(22.dp),
        border = BorderStroke(1.dp, colors.line),
        shadowElevation = 5.dp
    ) { Column(Modifier.padding(16.dp)) { content() } }
}

@Composable
private fun SectionTitle(colors: AtharPalette, title: String, subtitle: String? = null) {
    Column(Modifier.fillMaxWidth().padding(start = 4.dp, top = 12.dp, bottom = 10.dp)) {
        Text(title, color = colors.text, fontSize = 21.sp, fontWeight = FontWeight.Bold)
        if (subtitle != null) Text(subtitle, color = colors.muted, fontSize = 12.sp, modifier = Modifier.padding(top = 3.dp))
    }
}

@Composable
private fun GoldButton(colors: AtharPalette, label: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Button(
        onClick = onClick, modifier = modifier,
        colors = ButtonDefaults.buttonColors(containerColor = colors.accent, contentColor = Color(0xFF17130A)),
        shape = RoundedCornerShape(15.dp), contentPadding = PaddingValues(horizontal = 17.dp, vertical = 11.dp)
    ) { Text(label, fontWeight = FontWeight.Bold) }
}

private data class CityChoice(val english: String, val arabic: String)
private val cityChoices = egyptCities.map { CityChoice(it.english, it.arabic) }
private val prayerSpecs = listOf(
    Triple("Fajr", "الفجر", 20), Triple("Dhuhr", "الظهر", 10), Triple("Asr", "العصر", 10),
    Triple("Maghrib", "المغرب", 5), Triple("Isha", "العشاء", 10)
)

private suspend fun requestPrayerCalendar(city: String, country: String): PrayerBundle = withContext(Dispatchers.IO) {
    val encoded = URLEncoder.encode(city, "UTF-8")
    val monthCursor = Calendar.getInstance().apply { set(Calendar.DAY_OF_MONTH, 1) }
    val todayKey = SimpleDateFormat("yyyyMMdd", Locale.US).format(Date())
    val scheduleRows = mutableListOf<String>()
    var todayTimings: Map<String, String> = emptyMap()
    repeat(2) {
        val year = monthCursor.get(Calendar.YEAR)
        val month = monthCursor.get(Calendar.MONTH) + 1
        val encodedCountry = URLEncoder.encode(country, "UTF-8")
        val url = "https://api.aladhan.com/v1/calendarByCity/$year/$month?city=$encoded&country=$encodedCountry"
        val connection = (URL(url).openConnection() as HttpURLConnection)
        connection.requestMethod = "GET"
        connection.connectTimeout = 12000
        connection.readTimeout = 15000
        connection.setRequestProperty("Accept", "application/json")
        try {
            val body = connection.inputStream.bufferedReader().use { it.readText() }
            val days = JSONObject(body).getJSONArray("data")
            for (i in 0 until days.length()) {
                val day = days.getJSONObject(i)
                val gregorian = day.getJSONObject("date").getJSONObject("gregorian")
                val rawDate = gregorian.optString("date")
                val parsedDate = SimpleDateFormat("dd-MM-yyyy", Locale.US).parse(rawDate) ?: continue
                val dayKey = SimpleDateFormat("yyyyMMdd", Locale.US).format(parsedDate)
                val timingsObject = day.getJSONObject("timings")
                val dayTimes = prayerSpecs.associate { (key, _, _) -> key to timingsObject.optString(key) }
                val compactTimes = prayerSpecs.joinToString(",") { (key, _, _) -> extractHHmm(dayTimes[key]) }
                if (compactTimes.split(",").any { it.length != 4 }) continue
                scheduleRows.add("$dayKey,$compactTimes")
                if (dayKey == todayKey) todayTimings = dayTimes
            }
        } finally { connection.disconnect() }
        monthCursor.add(Calendar.MONTH, 1)
    }
    if (todayTimings.isEmpty() || scheduleRows.isEmpty()) error("تعذّر قراءة جدول المواقيت")
    PrayerBundle(todayTimings, scheduleRows.joinToString("~"))
}

private fun extractHHmm(value: String?): String {
    val match = Regex("(\\d{1,2}):(\\d{2})").find(value.orEmpty()) ?: return ""
    return match.groupValues[1].padStart(2, '0') + match.groupValues[2]
}

private fun syncNativeAdhan(context: Context, city: String, bundle: PrayerBundle) {
    if (bundle.schedule.isBlank()) return
    AdhanPrefs.save(context, AdhanPrefs.on(context), AdhanPrefs.flags(context), AdhanPrefs.vol(context), city, bundle.schedule)
    AdhanScheduler.schedule(context)
}

private fun bundleToJson(bundle: PrayerBundle): String {
    val today = JSONObject(); bundle.today.forEach { (key, value) -> today.put(key, value) }
    return JSONObject().put("today", today).put("schedule", bundle.schedule).toString()
}

private fun bundleFromJson(raw: String?): PrayerBundle? = runCatching {
    if (raw.isNullOrBlank()) return@runCatching null
    val root = JSONObject(raw)
    val today = root.getJSONObject("today")
    PrayerBundle(prayerSpecs.associate { (key, _, _) -> key to today.optString(key) }, root.optString("schedule"))
}.getOrNull()

private fun saveAdhanPreference(context: Context, enabled: Boolean, city: String) {
    AdhanPrefs.save(context, enabled, AdhanPrefs.flags(context), AdhanPrefs.vol(context), city, AdhanPrefs.times(context))
    AdhanScheduler.schedule(context)
}

private fun nextPrayerInfo(timings: Map<String, String>, now: Long): Pair<String, Long>? {
    if (timings.isEmpty()) return null
    val cal = Calendar.getInstance().apply { timeInMillis = now }
    for ((key, name, _) in prayerSpecs) {
        val hhmm = extractHHmm(timings[key])
        if (hhmm.length != 4) continue
        val target = Calendar.getInstance().apply {
            timeInMillis = now
            set(Calendar.HOUR_OF_DAY, hhmm.substring(0, 2).toInt())
            set(Calendar.MINUTE, hhmm.substring(2, 4).toInt())
            set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
        }.timeInMillis
        if (target > now) return name to target
    }
    val fajr = extractHHmm(timings["Fajr"])
    if (fajr.length == 4) {
        cal.add(Calendar.DAY_OF_YEAR, 1)
        cal.set(Calendar.HOUR_OF_DAY, fajr.substring(0, 2).toInt())
        cal.set(Calendar.MINUTE, fajr.substring(2, 4).toInt())
        cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0)
        return "الفجر" to cal.timeInMillis
    }
    return null
}

private fun timeText(value: String?): String {
    val hhmm = extractHHmm(value)
    if (hhmm.length != 4) return "—"
    val hour = hhmm.substring(0, 2).toInt()
    val minute = hhmm.substring(2, 4)
    val hour12 = (hour % 12).let { if (it == 0) 12 else it }
    return "$hour12:$minute ${if (hour < 12) "ص" else "م"}"
}

@Composable
private fun PrayerScreen(colors: AtharPalette, countries: List<CountryItem>, countryEnglish: String, cityEnglish: String, onLocation: (String, String) -> Unit, onIqama: () -> Unit) {
    val context = LocalContext.current
    var cityDialog by remember { mutableStateOf(false) }
    var selectingCity by remember { mutableStateOf(false) }
    var dialogCountry by remember { mutableStateOf(countryEnglish) }
    val cachePrefs = remember { context.getSharedPreferences("athar_native", Context.MODE_PRIVATE) }
    var timings by remember { mutableStateOf(bundleFromJson(cachePrefs.getString("prayer_cache_${countryEnglish}_$cityEnglish", null))?.today ?: emptyMap()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf(false) }
    var refreshToken by remember { mutableIntStateOf(0) }
    var clock by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(countryEnglish, cityEnglish, refreshToken) {
        val cacheKey = "prayer_cache_${countryEnglish}_$cityEnglish"
        val updatedKey = "${cacheKey}_updated"
        val cached = bundleFromJson(cachePrefs.getString(cacheKey, null))
        timings = cached?.today ?: emptyMap()
        if (!cached?.schedule.isNullOrBlank()) {
            AdhanPrefs.save(context, AdhanPrefs.on(context), AdhanPrefs.flags(context), AdhanPrefs.vol(context), "$cityEnglish, $countryEnglish", cached!!.schedule)
            AdhanScheduler.schedule(context)
        }
        val cacheAge = System.currentTimeMillis() - cachePrefs.getLong(updatedKey, 0L)
        val cacheIsFresh = cached != null && cacheAge in 0..(12L * 60L * 60L * 1000L)
        if (cacheIsFresh && refreshToken == 0) {
            loading = false
            error = false
            return@LaunchedEffect
        }
        loading = timings.isEmpty(); error = false
        runCatching { requestPrayerCalendar(cityEnglish, countryEnglish) }
            .onSuccess { fresh ->
                timings = fresh.today
                cachePrefs.edit().putString(cacheKey, bundleToJson(fresh)).putLong(updatedKey, System.currentTimeMillis()).apply()
                syncNativeAdhan(context, "$cityEnglish, $countryEnglish", fresh)
            }
            .onFailure { error = true }
        loading = false
    }
    LaunchedEffect(Unit) { while (true) { delay(1000); clock = System.currentTimeMillis() } }
    val next = remember(timings, clock) { nextPrayerInfo(timings, clock) }
    val countryArabic = countries.firstOrNull { it.english == countryEnglish }?.arabic ?: countryEnglish
    val cityArabic = countries.firstOrNull { it.english == countryEnglish }?.cities?.firstOrNull { it.english == cityEnglish }?.arabic ?: cityEnglish

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 10.dp)) {
        GlassCard(colors) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("موقع المواقيت", color = colors.muted, fontSize = 12.sp)
                    Text("$cityArabic، $countryArabic", color = colors.text, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                }
                GoldButton(colors, "تغيير الموقع") { selectingCity = false; dialogCountry = countryEnglish; cityDialog = true }
            }
        }
        Spacer(Modifier.height(12.dp))
        GlassCard(colors) {
            Text("الصلاة القادمة", color = colors.accent, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(7.dp))
            if (loading && timings.isEmpty()) {
                CircularProgressIndicator(color = colors.accent, modifier = Modifier.size(32.dp))
                Text("جارٍ تحميل مواقيت الصلاة", color = colors.muted, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
            } else if (next != null) {
                val remain = (next.second - clock).coerceAtLeast(0L) / 1000
                Text(next.first, color = colors.text, fontSize = 29.sp, fontWeight = FontWeight.ExtraBold)
                Text(String.format(Locale.US, "%02d:%02d:%02d", remain / 3600, (remain % 3600) / 60, remain % 60),
                    color = colors.accent, fontSize = 30.sp, fontWeight = FontWeight.Bold)
                Text("الوقت المتبقي", color = colors.muted, fontSize = 11.sp)
                Spacer(Modifier.height(12.dp))
                GoldButton(colors, "فتح شاشة الإقامة") { onIqama() }
            } else {
                Text(if (error) "تعذّر تحميل المواقيت. تحقق من الإنترنت وأعد المحاولة." else "لا توجد مواقيت متاحة الآن.", color = colors.muted)
                GoldButton(colors, "إعادة المحاولة") { refreshToken++ }
            }
        }
        SectionTitle(colors, "مواقيت اليوم", "الأذان والإقامة المقدّرة")
        prayerSpecs.forEach { (key, name, defaultDelay) ->
            val iqamaDelay = context.getSharedPreferences("athar_native", Context.MODE_PRIVATE).getInt("iqama_${cityEnglish}_$key", defaultDelay)
            val at = extractHHmm(timings[key])
            val iqamaTime = if (at.length == 4) {
                val c = Calendar.getInstance().apply { set(Calendar.HOUR_OF_DAY, at.substring(0, 2).toInt()); set(Calendar.MINUTE, at.substring(2, 4).toInt()); add(Calendar.MINUTE, iqamaDelay) }
                timeText(String.format(Locale.US, "%02d:%02d", c.get(Calendar.HOUR_OF_DAY), c.get(Calendar.MINUTE)))
            } else "—"
            GlassCard(colors, Modifier.padding(bottom = 9.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column {
                        Text(name, color = colors.text, fontSize = 19.sp, fontWeight = FontWeight.Bold)
                        Text("الإقامة بعد $iqamaDelay دقيقة", color = colors.muted, fontSize = 11.sp)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(timeText(timings[key]), color = colors.accent, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                        Text("إقامة متوقعة: $iqamaTime", color = colors.muted, fontSize = 10.sp)
                    }
                }
            }
        }
        if (error) Text("المواقيت تحتاج اتصالًا بالإنترنت عند أول تحميل؛ بعد ذلك سيُحفظ جدول الأذان على الهاتف.", color = colors.muted, fontSize = 11.sp)
        Spacer(Modifier.height(12.dp))
    }
    if (cityDialog) {
        val currentCountry = countries.firstOrNull { it.english == dialogCountry }
        AlertDialog(onDismissRequest = { cityDialog = false }, containerColor = colors.card,
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (selectingCity) TextButton(onClick = { selectingCity = false }) { Text("رجوع", color = colors.accent) }
                    Text(if (selectingCity) "اختر المدينة · ${currentCountry?.arabic ?: dialogCountry}" else "اختر الدولة", color = colors.text)
                }
            },
            text = {
                Column(Modifier.height(360.dp).verticalScroll(rememberScrollState())) {
                    if (!selectingCity) {
                        countries.sortedBy { it.arabic }.forEach { country ->
                            TextButtonRow(colors, country.arabic) { dialogCountry = country.english; selectingCity = true }
                        }
                    } else {
                        currentCountry?.cities?.forEach { city ->
                            TextButtonRow(colors, city.arabic) {
                                onLocation(dialogCountry, city.english)
                                cityDialog = false
                            }
                        }
                    }
                }
            }, confirmButton = { TextButton(onClick = { cityDialog = false }) { Text("إغلاق", color = colors.accent) } })
    }
}

@Composable
private fun TextButtonRow(colors: AtharPalette, text: String, onClick: () -> Unit) {
    Text(text, color = colors.text, modifier = Modifier.fillMaxWidth().clickable { onClick() }.padding(vertical = 12.dp, horizontal = 5.dp))
    Divider(color = colors.line)
}

@Composable
private fun IqamaScreen(colors: AtharPalette, city: String, onBack: () -> Unit) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("athar_native", Context.MODE_PRIVATE) }
    val delays = remember {
        mutableStateOf(prayerSpecs.associate { (key, _, default) -> key to prefs.getInt("iqama_${city}_$key", default) })
    }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            GoldButton(colors, "رجوع") { onBack() }
            Spacer(Modifier.width(12.dp))
            Text("إقامة الصلاة", color = colors.text, fontSize = 21.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(14.dp))
        GlassCard(colors) {
            Text("ضبط مواعيد الإقامة", color = colors.accent, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Text("هذه مدد تقديرية بعد الأذان، وقد تختلف من مسجد لآخر. اضبطها وفق مسجدك.", color = colors.muted, fontSize = 12.sp, modifier = Modifier.padding(top = 6.dp, bottom = 10.dp))
            prayerSpecs.forEach { (key, name, _) ->
                val value = delays.value[key] ?: 10
                Row(Modifier.fillMaxWidth().padding(vertical = 9.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(name, color = colors.text, fontSize = 16.sp)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        TextButton(onClick = {
                            val next = (value - 1).coerceAtLeast(0); delays.value = delays.value + (key to next); prefs.edit().putInt("iqama_${city}_$key", next).apply()
                        }) { Text("−", color = colors.accent, fontSize = 22.sp) }
                        Text("$value د", color = colors.text, fontWeight = FontWeight.Bold)
                        TextButton(onClick = {
                            val next = (value + 1).coerceAtMost(180); delays.value = delays.value + (key to next); prefs.edit().putInt("iqama_${city}_$key", next).apply()
                        }) { Text("+", color = colors.accent, fontSize = 22.sp) }
                    }
                }
                Divider(color = colors.line)
            }
            GoldButton(colors, "استعادة المدد المقترحة", modifier = Modifier.fillMaxWidth()) {
                val defaults = prayerSpecs.associate { it.first to it.third }
                delays.value = defaults
                val edit = prefs.edit(); defaults.forEach { (k, v) -> edit.putInt("iqama_${city}_$k", v) }; edit.apply()
            }
        }
    }
}

private fun qiblaBearing(lat: Double, lon: Double): Double {
    val kaabaLat = Math.toRadians(21.422487)
    val kaabaLon = Math.toRadians(39.826206)
    val p1 = Math.toRadians(lat)
    val p2 = kaabaLat
    val dLon = kaabaLon - Math.toRadians(lon)
    val y = sin(dLon) * cos(p2)
    val x = cos(p1) * sin(p2) - sin(p1) * cos(p2) * cos(dLon)
    return (Math.toDegrees(atan2(y, x)) + 360.0) % 360.0
}

@Composable
private fun QiblaScreen(colors: AtharPalette, countryEnglish: String, cityEnglish: String) {
    val context = LocalContext.current
    val cityFallback = if (countryEnglish.equals("Egypt", ignoreCase = true)) {
        egyptCities.firstOrNull { it.english.equals(cityEnglish, ignoreCase = true) }
    } else null
    var latitude by remember(countryEnglish, cityEnglish) { mutableStateOf(cityFallback?.lat) }
    var longitude by remember(countryEnglish, cityEnglish) { mutableStateOf(cityFallback?.lon) }
    var locationStatus by remember(countryEnglish, cityEnglish) {
        mutableStateOf(if (cityFallback != null) "الاتجاه محسوب من مدينة $cityEnglish" else "حدّد موقعك للحصول على اتجاه أدق")
    }
    var heading by remember { mutableFloatStateOf(0f) }
    val locationManager = remember { context.getSystemService(Context.LOCATION_SERVICE) as LocationManager }

    val readDeviceLocation: () -> Unit = {
        val fineGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarseGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (fineGranted || coarseGranted) {
            val lastKnown = runCatching {
                locationManager.getProviders(true).mapNotNull { provider ->
                    runCatching { locationManager.getLastKnownLocation(provider) }.getOrNull()
                }.maxByOrNull { it.time }
            }.getOrNull()
            if (lastKnown != null) {
                latitude = lastKnown.latitude
                longitude = lastKnown.longitude
                locationStatus = "تم تحديد موقعك الحالي"
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val provider = runCatching {
                    listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
                        .firstOrNull { locationManager.isProviderEnabled(it) }
                }.getOrNull()
                if (provider != null) {
                    runCatching {
                        locationManager.getCurrentLocation(provider, CancellationSignal(), Executor { command ->
                            context.mainExecutor.execute(command)
                        }) { found: Location? ->
                            if (found != null) {
                                latitude = found.latitude
                                longitude = found.longitude
                                locationStatus = "تم تحديد موقعك الحالي"
                            } else {
                                locationStatus = "تعذر تحديد الموقع؛ تحقق من تشغيل خدمة الموقع"
                            }
                        }
                    }.onFailure { locationStatus = "تعذر تحديد الموقع؛ حاول مرة أخرى" }
                } else {
                    locationStatus = "شغّل خدمة الموقع في الهاتف ثم حاول مرة أخرى"
                }
            } else {
                locationStatus = "لم يتوفر موقع حديث؛ اختر مدينة مدعومة أو حدّث موقعك"
            }
        } else {
            locationStatus = "اسمح للتطبيق بالوصول إلى موقعك لحساب القبلة بدقة"
        }
    }

    val locationPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { result ->
        if (result[Manifest.permission.ACCESS_FINE_LOCATION] == true || result[Manifest.permission.ACCESS_COARSE_LOCATION] == true) {
            readDeviceLocation()
        } else {
            locationStatus = "لم يتم منح إذن الموقع؛ الاتجاه يعتمد على المدينة المختارة"
        }
    }

    val sensorManager = remember { context.getSystemService(Context.SENSOR_SERVICE) as SensorManager }
    val sensor = remember { sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR) }
    DisposableEffect(sensor) {
        val listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                val rotation = FloatArray(9); val orientation = FloatArray(3)
                SensorManager.getRotationMatrixFromVector(rotation, event.values)
                SensorManager.getOrientation(rotation, orientation)
                heading = ((Math.toDegrees(orientation[0].toDouble()).toFloat() + 360f) % 360f)
            }
            override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
        }
        if (sensor != null) sensorManager.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_UI)
        onDispose { sensorManager.unregisterListener(listener) }
    }

    val hasCoordinates = latitude != null && longitude != null
    val bearing = if (hasCoordinates) qiblaBearing(latitude!!, longitude!!).toFloat() else 0f
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        SectionTitle(colors, "اتجاه القبلة", locationStatus)
        GlassCard(colors) {
            Text("زاوية القبلة من الشمال", color = colors.muted, fontSize = 12.sp)
            if (hasCoordinates) {
                Text("${bearing.toInt()}°", color = colors.accent, fontSize = 38.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.align(Alignment.CenterHorizontally).padding(12.dp))
            } else {
                Text("يلزم تحديد الموقع", color = colors.accent, fontSize = 20.sp, fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.CenterHorizontally).padding(16.dp))
            }
            Box(Modifier.fillMaxWidth().height(220.dp), contentAlignment = Alignment.Center) {
                Surface(shape = CircleShape, color = colors.background, border = BorderStroke(2.dp, colors.line), modifier = Modifier.size(190.dp)) {
                    Box(contentAlignment = Alignment.Center) {
                        Text("N", color = colors.muted, modifier = Modifier.align(Alignment.TopCenter).padding(top = 10.dp), fontWeight = FontWeight.Bold)
                        Text("S", color = colors.muted, modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 10.dp), fontWeight = FontWeight.Bold)
                        Text("E", color = colors.muted, modifier = Modifier.align(Alignment.CenterEnd).padding(end = 10.dp), fontWeight = FontWeight.Bold)
                        Text("W", color = colors.muted, modifier = Modifier.align(Alignment.CenterStart).padding(start = 10.dp), fontWeight = FontWeight.Bold)
                        if (hasCoordinates) Text("▲", color = colors.accent, fontSize = 46.sp, modifier = Modifier.rotate(bearing - heading))
                    }
                }
            }
            if (hasCoordinates) {
                Text("اتجاه الجهاز: ${heading.toInt()}°", color = colors.text, modifier = Modifier.align(Alignment.CenterHorizontally))
            }
            if (sensor == null) Text("هذا الهاتف لا يوفّر حساس اتجاه مناسبًا؛ استخدم زاوية القبلة الموضحة بالأعلى.", color = colors.muted, fontSize = 11.sp)
            else Text("حرّك الهاتف ببطء بشكل أفقي بعيدًا عن المعادن ومصادر التشويش.", color = colors.muted, fontSize = 11.sp)
            Spacer(Modifier.height(12.dp))
            GoldButton(colors, "تحديد موقعي الحالي", modifier = Modifier.fillMaxWidth()) {
                val fineGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                val coarseGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
                if (fineGranted || coarseGranted) readDeviceLocation()
                else locationPermission.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
            }
        }
    }
}

private suspend fun fetchSurah(number: Int, tafsir: Boolean): List<AyahItem> = withContext(Dispatchers.IO) {
    val edition = if (tafsir) "/ar.muyassar" else ""
    val connection = (URL("https://api.alquran.cloud/v1/surah/$number$edition").openConnection() as HttpURLConnection)
    connection.connectTimeout = 15000; connection.readTimeout = 15000
    try {
        val root = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
        val array = root.getJSONObject("data").getJSONArray("ayahs")
        (0 until array.length()).map { i ->
            val item = array.getJSONObject(i)
            AyahItem(item.optInt("numberInSurah", i + 1), item.optString("text"))
        }
    } finally { connection.disconnect() }
}

@Composable
private fun QuranSection(colors: AtharPalette, surahs: List<SurahItem>, tafsir: Boolean, reciters: List<ReciterItem>) {
    val context = LocalContext.current
    val player = remember { MediaPlayer() }
    var playingAyah by remember { mutableIntStateOf(-1) }
    var reciterIndex by rememberSaveable { mutableIntStateOf(0) }
    DisposableEffect(player) {
        onDispose { runCatching { if (player.isPlaying) player.stop(); player.release() } }
    }
    var selected by remember { mutableStateOf<SurahItem?>(null) }
    var query by rememberSaveable { mutableStateOf("") }
    var ayahs by remember { mutableStateOf<List<AyahItem>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf(false) }
    var retryToken by remember { mutableIntStateOf(0) }
    LaunchedEffect(selected?.number, tafsir, retryToken) {
        val current = selected ?: return@LaunchedEffect
        runCatching { if (player.isPlaying) player.stop(); player.reset() }
        playingAyah = -1
        loading = true; error = false; ayahs = emptyList()
        runCatching { fetchSurah(current.number, tafsir) }
            .onSuccess { ayahs = it }
            .onFailure { error = true }
        loading = false
    }
    if (selected == null) {
        Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
            SectionTitle(colors, if (tafsir) "التفسير الميسّر" else "المصحف الشريف", "اختر سورة للبدء")
            OutlinedTextField(
                value = query, onValueChange = { query = it }, modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("ابحث عن سورة...", color = colors.muted) }, singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = colors.accent, unfocusedBorderColor = colors.line, focusedTextColor = colors.text, unfocusedTextColor = colors.text)
            )
            Spacer(Modifier.height(10.dp))
            LazyColumn(contentPadding = PaddingValues(bottom = 18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(surahs.filter { query.isBlank() || it.name.contains(query.trim()) || it.number.toString() == query.trim() }, key = { it.number }) { surah ->
                    GlassCard(colors, Modifier.clickable { selected = surah }) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column {
                                Text(surah.name, color = colors.text, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                                Text("${if (surah.medinan) "مدنية" else "مكية"} · ${surah.ayahs} آية", color = colors.muted, fontSize = 11.sp)
                            }
                            Text(surah.number.toString().padStart(3, '0'), color = colors.accent, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    } else {
        Column(Modifier.fillMaxSize().padding(horizontal = 14.dp)) {
            Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                GoldButton(colors, "السور") {
                    runCatching { if (player.isPlaying) player.stop(); player.reset() }
                    playingAyah = -1; selected = null
                }
                Spacer(Modifier.width(10.dp))
                Column {
                    Text(selected!!.name, color = colors.text, fontSize = 19.sp, fontWeight = FontWeight.Bold)
                    Text(if (tafsir) "التفسير الميسّر · يتطلب إنترنت" else "نص القرآن الكريم · تلاوة صوتية عبر الإنترنت", color = colors.muted, fontSize = 10.sp)
                }
            }
            if (!tafsir && reciters.isNotEmpty()) {
                Row(Modifier.fillMaxWidth().padding(bottom = 8.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("القارئ: ${reciters[reciterIndex.coerceIn(0, reciters.lastIndex)].name}", color = colors.accent, fontSize = 12.sp)
                    TextButton(onClick = { reciterIndex = (reciterIndex + 1) % reciters.size }) { Text("تغيير القارئ", color = colors.accent) }
                }
            }
            when {
                loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = colors.accent) }
                error -> GlassCard(colors) {
                    Text("تعذّر تحميل المحتوى. تحقق من اتصال الإنترنت.", color = colors.text)
                    GoldButton(colors, "إعادة المحاولة") { retryToken++ }
                }
                else -> LazyColumn(contentPadding = PaddingValues(bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    items(ayahs, key = { it.number }) { ayah ->
                        GlassCard(colors) {
                            Text(ayah.text, color = colors.text, fontSize = if (tafsir) 17.sp else 23.sp,
                                lineHeight = if (tafsir) 30.sp else 43.sp, textAlign = TextAlign.End, modifier = Modifier.fillMaxWidth())
                            Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text("۞ ${ayah.number}", color = colors.accent, fontSize = 12.sp)
                                if (!tafsir) {
                                    TextButton(onClick = {
                                        try {
                                            if (player.isPlaying && playingAyah == ayah.number) {
                                                player.pause(); playingAyah = -1
                                            } else {
                                                player.reset()
                                                val reciterId = reciters.getOrNull(reciterIndex)?.id ?: "Alafasy_128kbps"
                                                val audioPath = "https://everyayah.com/data/$reciterId/${selected!!.number.toString().padStart(3, '0')}${ayah.number.toString().padStart(3, '0')}.mp3"
                                                player.setDataSource(audioPath)
                                                player.setOnPreparedListener { media -> media.start(); playingAyah = ayah.number }
                                                player.setOnCompletionListener { playingAyah = -1 }
                                                player.setOnErrorListener { _, _, _ ->
                                                    playingAyah = -1
                                                    Toast.makeText(context, "تعذّر تشغيل التلاوة. تحقق من الإنترنت.", Toast.LENGTH_SHORT).show()
                                                    true
                                                }
                                                player.prepareAsync()
                                            }
                                        } catch (_: Exception) {
                                            playingAyah = -1
                                            Toast.makeText(context, "تعذّر تشغيل التلاوة.", Toast.LENGTH_SHORT).show()
                                        }
                                    }) { Text(if (playingAyah == ayah.number) "Ⅱ إيقاف" else "▶ استماع", color = colors.accent, fontSize = 11.sp) }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TasbihScreen(colors: AtharPalette, items: List<String>) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("athar_native", Context.MODE_PRIVATE) }
    var count by rememberSaveable { mutableIntStateOf(prefs.getInt("tasbih_count", 0)) }
    var selected by rememberSaveable { mutableIntStateOf(prefs.getInt("tasbih_selected", 0).coerceIn(0, (items.size - 1).coerceAtLeast(0))) }
    val phrase = items.getOrNull(selected) ?: "سبحان الله"
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        SectionTitle(colors, "المسبحة الإلكترونية", "عداد محلي يُحفظ على جهازك")
        GlassCard(colors) {
            Text(phrase, color = colors.text, fontSize = 24.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(vertical = 22.dp))
            Surface(
                shape = CircleShape, color = colors.background, border = BorderStroke(3.dp, colors.accent),
                modifier = Modifier.size(210.dp).align(Alignment.CenterHorizontally).clickable {
                    count += 1; prefs.edit().putInt("tasbih_count", count).apply()
                }
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Text(count.toString(), color = colors.accent, fontSize = 56.sp, fontWeight = FontWeight.ExtraBold)
                    Text("اضغط للتسبيح", color = colors.muted, fontSize = 12.sp)
                }
            }
            Spacer(Modifier.height(16.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                GoldButton(colors, "الذكر التالي") { selected = (selected + 1) % items.size; count = 0; prefs.edit().putInt("tasbih_selected", selected).putInt("tasbih_count", 0).apply() }
                GoldButton(colors, "تصفير العداد") { count = 0; prefs.edit().putInt("tasbih_count", 0).apply() }
            }
        }
    }
}

@Composable
private fun HadithScreen(colors: AtharPalette, hadiths: List<HadithItem>) {
    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        SectionTitle(colors, "أحاديث نبوية", "مجموعة محفوظة داخل التطبيق")
        LazyColumn(contentPadding = PaddingValues(bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            items(hadiths) { hadith ->
                GlassCard(colors) {
                    Text("❞", color = colors.accent, fontSize = 24.sp)
                    Text(hadith.text, color = colors.text, fontSize = 18.sp, lineHeight = 31.sp, textAlign = TextAlign.End)
                    Text(hadith.source, color = colors.accent, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 10.dp))
                }
            }
        }
    }
}

@Composable
private fun DuasScreen(
    colors: AtharPalette,
    duas: List<DuaItem>,
    azkar: List<String>,
    khatmDuas: List<String>
) {
    var query by rememberSaveable { mutableStateOf("") }
    var category by rememberSaveable { mutableIntStateOf(0) }
    val tabs = listOf("أذكار يومية", "أذكار مختصرة", "دعاء الختم")
    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        SectionTitle(colors, "الأذكار والأدعية", "كل مجموعات أَثَر المحفوظة على الجهاز")
        Row(
            Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            tabs.forEachIndexed { index, label ->
                TextButton(onClick = { category = index; query = "" }) {
                    Text(label, color = if (category == index) colors.accent else colors.muted,
                        fontWeight = if (category == index) FontWeight.Bold else FontWeight.Normal)
                }
            }
        }
        OutlinedTextField(value = query, onValueChange = { query = it }, modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("ابحث في المحتوى...", color = colors.muted) }, singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = colors.accent, unfocusedBorderColor = colors.line, focusedTextColor = colors.text, unfocusedTextColor = colors.text))
        Spacer(Modifier.height(10.dp))
        when (category) {
            0 -> LazyColumn(contentPadding = PaddingValues(bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                items(duas.filter { query.isBlank() || it.title.contains(query, true) || it.content.contains(query, true) }) { dua ->
                    GlassCard(colors) {
                        Text(dua.title, color = colors.accent, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                        Divider(color = colors.line, modifier = Modifier.padding(vertical = 8.dp))
                        Text(dua.content, color = colors.text, fontSize = 18.sp, lineHeight = 31.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                    }
                }
            }
            1 -> LazyColumn(contentPadding = PaddingValues(bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                items(azkar.filter { query.isBlank() || it.contains(query, true) }) { zikr ->
                    GlassCard(colors) { Text(zikr, color = colors.text, fontSize = 18.sp, lineHeight = 31.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth()) }
                }
            }
            else -> LazyColumn(contentPadding = PaddingValues(bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                items(khatmDuas.filter { query.isBlank() || it.contains(query, true) }) { dua ->
                    GlassCard(colors) {
                        Text("دعاء ختم القرآن", color = colors.accent, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        Text(dua, color = colors.text, fontSize = 18.sp, lineHeight = 31.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingsScreen(
    colors: AtharPalette,
    isDark: Boolean,
    paletteIndex: Int,
    onPalette: (Int) -> Unit,
    adhanOn: Boolean,
    onAdhan: (Boolean) -> Unit,
    reminderOn: Boolean,
    onReminder: (Boolean) -> Unit,
    onTestAdhan: () -> Unit,
    onPermissions: () -> Unit
) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        SectionTitle(colors, "إعدادات أَثَر", "خصّص تجربة التطبيق والتنبيهات")
        GlassCard(colors) {
            Text("المظهر", color = colors.accent, fontWeight = FontWeight.Bold, fontSize = 17.sp)
            Text(if (isDark) "الوضع الداكن مفعّل" else "الوضع الفاتح مفعّل", color = colors.muted, fontSize = 12.sp)
            Text("ألوان التطبيق", color = colors.text, modifier = Modifier.padding(top = 12.dp, bottom = 8.dp))
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                atharPalettes.take(5).forEachIndexed { index, palette ->
                    Surface(shape = CircleShape, color = palette.accent, border = if (paletteIndex == index) BorderStroke(3.dp, colors.text) else null,
                        modifier = Modifier.size(39.dp).clickable { onPalette(index) }) {}
                }
            }
            Text("الألوان متاحة عند استخدام الوضع الداكن. الوضع الفاتح له لوحة مستقلة.", color = colors.muted, fontSize = 10.sp, modifier = Modifier.padding(top = 8.dp))
        }
        Spacer(Modifier.height(10.dp))
        GlassCard(colors) {
            Text("الأذان والتنبيهات", color = colors.accent, fontWeight = FontWeight.Bold, fontSize = 17.sp)
            ToggleRow(colors, "تشغيل الأذان في موعد الصلاة", adhanOn, onAdhan)
            Divider(color = colors.line)
            ToggleRow(colors, "تذكير الصلاة الاختياري", reminderOn, onReminder)
            Text("التذكير الصوتي لا يعمل إلا بعد سماحك للميكروفون، ولا يتم حفظ تسجيل صوتي.", color = colors.muted, fontSize = 11.sp)
            Text("لأفضل دقة لموعد الأذان اسمح بصلاحية المنبهات الدقيقة. عند رفضها قد يتأخر التنبيه حسب نظام الهاتف.", color = colors.muted, fontSize = 11.sp, modifier = Modifier.padding(top = 6.dp))
            Spacer(Modifier.height(8.dp))
            GoldButton(colors, "تجربة الأذان الآن", modifier = Modifier.fillMaxWidth(), onClick = onTestAdhan)
            TextButton(onClick = onPermissions, modifier = Modifier.fillMaxWidth()) { Text("ضبط أذونات الأذان", color = colors.accent) }
        }
        Spacer(Modifier.height(10.dp))
        GlassCard(colors) {
            Text("عن أَثَر", color = colors.accent, fontSize = 17.sp, fontWeight = FontWeight.Bold)
            Text("أَثَر — رفيقك اليومي للقرآن والصلاة والذكر.", color = colors.text, fontSize = 14.sp, modifier = Modifier.padding(top = 7.dp))
            Text("الإصدار الأصلي التجريبي 2.5.0", color = colors.muted, fontSize = 11.sp, modifier = Modifier.padding(top = 6.dp))
        }
        Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun ToggleRow(colors: AtharPalette, label: String, checked: Boolean, onChecked: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(vertical = 9.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = colors.text, fontSize = 14.sp, modifier = Modifier.weight(1f).padding(end = 8.dp))
        Switch(checked = checked, onCheckedChange = onChecked)
    }
}

private fun openAdhanPermissionFlow(context: Context) {
    runCatching {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("athar-adhan://perms")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}

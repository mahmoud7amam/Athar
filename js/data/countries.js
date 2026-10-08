/* أَثَر — بيانات: الدول والمدن */

const arabCountries = {
    "Egypt": { ar: "مصر", cities: [{ar:"القاهرة",en:"Cairo"},{ar:"الإسكندرية",en:"Alexandria"},{ar:"الجيزة",en:"Giza"},{ar:"الدقهلية",en:"Dakahlia"},{ar:"البحر الأحمر",en:"Red Sea"},{ar:"البحيرة",en:"Beheira"},{ar:"الفيوم",en:"Faiyum"},{ar:"الغربية",en:"Gharbia"},{ar:"الإسماعيلية",en:"Ismailia"},{ar:"المنوفية",en:"Monufia"},{ar:"المنيا",en:"Minya"},{ar:"القليوبية",en:"Qalyubia"},{ar:"الوادي الجديد",en:"New Valley"},{ar:"الشرقية",en:"Sharqia"},{ar:"السويس",en:"Suez"},{ar:"أسوان",en:"Aswan"},{ar:"أسيوط",en:"Asyut"},{ar:"بني سويف",en:"Beni Suef"},{ar:"بورسعيد",en:"Port Said"},{ar:"دمياط",en:"Damietta"},{ar:"جنوب سيناء",en:"South Sinai"},{ar:"كفر الشيخ",en:"Kafr el-Sheikh"},{ar:"مطروح",en:"Matrouh"},{ar:"قنا",en:"Qena"},{ar:"شمال سيناء",en:"North Sinai"},{ar:"سوهاج",en:"Sohag"},{ar:"الأقصر",en:"Luxor"}] },
    "Saudi Arabia": { ar: "السعودية", cities: [{ar:"الرياض",en:"Riyadh"},{ar:"جدة",en:"Jeddah"},{ar:"مكة المكرمة",en:"Makkah"},{ar:"المدينة المنورة",en:"Madinah"},{ar:"الدمام",en:"Dammam"},{ar:"الخبر",en:"Khobar"},{ar:"الطائف",en:"Taif"},{ar:"تبوك",en:"Tabuk"},{ar:"بريدة",en:"Buraidah"},{ar:"خميس مشيط",en:"Khamis Mushait"},{ar:"أبها",en:"Abha"},{ar:"الجبيل",en:"Jubail"},{ar:"نجران",en:"Najran"},{ar:"ينبع",en:"Yanbu"},{ar:"حائل",en:"Hail"},{ar:"حفر الباطن",en:"Hafar Al Batin"}] },
    "UAE": { ar: "الإمارات", cities: [{ar:"دبي",en:"Dubai"},{ar:"أبوظبي",en:"Abu Dhabi"},{ar:"الشارقة",en:"Sharjah"},{ar:"العين",en:"Al Ain"},{ar:"عجمان",en:"Ajman"},{ar:"رأس الخيمة",en:"Ras Al Khaimah"},{ar:"الفجيرة",en:"Fujairah"},{ar:"أم القيوين",en:"Umm Al Quwain"}] },
    "Kuwait": { ar: "الكويت", cities: [{ar:"مدينة الكويت",en:"Kuwait City"},{ar:"حولي",en:"Hawalli"},{ar:"الفروانية",en:"Al Farwaniyah"},{ar:"الأحمدي",en:"Al Ahmadi"},{ar:"الجهراء",en:"Al Jahra"},{ar:"السالمية",en:"Salmiya"}] },
    "Qatar": { ar: "قطر", cities: [{ar:"الدوحة",en:"Doha"},{ar:"الريان",en:"Al Rayyan"},{ar:"الوكرة",en:"Al Wakrah"},{ar:"الخور",en:"Al Khor"},{ar:"أم صلال",en:"Umm Salal"}] },
    "Bahrain": { ar: "البحرين", cities: [{ar:"المنامة",en:"Manama"},{ar:"المحرق",en:"Muharraq"},{ar:"الرفاع",en:"Riffa"},{ar:"مدينة حمد",en:"Hamad Town"},{ar:"عالي",en:"A'ali"}] },
    "Oman": { ar: "عُمان", cities: [{ar:"مسقط",en:"Muscat"},{ar:"صلالة",en:"Salalah"},{ar:"صحار",en:"Sohar"},{ar:"نزوى",en:"Nizwa"},{ar:"صور",en:"Sur"},{ar:"الرستاق",en:"Rustaq"}] },
    "Yemen": { ar: "اليمن", cities: [{ar:"صنعاء",en:"Sanaa"},{ar:"عدن",en:"Aden"},{ar:"تعز",en:"Taiz"},{ar:"الحديدة",en:"Al Hudaydah"},{ar:"المكلا",en:"Mukalla"},{ar:"إب",en:"Ibb"}] },
    "Jordan": { ar: "الأردن", cities: [{ar:"عمان",en:"Amman"},{ar:"إربد",en:"Irbid"},{ar:"الزرقاء",en:"Zarqa"},{ar:"العقبة",en:"Aqaba"},{ar:"السلط",en:"As-Salt"},{ar:"المفرق",en:"Mafraq"}] },
    "Palestine": { ar: "فلسطين", cities: [{ar:"القدس",en:"Jerusalem"},{ar:"غزة",en:"Gaza"},{ar:"رام الله",en:"Ramallah"},{ar:"الخليل",en:"Hebron"},{ar:"نابلس",en:"Nablus"},{ar:"جنين",en:"Jenin"},{ar:"بيت لحم",en:"Bethlehem"}] },
    "Syria": { ar: "سوريا", cities: [{ar:"دمشق",en:"Damascus"},{ar:"حلب",en:"Aleppo"},{ar:"حمص",en:"Homs"},{ar:"اللاذقية",en:"Latakia"},{ar:"حماة",en:"Hama"},{ar:"طرطوس",en:"Tartus"}] },
    "Lebanon": { ar: "لبنان", cities: [{ar:"بيروت",en:"Beirut"},{ar:"طرابلس",en:"Tripoli"},{ar:"صيدا",en:"Sidon"},{ar:"صور",en:"Tyre"},{ar:"زحلة",en:"Zahle"}] },
    "Iraq": { ar: "العراق", cities: [{ar:"بغداد",en:"Baghdad"},{ar:"البصرة",en:"Basra"},{ar:"الموصل",en:"Mosul"},{ar:"أربيل",en:"Erbil"},{ar:"كركوك",en:"Kirkuk"},{ar:"النجف",en:"Najaf"},{ar:"كربلاء",en:"Karbala"}] },
    "Algeria": { ar: "الجزائر", cities: [{ar:"الجزائر العاصمة",en:"Algiers"},{ar:"وهران",en:"Oran"},{ar:"قسنطينة",en:"Constantine"},{ar:"عنابة",en:"Annaba"},{ar:"البليدة",en:"Blida"},{ar:"باتنة",en:"Batna"}] },
    "Morocco": { ar: "المغرب", cities: [{ar:"الدار البيضاء",en:"Casablanca"},{ar:"الرباط",en:"Rabat"},{ar:"فاس",en:"Fes"},{ar:"مراكش",en:"Marrakesh"},{ar:"طنجة",en:"Tangier"},{ar:"أكادير",en:"Agadir"}] },
    "Tunisia": { ar: "تونس", cities: [{ar:"تونس العاصمة",en:"Tunis"},{ar:"صفاقس",en:"Sfax"},{ar:"سوسة",en:"Sousse"},{ar:"القيروان",en:"Kairouan"},{ar:"بنزرت",en:"Bizerte"}] },
    "Libya": { ar: "ليبيا", cities: [{ar:"طرابلس",en:"Tripoli"},{ar:"بنغازي",en:"Benghazi"},{ar:"مصراتة",en:"Misrata"},{ar:"البيضاء",en:"Bayda"}] },
    "Sudan": { ar: "السودان", cities: [{ar:"الخرطوم",en:"Khartoum"},{ar:"أم درمان",en:"Omdurman"},{ar:"بورتسودان",en:"Port Sudan"},{ar:"كسلا",en:"Kassala"}] },
    "Mauritania": { ar: "موريتانيا", cities: [{ar:"نواكشوط",en:"Nouakchott"},{ar:"نواذيبو",en:"Nouadhibou"},{ar:"كيفه",en:"Kiffa"}] },
    "Somalia": { ar: "الصومال", cities: [{ar:"مقديشو",en:"Mogadishu"},{ar:"هرجيسا",en:"Hargeisa"},{ar:"بوساسو",en:"Bosaso"}] },
    "Djibouti": { ar: "جيبوتي", cities: [{ar:"جيبوتي",en:"Djibouti"},{ar:"علي صبيح",en:"Ali Sabieh"}] },
    "Comoros": { ar: "جزر القمر", cities: [{ar:"موروني",en:"Moroni"},{ar:"موتسامودو",en:"Mutsamudu"}] }
};

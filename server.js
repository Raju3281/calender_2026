// ------------------------------------------------------------
// IMPORTS
// ------------------------------------------------------------
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import moment from "moment-timezone";
import fs from "fs";
import path from "path";

const festivalsEn2025 = JSON.parse(
  fs.readFileSync(path.resolve("data/festivals_en_2025.json"), "utf-8")
);
const festivalsTe2025 = JSON.parse(
  fs.readFileSync(path.resolve("data/festivals_te_2025.json"), "utf-8")
);
const festivalsEn2026 = JSON.parse(
  fs.readFileSync(path.resolve("data/festivals_en_2026.json"), "utf-8")
);

const festivalsTe2026 = JSON.parse(
  fs.readFileSync(path.resolve("data/festivals_te_2026.json"), "utf-8")
);
// 2027
const festivalsEn2027 = JSON.parse(
  fs.readFileSync(path.resolve("data/festivals_en_2027.json"), "utf-8")
);
const festivalsTe2027 = JSON.parse(
  fs.readFileSync(path.resolve("data/festivals_te_2027.json"), "utf-8")
);
import {
  getPanchangam,
  Observer,
  tithiNames,
  nakshatraNames,
  yogaNames,
  karanaNames,
} from "@ishubhamx/panchangam-js";

import Astronomy from "astronomy-engine";

// ------------------------------------------------------------
dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());
const PORT = process.env.PORT || 4000;

// ------------------------------------------------------------
// CONSTANTS & HELPERS
// ------------------------------------------------------------
const DEFAULT_LAT = 17.385;
const DEFAULT_LON = 78.4867;
const DEFAULT_ELEV = 520;
const DEFAULT_TZ = "Asia/Kolkata";

function normalizeDate(dateStr) {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) throw new Error("Invalid date");
  return d;
}

function fmtTime(dt) {
  if (!dt) return null;
  return moment(dt).tz(DEFAULT_TZ).format("HH:mm");
}
function fmtDate(dt) {
  return moment(dt).tz(DEFAULT_TZ).format("YYYY-MM-DD");
}

function mods(d) {
  let x = d % 360;
  if (x < 0) x += 360;
  return x;
}

function rasiIndex(deg) {
  let d = mods(deg);
  return Math.floor(d / 30); // 0..11
}

function houseFromBirth(birthIndex, planetIndex) {
  return ((planetIndex - birthIndex + 12) % 12) + 1; // 1..12
}

const RASIS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];

const RASI_EN_DISPLAY = [
  "Mesha (Aries)",
  "Vrishabha (Taurus)",
  "Mithuna (Gemini)",
  "Karka (Cancer)",
  "Simha (Leo)",
  "Kanya (Virgo)",
  "Tula (Libra)",
  "Vrischika (Scorpio)",
  "Dhanu (Sagittarius)",
  "Makara (Capricorn)",
  "Kumbha (Aquarius)",
  "Meena (Pisces)",
];

const RASI_TE_DISPLAY = [
  "మేషం",
  "వృషభం",
  "మిథునం",
  "కర్కాటకం",
  "సింహం",
  "కన్యా",
  "తులా",
  "వృశ్చికం",
  "ధనుస్సు",
  "మకరం",
  "కుంభం",
  "మీనం",
];

const HOUSE_MEANING_EN = {
  1: "self, body, personality and mindset",
  2: "wealth, family, speech and food",
  3: "courage, effort, communication and siblings",
  4: "home, emotions, mother, vehicles and comforts",
  5: "intelligence, children, creativity and romance",
  6: "enemies, diseases, debts and daily work",
  7: "marriage, partnerships and public interactions",
  8: "sudden events, hidden matters and deep changes",
  9: "luck, dharma, higher wisdom and blessings",
  10: "career, status, responsibilities and karma",
  11: "gains, profits, desires and friends",
  12: "losses, expenses, isolation and spiritual growth",
};

const HOUSE_MEANING_TE = {
  1: "శరీరం, వ్యక్తిత్వం, మనస్తత్వం",
  2: "ధనం, కుటుంబం, మాట, ఆహారం",
  3: "ధైర్యం, ప్రయత్నం, సహోదరులు",
  4: "ఇల్లు, తల్లి, భావోద్వేగాలు, వాహనాలు",
  5: "బుద్ధి, పిల్లలు, సృజనాత్మకత, ప్రేమ",
  6: "రోగాలు, శత్రువులు, అప్పులు, పనిభారం",
  7: "వివాహం, భాగస్వామ్యం, ఇతరులతో సంబంధాలు",
  8: "ఆకస్మిక సంఘటనలు, గోప్య విషయాలు, మార్పులు",
  9: "అదృష్టం, ధర్మం, ఉన్నత జ్ఞానం, ఆశీర్వాదం",
  10: "వృత్తి, స్థానం, బాధ్యత, కర్మ",
  11: "లాభాలు, స్నేహితులు, కోరికలు",
  12: "నష్టాలు, వ్యయం, ఒంటరితనం, ఆధ్యాత్మికత",
};

// Moon house → base score
const HOUSE_SCORE = {
  1: 0,
  2: 2,
  3: 1,
  4: 0,
  5: 2,
  6: -2,
  7: 1,
  8: -3,
  9: 3,
  10: -1,
  11: 3,
  12: -2,
};

function qualityFromScore(s) {
  if (s >= 3) return "excellent";
  if (s === 1 || s === 2) return "good";
  if (s === 0) return "mixed";
  if (s === -1 || s === -2) return "bad";
  return "very_bad"; // <= -3
}

const QUALITY_EN = {
  excellent: "excellent, highly favourable",
  good: "good and supportive",
  mixed: "mixed / average",
  bad: "difficult and challenging",
  very_bad: "very challenging, high caution needed",
};

const QUALITY_TE = {
  excellent: "అత్యంత శుభదాయకం",
  good: "శుభప్రదం",
  mixed: "మిశ్రమ ఫలితం",
  bad: "కొంత కష్టంతో",
  very_bad: "చాలా కఠినమైన రోజు",
};

// Section templates per quality
const BLOCKS_EN = {
  excellent: {
    finance:
      "Finances look strong. Gains, collections or new opportunities can come easily. Good day to plan or expand investments with practical wisdom.",
    career:
      "In career and work, support from seniors and colleagues is likely. Important tasks can move forward smoothly and your efforts may get recognition.",
    health:
      "Health and energy remain high. You can handle extra workload without much fatigue. Good day to start or continue exercise routines.",
    relations:
      "Family and relationships are warm. Harmony in home and personal life supports your decisions. Good day for discussions and bonding.",
    remedy:
      "As a gratitude for the good support, do a small act of charity or help someone genuinely who needs it.",
  },
  good: {
    finance:
      "Money matters remain stable with scope for small improvements. Good for clearing pending payments and doing practical financial planning.",
    career:
      "The work environment is mostly supportive. You can make progress in pending tasks and receive cooperation if you stay organized.",
    health:
      "Health is generally okay. Mild tiredness is possible if you overwork, so take breaks and hydrate well.",
    relations:
      "Relations with family and partner are mostly positive. Small misunderstandings clear quickly with open communication.",
    remedy:
      "Light a ghee lamp or incense and spend a few quiet moments in prayer or gratitude for the stability in life.",
  },
  mixed: {
    finance:
      "Financially the day looks average. Try to avoid big commitments or risky decisions. Focus on maintaining balance in income and expenses.",
    career:
      "Work may show both supporting and blocking situations. Some tasks move ahead while others get delayed. Patience and clear communication help.",
    health:
      "Energy can fluctuate. Take care of food, sleep and water. Avoid mental overthinking and balance screen time.",
    relations:
      "Emotionally you may feel sensitive. Handle family discussions slowly, without reacting instantly. Listening more than speaking helps.",
    remedy:
      "Spend 5–10 minutes in quiet breathing or mantra chanting to stabilize the mind and reduce confusion.",
  },
  bad: {
    finance:
      "Expenses, delays in money or unwanted spending are possible. Avoid taking loans, giving large hand loans or entering new risky deals today.",
    career:
      "At work, pressure or criticism may show up. Avoid conflicts with seniors or colleagues. Focus on doing your duty carefully.",
    health:
      "Stress, fatigue or body pain can increase if you push yourself too much. Pay attention to digestion and sleep.",
    relations:
      "Misunderstandings in family or partner relations may arise. Choose words carefully and avoid harsh speech or blame.",
    remedy:
      "In the morning, offer water to the Sun and resolve to avoid negative talk. Keeping calm will reduce impact of planetary pressure.",
  },
  very_bad: {
    finance:
      "Finances need strong caution. Avoid any major decisions, speculative deals, new loans or large purchases. Today is for protection, not expansion.",
    career:
      "Work may feel heavy, slow or blocked. Delays, mistakes or criticism are possible. Only do what is absolutely necessary and avoid over-promising.",
    health:
      "Low energy, stress or sleep disturbance is likely. Don’t ignore even small health signals. Rest properly and avoid unnecessary strain.",
    relations:
      "Emotions can be intense. Small issues may turn into arguments if you react quickly. Silence is better than angry replies today.",
    remedy:
      "Chant a simple Shiva or Hanuman mantra and if possible do a small donation (food, water or money) to someone in need.",
  },
};

const BLOCKS_TE = {
  excellent: {
    finance:
      "ధన విషయంలో మంచి స్థితి కనిపిస్తుంది. లాభాలు, చెల్లింపులు లేదా కొత్త అవకాశాలు వచ్చే సూచనలు ఉన్నాయి. ఆలోచనతో పెట్టుబడులు ప్లాన్ చేయడానికి అనుకూలమైన రోజు.",
    career:
      "ఉద్యోగం/వ్యాపారంలో ఉన్నతాధికారులు, సహోద్యోగుల నుండి మంచి సహకారం లభించే అవకాశం ఉంది. పెండింగ్ పనులు సాఫీగా పూర్తవుతాయి.",
    health:
      "ఆరోగ్యం, శక్తి మంచి స్థాయిలో ఉంటుంది. ఎక్కువ పని చేసినా పెద్దగా అలసటగా అనిపించదు. వ్యాయామం ప్రారంభించడానికి కూడా మంచి రోజు.",
    relations:
      "కుటుంబం, భాగస్వామ్య సంబంధాలు సానుకూలంగా ఉంటాయి. ఇంటి వాతావరణం ఆనందంగా ఉండే అవకాశం ఉంది. మంచి మాట్లాడే అవకాశం గా ఉపయోగించుకోండి.",
    remedy:
      "ఈ రోజు లభించిన శుభ ఫలితాలకు కృతజ్ఞతగా, మీ సామర్థ్యానికి తగ్గట్టు ఎవరికైనా చిన్న సహాయం చేయండి.",
  },
  good: {
    finance:
      "ఆర్థిక విషయాలు సాధారణంగా స్థిరంగా ఉంటాయి. చిన్న ప్రయోజనాలు, సాధారణ లాభాలు కనిపిస్తాయి. పెండింగ్ బిల్లులు, చెల్లింపులు క్లియర్ చేయడానికి అనుకూలమైన రోజు.",
    career:
      "పని విషయంలో సాధారణంగా సహకారం కనిపిస్తుంది. ప్లాన్‌తో పనిచేస్తే పనులు ముందుకు సాగుతాయి.",
    health:
      "ఆరోగ్యంగా ఉంటారు. అయితే ఎక్కువగా పని చేస్తే లేదా ఒత్తిడి పెరిగితే స్వల్ప అలసట ఉండవచ్చు.",
    relations:
      "కుటుంబ సభ్యులు, స్నేహితులతో సంబంధాలు బాగానే ఉంటాయి. చిన్న అపార్థాలు వచ్చినా త్వరగా పరిష్కారం దొరుకుతుంది.",
    remedy:
      "ఒక దీపం లేదా అగర్బత్తి వెలిగించి, కొన్ని నిమిషాలు ప్రశాంతంగా ప్రార్థనలో గడపండి.",
  },
  mixed: {
    finance:
      "ధన విషయంలో పెద్ద లాభం లేకపోయినా పెద్ద నష్టం కూడా కనిపించడం లేదు. కొత్త ఆర్థిక నిర్ణయాలు తీసుకోవడం కంటే ప్రస్తుత పరిస్థితిని నిలబెట్టుకోవడం మంచిది.",
    career:
      "పని విషయంలో ఎత్తుపల్లాలు ఉండే రోజు. కొన్ని పనులు సులభంగా జరగగా, మరికొన్ని పనులు ఆలస్యం కావచ్చు. ఓపికగా, ప్లాన్‌తో ముందుకు వెళితే మంచిది.",
    health:
      "శక్తి స్థాయి మధ్యమంగా ఉండే అవకాశం ఉంది. ఆహారం, నిద్ర, నీటి సేవనంపై కొంచెం శ్రద్ధ పెట్టండి.",
    relations:
      "భావోద్వేగంగా కొద్దిగా సెన్సిటివ్‌గా అనిపించవచ్చు. ఇంట్లో మాట్లాడేటప్పుడు చాలా జాగ్రత్తగా మాట్లాడండి.",
    remedy:
      "5–10 నిమిషాలు ప్రశాంతంగా కూర్చొని శ్వాసాభ్యాసం చేయండి లేదా మీకు నచ్చిన మంత్రాన్ని జపించండి.",
  },
  bad: {
    finance:
      "ఖర్చులు పెరగడం, డబ్బు అడ్డుకుపోవడం వంటి సూచనలు కనిపిస్తాయి. ఈ రోజు అప్పులు తీసుకోవడం, పెద్ద పెట్టుబడులు పెట్టడం టాలివేయాలి.",
    career:
      "పని విషయంలో ఒత్తిడి లేదా విమర్శలు ఎదురయ్యే అవకాశం ఉంది. unnecessary వాదనలు తప్పించుకోవడం మంచిది.",
    health:
      "స్ట్రెస్, అలసట లేదా చిన్న చిన్న శారీరక సమస్యలు ఎక్కువయ్యే అవకాశం. ఆహారాన్ని జాగ్రత్తగా తీసుకోవాలి, విశ్రాంతికి సమయం కేటాయించాలి.",
    relations:
      "కుటుంబంలో, సంబంధాలలో అపార్థాలు, వాదనలు వచ్చే అవకాశం ఉంది. కఠినమైన మాటలు మాట్లాడకుండా జాగ్రత్త పడండి.",
    remedy:
      "ఉదయం సమయంలో సూర్యనారాయణుడికి నీరు సమర్పించి కొన్ని క్షణాలు నిశ్శబ్దంగా ప్రార్థించండి.",
  },
  very_bad: {
    finance:
      "ధన విషయాల్లో అత్యధిక జాగ్రత్త అవసరం. కొత్త అప్పులు, పెద్ద ఖర్చులు, రిస్కీ పెట్టుబడులు పూర్తిగా నివారించాలి.",
    career:
      "ఉద్యోగం/వ్యాపారంలో ఆలస్యం, ఒత్తిడి, తప్పుబాట్లు ఎక్కువయ్యే సూచనలు ఉన్నాయి. అవసరమైన పనులు మాత్రమే సైలెంట్‌గా పూర్తి చేయండి.",
    health:
      "శక్తి తక్కువగా అనిపించడం, ఒత్తిడి, నిద్రలేమి వంటి సమస్యలు రావచ్చు. శరీరం ఇచ్చే సంకేతాలను నిర్లక్ష్యం చేయకండి.",
    relations:
      "చిన్న విషయాలు కూడా పెద్ద గొడవలకు దారి తీసే అవకాశం. కోపంతో స్పందించకుండా, అవసరమైతే మౌనం పాటించండి.",
    remedy:
      "శివుడు లేదా హనుమంతుడి నామస్మరణ చేయండి. మీకు సాధ్యమైనంతవరకు దరద్రులకు అన్నం/నీరు/సహాయం అందించండి.",
  },
};

// build descriptive phalam text
function buildPhalam({
  dateStr,
  birthIndex,
  birthKey,
  lang,
  quality,
  totalScore,
  moonHouse,
  planets,
}) {
  const isTe = lang === "te";
  const rasiEn = RASI_EN_DISPLAY[birthIndex];
  const rasiTe = RASI_TE_DISPLAY[birthIndex];

  const qWord = isTe ? QUALITY_TE[quality] : QUALITY_EN[quality];
  const blocks = isTe ? BLOCKS_TE[quality] : BLOCKS_EN[quality];

  const houseMeaning = isTe
    ? HOUSE_MEANING_TE[moonHouse]
    : HOUSE_MEANING_EN[moonHouse];

  // small planet influence summary
  const beneficNotes = [];
  const maleficNotes = [];

  const goodHouses = [1, 2, 5, 7, 9, 11];
  const badHouses = [6, 8, 12];

  if (planets.jupiter) {
    const h = planets.jupiter.house_from_birth;
    if (goodHouses.includes(h))
      beneficNotes.push(isTe ? `గురుడు ${h}వ ఇంటిలో` : `Jupiter in house ${h}`);
    if (badHouses.includes(h))
      maleficNotes.push(isTe ? `గురుడు ${h}వ ఇంటిలో` : `Jupiter in house ${h}`);
  }
  if (planets.venus) {
    const h = planets.venus.house_from_birth;
    if (goodHouses.includes(h))
      beneficNotes.push(isTe ? `శుక్రుడు ${h}వ ఇంటిలో` : `Venus in house ${h}`);
    if (badHouses.includes(h))
      maleficNotes.push(isTe ? `శుక్రుడు ${h}వ ఇంటిలో` : `Venus in house ${h}`);
  }
  if (planets.saturn) {
    const h = planets.saturn.house_from_birth;
    if (badHouses.includes(h))
      maleficNotes.push(isTe ? `శని ${h}వింటిలో` : `Saturn in house ${h}`);
  }
  if (planets.mars) {
    const h = planets.mars.house_from_birth;
    if (badHouses.includes(h))
      maleficNotes.push(isTe ? `కుజుడు ${h}వింటిలో` : `Mars in house ${h}`);
  }

  let planetLine = "";
  if (isTe) {
    const goodText = beneficNotes.length
      ? `శుభ గ్రహ ప్రభావం: ${beneficNotes.join(", ")}. `
      : "";
    const badText = maleficNotes.length
      ? `పాప గ్రహ ఒత్తిడి: ${maleficNotes.join(", ")}. `
      : "";
    planetLine =
      goodText || badText
        ? goodText + badText
        : "ప్రత్యేకమైన గ్రహ ప్రభావం సాధారణ స్థాయిలోనే ఉంది.";
  } else {
    const goodText = beneficNotes.length
      ? `Supportive planets: ${beneficNotes.join(", ")}. `
      : "";
    const badText = maleficNotes.length
      ? `Challenging planets: ${maleficNotes.join(", ")}. `
      : "";
    planetLine =
      goodText || badText
        ? goodText + badText
        : "Planetary influences are moderate without extreme highs or lows today.";
  }

  if (!blocks) {
    return isTe
      ? "ఈ రోజు ఫలితాలు సాధారణంగా మిశ్రమంగా ఉంటాయి."
      : "Today shows mixed results with no strong positive or negative extremes.";
  }

  if (isTe) {
    return [
      `${fmtDate(new Date(dateStr))} నాడు ${rasiTe} రాశి వారికి, చంద్రుడు మీ జన్మరాశి నుండి ${moonHouse}వ ఇంటిలో (${houseMeaning}) సంచరిస్తున్నాడు.`,
      `మొత్తం ఫలిత ధోరణి: ${qWord} (స్కోర్ ${totalScore}).`,
      "",
      `ఆర్థికం: ${blocks.finance}`,
      `ఉద్యోగం/వ్యాపారం: ${blocks.career}`,
      `ఆరోగ్యం: ${blocks.health}`,
      `కుటుంబం / సంబంధాలు: ${blocks.relations}`,
      `గ్రహ ప్రభావం: ${planetLine}`,
      `పరిహారం: ${blocks.remedy}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  } else {
    return [
      `For ${rasiEn} natives, on ${dateStr}, the Moon is transiting your ${moonHouse}ᵗʰ house (${houseMeaning}).`,
      `Overall day quality: ${qWord} (score ${totalScore}).`,
      "",
      `FINANCE: ${blocks.finance}`,
      `CAREER & WORK: ${blocks.career}`,
      `HEALTH: ${blocks.health}`,
      `RELATIONSHIPS & FAMILY: ${blocks.relations}`,
      `PLANETARY INFLUENCE: ${planetLine}`,
      `REMEDY: ${blocks.remedy}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  }
}

// ------------------------------------------------------------
// PLANET CALC USING astronomy-engine 2.1.19
// ------------------------------------------------------------

// Sun → SunPosition().elon
function longitudeSun(date) {
  const s = Astronomy.SunPosition(date);
  return mods(s.elon);
}

// Moon → EclipticLongitude(Moon)
function longitudeMoon(date) {
  return mods(Astronomy.EclipticLongitude(Astronomy.Body.Moon, date));
}

// Other planets → EclipticLongitude
function longitudePlanet(body, date) {
  return mods(Astronomy.EclipticLongitude(body, date));
}

function getPlanetData(date) {
  return {
    sun: longitudeSun(date),
    moon: longitudeMoon(date),
    mercury: longitudePlanet(Astronomy.Body.Mercury, date),
    venus: longitudePlanet(Astronomy.Body.Venus, date),
    mars: longitudePlanet(Astronomy.Body.Mars, date),
    jupiter: longitudePlanet(Astronomy.Body.Jupiter, date),
    saturn: longitudePlanet(Astronomy.Body.Saturn, date),
  };
}

// ------------------------------------------------------------
// API: PANCHANG (POST)
// ------------------------------------------------------------
// ------------------------------------------------------------
// API: PANCHANG (POST) - FIXED
// ------------------------------------------------------------
app.post("/api/panchang", (req, res) => {
  try {
    const { date, lang = "en" } = req.body || {};
    const d = normalizeDate(date);

    const obs = new Observer(DEFAULT_LAT, DEFAULT_LON, DEFAULT_ELEV);
    const p = getPanchangam(d, obs);

    // --- RASHI CALC ---
    const sunLon = longitudeSun(d);
    const moonLon = longitudeMoon(d);

    const suryaRasiIndex = rasiIndex(sunLon);
    const chandraRasiIndex = rasiIndex(moonLon);

    const suryaRashi =
      lang === "te"
        ? RASI_TE_DISPLAY[suryaRasiIndex]
        : RASI_EN_DISPLAY[suryaRasiIndex];

    const chandraRashi =
      lang === "te"
        ? RASI_TE_DISPLAY[chandraRasiIndex]
        : RASI_EN_DISPLAY[chandraRasiIndex];

    // --- PAKSHA ---
    const paksha =
      p.tithi <= 15
        ? lang === "te"
          ? "శుక్ల పక్షం"
          : "Shukla Paksha"
        : lang === "te"
        ? "కృష్ణ పక్షం"
        : "Krishna Paksha";

    res.json({
      date: fmtDate(d),

      // Core Panchangam
      paksha,
      tithi: tithiNames[p.tithi],
      nakshatra: nakshatraNames[p.nakshatra],
      yoga: yogaNames[p.yoga],
      karana: karanaNames[p.karana], // Ensure karanaNames is complete

      // Timings
      sunrise: fmtTime(p.sunrise),
      sunset: fmtTime(p.sunset),
      moonrise: fmtTime(p.moonrise),
      moonset: fmtTime(p.moonset),

      // --- FIXED TIMING CHECKS ---
      rahu_kalam:
        p.rahuKalamStart && p.rahuKalamEnd
          ? `${fmtTime(p.rahuKalamStart)} - ${fmtTime(p.rahuKalamEnd)}`
          : null,

      yamagandam:
        p.yamagandamStart && p.yamagandamEnd
          ? `${fmtTime(p.yamagandamStart)} - ${fmtTime(p.yamagandamEnd)}`
          : null,

      gulika_kalam:
        p.gulikaStart && p.gulikaEnd
          ? `${fmtTime(p.gulikaStart)} - ${fmtTime(p.gulikaEnd)}`
          : null,
          
      abhijit:
        p.abhijitStart && p.abhijitEnd
          ? `${fmtTime(p.abhijitStart)} - ${fmtTime(p.abhijitEnd)}`
          : null,
      
      durmuhurtham: [
        p.durmuhurta1Start && p.durmuhurta1End
          ? `${fmtTime(p.durmuhurta1Start)} - ${fmtTime(
              p.durmuhurta1End
            )}`
          : null,
        p.durmuhurta2Start && p.durmuhurta2End
          ? `${fmtTime(p.durmuhurta2Start)} - ${fmtTime(
              p.durmuhurta2End
            )}`
          : null,
      ].filter(Boolean),

      // Rashis
      surya_rashi: suryaRashi,
      chandra_rashi: chandraRashi,
    });
  } catch (err) {
    console.error("PANCHANG ERROR:", err);
    res.status(500).json({ error: err.toString() });
  }
});

// ------------------------------------------------------------
// API: RASI PHALAM (POST)
// ------------------------------------------------------------
app.post("/api/rasi-phalam", (req, res) => {
  console.log("RASI PHALAM REQUEST:", req.body);

  try {
    const { date, birth_rasi, lang = "en" } = req.body || {};

    // ---------- VALIDATION ----------
    if (!birth_rasi) {
      return res.status(400).json({
        error: "missing_birth_rasi",
        message: "birth_rasi is required",
      });
    }

    const birthKey = String(birth_rasi).trim().toLowerCase();
    const birthIndex = RASIS.indexOf(birthKey);

    if (birthIndex === -1) {
      return res.status(400).json({
        error: "invalid_rasi",
        message: "birth_rasi must be one of: " + RASIS.join(", "),
        received: birthKey,
      });
    }

    const langNormalized = lang.toLowerCase() === "te" ? "te" : "en";

    // ---------- DATE ----------
    const d = normalizeDate(date);
    const outDate = fmtDate(d);

    // ---------- PLANET DATA ----------
    const deg = getPlanetData(d);
    const planets = {};

    for (const [planet, longitude] of Object.entries(deg)) {
      const rasiIndexVal = rasiIndex(longitude);
      const house = houseFromBirth(birthIndex, rasiIndexVal);

      planets[planet] = {
        longitude,
        rasi: RASIS[rasiIndexVal], // logic key
        rasi_index: rasiIndexVal,
        rasi_display:
          langNormalized === "te"
            ? RASI_TE_DISPLAY[rasiIndexVal]
            : RASI_EN_DISPLAY[rasiIndexVal],
        house_from_birth: house,
      };
    }

    // ---------- SCORING ----------
    const moonHouse = planets.moon.house_from_birth;
    const baseScore = HOUSE_SCORE[moonHouse] ?? 0;

    let beneficScore = 0;
    let maleficScore = 0;

    // Benefics
    for (const p of ["jupiter", "venus"]) {
      const h = planets[p].house_from_birth;
      if ([2, 5, 7, 9, 11].includes(h)) beneficScore += 1;
      if ([6, 8, 12].includes(h)) beneficScore -= 1;
    }

    // Malefics
    for (const p of ["mars", "saturn"]) {
      const h = planets[p].house_from_birth;
      if ([6, 8, 12].includes(h)) maleficScore += 1;
    }

    // Sun slight malefic
    if ([8, 12].includes(planets.sun.house_from_birth)) {
      maleficScore += 1;
    }

    const totalScore = baseScore + beneficScore - maleficScore;
    const quality = qualityFromScore(totalScore);

    // ---------- PHALAM ----------
    const phalam_en = buildPhalam({
      dateStr: outDate,
      birthIndex,
      birthKey,
      lang: "en",
      quality,
      totalScore,
      moonHouse,
      planets,
    });

    const phalam_te = buildPhalam({
      dateStr: outDate,
      birthIndex,
      birthKey,
      lang: "te",
      quality,
      totalScore,
      moonHouse,
      planets,
    });

    // ---------- RESPONSE ----------
    res.json({
      date: outDate,

      birth_rasi: birthKey,
      birth_rasi_display:
        langNormalized === "te"
          ? RASI_TE_DISPLAY[birthIndex]
          : RASI_EN_DISPLAY[birthIndex],

      moon_rasi_today: planets.moon.rasi,
      moon_rasi_display: planets.moon.rasi_display,
      moon_house_from_birth: moonHouse,

      base_score: baseScore,
      benefic_score: beneficScore,
      malefic_score: maleficScore,
      total_score: totalScore,
      quality,

      planets,

      phalam_en,
      phalam_te,
      phalam: langNormalized === "te" ? phalam_te : phalam_en,
    });
  } catch (err) {
    console.error("RASI PHALAM ERROR:", err);
    res.status(500).json({
      error: "rasi_phalam_error",
      message: err.message || String(err),
    });
  }
});

app.get("/api/festivals", (req, res) => {
  try {
    const { year, month, lang = "en" } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        error: "year_and_month_required",
      });
    }

    const yearNum = Number(year);
    const monthNum = Number(month);
    const langKey = lang === "te" ? "te" : "en";

    // ---------------- YEAR + LANGUAGE DATA MAP ----------------

    const FESTIVAL_DATA = {
      2025: {
        en: festivalsEn2025,
        te: festivalsTe2025,
      },
      2026: {
        en: festivalsEn2026,
        te: festivalsTe2026,
      },
      2027: {
        en: festivalsEn2027,
        te: festivalsTe2027,
      },
    };

    const dataSource = FESTIVAL_DATA[yearNum]?.[langKey];

    if (!dataSource) {
      return res.json({
        year: yearNum,
        month: monthNum,
        lang: langKey,
        monthName: null,
        data: [],
      });
    }

    // ---------------- LANGUAGE-AWARE KEYS ----------------

    const YEAR_KEY = langKey === "te" ? "సంవత్సరం" : "year";
    const CALENDAR_KEY = langKey === "te" ? "క్యాలెండర్" : "calendar";
    const MONTH_KEY = langKey === "te" ? "నెల" : "month";
    const DAYS_KEY = langKey === "te" ? "రోజులు" : "days";
    const DATE_KEY = langKey === "te" ? "తేదీ" : "date";
    const NAME_KEY = langKey === "te" ? "పేరు" : "name";
    const TYPE_KEY = langKey === "te" ? "రకం" : "type";
    const DETAILS_KEY = langKey === "te" ? "వివరణ" : "details";
    const LUNAR_KEY =
      langKey === "te"
        ? `ముఖ్యమైన_చంద్రమాన_తిథులు_${yearNum}_పాక్షికం`
        : `lunar_observances_${yearNum}_partial`;

    // ---------------- YEAR CHECK ----------------

    if (dataSource[YEAR_KEY] !== yearNum) {
      return res.json({
        year: yearNum,
        month: monthNum,
        lang: langKey,
        monthName: null,
        data: [],
      });
    }

    // ---------------- MONTH BLOCK ----------------

    const monthBlock = dataSource[CALENDAR_KEY]?.[monthNum - 1];

    if (!monthBlock) {
      return res.json({
        year: yearNum,
        month: monthNum,
        lang: langKey,
        monthName: null,
        data: [],
      });
    }

    // ---------------- MONTH FESTIVALS ----------------

    const monthFestivals = (monthBlock[DAYS_KEY] || []).map((d) => ({
      date: d[DATE_KEY],
      name: d[NAME_KEY],
      type: d[TYPE_KEY],
      details: d[DETAILS_KEY] || [],
    }));

    // ---------------- LUNAR FESTIVALS ----------------

    const lunarFestivals = (dataSource[LUNAR_KEY] || [])
      .filter(
        (d) => new Date(d[DATE_KEY]).getMonth() + 1 === monthNum
      )
      .map((d) => ({
        date: d[DATE_KEY],
        name: d[NAME_KEY],
        type: d[TYPE_KEY],
      }));

    // ---------------- RESPONSE ----------------

    return res.json({
      year: yearNum,
      month: monthNum,
      lang: langKey,
      monthName: monthBlock[MONTH_KEY],
      data: [...monthFestivals, ...lunarFestivals],
    });
  } catch (err) {
    console.error("FESTIVAL API ERROR:", err);
    res.status(500).json({
      error: "festival_api_error",
      message: err.toString(),
    });
  }
});




// ------------------------------------------------------------
// START SERVER
// ------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});

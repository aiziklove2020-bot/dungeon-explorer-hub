// מציג "זוגות רשומים" בכל כרטיס אירוע בדשבורד המפרסם — מתחבר ישירות ל-Firestore
// (עצמאי מ-site-data.js, אותו דפוס כמו leads.js) כי window.LPData לא חושף
// גישה לפרטי ההרשמות המלאים של אירוע.
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, collection, query, where, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAJv0APn-Qmv59H2Behu3PhskObCaPHW_A",
  authDomain: "tbdsm-5acca.firebaseapp.com",
  projectId: "tbdsm-5acca",
  storageBucket: "tbdsm-5acca.firebasestorage.app",
  messagingSenderId: "905865425928",
  appId: "1:905865425928:web:1898ebb5b8de87ecf3cdbd",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

async function isRealUser(phoneNumber) {
  if (!phoneNumber) return false;
  const snap = await getDocs(query(collection(db, "users"), where("phoneNumber", "==", phoneNumber), limit(1)));
  if (snap.empty) return false;
  return snap.docs[0].data()?.level !== "blocked";
}

function withTelegram(person, byPhone, fallbackTelegram) {
  const reg = byPhone.get(person.phoneNumber);
  return {
    fullName: person.fullName || reg?.fullName || reg?.userName || "",
    phoneNumber: person.phoneNumber || "",
    telegramUsername: fallbackTelegram || reg?.telegramUsername || "",
  };
}

// Couples who registered together (either record shape) — unchanged from
// before: only shown once both partners have a real, unblocked account.
function couplePairsFromRegistrations(registrations) {
  const byPhone = new Map();
  registrations.forEach((r) => { if (r.phoneNumber) byPhone.set(r.phoneNumber, r); });

  const pairs = [];
  const seen = new Set();
  const byCoupleId = new Map();
  registrations
    .filter((r) => r.registrationType === "couple" && r.coupleId)
    .forEach((r) => {
      if (!byCoupleId.has(r.coupleId)) byCoupleId.set(r.coupleId, []);
      byCoupleId.get(r.coupleId).push(r);
    });
  byCoupleId.forEach((group) => {
    const male = group.find((r) => r.gender === "male") || group[0];
    const female = group.find((r) => r.gender === "female") || group[1];
    if (male && female) pairs.push([male, female]);
  });

  // The public registration form's "couple" option registers each partner
  // as their own record (single-male-couple / single-female-couple), each
  // pointing at the other's phone in partnerPhone.
  registrations
    .filter((r) => r.partnerPhone && r.phoneNumber)
    .forEach((r) => {
      if (seen.has(r.phoneNumber)) return;
      const partner = byPhone.get(r.partnerPhone);
      if (!partner || partner.partnerPhone !== r.phoneNumber) return;
      seen.add(r.phoneNumber);
      seen.add(partner.phoneNumber);
      const male = r.gender === "male" ? r : partner;
      const female = r.gender === "female" ? r : partner;
      pairs.push([male, female]);
    });

  return pairs;
}

// Every gender-balance match on the party — automatic or created by the
// admin by hand — is shown to the party's producer in full (name, Telegram
// nickname, phone for both sides). Registrants for balance on a producer's
// party are told up front that a match's details go to the producer.
// Deliberately not filtered by "has an account": an admin's manual match is
// an explicit decision and must always reach the producer.
function balancePairs(registrations, balanceMatches) {
  const byPhone = new Map();
  registrations.forEach((r) => { if (r.phoneNumber) byPhone.set(r.phoneNumber, r); });

  const pairs = [];
  (balanceMatches || [])
    .filter((m) => m?.isMatched && !m?.isCouple && m?.malePhone && m?.femalePhone)
    .forEach((m) => {
      pairs.push([
        withTelegram({ fullName: m.maleName, phoneNumber: m.malePhone }, byPhone, m.maleTelegram),
        withTelegram({ fullName: m.femaleName, phoneNumber: m.femalePhone }, byPhone, m.femaleTelegram),
      ]);
    });

  // Legacy algorithm matches recorded only as `balancedWith` on the
  // registrations themselves.
  const seen = new Set();
  registrations
    .filter((r) => r.balancedWith && r.phoneNumber)
    .forEach((r) => {
      if (seen.has(r.phoneNumber)) return;
      const partner = byPhone.get(r.balancedWith);
      if (!partner) return;
      seen.add(r.phoneNumber);
      seen.add(partner.phoneNumber);
      const male = r.gender === "male" ? r : partner;
      const female = r.gender === "female" ? r : partner;
      pairs.push([withTelegram(male, byPhone), withTelegram(female, byPhone)]);
    });

  const seenKey = new Set();
  return pairs.filter(([male, female]) => {
    const key = [male.phoneNumber, female.phoneNumber].sort().join("|");
    if (seenKey.has(key)) return false;
    seenKey.add(key);
    return true;
  });
}

function personRow(person) {
  const row = document.createElement("div");
  row.style.cssText = "display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:4px 0;flex-wrap:wrap";
  const who = document.createElement("span");
  const name = document.createElement("span");
  name.style.cssText = "font-weight:800;font-size:17px;color:#fff";
  name.textContent = person.fullName || person.userName || "-";
  who.appendChild(name);
  const tg = String(person.telegramUsername || "").replace(/^@+/, "").trim();
  if (tg) {
    const tgEl = document.createElement("span");
    tgEl.style.cssText = "margin-right:8px;color:#d8b4c8;font-size:14px;direction:ltr;unicode-bidi:isolate";
    tgEl.textContent = `@${tg}`;
    who.appendChild(tgEl);
  }
  const phone = document.createElement("a");
  phone.href = `tel:${person.phoneNumber}`;
  phone.style.cssText = "color:#ffb0b8;direction:ltr;font-size:16px;font-weight:700;text-decoration:none";
  phone.textContent = person.phoneNumber || "";
  row.appendChild(who);
  row.appendChild(phone);
  return row;
}

function pairsBox(titleText, pairs) {
  const box = document.createElement("div");
  box.style.cssText = "margin-top:14px;padding:14px 16px;border:1px solid #7c1828;border-radius:14px;background:rgba(255,23,57,.08)";
  const title = document.createElement("p");
  title.style.cssText = "margin:0 0 12px;font-size:16px;font-weight:800;color:#ff5708";
  title.textContent = `${titleText} (${pairs.length})`;
  box.appendChild(title);
  pairs.forEach(([male, female], idx) => {
    const pairBox = document.createElement("div");
    pairBox.style.cssText = idx > 0 ? "margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.12)" : "";
    pairBox.appendChild(personRow(male));
    pairBox.appendChild(personRow(female));
    box.appendChild(pairBox);
  });
  return box;
}

async function renderCouplesForEvent(eventId, targetEl) {
  try {
    const partySnap = await getDoc(doc(db, "parties", eventId));
    if (!partySnap.exists()) return;
    const data = partySnap.data() || {};
    const registrations = data.registrations || [];

    const balanced = balancePairs(registrations, data.balanceMatches);
    const balancedPhones = new Set(balanced.flat().map((p) => p.phoneNumber));

    // A producer's party that takes registrations through the site (an
    // internal party, or an external one that opted in): couples registered
    // knowing their details go to the producer — show them all, whether or
    // not they have an account. A WhatsApp-only party has no on-site form.
    const takesOnSite = !data.whatsappNumber && (data.partyType !== "external" || data.allowBalanceRegistration === true);
    const showAllCouples = takesOnSite;
    const couples = [];
    for (const [male, female] of couplePairsFromRegistrations(registrations)) {
      if (balancedPhones.has(male.phoneNumber) || balancedPhones.has(female.phoneNumber)) continue;
      if (showAllCouples) { couples.push([male, female]); continue; }
      const [maleOk, femaleOk] = await Promise.all([isRealUser(male.phoneNumber), isRealUser(female.phoneNumber)]);
      if (maleOk && femaleOk) couples.push([male, female]);
    }

    if (balanced.length) targetEl.appendChild(pairsBox("איזונים מגדריים", balanced));
    if (couples.length) targetEl.appendChild(pairsBox("זוגות רשומים", couples));
    if (!balanced.length && !couples.length && showAllCouples) {
      const empty = document.createElement("p");
      empty.className = "meta";
      empty.style.cssText = "margin-top:12px";
      empty.textContent = "עדיין אין הרשמות דרך האתר למסיבה הזו. זוגות שנרשמים וזוגות שמאוזנים יופיעו כאן.";
      targetEl.appendChild(empty);
    }
  } catch (e) {
    // best-effort — a broken event shouldn't break the rest of the dashboard
  }
}

export async function renderAdvertiserCouples(events, listEl) {
  const cards = listEl.querySelectorAll("article[data-card]");
  events.forEach((ev, i) => {
    const card = cards[i];
    const body = card?.querySelector("[data-card-body]");
    if (body && ev.id) renderCouplesForEvent(ev.id, body);
  });
}

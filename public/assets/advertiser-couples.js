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

function pairsFromRegistrations(registrations) {
  const byPhone = new Map();
  registrations.forEach((r) => { if (r.phoneNumber) byPhone.set(r.phoneNumber, r); });

  const pairs = [];
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

  const seen = new Set();
  registrations
    .filter((r) => r.balancedWith && r.phoneNumber && !seen.has(r.phoneNumber))
    .forEach((r) => {
      const partner = byPhone.get(r.balancedWith);
      if (!partner) return;
      seen.add(r.phoneNumber);
      seen.add(partner.phoneNumber);
      const male = r.gender === "male" ? r : partner;
      const female = r.gender === "female" ? r : partner;
      pairs.push([male, female]);
    });

  // The public registration form's "couple" option registers each partner
  // as their own record (registrationType single-male-couple /
  // single-female-couple) linked purely by each pointing at the other's
  // phone in partnerPhone — there's no coupleId on this path.
  registrations
    .filter((r) => r.partnerPhone && r.phoneNumber && !seen.has(r.phoneNumber))
    .forEach((r) => {
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

// Manual gender-balance matches ("צור איזון" in the admin) live in a
// separate `balanceMatches` array on the party doc, not on the individual
// registration records — algorithm matches write `balancedWith` on the
// registration itself, but a manual match never does.
function pairsFromBalanceMatches(balanceMatches) {
  return (balanceMatches || [])
    .filter((m) => m?.isMatched && !m?.isCouple && m?.malePhone && m?.femalePhone)
    .map((m) => [
      { fullName: m.maleName, phoneNumber: m.malePhone },
      { fullName: m.femaleName, phoneNumber: m.femalePhone },
    ]);
}

async function renderCouplesForEvent(eventId, targetEl) {
  try {
    const partySnap = await getDoc(doc(db, "parties", eventId));
    if (!partySnap.exists()) return;
    const data = partySnap.data() || {};
    const registrations = data.registrations || [];
    const regPairs = pairsFromRegistrations(registrations);
    const manualPairs = pairsFromBalanceMatches(data.balanceMatches);

    // Dedupe: an algorithm match can show up both via balancedWith on the
    // registration and (once saved) in balanceMatches.
    const seenPairKey = new Set();
    const pairs = [];
    [...regPairs, ...manualPairs].forEach(([male, female]) => {
      const key = [male.phoneNumber, female.phoneNumber].sort().join("|");
      if (seenPairKey.has(key)) return;
      seenPairKey.add(key);
      pairs.push([male, female]);
    });
    if (pairs.length === 0) return;

    const confirmed = [];
    for (const [male, female] of pairs) {
      const [maleOk, femaleOk] = await Promise.all([isRealUser(male.phoneNumber), isRealUser(female.phoneNumber)]);
      if (maleOk && femaleOk) confirmed.push([male, female]);
    }
    if (confirmed.length === 0) return;

    const box = document.createElement("div");
    box.style.cssText = "margin-top:10px;padding:10px 12px;border:1px solid #7c1828;border-radius:12px;background:rgba(255,23,57,.06)";
    const title = document.createElement("p");
    title.style.cssText = "margin:0 0 8px;font-size:12px;font-weight:700;color:#ff1739";
    title.textContent = `זוגות רשומים (${confirmed.length})`;
    box.appendChild(title);

    confirmed.forEach(([male, female]) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;justify-content:space-between;gap:8px;padding:6px 0;font-size:13px;border-top:1px solid rgba(255,255,255,.06)";
      const name = document.createElement("span");
      name.style.fontWeight = "700";
      name.textContent = `${male.fullName || male.userName || ""} ו${female.fullName || female.userName || ""}`;
      const phones = document.createElement("span");
      phones.style.cssText = "color:#8f8f98;direction:ltr";
      phones.textContent = `${male.phoneNumber} · ${female.phoneNumber}`;
      row.appendChild(name);
      row.appendChild(phones);
      box.appendChild(row);
    });

    targetEl.appendChild(box);
  } catch (e) {
    // best-effort — a broken event shouldn't break the rest of the dashboard
  }
}

export async function renderAdvertiserCouples(events, listEl) {
  const cards = listEl.querySelectorAll("article.card");
  events.forEach((ev, i) => {
    const card = cards[i];
    const body = card?.querySelector(".card-body");
    if (body && ev.id) renderCouplesForEvent(ev.id, body);
  });
}

// טופס לידים עצמאי לעמוד "מנוי איזון מגדרי" — פועל בנפרד מ-site-data.js
// כדי לא לגעת בבאנדל הגדול, מתחבר ישירות ל-Firestore עם אותו פרויקט Firebase.
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

function cleanPhone(value) {
  return String(value || "").replace(/\D/g, "");
}
function isValidIsraeliPhone(value) {
  return /^05\d{8}$/.test(cleanPhone(value));
}

async function submitLead({ name, phone, track, message, source = "membership_page" }) {
  const cleanedPhone = cleanPhone(phone);
  const trimmedName = (name || "").trim();

  if (!trimmedName) throw new Error("נא להזין שם");
  if (!isValidIsraeliPhone(cleanedPhone)) throw new Error("נא להזין מספר טלפון תקין (05xxxxxxxx)");
  if (!["parties", "exchange", "combo"].includes(track)) throw new Error("נא לבחור מסלול");

  const leadsRef = collection(db, "leads");
  const newRef = doc(leadsRef);
  const payload = {
    name: trimmedName,
    phone: cleanedPhone,
    track,
    message: (message || "").trim().slice(0, 500),
    source,
    status: "new",
    createdAt: new Date().toISOString(),
  };
  await setDoc(newRef, payload);
  return { id: newRef.id, ...payload };
}

window.LPLeads = { submitLead };

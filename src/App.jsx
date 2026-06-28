import { useState, useEffect, useContext, createContext, useMemo } from "react";
import {
  Trophy, Users, Plus, LogIn, Calendar, Lock, Crown, Medal, ChevronRight,
  Check, Clock, ArrowLeft, Share2, Star, MapPin, Eye, BarChart2,
  Sun, Moon, MessageCircle, Send, Zap, Edit3, TrendingUp
} from "lucide-react";
import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot, deleteDoc } from "firebase/firestore";

// ---- Theme Context ----
const ThemeCtx = createContext({ light: false, cls: (d) => d });
const useTheme = () => useContext(ThemeCtx);

// ---- Scoring ----
const SCORING = { exactReg: 10, gdReg: 7, winner: 5, etExact: 5, etGd: 2, pensWinner: 3, pensExact: 3, champion: 15, finalists: 8 };

// ---- Rounds ----
const ROUNDS = [
  { key: "R32", name: "Round of 32" }, { key: "R16", name: "Round of 16" },
  { key: "QF", name: "Quarterfinals" }, { key: "SF", name: "Semifinals" },
  { key: "3RD", name: "3rd Place" }, { key: "F", name: "Final" },
];

// ---- Flags ----
const FLAGS = {
  "South Africa": "🇿🇦", "Canada": "🇨🇦", "Brazil": "🇧🇷", "Japan": "🇯🇵", "Germany": "🇩🇪", "Paraguay": "🇵🇾",
  "Netherlands": "🇳🇱", "Morocco": "🇲🇦", "Ivory Coast": "🇨🇮", "Norway": "🇳🇴", "France": "🇫🇷", "Sweden": "🇸🇪",
  "Mexico": "🇲🇽", "Ecuador": "🇪🇨", "Portugal": "🇵🇹", "Croatia": "🇭🇷", "Spain": "🇪🇸", "Austria": "🇦🇹",
  "USA": "🇺🇸", "Bosnia & Herz.": "🇧🇦", "Belgium": "🇧🇪", "Senegal": "🇸🇳", "England": "🇬🇧", "DR Congo": "🇨🇩",
  "Argentina": "🇦🇷", "Cape Verde": "🇨🇻", "Australia": "🇦🇺", "Egypt": "🇪🇬", "Switzerland": "🇨🇭",
  "Algeria": "🇩🇿", "Colombia": "🇨🇴", "Ghana": "🇬🇭", "TBD": "⚪",
};

// ---- Team Colors ----
const TEAM_COLOR = {
  "South Africa": "#007A4D", "Canada": "#FF0000", "Brazil": "#009C3B", "Japan": "#BC002D", "Germany": "#555",
  "Paraguay": "#D52B1E", "Netherlands": "#FF6600", "Morocco": "#C1272D", "Ivory Coast": "#FF8200",
  "Norway": "#EF2B2D", "France": "#0055A4", "Sweden": "#006AA7", "Mexico": "#006847", "Ecuador": "#FFD100",
  "Portugal": "#006600", "Croatia": "#FF0000", "Spain": "#AA151B", "Austria": "#ED2939", "USA": "#3C3B6E",
  "Bosnia & Herz.": "#002395", "Belgium": "#F9A602", "Senegal": "#00853F", "England": "#012169",
  "DR Congo": "#007FFF", "Argentina": "#74ACDF", "Cape Verde": "#003893", "Australia": "#00008B",
  "Egypt": "#CE1126", "Switzerland": "#FF0000", "Algeria": "#006233", "Colombia": "#FCD116", "Ghana": "#006B3F",
};

const ALL_TEAMS = ["Algeria", "Argentina", "Australia", "Austria", "Belgium", "Bosnia & Herz.", "Brazil", "Canada", "Cape Verde", "Colombia", "Croatia", "DR Congo", "Ecuador", "Egypt", "England", "France", "Germany", "Ghana", "Ivory Coast", "Japan", "Mexico", "Morocco", "Netherlands", "Norway", "Paraguay", "Portugal", "Senegal", "South Africa", "Spain", "Sweden", "Switzerland", "USA"].sort();

// ---- Schedule ----
function buildInitialMatches() {
  const t = s => new Date(s).getTime();
  return [
    { id: "M73", round: "R32", slot: 0, teamA: "South Africa", teamB: "Canada", kickoff: t("2026-06-28T20:00:00Z"), venue: "Los Angeles" },
    { id: "M74", round: "R32", slot: 1, teamA: "Brazil", teamB: "Japan", kickoff: t("2026-06-29T18:00:00Z"), venue: "Houston" },
    { id: "M75", round: "R32", slot: 2, teamA: "Germany", teamB: "Paraguay", kickoff: t("2026-06-29T21:30:00Z"), venue: "Boston" },
    { id: "M76", round: "R32", slot: 3, teamA: "Netherlands", teamB: "Morocco", kickoff: t("2026-06-30T02:00:00Z"), venue: "Monterrey" },
    { id: "M77", round: "R32", slot: 4, teamA: "Ivory Coast", teamB: "Norway", kickoff: t("2026-06-30T18:00:00Z"), venue: "Dallas" },
    { id: "M78", round: "R32", slot: 5, teamA: "France", teamB: "Sweden", kickoff: t("2026-06-30T22:00:00Z"), venue: "New York NJ" },
    { id: "M79", round: "R32", slot: 6, teamA: "Mexico", teamB: "Ecuador", kickoff: t("2026-07-01T02:00:00Z"), venue: "Mexico City" },
    { id: "M80", round: "R32", slot: 7, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-01T21:00:00Z"), venue: "Atlanta" },
    { id: "M81", round: "R32", slot: 8, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-01T23:00:00Z"), venue: "San Francisco" },
    { id: "M82", round: "R32", slot: 9, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-02T02:00:00Z"), venue: "Seattle" },
    { id: "M83", round: "R32", slot: 10, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-02T18:00:00Z"), venue: "Toronto" },
    { id: "M84", round: "R32", slot: 11, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-02T21:00:00Z"), venue: "Los Angeles" },
    { id: "M85", round: "R32", slot: 12, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-03T01:00:00Z"), venue: "Vancouver" },
    { id: "M86", round: "R32", slot: 13, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-03T18:00:00Z"), venue: "Boston" },
    { id: "M87", round: "R32", slot: 14, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-03T21:00:00Z"), venue: "Kansas City" },
    { id: "M88", round: "R32", slot: 15, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-04T01:00:00Z"), venue: "Miami" },
    { id: "M89", round: "R16", slot: 0, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-04T21:00:00Z"), venue: "Philadelphia" },
    { id: "M90", round: "R16", slot: 1, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-05T00:30:00Z"), venue: "Houston" },
    { id: "M91", round: "R16", slot: 2, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-05T21:30:00Z"), venue: "New York NJ" },
    { id: "M92", round: "R16", slot: 3, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-06T01:00:00Z"), venue: "Mexico City" },
    { id: "M93", round: "R16", slot: 4, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-06T22:00:00Z"), venue: "Dallas" },
    { id: "M94", round: "R16", slot: 5, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-07T01:30:00Z"), venue: "Seattle" },
    { id: "M95", round: "R16", slot: 6, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-07T21:00:00Z"), venue: "Atlanta" },
    { id: "M96", round: "R16", slot: 7, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-08T01:00:00Z"), venue: "Vancouver" },
    { id: "M97", round: "QF", slot: 0, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-09T23:00:00Z"), venue: "Boston" },
    { id: "M98", round: "QF", slot: 1, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-11T00:00:00Z"), venue: "Los Angeles" },
    { id: "M99", round: "QF", slot: 2, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-11T21:00:00Z"), venue: "Miami" },
    { id: "M100", round: "QF", slot: 3, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-12T01:00:00Z"), venue: "Kansas City" },
    { id: "M101", round: "SF", slot: 0, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-15T01:00:00Z"), venue: "Dallas" },
    { id: "M102", round: "SF", slot: 1, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-16T01:00:00Z"), venue: "Atlanta" },
    { id: "M103", round: "3RD", slot: 0, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-18T21:00:00Z"), venue: "Miami" },
    { id: "M104", round: "F", slot: 0, teamA: "TBD", teamB: "TBD", kickoff: t("2026-07-19T20:00:00Z"), venue: "New York NJ" },
  ];
}

// ---- Utils ----
const isLive = m => { const n = Date.now(); return n >= m.kickoff && n <= m.kickoff + 7200000; };
function scoreMatch(pred, result) {
  if (!pred || !result || result.aReg == null) return null;
  let pts = 0; const detail = [];
  const { aReg: pA, bReg: pB } = pred, { aReg: rA, bReg: rB } = result;
  const exact = pA === rA && pB === rB, pD = pA - pB, rD = rA - rB;
  if (exact) { pts += SCORING.exactReg; detail.push(["Exact", SCORING.exactReg]); }
  else if (pD === rD) { pts += SCORING.gdReg; detail.push(["Goal diff", SCORING.gdReg]); }
  else if ((pred.advance && pred.advance === result.advance) || (Math.sign(pD) === Math.sign(rD) && rD !== 0)) { pts += SCORING.winner; detail.push(["Advances", SCORING.winner]); }
  if (result.hadET && pred.aET != null && result.aET != null) {
    if (pred.aET === result.aET && pred.bET === result.bET) { pts += SCORING.etExact; detail.push(["ET exact", SCORING.etExact]); }
    else if ((pred.aET - pred.bET) === (result.aET - result.bET)) { pts += SCORING.etGd; detail.push(["ET diff", SCORING.etGd]); }
  }
  if (result.hadPens) {
    if (pred.advance && pred.advance === result.advance) { pts += SCORING.pensWinner; detail.push(["Pen win", SCORING.pensWinner]); }
    if (pred.pensA != null && pred.pensA === result.pensA && pred.pensB === result.pensB) { pts += SCORING.pensExact; detail.push(["Pen exact", SCORING.pensExact]); }
  }
  return { pts, detail, exact };
}
function computeTotal(preds, bonus, matches, results, adj = 0) {
  let total = 0, exacts = 0, advances = 0; const byRound = {};
  for (const r of ROUNDS) byRound[r.key] = 0;
  for (const m of matches) {
    const s = scoreMatch(preds[m.id], results[m.id]);
    if (s) { total += s.pts; byRound[m.round] = (byRound[m.round] || 0) + s.pts; if (s.exact) exacts++; if (s.detail.some(d => d[0].includes("Adv"))) advances++; }
  }
  if (bonus?.locked && results.__final) {
    if (results.__final.champion && bonus.champion === results.__final.champion) { total += SCORING.champion; byRound.F = (byRound.F || 0) + SCORING.champion; }
    if (results.__final.finalists && bonus.finalists?.every(f => results.__final.finalists.includes(f))) { total += SCORING.finalists; byRound.F = (byRound.F || 0) + SCORING.finalists; }
  }
  total += adj;
  return { total, exacts, advances, byRound };
}
const ls = { get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } } };
function genCode() { return Math.random().toString(36).substring(2, 7).toUpperCase(); }
function useToast() { const [t, sT] = useState(""); const show = m => { sT(m); setTimeout(() => sT(""), 2500); }; return [t, show]; }
function fmtKickoff(ts) { return new Date(ts).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Etc/GMT+5" }) + " EST"; }

// ---- Confetti ----
function Confetti() {
  const items = useMemo(() => Array.from({ length: 28 }).map((_, i) => ({ id: i, left: Math.random() * 100, delay: Math.random() * 3, dur: 2 + Math.random() * 2, e: ["🎊", "🎉", "⭐", "🏆", "⚽", "🌟", "🥇"][Math.floor(Math.random() * 7)] })), []);
  return (
    <>
      <style>{`@keyframes cffall{to{transform:translateY(110vh) rotate(720deg);opacity:0;}}`}</style>
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {items.map(p => <div key={p.id} style={{ position: "absolute", left: `${p.left}%`, top: "-30px", fontSize: "22px", animation: `cffall ${p.dur}s linear ${p.delay}s forwards` }}>{p.e}</div>)}
      </div>
    </>
  );
}

// ============================================================
// App Root
// ============================================================
export default function App() {
  const [light, setLight] = useState(() => ls.get("wc26:light") || false);
  const [screen, setScreen] = useState("home");
  const [name, setName] = useState(""); const [nameInput, setNameInput] = useState("");
  const [leagues, setLeagues] = useState([]); const [active, setActive] = useState(null);
  const [tab, setTab] = useState("matches"); const [ready, setReady] = useState(false);
  const [toast, showToast] = useToast();

  const cls = (dark, lght = dark) => light ? lght : dark;
  const toggleLight = () => { const n = !light; setLight(n); ls.set("wc26:light", n); };

  useEffect(() => { const n = ls.get("wc26:name"), l = ls.get("wc26:leagues"); if (n) setName(n); if (l) setLeagues(l); setReady(true); }, []);
  const saveLeagues = next => { setLeagues(next); ls.set("wc26:leagues", next); };
  const saveName = () => { const n = nameInput.trim(); if (!n) return; setName(n); ls.set("wc26:name", n); setScreen("lobby"); };

  const createLeague = async lname => {
    const code = genCode(), meta = { code, name: lname, owner: name, created: Date.now() };
    await setDoc(doc(db, "leagues", code), { ...meta, members: [{ name, joined: Date.now() }], matches: buildInitialMatches(), results: {}, comments: {}, adjustments: {} });
    saveLeagues([...leagues, meta]); showToast(`League created! Code: ${code}`); return code;
  };
  const joinLeague = async raw => {
    const code = raw.trim().toUpperCase(), snap = await getDoc(doc(db, "leagues", code));
    if (!snap.exists()) { showToast("League not found"); return false; }
    const d = snap.data();
    if (leagues.some(l => l.code === code)) { setActive(code); setScreen("league"); return true; }
    const members = d.members || [];
    if (!members.some(m => m.name === name)) await updateDoc(doc(db, "leagues", code), { members: [...members, { name, joined: Date.now() }] });
    saveLeagues([...leagues, { code, name: d.name, owner: d.owner }]); showToast(`Joined ${d.name}!`); return true;
  };
  const removeLeague = async (league, me) => {
    if (league.owner === me) { await deleteDoc(doc(db, "leagues", league.code)); }
    else { const s = await getDoc(doc(db, "leagues", league.code)); if (s.exists()) { const mem = (s.data().members || []).filter(m => m.name !== me); await updateDoc(doc(db, "leagues", league.code), { members: mem }); } }
    saveLeagues(leagues.filter(l => l.code !== league.code));
  };

  if (!ready) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading…</div>;
  return (
    <ThemeCtx.Provider value={{ light, cls }}>
      <div className={cls("min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white", "min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-slate-100 text-slate-800")}>
        <button onClick={toggleLight} className="fixed top-3 right-3 z-50 w-9 h-9 rounded-full bg-slate-700/80 hover:bg-slate-600 flex items-center justify-center shadow-lg backdrop-blur-sm">
          {light ? <Moon className="w-4 h-4 text-slate-200" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>
        {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 px-4 py-2 rounded-xl shadow-xl text-sm font-semibold text-white">{toast}</div>}
        {(!name || screen === "home") && <Home nameInput={nameInput} setNameInput={setNameInput} saveName={saveName} name={name} go={() => setScreen("lobby")} />}
        {name && screen === "lobby" && <Lobby name={name} leagues={leagues} createLeague={createLeague} joinLeague={joinLeague} removeLeague={removeLeague} open={c => { setActive(c); setTab("matches"); setScreen("league"); }} />}
        {name && screen === "league" && active && <League code={active} me={name} back={() => setScreen("lobby")} tab={tab} setTab={setTab} showToast={showToast} />}
      </div>
    </ThemeCtx.Provider>
  );
}

// ============================================================
// Home
// ============================================================
function Home({ nameInput, setNameInput, saveName, name, go }) {
  const { cls } = useTheme();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 mb-4 shadow-2xl shadow-emerald-500/30"><Trophy className="w-11 h-11 text-white" /></div>
        <h1 className="text-3xl font-black tracking-tight">World Cup 2026</h1>
        <p className="text-emerald-400 font-bold text-lg">Knockout Predictor</p>
        <p className={cls("text-slate-400", "text-slate-500") + " text-sm mt-1"}>Predict every match · Beat your friends</p>
      </div>
      {name ? (<button onClick={go} className="bg-emerald-500 hover:bg-emerald-400 transition px-8 py-3 rounded-xl font-bold flex items-center gap-2 text-white">Continue as {name}<ChevronRight className="w-4 h-4" /></button>) : (
        <div className="w-full max-w-xs">
          <label className={cls("text-slate-300", "text-slate-600") + " text-sm mb-1.5 block"}>Your display name</label>
          <input value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === "Enter" && saveName()} placeholder="e.g. Marco" autoFocus className={cls("bg-slate-800 border-slate-700 text-white", "bg-white border-slate-300 text-slate-800") + " w-full border rounded-xl px-4 py-3 mb-3 outline-none focus:border-emerald-500"} />
          <button onClick={saveName} className="w-full bg-emerald-500 hover:bg-emerald-400 transition py-3 rounded-xl font-bold text-white">Get Started</button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Lobby
// ============================================================
function Lobby({ name, leagues, createLeague, joinLeague, removeLeague, open }) {
  const { cls } = useTheme();
  const [mode, setMode] = useState(null), [lname, setLname] = useState(""), [code, setCode] = useState(""), [busy, setBusy] = useState(false), [confirm, setConfirm] = useState(null);
  const card = cls("bg-slate-800/60 border-slate-700", "bg-white border-slate-200 shadow-sm");
  const inp = cls("bg-slate-900 border-slate-700 text-white", "bg-slate-50 border-slate-300 text-slate-800");
  return (
    <div className="max-w-md mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-6">
        <div><p className={cls("text-slate-400", "text-slate-500") + " text-sm"}>Welcome,</p><h2 className="text-2xl font-black">{name}</h2></div>
        <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-lg text-white">{name[0]?.toUpperCase()}</div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[["create", Plus, "Create League"], ["join", LogIn, "Join League"]].map(([k, Icon, label]) => (
          <button key={k} onClick={() => setMode(mode === k ? null : k)} className={`p-4 rounded-xl border transition flex flex-col items-center gap-2 ${mode === k ? "bg-emerald-500 border-emerald-400 text-white" : `${card} hover:border-emerald-500`}`}>
            <Icon className="w-6 h-6" /><span className="font-bold text-sm">{label}</span>
          </button>
        ))}
      </div>
      {mode === "create" && <div className={`${card} border rounded-xl p-4 mb-6`}><input value={lname} onChange={e => setLname(e.target.value)} placeholder="League name" className={`w-full ${inp} border rounded-lg px-3 py-2.5 mb-3 outline-none focus:border-emerald-500`} /><button disabled={busy || !lname.trim()} onClick={async () => { setBusy(true); const c = await createLeague(lname.trim()); setBusy(false); setLname(""); setMode(null); open(c); }} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 py-2.5 rounded-lg font-bold text-white">{busy ? "Creating…" : "Create"}</button></div>}
      {mode === "join" && <div className={`${card} border rounded-xl p-4 mb-6`}><input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="5-letter code" maxLength={5} className={`w-full ${inp} border rounded-lg px-3 py-2.5 mb-3 font-mono tracking-widest uppercase outline-none focus:border-emerald-500`} /><button disabled={busy || !code.trim()} onClick={async () => { setBusy(true); const ok = await joinLeague(code); setBusy(false); if (ok) { setCode(""); setMode(null); open(code.trim().toUpperCase()); } }} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 py-2.5 rounded-lg font-bold text-white">{busy ? "Joining…" : "Join"}</button></div>}
      <h3 className={cls("text-slate-400", "text-slate-500") + " text-xs font-bold uppercase tracking-widest mb-3"}>Your Leagues</h3>
      {leagues.length === 0 ? (<div className="text-center py-12 text-slate-500"><Users className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm">Create or join a league to start!</p></div>) : (
        <div className="space-y-2">
          {leagues.map(l => (
            <div key={l.code} className={`${card} border hover:border-emerald-500 transition rounded-xl overflow-hidden`}>
              <div className="flex items-center">
                <button onClick={() => open(l.code)} className="flex-1 p-4 text-left"><p className="font-bold">{l.name}</p><p className={cls("text-slate-400", "text-slate-500") + " text-xs font-mono mt-0.5"}>Code: {l.code} · {l.owner === name ? "Owner" : `by ${l.owner}`}</p></button>
                <button onClick={() => setConfirm(confirm === l.code ? null : l.code)} className={cls("text-slate-500 hover:text-red-400", "text-slate-400 hover:text-red-500") + " px-4 py-4 transition text-lg"}>{confirm === l.code ? "✕" : "🗑️"}</button>
              </div>
              {confirm === l.code && (
                <div className={cls("border-slate-700 bg-slate-900/60", "border-slate-200 bg-slate-50") + " border-t px-4 py-3"}>
                  <p className={cls("text-slate-300", "text-slate-600") + " text-xs mb-2"}>{l.owner === name ? "Delete this league for everyone?" : "Leave this league?"}</p>
                  <div className="flex gap-2">
                    <button onClick={async () => { await removeLeague(l, name); setConfirm(null); }} className="flex-1 bg-red-600 hover:bg-red-500 py-1.5 rounded-lg text-xs font-bold text-white">{l.owner === name ? "Delete" : "Leave"}</button>
                    <button onClick={() => setConfirm(null)} className={cls("bg-slate-700 hover:bg-slate-600", "bg-slate-200 hover:bg-slate-300") + " flex-1 py-1.5 rounded-lg text-xs font-bold"}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// League
// ============================================================
function League({ code, me, back, tab, setTab, showToast }) {
  const { cls } = useTheme();
  const [data, setData] = useState(null), [myPreds, setMyPreds] = useState({}), [myBonus, setMyBonus] = useState(null);
  const [allPreds, setAllPreds] = useState({}), [allBonus, setAllBonus] = useState({}), [showCelebration, setShowCelebration] = useState(false);
  const isOwner = data?.owner === me;

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "leagues", code), async snap => {
      if (!snap.exists()) return;
      const d = snap.data(); setData(d);
      const ap = {}, ab = {};
      for (const m of (d.members || [])) {
        const ps = await getDoc(doc(db, "leagues", code, "predictions", m.name)); ap[m.name] = ps.exists() ? ps.data() : {};
        const bs = await getDoc(doc(db, "leagues", code, "bonuses", m.name)); ab[m.name] = bs.exists() ? bs.data() : null;
      }
      setAllPreds(ap); setAllBonus(ab);
      if (d.results?.M104 && !ls.get(`wc26:celebrated:${code}`)) setShowCelebration(true);
    });
    return () => unsub();
  }, [code]);

  useEffect(() => {
    (async () => {
      const ps = await getDoc(doc(db, "leagues", code, "predictions", me)); setMyPreds(ps.exists() ? ps.data() : {});
      const bs = await getDoc(doc(db, "leagues", code, "bonuses", me)); setMyBonus(bs.exists() ? bs.data() : null);
    })();
  }, [code, me]);

  const savePred = async (mid, pred) => { const next = { ...myPreds, [mid]: pred }; setMyPreds(next); setAllPreds(p => ({ ...p, [me]: next })); await setDoc(doc(db, "leagues", code, "predictions", me), next); };
  const saveBonusFn = async b => { setMyBonus(b); setAllBonus(p => ({ ...p, [me]: b })); await setDoc(doc(db, "leagues", code, "bonuses", me), b); };
  const saveResult = async (mid, result) => { const results = { ...(data?.results || {}), [mid]: result }; await updateDoc(doc(db, "leagues", code), { results }); };
  const addComment = async (mid, text) => { const comments = { ...(data?.comments || {}) }; comments[mid] = [...(comments[mid] || []), { name: me, text, ts: Date.now() }]; await updateDoc(doc(db, "leagues", code), { comments }); };
  const saveAdjustments = async adj => await updateDoc(doc(db, "leagues", code), { adjustments: adj });
  const updateMatchTeams = async (mid, tA, tB) => { const matches = (data?.matches || []).map(m => m.id === mid ? { ...m, teamA: tA, teamB: tB } : m); await updateDoc(doc(db, "leagues", code), { matches }); };

  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Loading league…</div>;
  const { matches = [], results = {}, members = [], name: lname, comments = {}, adjustments = {} } = data;

  if (showCelebration) return <CelebrationScreen members={members} allPreds={allPreds} allBonus={allBonus} matches={matches} results={results} adjustments={adjustments} lname={lname} onClose={() => { ls.set(`wc26:celebrated:${code}`, true); setShowCelebration(false); }} />;

  const tabs = [["matches", "Matches", Calendar], ["picks", "All Picks", Eye], ["stats", "Stats", BarChart2], ["bracket", "Bracket", Trophy], ["board", "Leaderboard", Medal], ...(isOwner ? [["admin", "Admin", Edit3]] : [])];

  return (
    <div className="max-w-md mx-auto px-4 py-5 pb-28">
      <div className="flex items-center justify-between mb-4">
        <button onClick={back} className={cls("text-slate-400 hover:text-white", "text-slate-500 hover:text-slate-800") + " flex items-center gap-1 text-sm"}><ArrowLeft className="w-4 h-4" /> Leagues</button>
        <button onClick={() => { navigator.clipboard?.writeText(code); showToast(`Code ${code} copied!`); }} className={cls("bg-slate-800 hover:bg-slate-700", "bg-white hover:bg-slate-100 shadow-sm") + " flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono"}><Share2 className="w-3.5 h-3.5" /> {code}</button>
      </div>
      <h2 className="text-2xl font-black mb-1">{lname}</h2>
      <p className={cls("text-slate-400", "text-slate-500") + " text-sm mb-5"}>{members.length} player{members.length !== 1 ? "s" : ""}</p>
      <div className={cls("bg-slate-800/60", "bg-white shadow-sm") + " flex gap-1 p-1 rounded-xl mb-5"}>
        {tabs.map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex-1 py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition ${tab === k ? "bg-emerald-500 text-white" : cls("text-slate-400 hover:text-white", "text-slate-500 hover:text-slate-700")}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>
      {tab === "matches" && <MatchesTab matches={matches} myPreds={myPreds} savePred={savePred} myBonus={myBonus} saveBonus={saveBonusFn} members={members} allPreds={allPreds} />}
      {tab === "picks" && <PicksTab matches={matches} results={results} members={members} allPreds={allPreds} comments={comments} addComment={addComment} me={me} />}
      {tab === "stats" && <StatsTab me={me} members={members} allPreds={allPreds} allBonus={allBonus} matches={matches} results={results} adjustments={adjustments} />}
      {tab === "bracket" && <BracketTab matches={matches} results={results} />}
      {tab === "board" && <Leaderboard members={members} allPreds={allPreds} allBonus={allBonus} matches={matches} results={results} me={me} adjustments={adjustments} />}
      {tab === "admin" && isOwner && <AdminTab matches={matches} results={results} saveResult={saveResult} members={members} adjustments={adjustments} saveAdjustments={saveAdjustments} updateMatchTeams={updateMatchTeams} />}
    </div>
  );
}

// ============================================================
// Matches Tab
// ============================================================
function MatchesTab({ matches, myPreds, savePred, myBonus, saveBonus, members, allPreds }) {
  const { cls } = useTheme();
  const [round, setRound] = useState("R32");
  const motd = useMemo(() => {
    const now = Date.now(), upcoming = matches.filter(m => m.teamA !== "TBD" && m.kickoff > now);
    let best = null, maxV = 0;
    for (const m of upcoming) {
      const preds = members.map(mem => allPreds[mem.name]?.[m.id]).filter(Boolean);
      if (preds.length < 2) continue;
      const aW = preds.filter(p => p.aReg > p.bReg).length, bW = preds.filter(p => p.bReg > p.aReg).length;
      const v = 1 - Math.max(aW, bW, preds.length - aW - bW) / preds.length;
      if (v > maxV) { maxV = v; best = m; }
    }
    return maxV > 0.2 ? best : null;
  }, [matches, members, allPreds]);

  return (
    <div>
      <BonusCard myBonus={myBonus} saveBonus={saveBonus} />
      {motd && (
        <div className="mb-4 p-3 rounded-xl border border-amber-500/40 bg-amber-500/10">
          <p className="text-xs font-bold text-amber-400 mb-1">⚡ Most Contested Match</p>
          <p className="text-sm font-bold">{FLAGS[motd.teamA]} {motd.teamA} vs {motd.teamB} {FLAGS[motd.teamB]}</p>
          <p className={cls("text-slate-400", "text-slate-500") + " text-[11px] mt-0.5"}>{motd.id} · {motd.venue}</p>
        </div>
      )}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {ROUNDS.map(r => (
          <button key={r.key} onClick={() => setRound(r.key)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${round === r.key ? "bg-emerald-500 text-white" : cls("bg-slate-800 text-slate-400", "bg-white text-slate-500 shadow-sm")}`}>{r.name}</button>
        ))}
      </div>
      <div className="space-y-3">
        {matches.filter(m => m.round === round).map(m => <MatchCard key={m.id} match={m} pred={myPreds[m.id]} savePred={savePred} />)}
      </div>
    </div>
  );
}

function BonusCard({ myBonus, saveBonus }) {
  const { cls } = useTheme();
  const [open, setOpen] = useState(false), [champ, setChamp] = useState(myBonus?.champion || ""), [f1, setF1] = useState(myBonus?.finalists?.[0] || ""), [f2, setF2] = useState(myBonus?.finalists?.[1] || "");
  const locked = !!myBonus?.locked;
  return (
    <div className="bg-gradient-to-br from-amber-900/40 to-slate-800/60 border border-amber-700/40 rounded-xl p-4 mb-5">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2"><Crown className="w-5 h-5 text-amber-400" /><span className="font-bold text-sm">Tournament Bonuses</span>{locked && <Lock className="w-3.5 h-3.5 text-amber-500" />}</div>
        <ChevronRight className={`w-4 h-4 ${cls("text-slate-400", "text-slate-500")} transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {locked && <div className="mt-3 text-xs space-y-1 text-amber-200/80"><p>🏆 Champion: <b>{myBonus.champion}</b> (+{SCORING.champion} pts)</p><p>🥇 Finalists: <b>{myBonus.finalists.join(" & ")}</b> (+{SCORING.finalists} pts)</p></div>}
      {open && !locked && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-amber-200/70">Pick once — locked permanently.</p>
          {[["Champion (+15 pts)", champ, setChamp], ["Finalist 1 (+8 if both correct)", f1, setF1], ["Finalist 2", f2, setF2]].map(([label, val, setter]) => (
            <div key={label}><label className={cls("text-slate-400", "text-slate-500") + " text-xs mb-1 block"}>{label}</label>
              <select value={val} onChange={e => setter(e.target.value)} className={cls("bg-slate-900 border-slate-700 text-white", "bg-white border-slate-300 text-slate-800") + " w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"}><option value="">Select team…</option>{ALL_TEAMS.map(t => <option key={t} value={t}>{FLAGS[t]} {t}</option>)}</select></div>
          ))}
          <button disabled={!champ || !f1 || !f2 || f1 === f2 || champ === f1 || champ === f2} onClick={() => saveBonus({ champion: champ, finalists: [f1, f2], locked: true })} className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 py-2 rounded-lg font-bold text-sm text-white">🔒 Lock In Bonuses</button>
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, pred, savePred }) {
  const { cls } = useTheme();
  const now = Date.now(), locked = now >= match.kickoff, live = isLive(match), isTBD = match.teamA === "TBD" || match.teamB === "TBD";
  const [aReg, setAReg] = useState(pred?.aReg ?? ""), [bReg, setBReg] = useState(pred?.bReg ?? ""), [advance, setAdvance] = useState(pred?.advance ?? "");
  const draw = aReg !== "" && bReg !== "" && Number(aReg) === Number(bReg);
  const cA = TEAM_COLOR[match.teamA], cB = TEAM_COLOR[match.teamB];
  const bgStyle = cA && cB && !isTBD ? { background: `linear-gradient(135deg,${cA}18,transparent 50%,${cB}18)` } : {};
  const save = () => { if (aReg === "" || bReg === "") return; const p = { aReg: Number(aReg), bReg: Number(bReg) }; p.advance = draw ? (advance || match.teamA) : (Number(aReg) > Number(bReg) ? match.teamA : match.teamB); savePred(match.id, p); };
  const timeLeft = () => { const d = match.kickoff - now; if (d <= 0) return "Locked"; const h = Math.floor(d / 3600000), days = Math.floor(h / 24); if (days > 0) return `${days}d ${h % 24}h`; return `${h}h ${Math.floor((d % 3600000) / 60000)}m`; };

  return (
    <div className={cls("border-slate-700", "border-slate-200 shadow-sm") + " border rounded-xl p-4 overflow-hidden"} style={bgStyle}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-emerald-400">{match.id}</span>
            {live && <span className="flex items-center gap-0.5 text-[10px] text-red-400 font-bold animate-pulse"><Zap className="w-2.5 h-2.5" />LIVE</span>}
          </div>
          <div className={cls("text-slate-500", "text-slate-400") + " flex items-center gap-1 text-[11px] mt-0.5"}><MapPin className="w-3 h-3" />{match.venue}</div>
        </div>
        <div className="text-right">
          <span className={`text-[11px] flex items-center gap-1 justify-end ${live ? "text-red-400 animate-pulse" : locked ? "text-red-400/70" : "text-emerald-400"}`}>
            {live ? <><Zap className="w-3 h-3" />In Progress</> : locked ? <><Lock className="w-3 h-3" />Locked</> : <><Clock className="w-3 h-3" />{timeLeft()}</>}
          </span>
          <p className={cls("text-slate-500", "text-slate-400") + " text-[10px] mt-0.5"}>{fmtKickoff(match.kickoff)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 text-right"><span className="font-bold text-sm">{FLAGS[match.teamA]} {match.teamA}</span></div>
        <input type="text" inputMode="numeric" pattern="[0-9]*" disabled={locked || isTBD} value={aReg} onChange={e => setAReg(e.target.value.replace(/[^0-9]/g, ""))} onBlur={save} className={cls("bg-slate-900 border-slate-700 text-white", "bg-slate-50 border-slate-300 text-slate-800") + " w-12 h-12 text-center border rounded-lg font-bold text-lg outline-none focus:border-emerald-500 disabled:opacity-30"} />
        <span className={cls("text-slate-500", "text-slate-400") + " font-bold text-lg"}>–</span>
        <input type="text" inputMode="numeric" pattern="[0-9]*" disabled={locked || isTBD} value={bReg} onChange={e => setBReg(e.target.value.replace(/[^0-9]/g, ""))} onBlur={save} className={cls("bg-slate-900 border-slate-700 text-white", "bg-slate-50 border-slate-300 text-slate-800") + " w-12 h-12 text-center border rounded-lg font-bold text-lg outline-none focus:border-emerald-500 disabled:opacity-30"} />
        <div className="flex-1"><span className="font-bold text-sm">{match.teamB} {FLAGS[match.teamB]}</span></div>
      </div>
      {draw && !locked && !isTBD && (
        <div className={cls("border-slate-700", "border-slate-200") + " mt-3 pt-3 border-t"}>
          <p className={cls("text-slate-400", "text-slate-500") + " text-xs mb-2"}>Draw — who advances (ET / pens)?</p>
          <div className="grid grid-cols-2 gap-2">
            {[match.teamA, match.teamB].map(t => (
              <button key={t} onClick={() => { setAdvance(t); savePred(match.id, { aReg: Number(aReg), bReg: Number(bReg), advance: t }); }} className={`py-2 rounded-lg text-xs font-bold transition ${advance === t ? "bg-emerald-500 text-white" : cls("bg-slate-900 border-slate-700", "bg-slate-100 border-slate-200") + " border"}`}>{FLAGS[t]} {t}</button>
            ))}
          </div>
        </div>
      )}
      {pred && !isTBD && <p className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" />{pred.aReg}–{pred.bReg}{draw && pred.advance ? ` · ${pred.advance} advances` : ""}</p>}
      {isTBD && <p className={cls("text-slate-500", "text-slate-400") + " mt-2 text-[11px]"}>Teams confirmed after group stage</p>}
    </div>
  );
}

// ============================================================
// All Picks Tab
// ============================================================
function PicksTab({ matches, results, members, allPreds, comments, addComment, me }) {
  const { cls } = useTheme();
  const [round, setRound] = useState("R32"), [commentInputs, setCommentInputs] = useState({}), [showC, setShowC] = useState({});

  return (
    <div>
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {ROUNDS.map(r => <button key={r.key} onClick={() => setRound(r.key)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${round === r.key ? "bg-emerald-500 text-white" : cls("bg-slate-800 text-slate-400", "bg-white text-slate-500 shadow-sm")}`}>{r.name}</button>)}
      </div>
      <div className="space-y-4">
        {matches.filter(m => m.round === round).map(m => {
          const res = results[m.id], isTBD = m.teamA === "TBD" || m.teamB === "TBD", mc = comments[m.id] || [];
          const preds = members.map(mem => allPreds[mem.name]?.[m.id]).filter(Boolean);
          const aV = preds.filter(p => p.aReg > p.bReg).length, bV = preds.filter(p => p.bReg > p.aReg).length, dV = preds.filter(p => p.aReg === p.bReg).length;
          const total = preds.length;
          return (
            <div key={m.id} className={cls("bg-slate-800/60 border-slate-700", "bg-white border-slate-200 shadow-sm") + " border rounded-xl overflow-hidden"}>
              <div className={cls("bg-slate-900/60 border-slate-700", "bg-slate-50 border-slate-200") + " p-3 border-b"}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-emerald-400">{m.id}</span>
                  <span className={cls("text-slate-500", "text-slate-400") + " text-[11px] flex items-center gap-1"}><MapPin className="w-2.5 h-2.5" />{m.venue}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm flex-1">{FLAGS[m.teamA]} {m.teamA}</span>
                  <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${res ? "bg-emerald-500/20 text-emerald-300" : cls("text-slate-500", "text-slate-400")}`}>{res ? `${res.aReg}–${res.bReg}` : "vs"}</span>
                  <span className="font-bold text-sm flex-1 text-right">{m.teamB} {FLAGS[m.teamB]}</span>
                </div>
                {res?.advance && <p className="text-[11px] text-emerald-400 text-center mt-1.5">✅ {FLAGS[res.advance]} {res.advance} advances{res.hadPens ? ` (pens ${res.pensA}–${res.pensB})` : res.hadET ? " (ET)" : ""}</p>}
                {total > 0 && !isTBD && (
                  <div className="mt-2">
                    <div className={cls("text-slate-500", "text-slate-400") + " flex text-[10px] justify-between mb-0.5"}>
                      <span>{m.teamA.split(" ")[0]} {aV}</span><span>Draw {dV}</span><span>{bV} {m.teamB.split(" ")[0]}</span>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
                      {aV > 0 && <div className="bg-blue-500 rounded-full" style={{ flex: aV }} />}
                      {dV > 0 && <div className="bg-slate-500 rounded-full" style={{ flex: dV }} />}
                      {bV > 0 && <div className="bg-red-500 rounded-full" style={{ flex: bV }} />}
                    </div>
                  </div>
                )}
              </div>
              <div className={cls("divide-slate-700/30", "divide-slate-100") + " divide-y"}>
                {members.map(member => {
                  const pred = allPreds[member.name]?.[m.id], score = (res && pred) ? scoreMatch(pred, res) : null, isDraw = pred && pred.aReg === pred.bReg;
                  return (
                    <div key={member.name} className="flex items-center px-3 py-2.5 gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">{member.name[0]?.toUpperCase()}</div>
                      <span className="text-sm font-medium flex-1 truncate">{member.name}</span>
                      {pred ? (
                        <div className="flex items-center gap-1.5">
                          {score?.exact && <span title="Called it!">🔮</span>}
                          <span className={cls("text-slate-300", "text-slate-600") + " text-sm font-mono"}>{pred.aReg}–{pred.bReg}{isDraw && pred.advance ? <span className={cls("text-slate-400", "text-slate-400") + " text-[10px] ml-1"}>({FLAGS[pred.advance]})</span> : null}</span>
                          {score != null ? (<span className={`text-xs font-black px-2 py-0.5 rounded-full min-w-[40px] text-center ${score.pts >= SCORING.exactReg ? "bg-amber-500/30 text-amber-300" : score.pts > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700/50 text-slate-500"}`}>+{score.pts}</span>) : (<span className={cls("text-slate-600", "text-slate-400") + " text-[11px] italic min-w-[40px] text-right"}>—</span>)}
                        </div>
                      ) : (<span className={cls("text-slate-600", "text-slate-400") + " text-[11px] italic"}>no pick</span>)}
                    </div>
                  );
                })}
              </div>
              <div className={cls("border-slate-700/50", "border-slate-100") + " border-t"}>
                <button onClick={() => setShowC(s => ({ ...s, [m.id]: !s[m.id] }))} className={cls("text-slate-500 hover:text-slate-300", "text-slate-400 hover:text-slate-600") + " flex items-center gap-1.5 px-3 py-2 text-xs font-medium w-full"}>
                  <MessageCircle className="w-3.5 h-3.5" />{mc.length > 0 ? `${mc.length} comment${mc.length !== 1 ? "s" : ""}` : "Add comment"}<ChevronRight className={`w-3 h-3 ml-auto transition-transform ${showC[m.id] ? "rotate-90" : ""}`} />
                </button>
                {showC[m.id] && (
                  <div className="px-3 pb-3 space-y-2">
                    {mc.map((c, i) => (
                      <div key={i} className={cls("bg-slate-900/60", "bg-slate-50") + " rounded-lg px-3 py-2"}>
                        <span className="text-xs font-bold text-emerald-400">{c.name}</span>
                        <span className={cls("text-slate-300", "text-slate-600") + " text-xs ml-2"}>{c.text}</span>
                        <span className={cls("text-slate-600", "text-slate-400") + " text-[10px] ml-1"}>{new Date(c.ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <input value={commentInputs[m.id] || ""} onChange={e => setCommentInputs(s => ({ ...s, [m.id]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter" && commentInputs[m.id]?.trim()) { addComment(m.id, commentInputs[m.id].trim()); setCommentInputs(s => ({ ...s, [m.id]: "" })); } }} placeholder="Say something…" maxLength={120} className={cls("bg-slate-900 border-slate-700 text-white", "bg-white border-slate-300 text-slate-800") + " flex-1 border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-emerald-500"} />
                      <button onClick={() => { if (commentInputs[m.id]?.trim()) { addComment(m.id, commentInputs[m.id].trim()); setCommentInputs(s => ({ ...s, [m.id]: "" })); } }} className="bg-emerald-500 hover:bg-emerald-400 p-2 rounded-lg"><Send className="w-3.5 h-3.5 text-white" /></button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Stats Tab
// ============================================================
function StatsTab({ me, members, allPreds, allBonus, matches, results, adjustments }) {
  const { cls } = useTheme();
  const [view, setView] = useState("me");
  function playerStats(name) {
    const preds = allPreds[name] || {}, bonus = allBonus[name];
    const { total, byRound, exacts } = computeTotal(preds, bonus, matches, results, adjustments[name] || 0);
    const played = matches.filter(m => results[m.id] && preds[m.id]);
    const accuracy = played.length > 0 ? Math.round(played.filter(m => { const s = scoreMatch(preds[m.id], results[m.id]); return s && s.pts > 0; }).length / played.length * 100) : 0;
    const total_preds = Object.keys(preds).length;
    const pickCounts = {};
    for (const m of matches) { const p = preds[m.id]; if (!p) continue; const w = p.aReg > p.bReg ? m.teamA : p.bReg > p.aReg ? m.teamB : p.advance; if (w && w !== "TBD") pickCounts[w] = (pickCounts[w] || 0) + 1; }
    const favTeam = Object.entries(pickCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return { total, byRound, exacts, accuracy, total_preds, favTeam };
  }
  const myStats = playerStats(me);
  const allStats = members.map(m => ({ name: m.name, ...playerStats(m.name) })).sort((a, b) => b.total - a.total);
  const SC = ({ label, value, sub }) => (<div className={cls("bg-slate-800/60 border-slate-700", "bg-white border-slate-200 shadow-sm") + " border rounded-xl p-3 text-center"}><p className="text-xl font-black text-emerald-400">{value}</p><p className={cls("text-slate-300", "text-slate-700") + " text-xs font-bold mt-0.5"}>{label}</p>{sub && <p className={cls("text-slate-500", "text-slate-400") + " text-[10px] mt-0.5"}>{sub}</p>}</div>);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {[["me", "My Stats"], ["all", "All Players"]].map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${view === k ? "bg-emerald-500 text-white" : cls("bg-slate-800 text-slate-400", "bg-white text-slate-500 shadow-sm")}`}>{l}</button>
        ))}
      </div>
      {view === "me" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <SC label="Total Points" value={myStats.total} />
            <SC label="Exact Scores" value={myStats.exacts} />
            <SC label="Pick Accuracy" value={`${myStats.accuracy}%`} sub="at least 1 pt" />
            <SC label="Predictions Made" value={myStats.total_preds} />
          </div>
          {myStats.favTeam && (
            <div className={cls("bg-slate-800/60 border-slate-700", "bg-white border-slate-200 shadow-sm") + " border rounded-xl p-3 flex items-center gap-3"}>
              <span className="text-2xl">{FLAGS[myStats.favTeam]}</span>
              <div><p className={cls("text-slate-400", "text-slate-500") + " text-[11px]"}>Favourite pick</p><p className="font-bold text-sm">{myStats.favTeam}</p></div>
            </div>
          )}
          <div className={cls("bg-slate-800/60 border-slate-700", "bg-white border-slate-200 shadow-sm") + " border rounded-xl p-4"}>
            <p className="font-bold text-sm mb-3 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-emerald-400" /> Points by Round</p>
            <div className="space-y-2">
              {ROUNDS.map(r => {
                const pts = myStats.byRound[r.key] || 0, max = Math.max(...Object.values(myStats.byRound), 1); return (
                  <div key={r.key} className="flex items-center gap-2">
                    <span className={cls("text-slate-400", "text-slate-500") + " text-[11px] w-24 shrink-0"}>{r.name}</span>
                    <div className={cls("bg-slate-700", "bg-slate-100") + " flex-1 h-2 rounded-full overflow-hidden"}><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pts / max * 100}%` }} /></div>
                    <span className="text-xs font-bold text-emerald-400 w-6 text-right">{pts}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {view === "all" && (
        <div className="space-y-2">
          {allStats.map((s, i) => (
            <div key={s.name} className={cls("bg-slate-800/60 border-slate-700", "bg-white border-slate-200 shadow-sm") + (s.name === me ? " border-emerald-500/50" : "") + ` border rounded-xl p-3`}>
              <div className="flex items-center gap-3 mb-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${i === 0 ? "bg-amber-400 text-slate-900" : i === 1 ? "bg-slate-300 text-slate-900" : i === 2 ? "bg-amber-700 text-white" : "bg-slate-700 text-white"}`}>{i + 1}</div>
                <span className="font-bold text-sm flex-1">{s.name}{s.name === me && <span className="ml-1 text-[10px] bg-emerald-500 px-1.5 py-0.5 rounded text-white">You</span>}</span>
                <span className="font-black text-lg text-emerald-400">{s.total}</span>
              </div>
              <div className="flex gap-3 text-[11px] ml-10">
                <span className={cls("text-slate-400", "text-slate-500")}>🎯 {s.exacts} exact</span>
                <span className={cls("text-slate-400", "text-slate-500")}>📊 {s.accuracy}% acc</span>
                {s.favTeam && <span className={cls("text-slate-400", "text-slate-500")}>{FLAGS[s.favTeam]} fave</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Bracket Tab
// ============================================================
function BracketTab({ matches, results }) {
  const { cls } = useTheme();
  return (
    <div className="space-y-6">
      {ROUNDS.map(r => (
        <div key={r.key}>
          <h3 className={cls("text-slate-400", "text-slate-500") + " text-xs font-bold uppercase tracking-widest mb-2"}>{r.name}</h3>
          <div className="space-y-2">
            {matches.filter(m => m.round === r.key).map(m => {
              const res = results[m.id]; return (
                <div key={m.id} className={cls("bg-slate-800/60 border-slate-700", "bg-white border-slate-200 shadow-sm") + " border rounded-lg p-2.5"}>
                  <div className="flex items-center text-sm">
                    <span className="text-[10px] text-emerald-400 font-bold w-10 shrink-0">{m.id}</span>
                    <span className={`flex-1 ${res?.advance === m.teamA ? "font-bold text-emerald-400" : cls("text-slate-300", "text-slate-700")}`}>{FLAGS[m.teamA]} {m.teamA}</span>
                    <span className={cls("text-slate-500", "text-slate-400") + " text-xs mx-2 font-mono"}>{res ? `${res.aReg}–${res.bReg}` : "vs"}</span>
                    <span className={`flex-1 text-right ${res?.advance === m.teamB ? "font-bold text-emerald-400" : cls("text-slate-300", "text-slate-700")}`}>{m.teamB} {FLAGS[m.teamB]}</span>
                  </div>
                  <div className={cls("text-slate-500", "text-slate-400") + " flex items-center gap-1 mt-1 ml-10 text-[10px]"}><MapPin className="w-2.5 h-2.5" />{m.venue}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Leaderboard
// ============================================================
function Leaderboard({ members, allPreds, allBonus, matches, results, me, adjustments }) {
  const { cls } = useTheme();
  const [expanded, setExpanded] = useState(null);
  const rows = members.map(m => { const { total, exacts, advances, byRound } = computeTotal(allPreds[m.name] || {}, allBonus[m.name], matches, results, adjustments[m.name] || 0); return { name: m.name, total, exacts, advances, byRound }; }).sort((a, b) => b.total - a.total || b.exacts - a.exacts || b.advances - a.advances);
  const medals = ["bg-amber-400 text-slate-900", "bg-slate-300 text-slate-900", "bg-amber-700 text-white"];
  return (
    <div>
      <div className="space-y-2 mb-6">
        {rows.map((r, i) => (
          <div key={r.name}>
            <div className={cls("bg-slate-800/60 border-slate-700", "bg-white border-slate-200 shadow-sm") + (r.name === me ? " border-emerald-500/40" : "") + " border rounded-xl overflow-hidden"}>
              <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpanded(expanded === r.name ? null : r.name)}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${medals[i] || "bg-slate-700 text-white"}`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm flex items-center gap-1.5 flex-wrap">{r.name}{r.name === me && <span className="text-[10px] bg-emerald-500 px-1.5 py-0.5 rounded font-bold text-white">You</span>}{i === 0 && rows[0].total > 0 && <Crown className="w-3.5 h-3.5 text-amber-400" />}</p>
                  <p className={cls("text-slate-400", "text-slate-500") + " text-[11px]"}>{r.exacts} exact · {r.advances} advances</p>
                </div>
                <div className="text-right shrink-0 flex items-center gap-2">
                  <p className="font-black text-xl text-emerald-400">{r.total}</p>
                  <ChevronRight className={cls("text-slate-500", "text-slate-400") + ` w-4 h-4 transition-transform ${expanded === r.name ? "rotate-90" : ""}`} />
                </div>
              </div>
              {expanded === r.name && (
                <div className={cls("border-slate-700/50 bg-slate-900/40", "border-slate-100 bg-slate-50") + " border-t px-3 py-2.5"}>
                  <p className={cls("text-slate-400", "text-slate-500") + " text-[11px] font-bold mb-1.5"}>Points by round</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ROUNDS.map(ro => (
                      <div key={ro.key} className={cls("bg-slate-800", "bg-white") + " rounded-lg p-2 text-center"}>
                        <p className="text-emerald-400 font-black text-sm">{r.byRound[ro.key] || 0}</p>
                        <p className={cls("text-slate-500", "text-slate-400") + " text-[9px] font-bold truncate"}>{ro.name}</p>
                      </div>
                    ))}
                  </div>
                  {adjustments[r.name] && adjustments[r.name] !== 0 && <p className={cls("text-slate-400", "text-slate-500") + " text-[11px] mt-2"}>Adjustment: {adjustments[r.name] > 0 ? "+" : ""}{adjustments[r.name]} pts</p>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className={cls("bg-slate-800/40 border-slate-700", "bg-white border-slate-200 shadow-sm") + " border rounded-xl p-4 text-xs space-y-1.5"}>
        <p className={cls("text-slate-200", "text-slate-800") + " font-bold mb-2 flex items-center gap-1.5"}><Star className="w-3.5 h-3.5 text-amber-400" /> Scoring Guide</p>
        <p className={cls("text-slate-400", "text-slate-500")}>Exact: <b className={cls("text-white", "text-slate-800")}>{SCORING.exactReg}</b> · Goal diff: <b className={cls("text-white", "text-slate-800")}>{SCORING.gdReg}</b> · Advances: <b className={cls("text-white", "text-slate-800")}>{SCORING.winner}</b></p>
        <p className={cls("text-slate-400", "text-slate-500")}>ET exact: <b className={cls("text-white", "text-slate-800")}>+{SCORING.etExact}</b> · ET diff: <b className={cls("text-white", "text-slate-800")}>+{SCORING.etGd}</b> · Pen win: <b className={cls("text-white", "text-slate-800")}>+{SCORING.pensWinner}</b> · Pen exact: <b className={cls("text-white", "text-slate-800")}>+{SCORING.pensExact}</b></p>
        <p className={cls("text-slate-400", "text-slate-500")}>Champion: <b className={cls("text-white", "text-slate-800")}>+{SCORING.champion}</b> · Finalists: <b className={cls("text-white", "text-slate-800")}>+{SCORING.finalists}</b></p>
        <p className={cls("text-slate-500", "text-slate-400") + " pt-1 border-t " + cls("border-slate-700", "border-slate-200")}>Tap a player to see their round breakdown.</p>
      </div>
    </div>
  );
}

// ============================================================
// Admin Tab
// ============================================================
function AdminTab({ matches, results, saveResult, members, adjustments, saveAdjustments, updateMatchTeams }) {
  const { cls } = useTheme();
  const [section, setSection] = useState("results");
  return (
    <div>
      <div className={cls("bg-slate-800/60", "bg-white shadow-sm") + " flex gap-1 p-1 rounded-xl mb-4"}>
        {[["results", "Results"], ["teams", "TBD Teams"], ["final", "Bonuses"], ["adjust", "Adjustments"]].map(([k, l]) => (
          <button key={k} onClick={() => setSection(k)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition ${section === k ? "bg-emerald-500 text-white" : cls("text-slate-400", "text-slate-500")}`}>{l}</button>
        ))}
      </div>
      {section === "results" && <ResultsSection matches={matches} results={results} saveResult={saveResult} />}
      {section === "teams" && <TBDTeamsSection matches={matches} updateMatchTeams={updateMatchTeams} />}
      {section === "final" && <FinalBonusSection results={results} saveResult={saveResult} />}
      {section === "adjust" && <AdjustmentsSection members={members} adjustments={adjustments} saveAdjustments={saveAdjustments} />}
    </div>
  );
}

function ResultsSection({ matches, results, saveResult }) {
  const { cls } = useTheme();
  const [round, setRound] = useState("R32");
  const rm = matches.filter(m => m.round === round && m.teamA !== "TBD");
  return (
    <div>
      <p className={cls("text-amber-200/70 border-amber-700/30 bg-slate-800/60", "text-amber-700 border-amber-200 bg-amber-50") + " text-xs mb-3 flex items-center gap-1.5 border rounded-lg p-2.5"}><Lock className="w-3.5 h-3.5 shrink-0" /> Enter results to auto-score all players.</p>
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">{ROUNDS.map(r => <button key={r.key} onClick={() => setRound(r.key)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${round === r.key ? "bg-emerald-500 text-white" : cls("bg-slate-800 text-slate-400", "bg-white text-slate-500 shadow-sm")}`}>{r.name}</button>)}</div>
      <div className="space-y-3">{rm.length === 0 && <p className={cls("text-slate-500", "text-slate-400") + " text-sm text-center py-8"}>No confirmed teams yet.</p>}{rm.map(m => <ResultRow key={m.id} match={m} result={results[m.id]} saveResult={saveResult} />)}</div>
    </div>
  );
}

function TBDTeamsSection({ matches, updateMatchTeams }) {
  const { cls } = useTheme();
  const tbdMatches = matches.filter(m => m.teamA === "TBD" || m.teamB === "TBD");
  const [edits, setEdits] = useState({}), [saved, setSaved] = useState({});
  if (tbdMatches.length === 0) return <p className="text-emerald-400 text-sm text-center py-8">✅ All teams confirmed!</p>;
  return (
    <div className="space-y-3">
      {tbdMatches.map(m => {
        const e = edits[m.id] || { teamA: m.teamA === "TBD" ? "" : m.teamA, teamB: m.teamB === "TBD" ? "" : m.teamB };
        return (
          <div key={m.id} className={cls("bg-slate-800/60 border-slate-700", "bg-white border-slate-200 shadow-sm") + " border rounded-xl p-3"}>
            <div className="flex justify-between mb-2"><span className="text-xs font-bold text-emerald-400">{m.id}</span><span className={cls("text-slate-500", "text-slate-400") + " text-[10px]"}>{m.venue}</span></div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {["teamA", "teamB"].map(side => (
                <select key={side} value={e[side]} onChange={ev => setEdits(s => ({ ...s, [m.id]: { ...e, [side]: ev.target.value } }))} className={cls("bg-slate-900 border-slate-700 text-white", "bg-slate-50 border-slate-300 text-slate-800") + " w-full border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-emerald-500"}>
                  <option value="">Select team…</option>{ALL_TEAMS.map(t => <option key={t} value={t}>{FLAGS[t]} {t}</option>)}
                </select>
              ))}
            </div>
            <button disabled={!e.teamA || !e.teamB || e.teamA === e.teamB} onClick={async () => { await updateMatchTeams(m.id, e.teamA, e.teamB); setSaved(s => ({ ...s, [m.id]: true })); setTimeout(() => setSaved(s => ({ ...s, [m.id]: false })), 2000); }} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 py-1.5 rounded-lg text-xs font-bold text-white">{saved[m.id] ? "✅ Saved!" : "Confirm Teams"}</button>
          </div>
        );
      })}
    </div>
  );
}

function FinalBonusSection({ results, saveResult }) {
  const { cls } = useTheme();
  const cur = results.__final || {};
  const [champ, setChamp] = useState(cur.champion || ""), [f1, setF1] = useState(cur.finalists?.[0] || ""), [f2, setF2] = useState(cur.finalists?.[1] || ""), [saved, setSaved] = useState(false);
  return (
    <div className={cls("bg-slate-800/60 border-slate-700", "bg-white border-slate-200 shadow-sm") + " border rounded-xl p-4 space-y-3"}>
      <p className="font-bold text-sm flex items-center gap-2"><Crown className="w-4 h-4 text-amber-400" /> Enter Tournament Winners</p>
      <p className={cls("text-slate-400", "text-slate-500") + " text-xs"}>After the Final, enter results here to trigger all bonus point calculations.</p>
      {[["🏆 Champion (+15 pts)", champ, setChamp], ["🥈 Finalist 1 (+8 pts for both)", f1, setF1], ["🥉 Finalist 2", f2, setF2]].map(([label, val, setter]) => (
        <div key={label}><label className={cls("text-slate-400", "text-slate-500") + " text-xs mb-1 block"}>{label}</label>
          <select value={val} onChange={e => setter(e.target.value)} className={cls("bg-slate-900 border-slate-700 text-white", "bg-white border-slate-300 text-slate-800") + " w-full border rounded-lg px-3 py-2 text-sm outline-none"}><option value="">Select…</option>{ALL_TEAMS.map(t => <option key={t} value={t}>{FLAGS[t]} {t}</option>)}</select></div>
      ))}
      <button disabled={!champ || !f1 || !f2} onClick={async () => { await saveResult("__final", { champion: champ, finalists: [f1, f2] }); setSaved(true); setTimeout(() => setSaved(false), 2000); }} className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 py-2 rounded-lg font-bold text-sm text-white">{saved ? "✅ Saved & Scored!" : "Save & Score Bonuses"}</button>
    </div>
  );
}

function AdjustmentsSection({ members, adjustments, saveAdjustments }) {
  const { cls } = useTheme();
  const [local, setLocal] = useState(adjustments || {}), [saved, setSaved] = useState(false);
  return (
    <div className="space-y-3">
      <p className={cls("text-slate-400", "text-slate-500") + " text-xs"}>Add or subtract points from any player. Use for corrections or disputes.</p>
      {members.map(m => (
        <div key={m.name} className={cls("bg-slate-800/60 border-slate-700", "bg-white border-slate-200 shadow-sm") + " border rounded-xl p-3 flex items-center gap-3"}>
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">{m.name[0]?.toUpperCase()}</div>
          <span className="flex-1 text-sm font-medium">{m.name}</span>
          <input type="text" inputMode="numeric" value={local[m.name] || ""} onChange={e => { const v = e.target.value.replace(/[^-0-9]/g, ""); setLocal(s => ({ ...s, [m.name]: v ? Number(v) : 0 })); }} placeholder="0" className={cls("bg-slate-900 border-slate-700 text-white", "bg-slate-50 border-slate-300 text-slate-800") + " w-20 text-center border rounded-lg px-2 py-1.5 text-sm outline-none focus:border-emerald-500"} />
          <span className={cls("text-slate-500", "text-slate-400") + " text-xs"}>pts</span>
        </div>
      ))}
      <button onClick={async () => { await saveAdjustments(local); setSaved(true); setTimeout(() => setSaved(false), 2000); }} className="w-full bg-emerald-600 hover:bg-emerald-500 py-2 rounded-lg font-bold text-sm text-white">{saved ? "✅ Saved!" : "Save Adjustments"}</button>
    </div>
  );
}

function ResultRow({ match, result, saveResult }) {
  const { cls } = useTheme();
  const [aReg, setAReg] = useState(result?.aReg ?? ""), [bReg, setBReg] = useState(result?.bReg ?? ""), [hadET, setHadET] = useState(result?.hadET ?? false), [aET, setAET] = useState(result?.aET ?? ""), [bET, setBET] = useState(result?.bET ?? ""), [hadPens, setHadPens] = useState(result?.hadPens ?? false), [pensA, setPensA] = useState(result?.pensA ?? ""), [pensB, setPensB] = useState(result?.pensB ?? ""), [advance, setAdvance] = useState(result?.advance ?? "");
  const save = () => { if (aReg === "" || bReg === "" || !advance) return; saveResult(match.id, { aReg: Number(aReg), bReg: Number(bReg), hadET, aET: hadET ? Number(aET) : null, bET: hadET ? Number(bET) : null, hadPens, pensA: hadPens ? Number(pensA) : null, pensB: hadPens ? Number(pensB) : null, advance }); };
  const ni = (val, set) => <input type="text" inputMode="numeric" pattern="[0-9]*" value={val} onChange={e => set(e.target.value.replace(/[^0-9]/g, ""))} className={cls("bg-slate-900 border-slate-700 text-white", "bg-slate-50 border-slate-300 text-slate-800") + " w-11 h-10 text-center border rounded-lg font-bold outline-none focus:border-emerald-500"} />;
  return (
    <div className={cls("bg-slate-800/60 border-slate-700", "bg-white border-slate-200 shadow-sm") + " border rounded-xl p-3"}>
      <p className="text-[11px] text-emerald-400 font-bold mb-2">{match.id} · {match.venue}</p>
      <div className="flex items-center gap-2 mb-3"><span className="flex-1 text-right font-bold text-sm">{FLAGS[match.teamA]} {match.teamA}</span>{ni(aReg, setAReg)}<span className={cls("text-slate-500", "text-slate-400") + " font-bold"}>–</span>{ni(bReg, setBReg)}<span className="flex-1 font-bold text-sm">{match.teamB} {FLAGS[match.teamB]}</span></div>
      <div className="flex gap-4 mb-3 text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={hadET} onChange={e => setHadET(e.target.checked)} /> Extra time</label>
        <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={hadPens} onChange={e => setHadPens(e.target.checked)} /> Penalties</label>
      </div>
      {hadET && <div className="flex items-center gap-2 mb-3 text-xs"><span className={cls("text-slate-400", "text-slate-500") + " w-16"}>ET score:</span>{ni(aET, setAET)}<span className={cls("text-slate-500", "text-slate-400")}>–</span>{ni(bET, setBET)}</div>}
      {hadPens && <div className="flex items-center gap-2 mb-3 text-xs"><span className={cls("text-slate-400", "text-slate-500") + " w-16"}>Pens:</span>{ni(pensA, setPensA)}<span className={cls("text-slate-500", "text-slate-400")}>–</span>{ni(pensB, setPensB)}</div>}
      <div className="grid grid-cols-2 gap-2 mb-3">{[match.teamA, match.teamB].map(t => <button key={t} onClick={() => setAdvance(t)} className={`py-2 rounded-lg text-xs font-bold transition ${advance === t ? "bg-emerald-500 text-white" : cls("bg-slate-900 border-slate-700", "bg-slate-100 border-slate-200") + " border"}`}>{FLAGS[t]} {t} advances</button>)}</div>
      <button onClick={save} disabled={aReg === "" || bReg === "" || !advance} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 py-2 rounded-lg font-bold text-sm text-white">Save Result</button>
      {result && <p className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1"><Check className="w-3 h-3" /> Saved</p>}
    </div>
  );
}

// ============================================================
// Celebration Screen
// ============================================================
function CelebrationScreen({ members, allPreds, allBonus, matches, results, adjustments, lname, onClose }) {
  const finalRes = results.M104;
  const rows = members.map(m => { const { total, exacts } = computeTotal(allPreds[m.name] || {}, allBonus[m.name], matches, results, adjustments[m.name] || 0); return { name: m.name, total, exacts }; }).sort((a, b) => b.total - a.total || b.exacts - a.exacts);
  const winner = rows[0];
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <Confetti />
      <div className="text-center z-10 max-w-sm w-full">
        <div className="text-6xl mb-4 animate-bounce">🏆</div>
        <h1 className="text-3xl font-black mb-1">{lname}</h1>
        <p className="text-emerald-400 font-bold mb-6">Final Standings</p>
        {finalRes && <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl p-4 mb-4"><p className="text-sm text-emerald-300">⚽ World Cup 2026 Winner</p><p className="text-2xl font-black mt-1">{FLAGS[finalRes.advance]} {finalRes.advance}</p></div>}
        {winner && <div className="bg-amber-500/20 border border-amber-500/40 rounded-xl p-4 mb-4"><p className="text-sm text-amber-300">👑 Prediction Champion</p><p className="text-2xl font-black mt-1">{winner.name}</p><p className="text-emerald-400 font-bold">{winner.total} pts · {winner.exacts} exact scores</p></div>}
        <div className="space-y-2 mb-6">{rows.map((r, i) => <div key={r.name} className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-xl p-3"><span className="text-lg">{["🥇", "🥈", "🥉"][i] || `${i + 1}.`}</span><span className="flex-1 font-bold">{r.name}</span><span className="font-black text-emerald-400">{r.total} pts</span></div>)}</div>
        <button onClick={onClose} className="w-full bg-emerald-500 hover:bg-emerald-400 py-3 rounded-xl font-bold transition">Back to League</button>
      </div>
    </div>
  );
}
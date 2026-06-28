import { useState, useEffect, useCallback } from "react";
import { Trophy, Users, Plus, LogIn, Calendar, Lock, Crown, Medal, ChevronRight, Check, Clock, ArrowLeft, Share2, Star } from "lucide-react";
import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";

// ---- Scoring ----
const SCORING = {
  exactReg: 10, gdReg: 7, winner: 5,
  etExact: 5, etGd: 2,
  pensWinner: 3, pensExact: 3,
  champion: 15, finalists: 8,
};

// ---- Tournament ----
const ROUNDS = [
  { key: "R32", name: "Round of 32", count: 16 },
  { key: "R16", name: "Round of 16", count: 8 },
  { key: "QF", name: "Quarterfinals", count: 4 },
  { key: "SF", name: "Semifinals", count: 2 },
  { key: "F", name: "Final", count: 1 },
];

const FLAGS = {
  "Germany": "🇩🇪", "Paraguay": "🇵🇾", "France": "🇫🇷", "Sweden": "🇸🇪",
  "South Africa": "🇿🇦", "Canada": "🇨🇦", "Netherlands": "🇳🇱", "Morocco": "🇲🇦",
  "Portugal": "🇵🇹", "Croatia": "🇭🇷", "Spain": "🇪🇸", "Austria": "🇦🇹",
  "USA": "🇺🇸", "Bosnia & Herz.": "🇧🇦", "Belgium": "🇧🇪", "Senegal": "🇸🇳",
  "Brazil": "🇧🇷", "Japan": "🇯🇵", "Ireland": "🇮🇪", "Norway": "🇳🇴",
  "Mexico": "🇲🇽", "Ecuador": "🇪🇨", "England": "🇬🇧", "DR Congo": "🇨🇩",
  "Argentina": "🇦🇷", "Cape Verde": "🇨🇻", "Australia": "🇦🇺", "Egypt": "🇪🇬",
  "Switzerland": "🇨🇭", "Algeria": "🇩🇿", "Colombia": "🇨🇴", "Ghana": "🇬🇭",
  "TBD": "⚪",
};

const SAMPLE_R32 = [
  ["Germany", "Paraguay"], ["France", "Sweden"], ["South Africa", "Canada"], ["Netherlands", "Morocco"],
  ["Portugal", "Croatia"], ["Spain", "Austria"], ["USA", "Bosnia & Herz."], ["Belgium", "Senegal"],
  ["Brazil", "Japan"], ["Ireland", "Norway"], ["Mexico", "Ecuador"], ["England", "DR Congo"],
  ["Argentina", "Cape Verde"], ["Australia", "Egypt"], ["Switzerland", "Algeria"], ["Colombia", "Ghana"],
];

function buildInitialMatches() {
  const matches = [];
  let id = 0;
  SAMPLE_R32.forEach(([a, b], i) => {
    matches.push({
      id: `R32-${id++}`, round: "R32", slot: i, teamA: a, teamB: b,
      kickoff: Date.now() + (i + 1) * 3600000 * 6
    });
  });
  ["R16", "QF", "SF", "F"].forEach(rk => {
    const r = ROUNDS.find(x => x.key === rk);
    for (let i = 0; i < r.count; i++) {
      matches.push({
        id: `${rk}-${id++}`, round: rk, slot: i, teamA: "TBD", teamB: "TBD",
        kickoff: Date.now() + (20 + id) * 3600000 * 24
      });
    }
  });
  return matches;
}

// ---- Scoring Engine ----
function scoreMatch(pred, result) {
  if (!pred || !result || result.aReg == null) return null;
  let pts = 0; const detail = [];
  const { aReg: pA, bReg: pB } = pred;
  const { aReg: rA, bReg: rB } = result;
  const exact = pA === rA && pB === rB;
  const pDiff = pA - pB, rDiff = rA - rB;

  if (exact) { pts += SCORING.exactReg; detail.push(["Exact score", SCORING.exactReg]); }
  else if (pDiff === rDiff) { pts += SCORING.gdReg; detail.push(["Goal diff", SCORING.gdReg]); }
  else if ((pred.advance && pred.advance === result.advance) || (Math.sign(pDiff) === Math.sign(rDiff) && rDiff !== 0)) {
    pts += SCORING.winner; detail.push(["Who advances", SCORING.winner]);
  }

  if (result.hadET && pred.aET != null && result.aET != null) {
    const etEx = pred.aET === result.aET && pred.bET === result.bET;
    const etGd = (pred.aET - pred.bET) === (result.aET - result.bET);
    if (etEx) { pts += SCORING.etExact; detail.push(["ET exact", SCORING.etExact]); }
    else if (etGd) { pts += SCORING.etGd; detail.push(["ET goal diff", SCORING.etGd]); }
  }

  if (result.hadPens) {
    if (pred.advance && pred.advance === result.advance) { pts += SCORING.pensWinner; detail.push(["Pen winner", SCORING.pensWinner]); }
    if (pred.pensA != null && pred.pensA === result.pensA && pred.pensB === result.pensB) {
      pts += SCORING.pensExact; detail.push(["Pen exact", SCORING.pensExact]);
    }
  }
  return { pts, detail };
}

// ---- Local Storage ----
const ls = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
};

function genCode() { return Math.random().toString(36).substring(2, 7).toUpperCase(); }

function useToast() {
  const [toast, setToast] = useState("");
  const show = (m) => { setToast(m); setTimeout(() => setToast(""), 2500); };
  return [toast, show];
}

// ============================================================
// App Root
// ============================================================
export default function App() {
  const [screen, setScreen] = useState("home");
  const [name, setName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [leagues, setLeagues] = useState([]);
  const [active, setActive] = useState(null);
  const [tab, setTab] = useState("matches");
  const [ready, setReady] = useState(false);
  const [toast, showToast] = useToast();

  useEffect(() => {
    const n = ls.get("wc26:name");
    const l = ls.get("wc26:leagues");
    if (n) setName(n);
    if (l) setLeagues(l);
    setReady(true);
  }, []);

  const saveLeagues = (next) => { setLeagues(next); ls.set("wc26:leagues", next); };

  const saveName = () => {
    const n = nameInput.trim(); if (!n) return;
    setName(n); ls.set("wc26:name", n); setScreen("lobby");
  };

  const createLeague = async (lname) => {
    const code = genCode();
    const meta = { code, name: lname, owner: name, created: Date.now() };
    await setDoc(doc(db, "leagues", code), {
      ...meta,
      members: [{ name, joined: Date.now() }],
      matches: buildInitialMatches(),
      results: {},
    });
    saveLeagues([...leagues, meta]);
    showToast(`League created! Code: ${code}`);
    return code;
  };

  const joinLeague = async (raw) => {
    const code = raw.trim().toUpperCase();
    const snap = await getDoc(doc(db, "leagues", code));
    if (!snap.exists()) { showToast("League not found"); return false; }
    const d = snap.data();
    if (leagues.some(l => l.code === code)) { setActive(code); setScreen("league"); return true; }
    const members = d.members || [];
    if (!members.some(m => m.name === name)) {
      await updateDoc(doc(db, "leagues", code), { members: [...members, { name, joined: Date.now() }] });
    }
    const meta = { code, name: d.name, owner: d.owner };
    saveLeagues([...leagues, meta]);
    showToast(`Joined ${d.name}!`);
    return true;
  };

  if (!ready) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">Loading…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 px-4 py-2 rounded-xl shadow-xl text-sm font-semibold">
          {toast}
        </div>
      )}
      {(!name || screen === "home") && (
        <Home nameInput={nameInput} setNameInput={setNameInput} saveName={saveName} name={name} go={() => setScreen("lobby")} />
      )}
      {name && screen === "lobby" && (
        <Lobby name={name} leagues={leagues} createLeague={createLeague} joinLeague={joinLeague}
          open={c => { setActive(c); setTab("matches"); setScreen("league"); }} />
      )}
      {name && screen === "league" && active && (
        <League code={active} me={name} back={() => setScreen("lobby")} tab={tab} setTab={setTab} showToast={showToast} />
      )}
    </div>
  );
}

// ============================================================
// Home
// ============================================================
function Home({ nameInput, setNameInput, saveName, name, go }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 mb-4 shadow-2xl shadow-emerald-500/30">
          <Trophy className="w-11 h-11 text-white" />
        </div>
        <h1 className="text-3xl font-black tracking-tight">World Cup 2026</h1>
        <p className="text-emerald-400 font-bold text-lg">Knockout Predictor</p>
        <p className="text-slate-400 text-sm mt-1">Predict every match. Beat your friends.</p>
      </div>
      {name ? (
        <button onClick={go} className="bg-emerald-500 hover:bg-emerald-400 transition px-8 py-3 rounded-xl font-bold flex items-center gap-2">
          Continue as {name} <ChevronRight className="w-4 h-4" />
        </button>
      ) : (
        <div className="w-full max-w-xs">
          <label className="text-sm text-slate-300 mb-1.5 block">Your display name</label>
          <input value={nameInput} onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && saveName()}
            placeholder="e.g. Marco" autoFocus
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 mb-3 outline-none focus:border-emerald-500" />
          <button onClick={saveName}
            className="w-full bg-emerald-500 hover:bg-emerald-400 transition py-3 rounded-xl font-bold">
            Get Started
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Lobby
// ============================================================
function Lobby({ name, leagues, createLeague, joinLeague, open }) {
  const [mode, setMode] = useState(null);
  const [lname, setLname] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="max-w-md mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-slate-400 text-sm">Welcome,</p>
          <h2 className="text-2xl font-black">{name}</h2>
        </div>
        <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-lg">
          {name[0]?.toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {[["create", Plus, "Create League"], ["join", LogIn, "Join League"]].map(([k, Icon, label]) => (
          <button key={k} onClick={() => setMode(mode === k ? null : k)}
            className={`p-4 rounded-xl border transition flex flex-col items-center gap-2 ${mode === k ? "bg-emerald-500 border-emerald-400" : "bg-slate-800/60 border-slate-700 hover:border-emerald-500"}`}>
            <Icon className="w-6 h-6" />
            <span className="font-bold text-sm">{label}</span>
          </button>
        ))}
      </div>

      {mode === "create" && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 mb-6">
          <input value={lname} onChange={e => setLname(e.target.value)} placeholder="League name (e.g. Office Cup)"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 mb-3 outline-none focus:border-emerald-500" />
          <button disabled={busy || !lname.trim()} onClick={async () => {
            setBusy(true); const c = await createLeague(lname.trim());
            setBusy(false); setLname(""); setMode(null); open(c);
          }} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 py-2.5 rounded-lg font-bold">
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      )}

      {mode === "join" && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 mb-6">
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="5-letter code"
            maxLength={5}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 mb-3 font-mono tracking-widest uppercase outline-none focus:border-emerald-500" />
          <button disabled={busy || !code.trim()} onClick={async () => {
            setBusy(true); const ok = await joinLeague(code);
            setBusy(false);
            if (ok) { setCode(""); setMode(null); open(code.trim().toUpperCase()); }
          }} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 py-2.5 rounded-lg font-bold">
            {busy ? "Joining…" : "Join"}
          </button>
        </div>
      )}

      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Your Leagues</h3>
      {leagues.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Create or join a league to start!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leagues.map(l => (
            <button key={l.code} onClick={() => open(l.code)}
              className="w-full bg-slate-800/60 border border-slate-700 hover:border-emerald-500 transition rounded-xl p-4 flex items-center justify-between">
              <div className="text-left">
                <p className="font-bold">{l.name}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Code: {l.code}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </button>
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
  const [data, setData] = useState(null);
  const [myPreds, setMyPreds] = useState({});
  const [myBonus, setMyBonus] = useState(null);
  const [allPreds, setAllPreds] = useState({});
  const [allBonus, setAllBonus] = useState({});

  const isOwner = data?.owner === me;

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "leagues", code), async snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      setData(d);
      const ap = {}, ab = {};
      for (const m of (d.members || [])) {
        const ps = await getDoc(doc(db, "leagues", code, "predictions", m.name));
        ap[m.name] = ps.exists() ? ps.data() : {};
        const bs = await getDoc(doc(db, "leagues", code, "bonuses", m.name));
        ab[m.name] = bs.exists() ? bs.data() : null;
      }
      setAllPreds(ap); setAllBonus(ab);
    });
    return () => unsub();
  }, [code]);

  useEffect(() => {
    (async () => {
      const ps = await getDoc(doc(db, "leagues", code, "predictions", me));
      setMyPreds(ps.exists() ? ps.data() : {});
      const bs = await getDoc(doc(db, "leagues", code, "bonuses", me));
      setMyBonus(bs.exists() ? bs.data() : null);
    })();
  }, [code, me]);

  const savePred = async (matchId, pred) => {
    const next = { ...myPreds, [matchId]: pred };
    setMyPreds(next); setAllPreds(p => ({ ...p, [me]: next }));
    await setDoc(doc(db, "leagues", code, "predictions", me), next);
  };

  const saveBonusFn = async (b) => {
    setMyBonus(b); setAllBonus(p => ({ ...p, [me]: b }));
    await setDoc(doc(db, "leagues", code, "bonuses", me), b);
  };

  const saveResult = async (matchId, result) => {
    const results = { ...(data?.results || {}), [matchId]: result };
    await updateDoc(doc(db, "leagues", code), { results });
  };

  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Loading league…</div>;

  const { matches = [], results = {}, members = [], name: lname } = data;
  const tabs = [["matches", "Matches", Calendar], ["bracket", "Bracket", Trophy], ["board", "Leaderboard", Medal], ...(isOwner ? [["admin", "Admin", Lock]] : [])];

  return (
    <div className="max-w-md mx-auto px-4 py-5 pb-28">
      <div className="flex items-center justify-between mb-4">
        <button onClick={back} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4" /> Leagues
        </button>
        <button onClick={() => { navigator.clipboard?.writeText(code); showToast(`Code ${code} copied!`); }}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-sm font-mono">
          <Share2 className="w-3.5 h-3.5" /> {code}
        </button>
      </div>

      <h2 className="text-2xl font-black mb-1">{lname}</h2>
      <p className="text-slate-400 text-sm mb-5">{members.length} player{members.length !== 1 ? "s" : ""}</p>

      <div className="flex gap-1 bg-slate-800/60 p-1 rounded-xl mb-5">
        {tabs.map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition ${tab === k ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-white"}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "matches" && <MatchesTab matches={matches} myPreds={myPreds} savePred={savePred} myBonus={myBonus} saveBonus={saveBonusFn} />}
      {tab === "bracket" && <BracketTab matches={matches} results={results} />}
      {tab === "board" && <Leaderboard members={members} allPreds={allPreds} allBonus={allBonus} matches={matches} results={results} me={me} />}
      {tab === "admin" && isOwner && <AdminTab matches={matches} results={results} saveResult={saveResult} />}
    </div>
  );
}

// ============================================================
// Matches Tab
// ============================================================
function MatchesTab({ matches, myPreds, savePred, myBonus, saveBonus }) {
  const [round, setRound] = useState("R32");
  return (
    <div>
      <BonusCard myBonus={myBonus} saveBonus={saveBonus} />
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {ROUNDS.map(r => (
          <button key={r.key} onClick={() => setRound(r.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${round === r.key ? "bg-emerald-500" : "bg-slate-800 text-slate-400"}`}>
            {r.name}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {matches.filter(m => m.round === round).map(m => (
          <MatchCard key={m.id} match={m} pred={myPreds[m.id]} savePred={savePred} />
        ))}
      </div>
    </div>
  );
}

function BonusCard({ myBonus, saveBonus }) {
  const [open, setOpen] = useState(false);
  const [champ, setChamp] = useState(myBonus?.champion || "");
  const [f1, setF1] = useState(myBonus?.finalists?.[0] || "");
  const [f2, setF2] = useState(myBonus?.finalists?.[1] || "");
  const locked = !!myBonus?.locked;
  const teams = [...new Set(SAMPLE_R32.flat())].sort();

  return (
    <div className="bg-gradient-to-br from-amber-900/40 to-slate-800/60 border border-amber-700/40 rounded-xl p-4 mb-5">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-sm">Tournament Bonuses</span>
          {locked && <Lock className="w-3.5 h-3.5 text-amber-500" />}
        </div>
        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {locked && (
        <div className="mt-3 text-xs space-y-1 text-amber-200/80">
          <p>🏆 Champion: <b>{myBonus.champion}</b> (+{SCORING.champion} pts)</p>
          <p>🥇 Finalists: <b>{myBonus.finalists.join(" & ")}</b> (+{SCORING.finalists} pts)</p>
        </div>
      )}
      {open && !locked && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-amber-200/70">Pick once — locked permanently after saving.</p>
          {[["Champion (+15 pts)", champ, setChamp], ["Finalist 1 (+8 if both correct)", f1, setF1], ["Finalist 2", f2, setF2]].map(([label, val, setter]) => (
            <div key={label}>
              <label className="text-xs text-slate-400 mb-1 block">{label}</label>
              <select value={val} onChange={e => setter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500">
                <option value="">Select…</option>
                {teams.map(t => <option key={t} value={t}>{FLAGS[t]} {t}</option>)}
              </select>
            </div>
          ))}
          <button disabled={!champ || !f1 || !f2 || f1 === f2 || champ === f1 || champ === f2}
            onClick={() => saveBonus({ champion: champ, finalists: [f1, f2], locked: true })}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 py-2 rounded-lg font-bold text-sm transition">
            🔒 Lock In Bonuses
          </button>
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, pred, savePred }) {
  const now = Date.now();
  const locked = now >= match.kickoff;
  const isTBD = match.teamA === "TBD" || match.teamB === "TBD";
  const [aReg, setAReg] = useState(pred?.aReg ?? "");
  const [bReg, setBReg] = useState(pred?.bReg ?? "");
  const [advance, setAdvance] = useState(pred?.advance ?? "");

  const draw = aReg !== "" && bReg !== "" && Number(aReg) === Number(bReg);

  const save = () => {
    if (aReg === "" || bReg === "") return;
    const p = { aReg: Number(aReg), bReg: Number(bReg) };
    p.advance = draw ? (advance || match.teamA) : (Number(aReg) > Number(bReg) ? match.teamA : match.teamB);
    savePred(match.id, p);
  };

  const timeLeft = () => {
    const d = match.kickoff - now; if (d <= 0) return "Locked";
    const h = Math.floor(d / 3600000), days = Math.floor(h / 24);
    if (days > 0) return `${days}d ${h % 24}h`;
    return `${h}h ${Math.floor((d % 3600000) / 60000)}m`;
  };

  return (
    <div className={`bg-slate-800/60 border rounded-xl p-4 ${locked ? "border-slate-700/50 opacity-75" : "border-slate-700"}`}>
      <div className="flex justify-between mb-3">
        <span className="text-[11px] text-slate-500">{ROUNDS.find(r => r.key === match.round)?.name}</span>
        <span className={`text-[11px] flex items-center gap-1 ${locked ? "text-red-400" : "text-emerald-400"}`}>
          {locked ? <><Lock className="w-3 h-3" /> Locked</> : <><Clock className="w-3 h-3" /> {timeLeft()}</>}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 text-right"><span className="font-bold text-sm">{FLAGS[match.teamA]} {match.teamA}</span></div>
        <input type="number" min="0" max="20" disabled={locked || isTBD} value={aReg}
          onChange={e => setAReg(e.target.value)} onBlur={save}
          className="w-12 h-12 text-center bg-slate-900 border border-slate-700 rounded-lg font-bold text-lg outline-none focus:border-emerald-500 disabled:opacity-30" />
        <span className="text-slate-500 font-bold text-lg">–</span>
        <input type="number" min="0" max="20" disabled={locked || isTBD} value={bReg}
          onChange={e => setBReg(e.target.value)} onBlur={save}
          className="w-12 h-12 text-center bg-slate-900 border border-slate-700 rounded-lg font-bold text-lg outline-none focus:border-emerald-500 disabled:opacity-30" />
        <div className="flex-1"><span className="font-bold text-sm">{match.teamB} {FLAGS[match.teamB]}</span></div>
      </div>
      {draw && !locked && !isTBD && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <p className="text-xs text-slate-400 mb-2">Draw — who advances (ET / pens)?</p>
          <div className="grid grid-cols-2 gap-2">
            {[match.teamA, match.teamB].map(t => (
              <button key={t} onClick={() => { setAdvance(t); savePred(match.id, { aReg: Number(aReg), bReg: Number(bReg), advance: t }); }}
                className={`py-2 rounded-lg text-xs font-bold transition ${advance === t ? "bg-emerald-500" : "bg-slate-900 border border-slate-700"}`}>
                {FLAGS[t]} {t}
              </button>
            ))}
          </div>
        </div>
      )}
      {pred && !isTBD && (
        <p className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1">
          <Check className="w-3 h-3" /> {pred.aReg}–{pred.bReg}{draw && pred.advance ? ` · ${pred.advance} advances` : ""}
        </p>
      )}
      {isTBD && <p className="mt-2 text-[11px] text-slate-500">Teams confirmed after previous round</p>}
    </div>
  );
}

// ============================================================
// Bracket Tab
// ============================================================
function BracketTab({ matches, results }) {
  return (
    <div className="space-y-6">
      {ROUNDS.map(r => (
        <div key={r.key}>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{r.name}</h3>
          <div className="space-y-2">
            {matches.filter(m => m.round === r.key).map(m => {
              const res = results[m.id];
              return (
                <div key={m.id} className="bg-slate-800/60 border border-slate-700 rounded-lg p-2.5 flex items-center text-sm">
                  <span className={`flex-1 ${res?.advance === m.teamA ? "font-bold text-emerald-400" : "text-slate-300"}`}>
                    {FLAGS[m.teamA]} {m.teamA}
                  </span>
                  <span className="text-slate-500 text-xs mx-3 font-mono">{res ? `${res.aReg}–${res.bReg}` : "vs"}</span>
                  <span className={`flex-1 text-right ${res?.advance === m.teamB ? "font-bold text-emerald-400" : "text-slate-300"}`}>
                    {m.teamB} {FLAGS[m.teamB]}
                  </span>
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
function computeTotal(preds, bonus, matches, results) {
  let total = 0, exacts = 0, advances = 0;
  for (const m of matches) {
    const s = scoreMatch(preds[m.id], results[m.id]);
    if (s) {
      total += s.pts;
      if (s.detail.some(d => d[0] === "Exact score")) exacts++;
      if (s.detail.some(d => d[0].includes("advances") || d[0].includes("winner"))) advances++;
    }
  }
  if (bonus?.locked && results.__final) {
    if (results.__final.champion && bonus.champion === results.__final.champion) total += SCORING.champion;
    if (results.__final.finalists && bonus.finalists?.every(f => results.__final.finalists.includes(f))) total += SCORING.finalists;
  }
  return { total, exacts, advances };
}

function Leaderboard({ members, allPreds, allBonus, matches, results, me }) {
  const rows = members
    .map(m => ({ name: m.name, ...computeTotal(allPreds[m.name] || {}, allBonus[m.name], matches, results) }))
    .sort((a, b) => b.total - a.total || b.exacts - a.exacts || b.advances - a.advances);

  const medals = ["bg-amber-400 text-slate-900", "bg-slate-300 text-slate-900", "bg-amber-700 text-white"];

  return (
    <div>
      <div className="space-y-2 mb-6">
        {rows.map((r, i) => (
          <div key={r.name} className={`flex items-center gap-3 p-3 rounded-xl border ${r.name === me ? "bg-emerald-500/10 border-emerald-500/40" : "bg-slate-800/60 border-slate-700"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${medals[i] || "bg-slate-700 text-white"}`}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm flex items-center gap-1.5 flex-wrap">
                {r.name}
                {r.name === me && <span className="text-[10px] bg-emerald-500 px-1.5 py-0.5 rounded font-bold">You</span>}
                {i === 0 && rows[0].total > 0 && <Crown className="w-3.5 h-3.5 text-amber-400" />}
              </p>
              <p className="text-[11px] text-slate-400">{r.exacts} exact · {r.advances} advances</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-black text-xl text-emerald-400">{r.total}</p>
              <p className="text-[10px] text-slate-500">pts</p>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 text-xs text-slate-400 space-y-1.5">
        <p className="font-bold text-slate-200 mb-2 flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-400" /> Scoring Guide</p>
        <p>Exact score (reg): <b className="text-white">{SCORING.exactReg}</b> · Goal diff: <b className="text-white">{SCORING.gdReg}</b> · Who advances: <b className="text-white">{SCORING.winner}</b></p>
        <p>ET exact: <b className="text-white">+{SCORING.etExact}</b> · ET goal diff: <b className="text-white">+{SCORING.etGd}</b></p>
        <p>Pen winner: <b className="text-white">+{SCORING.pensWinner}</b> · Pen exact score: <b className="text-white">+{SCORING.pensExact}</b></p>
        <p>Champion: <b className="text-white">+{SCORING.champion}</b> · Both finalists: <b className="text-white">+{SCORING.finalists}</b></p>
        <p className="text-slate-500 pt-1 border-t border-slate-700">Tie-break: most exact scores → most correct advances</p>
      </div>
    </div>
  );
}

// ============================================================
// Admin Tab
// ============================================================
function AdminTab({ matches, results, saveResult }) {
  const [round, setRound] = useState("R32");
  const rm = matches.filter(m => m.round === round && m.teamA !== "TBD");

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 bg-slate-800/60 border border-amber-700/30 rounded-lg p-2.5 text-xs text-amber-200/70">
        <Lock className="w-3.5 h-3.5 shrink-0" />
        Owner only — enter results here to auto-score all players.
      </div>
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {ROUNDS.map(r => (
          <button key={r.key} onClick={() => setRound(r.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${round === r.key ? "bg-emerald-500" : "bg-slate-800 text-slate-400"}`}>
            {r.name}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {rm.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No matches with set teams yet.</p>}
        {rm.map(m => <ResultRow key={m.id} match={m} result={results[m.id]} saveResult={saveResult} />)}
      </div>
    </div>
  );
}

function ResultRow({ match, result, saveResult }) {
  const [aReg, setAReg] = useState(result?.aReg ?? "");
  const [bReg, setBReg] = useState(result?.bReg ?? "");
  const [hadET, setHadET] = useState(result?.hadET ?? false);
  const [aET, setAET] = useState(result?.aET ?? "");
  const [bET, setBET] = useState(result?.bET ?? "");
  const [hadPens, setHadPens] = useState(result?.hadPens ?? false);
  const [pensA, setPensA] = useState(result?.pensA ?? "");
  const [pensB, setPensB] = useState(result?.pensB ?? "");
  const [advance, setAdvance] = useState(result?.advance ?? "");

  const save = () => {
    if (aReg === "" || bReg === "" || !advance) return;
    saveResult(match.id, {
      aReg: Number(aReg), bReg: Number(bReg),
      hadET, aET: hadET ? Number(aET) : null, bET: hadET ? Number(bET) : null,
      hadPens, pensA: hadPens ? Number(pensA) : null, pensB: hadPens ? Number(pensB) : null,
      advance,
    });
  };

  const numInput = (val, set) => (
    <input type="number" min="0" value={val} onChange={e => set(e.target.value)}
      className="w-11 h-10 text-center bg-slate-900 border border-slate-700 rounded-lg font-bold outline-none focus:border-emerald-500" />
  );

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex-1 text-right font-bold text-sm">{FLAGS[match.teamA]} {match.teamA}</span>
        {numInput(aReg, setAReg)}
        <span className="text-slate-500 font-bold">–</span>
        {numInput(bReg, setBReg)}
        <span className="flex-1 font-bold text-sm">{match.teamB} {FLAGS[match.teamB]}</span>
      </div>
      <div className="flex gap-4 mb-3 text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={hadET} onChange={e => setHadET(e.target.checked)} /> Extra time
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={hadPens} onChange={e => setHadPens(e.target.checked)} /> Penalties
        </label>
      </div>
      {hadET && (
        <div className="flex items-center gap-2 mb-3 text-xs">
          <span className="text-slate-400 w-16">ET score:</span>
          {numInput(aET, setAET)} <span className="text-slate-500">–</span> {numInput(bET, setBET)}
        </div>
      )}
      {hadPens && (
        <div className="flex items-center gap-2 mb-3 text-xs">
          <span className="text-slate-400 w-16">Pens:</span>
          {numInput(pensA, setPensA)} <span className="text-slate-500">–</span> {numInput(pensB, setPensB)}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[match.teamA, match.teamB].map(t => (
          <button key={t} onClick={() => setAdvance(t)}
            className={`py-2 rounded-lg text-xs font-bold transition ${advance === t ? "bg-emerald-500" : "bg-slate-900 border border-slate-700"}`}>
            {FLAGS[t]} {t} advances
          </button>
        ))}
      </div>
      <button onClick={save} disabled={aReg === "" || bReg === "" || !advance}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 py-2 rounded-lg font-bold text-sm transition">
        Save Result
      </button>
      {result && (
        <p className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
          <Check className="w-3 h-3" /> Saved
        </p>
      )}
    </div>
  );
}
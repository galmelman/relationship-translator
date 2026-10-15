"use client";

import { useEffect, useRef, useState } from "react";
import {
  Send, Siren, TriangleAlert, Flame, Drama, Target, Users, Skull, Copy, Check,
} from "lucide-react";

type Status = "ongoing" | "survived" | "doomed";
type Result = {
  lang: "he" | "en";
  status: Status;
  translation: string;
  angerLevel: number;
  passiveAggressive: number;
  trapProbability: number;
  whoKnows: string;
  spreadLevel: number;
  emoji: string;
  badReply1: string;
  badReply2: string;
  survivalReply: string;
};
type Msg =
  | { id: number; role: "said"; text: string }
  | { id: number; role: "chose"; text: string }
  | { id: number; role: "bot"; result: Result }
  | { id: number; role: "error"; text: string };

type NewMsg =
  | { role: "said"; text: string }
  | { role: "chose"; text: string }
  | { role: "bot"; result: Result }
  | { role: "error"; text: string };

const T = {
  he: {
    title: "המתורגמן לזוגיות",
    tagline: "תכתוב מה היא אמרה. תשרוד את מה שהיא התכוונה.",
    placeholder: "מה היא אמרה לך?",
    send: "פענח",
    empty: "תעתיק בדיוק את המילים שלה. לנסח מחדש זה הדרך הכי מהירה להתחיל מלחמה.",
    meant: "מה היא באמת התכוונה",
    dashboard: "לוח בקרת סכנה",
    anger: "מד עצבים אמיתי",
    passive: "רמת פסיב-אגרסיב",
    trap: "הסיכוי שזאת מלכודת",
    grudge: "מי כבר יודע על זה",
    spread: ["עדיין אף אחד", "חברה אחת", "קבוצת הבנות", "אמא שלה", "כל המשפחה"],
    pick: "מה אתה עונה?",
    bad: "רעיון נורא",
    safe: "האופציה הבטוחה",
    survived: "שרדת. לעת עתה.",
    doomed: "זהו. נעים להכיר.",
    again: "סיטואציה חדשה",
    thinking: ["מפענח פסיכולוגיה נשית...", "בודק חשבונות מ-2019...", "מתייעץ עם האמא שלה...", "מחשב רדיוס פגיעה..."],
    suggestions: ["אני בסדר", "תעשה מה שאתה רוצה", "לא", "כלום", "מי זאת?", "אנחנו צריכים לדבר"],
  },
  en: {
    title: "The Relationship Translator",
    tagline: "Type what she said. Survive what she meant.",
    placeholder: "What did she say?",
    send: "Decode",
    empty: "Type her exact words. Paraphrasing is the fastest way to start a war.",
    meant: "What she actually meant",
    dashboard: "Danger dashboard",
    anger: "Actual anger level",
    passive: "Passive-aggressiveness",
    trap: "Probability it's a trap",
    grudge: "Who already knows",
    spread: ["Nobody yet", "One friend", "The group chat", "Her mother", "The whole family"],
    pick: "What do you say?",
    bad: "Terrible idea",
    safe: "The safe option",
    survived: "You survived. For now.",
    doomed: "That's it. Nice knowing you.",
    again: "New situation",
    thinking: ["Decoding female psychology...", "Cross-referencing 2019...", "Consulting her mother...", "Calculating blast radius..."],
    suggestions: ["I'm fine", "Do whatever you want", "No", "Nothing", "Who is she?", "We need to talk"],
  },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const HEB = /[֐-׿]/;

function Meter({ label, value, icon: Icon, delay }: { label: string; value: number; icon: typeof Flame; delay: number }) {
  const [w, setW] = useState(0);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(value), 150 + delay);
    let raf = 0;
    const start = performance.now() + 150 + delay;
    const tick = (now: number) => {
      const p = Math.min(Math.max((now - start) / 1100, 0), 1);
      setShown(Math.round(value * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [value, delay]);
  const color = value >= 85 ? "from-red-600 to-red-400" : value >= 60 ? "from-orange-500 to-amber-400" : "from-yellow-500 to-yellow-300";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-zinc-300">
        <span className="flex items-center gap-1.5"><Icon size={14} className="text-amber-400" />{label}</span>
        <span className="tabular-nums text-amber-300" dir="ltr">{shown}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800 ring-1 ring-white/5">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} ${value >= 85 ? "pulse-glow" : ""}`}
          style={{ width: `${w}%`, transition: "width 1.1s cubic-bezier(.2,.8,.2,1)" }}
        />
      </div>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      aria-label="copy"
      onClick={async (e) => {
        e.stopPropagation();
        try { await navigator.clipboard.writeText(text); } catch {}
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="shrink-0 rounded-md p-1 opacity-40 transition hover:bg-white/10 hover:opacity-100"
    >
      {done ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
    </button>
  );
}

function BotBubble({
  r, onPick, locked,
}: { r: Result; onPick: (t: string) => void; locked: boolean }) {
  const t = T[r.lang];
  const dir = r.lang === "he" ? "rtl" : "ltr";
  const replies = [
    { text: r.badReply1, good: false },
    { text: r.badReply2, good: false },
    { text: r.survivalReply, good: true },
  ];
  return (
    <div dir={dir} className="pop-in w-full max-w-[94%] space-y-3 self-start">
      <div className="rounded-2xl rounded-ss-sm border border-red-500/30 bg-zinc-900 p-3.5 shadow-lg shadow-red-950/30">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-400"><Siren size={13} /> {t.meant}</span>
          <span className="text-lg leading-none">{r.emoji}</span>
        </div>
        <p className="text-[15px] leading-relaxed text-zinc-100">{r.translation}</p>
      </div>

      <div className="rounded-2xl border border-amber-400/30 bg-zinc-950 p-3.5">
        <div className="hazard mb-3 h-1.5 rounded-full" />
        <h3 className="mb-3 text-xs font-bold text-amber-300">{t.dashboard}</h3>
        <div className="space-y-3">
          <Meter label={t.anger} value={r.angerLevel} icon={Flame} delay={0} />
          <Meter label={t.passive} value={r.passiveAggressive} icon={Drama} delay={220} />
          <Meter label={t.trap} value={r.trapProbability} icon={Target} delay={440} />
        </div>
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-200">
          <div className="flex items-start gap-2">
            <Users size={14} className="mt-0.5 shrink-0 text-red-400" />
            <div>
              <span className="block text-[11px] font-bold text-red-400">{t.grudge}</span>
              {r.whoKnows}
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                  i <= r.spreadLevel ? "bg-red-500" : "bg-zinc-800"
                }`}
                style={{ transitionDelay: `${600 + i * 120}ms` }}
              />
            ))}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-red-300">
            {t.spread[Math.max(0, Math.min(4, r.spreadLevel))]}
          </div>
        </div>
      </div>

      {r.status === "ongoing" ? (
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-zinc-400">{t.pick}</div>
          {replies.map((rep, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${
                rep.good
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-red-500/30 bg-red-500/5 text-zinc-300"
              } ${locked ? "opacity-50" : ""}`}
            >
              <button
                disabled={locked}
                onClick={() => onPick(rep.text)}
                className="flex flex-1 items-start gap-2 text-start transition active:scale-[.98] disabled:cursor-default"
              >
                <span className="mt-0.5 shrink-0">
                  {rep.good ? <Skull size={14} /> : <TriangleAlert size={14} className="text-red-400" />}
                </span>
                <span>
                  <span className="block text-[11px] font-bold opacity-70">{rep.good ? t.safe : t.bad}</span>
                  {rep.text}
                </span>
              </button>
              <CopyBtn text={rep.text} />
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`rounded-xl border p-3 text-center text-sm font-bold ${
            r.status === "survived"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/40 bg-red-950/50 text-red-200"
          }`}
        >
          {r.status === "survived" ? t.survived : t.doomed}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<"he" | "en">("he");
  const [line, setLine] = useState(T.he.thinking[0]);
  const endRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(1);
  const histRef = useRef<{ said: string; chose: string }[]>([]);
  const saidRef = useRef("");

  const t = T[lang];
  const over = (() => {
    const last = [...msgs].reverse().find((m) => m.role === "bot");
    return last && last.role === "bot" && last.result.status !== "ongoing";
  })();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, loading]);
  useEffect(() => {
    if (!loading) return;
    let i = 0;
    const lines = T[lang].thinking;
    setLine(lines[0]);
    const iv = setInterval(() => { i = (i + 1) % lines.length; setLine(lines[i]); }, 700);
    return () => clearInterval(iv);
  }, [loading, lang]);

  const add = (m: NewMsg) => setMsgs((p) => [...p, { ...m, id: idRef.current++ } as Msg]);

  const ask = async (payload: Record<string, unknown>) => {
    setLoading(true);
    try {
      const [res] = await Promise.all([
        fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
        sleep(1800),
      ]);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "error");
      setLang(data.lang === "en" ? "en" : "he");
      add({ role: "bot", result: data });
    } catch (e) {
      add({ role: "error", text: e instanceof Error ? e.message : "error" });
    } finally {
      setLoading(false);
    }
  };

  const translate = (text: string) => {
    const v = text.trim();
    if (!v || loading) return;
    const l = HEB.test(v) ? "he" : "en";
    setLang(l);
    histRef.current = [];
    saidRef.current = v;
    setMsgs([{ id: idRef.current++, role: "said", text: v }]);
    setInput("");
    ask({ text: v });
  };

  const pick = (choice: string) => {
    if (loading) return;
    add({ role: "chose", text: choice });
    histRef.current = [...histRef.current, { said: saidRef.current, chose: choice }];
    ask({ mode: "reply", text: saidRef.current, history: histRef.current });
  };

  const reset = () => {
    histRef.current = [];
    saidRef.current = "";
    setMsgs([]);
    setInput("");
  };

  return (
    <main dir={lang === "he" ? "rtl" : "ltr"} className="mx-auto flex h-dvh max-w-xl flex-col bg-zinc-950 text-zinc-100 sm:border-x sm:border-red-950">
      <style>{`
        .hazard{background:repeating-linear-gradient(-45deg,#facc15 0 10px,#18181b 10px 20px)}
        .pop-in{animation:pop .35s ease-out both}
        @keyframes pop{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
        .shake{animation:shake .45s infinite}
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-3px) rotate(-.4deg)}40%{transform:translateX(3px) rotate(.4deg)}60%{transform:translateX(-2px)}80%{transform:translateX(2px)}}
        .blink{animation:blink .7s steps(2) infinite}
        @keyframes blink{50%{opacity:.2}}
        .dot{animation:bounce 1s infinite}
        @keyframes bounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-5px);opacity:1}}
        .pulse-glow{animation:glow 1.4s ease-in-out infinite}
        @keyframes glow{50%{filter:brightness(1.35) drop-shadow(0 0 6px #ef4444)}}
        .siren{animation:siren 1.2s ease-in-out infinite}
        @keyframes siren{50%{filter:drop-shadow(0 0 8px #ef4444);transform:scale(1.1)}}
        @media (prefers-reduced-motion:reduce){.shake,.blink,.dot,.pulse-glow,.siren,.pop-in{animation:none}}
      `}</style>

      <header className="border-b border-red-900/60 bg-gradient-to-b from-red-950/50 to-zinc-950">
        <div className="hazard h-1.5" />
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="siren grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-600 text-white"><Siren size={22} /></div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold leading-tight">{t.title}</h1>
            <p className="truncate text-xs text-amber-300/80">{t.tagline}</p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {msgs.length === 0 && !loading && (
          <div className="pop-in rounded-2xl border border-dashed border-amber-400/30 p-5 text-center">
            <TriangleAlert className="mx-auto mb-2 text-amber-400" />
            <p className="text-sm text-zinc-300">{t.empty}</p>
          </div>
        )}
        {msgs.map((m) =>
          m.role === "said" ? (
            <div key={m.id} className="pop-in max-w-[80%] self-end rounded-2xl rounded-se-sm bg-amber-400 px-3.5 py-2 text-[15px] font-medium text-zinc-900">{m.text}</div>
          ) : m.role === "chose" ? (
            <div key={m.id} className="pop-in max-w-[80%] self-end rounded-2xl rounded-se-sm border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-sm text-zinc-200">{m.text}</div>
          ) : m.role === "error" ? (
            <div key={m.id} className="pop-in max-w-[85%] self-start rounded-2xl border border-red-500/40 bg-red-950/40 p-3 text-sm text-red-200">
              <TriangleAlert size={14} className="mb-1 inline text-red-400" /> {m.text}
            </div>
          ) : (
            <BotBubble key={m.id} r={m.result} onPick={pick} locked={loading || m.id !== [...msgs].reverse().find((x) => x.role === "bot")?.id} />
          )
        )}
        {loading && (
          <div className="pop-in max-w-[85%] self-start">
            <div className="shake rounded-2xl rounded-ss-sm border border-red-500/40 bg-zinc-900 p-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-300"><TriangleAlert size={16} className="blink" /> {line}</div>
              <div className="mt-2 flex gap-1.5">
                {[0, 1, 2].map((i) => <span key={i} className="dot h-2 w-2 rounded-full bg-red-500" style={{ animationDelay: `${i * 0.18}s` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <footer className="border-t border-red-950 bg-zinc-950 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        {over ? (
          <button onClick={reset} className="mb-1 w-full rounded-full bg-red-600 py-2.5 font-bold text-white transition hover:bg-red-500 active:scale-[.98]">
            {t.again}
          </button>
        ) : (
          <>
            {msgs.length === 0 && (
              <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                {t.suggestions.map((s) => (
                  <button key={s} disabled={loading} onClick={() => translate(s)}
                    className="shrink-0 rounded-full border border-amber-400/30 bg-zinc-900 px-3 py-1 text-xs text-amber-200 transition hover:bg-amber-400/10 disabled:opacity-40">{s}</button>
                ))}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); translate(input); }} className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.placeholder}
                maxLength={140}
                className="min-w-0 flex-1 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-[16px] outline-none placeholder:text-zinc-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
              />
              <button type="submit" disabled={loading || !input.trim()}
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-red-600 px-5 font-bold text-white transition hover:bg-red-500 active:scale-95 disabled:opacity-40">
                {t.send} <Send size={16} className={lang === "he" ? "-scale-x-100" : ""} />
              </button>
            </form>
          </>
        )}
      </footer>
    </main>
  );
}

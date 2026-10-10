// The home page's pretend Discord channel, acting out what Phoenix does.
import { useEffect, useRef, useState } from "react";

const PEOPLE = {
  foxy: { name: "Foxy", color: "#ff9f6b", initial: "F" },
  raccoon: { name: "Raccoon", color: "#9aa4b5", initial: "R" },
  abby: { name: "Abby", color: "#c39bff", initial: "A", role: "Mod" },
  wren: { name: "Wren", color: "#7fd4a8", initial: "W" },
  ines: { name: "Inès", color: "#ffd166", initial: "I" },
};

function Avatar({ who }) {
  if (who === "phoenix") return <img className="demo-avatar" src="/phoenixlogo.png" alt="" width={36} height={36} />;
  const p = PEOPLE[who];
  return <span className="demo-avatar" style={{ background: p.color }} aria-hidden="true">{p.initial}</span>;
}

function Author({ who }) {
  if (who === "phoenix") return <span className="demo-name phoenix">Phoenix <span className="demo-app">APP</span></span>;
  const p = PEOPLE[who];
  return <span className="demo-name" style={{ color: p.color }}>{p.name}{p.role && <span className="demo-role">{p.role}</span>}</span>;
}

function Mention({ children }) {
  return <span className="demo-mention">@{children}</span>;
}

// Each scene is a list of steps shown one after another.
const SCENES = [
  {
    id: "leveling",
    label: "Leveling",
    steps: [
      { who: "foxy", command: "/rank", body: null, wait: 600 },
      {
        who: "phoenix",
        reply: "foxy",
        typing: 700,
        body: (
          <div className="demo-rankcard">
            <span className="demo-avatar big" style={{ background: PEOPLE.foxy.color }}>F</span>
            <div className="demo-rank-info">
              <div className="demo-rank-top"><strong>Foxy</strong><span>Rank #3 · Level 12</span></div>
              <div className="demo-xp"><span /></div>
              <div className="demo-rank-xp">366 / 504 XP</div>
            </div>
          </div>
        ),
      },
      { who: "phoenix", typing: 900, body: <>🎉 <Mention>Foxy</Mention> reached <strong>level 12</strong> and earned <span className="demo-rolechip">Regular</span></> },
    ],
  },
  {
    id: "automod",
    label: "Automod",
    steps: [
      { who: "raccoon", body: <>FREE NITRO!!! claim here discord.gg/n1tr0-gift</>, removeAfter: 1300 },
      { who: "phoenix", typing: 500, body: <><Mention>Raccoon</Mention>, posting a server invite isn't allowed here.</> },
      {
        who: "phoenix",
        typing: 700,
        log: true,
        body: (
          <div className="demo-embed" style={{ borderColor: "#ff8a3d" }}>
            <div className="demo-embed-title">Automod: Posting a server invite</div>
            <div className="demo-embed-grid">
              <div><b>Member</b>Raccoon</div>
              <div><b>Action</b>Warned (case 41)</div>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "moderation",
    label: "Moderation",
    steps: [
      { who: "abby", command: "/mod warn", args: "member: bill11 reason: Being a raccoon", wait: 700 },
      {
        who: "phoenix",
        reply: "abby",
        typing: 700,
        body: <><span className="demo-ok">✔</span> Warned <strong>bill11</strong>, 3rd warning. User received a mute for this warning.</>,
      },
      {
        who: "phoenix",
        typing: 700,
        log: true,
        body: (
          <div className="demo-embed" style={{ borderColor: "#f2545b" }}>
            <div className="demo-embed-title">Case 42 · Mute</div>
            <div className="demo-embed-grid">
              <div><b>Offender</b>bill11</div>
              <div><b>Duration</b>1 hour</div>
              <div className="wide"><b>Reason</b>(Automod) Reached 3 active warnings.</div>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "welcome",
    label: "Welcome",
    steps: [
      { system: true, body: <><span className="demo-join">→</span> <strong>Wren</strong> just slid into the server.</>, wait: 500 },
      { who: "phoenix", typing: 700, body: <>Welcome <Mention>Wren</Mention> to <strong>Fox Den</strong>! You're member #1,024. Grab some roles below 👇</> },
      {
        who: "phoenix",
        typing: 500,
        body: (
          <div className="demo-select">
            <span>Select a role to add or remove...</span>
            <span aria-hidden="true">⌄</span>
          </div>
        ),
      },
    ],
  },
  {
    id: "translate",
    label: "Translate",
    steps: [
      { who: "ines", body: <>¿Alguien quiere jugar Minecraft esta noche?</>, wait: 900 },
      {
        who: "phoenix",
        reply: "abby",
        app: "Translate message",
        typing: 700,
        ephemeral: true,
        body: <><span className="demo-muted">Spanish → English</span><br />Anyone want to play Minecraft tonight?</>,
      },
    ],
  },
];

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function Message({ step }) {
  if (step.system) return <div className="demo-system">{step.body}</div>;
  return (
    <div className={`demo-msg${step.ephemeral ? " ephemeral" : ""}${step.log ? " log" : ""}`}>
      {step.reply && (
        <div className="demo-replyline">
          <span className="demo-avatar tiny" style={{ background: PEOPLE[step.reply].color }} />
          <span style={{ color: PEOPLE[step.reply].color }}>{PEOPLE[step.reply].name}</span>
          <span>used <span className="demo-cmd">{step.app ?? SCENE_COMMAND.get(step) ?? "a command"}</span></span>
        </div>
      )}
      <div className="demo-row">
        <Avatar who={step.who} />
        <div className="demo-content">
          <div className="demo-head"><Author who={step.who} /><span className="demo-time">{step.log ? "in #mod-log" : "Today at 4:20 PM"}</span></div>
          {step.command ? (
            <div className="demo-command"><span className="demo-cmd">{step.command}</span>{step.args && <span className="demo-args">{step.args}</span>}</div>
          ) : (
            <div className="demo-body">{step.body}</div>
          )}
          {step.ephemeral && <div className="demo-ephemeral">👁 Only you can see this</div>}
        </div>
      </div>
    </div>
  );
}

// Which command a reply belongs to (for the "used /rank" line).
const SCENE_COMMAND = new Map();
for (const scene of SCENES) {
  const command = scene.steps.find((s) => s.command)?.command;
  for (const step of scene.steps) if (step.reply && command) SCENE_COMMAND.set(step, command);
}

export function ChatDemo() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const [removed, setRemoved] = useState(new Set());
  const [paused, setPaused] = useState(false);
  const timers = useRef([]);
  const scene = SCENES[sceneIndex];

  useEffect(() => {
    const clear = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    clear();
    setRemoved(new Set());
    if (reducedMotion()) {
      setShown(scene.steps.length);
      setTyping(false);
      return clear;
    }
    setShown(0);
    let at = 350;
    const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
    scene.steps.forEach((step, index) => {
      if (step.typing) {
        later(() => setTyping(true), at);
        at += step.typing;
      }
      later(() => {
        setTyping(false);
        setShown(index + 1);
      }, at);
      if (step.removeAfter) later(() => setRemoved((r) => new Set(r).add(index)), at + step.removeAfter);
      at += (step.wait ?? 0) + 900;
    });
    if (!paused) later(() => setSceneIndex((i) => (i + 1) % SCENES.length), at + 2600);
    return clear;
  }, [sceneIndex, paused, scene.steps]);

  return (
    <div
      className="demo"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="demo-window" aria-label={`Example: ${scene.label}`} role="img">
        <div className="demo-bar">
          <span className="demo-dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="demo-channel"># general</span>
          <span className="demo-server">Fox Den</span>
        </div>
        <div className="demo-messages" aria-hidden="true">
          {scene.steps.slice(0, shown).map((step, index) => (
            removed.has(index) && step.removeAfter ? (
              <div key={`${scene.id}-${index}`} className="demo-deleted">Message deleted by Phoenix automod</div>
            ) : (
              <Message key={`${scene.id}-${index}`} step={step} />
            )
          ))}
          {typing && (
            <div className="demo-typing"><span /><span /><span /> <b>Phoenix</b> is typing…</div>
          )}
        </div>
        <div className="demo-composer" aria-hidden="true">Message #general</div>
      </div>
      <div className="demo-tabs" role="tablist" aria-label="Examples">
        {SCENES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === sceneIndex}
            className={i === sceneIndex ? "active" : ""}
            onClick={() => setSceneIndex(i)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

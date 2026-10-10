// The "your" clicker from the old API page: click the word "your" in the VanityDB
// section and see how far you get.
import { useState } from "react";

const FRIDAY = "https://cdn.discordapp.com/avatars/997535047513018478/0e9f6dc9bd77da214c8f4371a8e15f2f.png?size=56";
const SYLVEON = "https://cdn.discordapp.com/avatars/763631377152999435/d43615360079ed891cad8ced1b200170.png?size=56";
const PAL = "https://cdn.discordapp.com/avatars/1136953082090115082/6e352fc785c51222bccabd1eb80115d9.png?size=56";
const BABE = "https://cdn.discordapp.com/avatars/916691810506645585/932ed06767b291eb913a82127c079795.png?size=56";
const WAVE = "https://cdn.discordapp.com/emojis/1223812767325356206.gif?size=56&quality=lossless";
const HEART = "https://cdn.discordapp.com/emojis/1133195225817424063.png?size=56&quality=lossless";

const CHAT = [
  [FRIDAY, "Hi guys, how are you guys feeling today?"],
  [SYLVEON, <img key="wave" src={WAVE} alt=":wave:" width={28} height={28} />],
  [SYLVEON, "Pretty swell! Thanks for asking."],
  [PAL, "Yea I'm doing good too. How about you?"],
  [FRIDAY, <>That's great to hear! I'm glad you guys are doing great :D<br />I'm doing good, just watching Bluey right now.</>],
  [SYLVEON, "Awesome! That show is pretty great tbh"],
  [BABE, <>Hey babe! <img src={HEART} alt=":heart:" width={22} height={22} /></>],
  [SYLVEON, <>Heyyy <img src={HEART} alt=":heart:" width={22} height={22} /></>],
];

const ACHIEVEMENTS = [
  { at: 250, title: "250 clicks!", text: "That's awesome!", img: "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/3ce1bb39-5d74-42e4-a0a1-6f9e18aa5400/d5wtcym-1c0108b0-ace1-4ceb-9fbb-d33b3fe70ef9.gif?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcLzNjZTFiYjM5LTVkNzQtNDJlNC1hMGExLTZmOWUxOGFhNTQwMFwvZDV3dGN5bS0xYzAxMDhiMC1hY2UxLTRjZWItOWZiYi1kMzNiM2ZlNzBlZjkuZ2lmIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.etYNRyhAiMumfdgoGxmIFZ6vAE3Hdme9_aRq4oEKd6E" },
  { at: 500, title: "500 clicks!", text: "Hehe, wow, 500? That's really impressive :3", img: "https://i.kym-cdn.com/photos/images/original/001/161/961/2d4.gif" },
  { at: 1000, title: "1000 clicks!", text: "Yayyyy 1000 clicks ^w^", img: "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/e30144e7-15c8-4872-9f32-0ebef76551c1/df6lu24-0114b5cc-9d3e-4eea-8d18-f92818946bb3.gif?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcL2UzMDE0NGU3LTE1YzgtNDg3Mi05ZjMyLTBlYmVmNzY1NTFjMVwvZGY2bHUyNC0wMTE0YjVjYy05ZDNlLTRlZWEtOGQxOC1mOTI4MTg5NDZiYjMuZ2lmIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.Cu36pICsmFUR12zqwN_to3l7JSgKNjwPcK-MKD7Xirg" },
];

export function useClicker() {
  const [clicks, setClicks] = useState(0);
  return [clicks, () => setClicks((c) => c + 1)];
}

export function YourButton({ onClick }) {
  return <button type="button" className="your-button" onClick={onClick}>your</button>;
}

export function Clicker({ clicks }) {
  if (!clicks) return null;
  const unlocked = ACHIEVEMENTS.filter((a) => clicks >= a.at);
  return (
    <section className="clicker" aria-live="polite">
      <h2>“Your” clicker</h2>
      <p className="clicker-count">{clicks.toLocaleString()} {clicks === 1 ? "click" : "clicks"}</p>
      <h3>Achievements</h3>
      {unlocked.length === 0 && clicks < 9999 && <p className="muted">Keep clicking…</p>}
      {unlocked.map((a) => (
        <div key={a.at} className="clicker-achievement">
          <h4>{a.title}</h4>
          <p>{a.text}</p>
          <img src={a.img} alt="" loading="lazy" />
        </div>
      ))}
      {clicks >= 9999 && (
        <div className="clicker-chat">
          <h4>The Fridays group chat</h4>
          {CHAT.map(([avatar, line], i) => (
            <div key={i} className="clicker-line">
              <img src={avatar} alt="" width={40} height={40} />
              <span>{line}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

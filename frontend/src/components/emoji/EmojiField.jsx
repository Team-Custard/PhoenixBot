// Text boxes with an emoji button, and a picker-only control for settings that
// need exactly one emoji (starboard reaction, role menu options...).
import { forwardRef, lazy, Suspense, useCallback, useContext, useRef, useState } from "react";
import { ServerEmojis, customEmojiUrl, parseCustom } from "./emojiShared.js";

// The picker (and its emoji list) only downloads the first time someone opens it.
const EmojiPicker = lazy(() => import("./EmojiPicker.jsx").then((m) => ({ default: m.EmojiPicker })));

function SmileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9.25" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="10" r="1.3" fill="currentColor" />
      <circle cx="15" cy="10" r="1.3" fill="currentColor" />
      <path d="M8 14.2c1 1.5 2.4 2.3 4 2.3s3-.8 4-2.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Puts text at the cursor (replacing any selection), and puts the cursor after it.
 * Without a cursor yet (the box was never clicked), it goes at the end.
 */
function insertAt(selection, value, text, maxLength) {
  const current = value ?? "";
  const [start, end] = selection ? selection.map((n) => Math.min(n, current.length)) : [current.length, current.length];
  // A space keeps custom emojis from running into the word before them.
  const needsSpace = text.startsWith("<") && start > 0 && !/\s/.test(current[start - 1]);
  const insert = `${needsSpace ? " " : ""}${text}`;
  const next = current.slice(0, start) + insert + current.slice(end);
  // Don't push the text past its limit (say, a 32 character nickname).
  if (maxLength && next.length > maxLength) return null;
  return { next, caret: start + insert.length };
}

/**
 * An input or textarea with an emoji button in its corner.
 * `unicodeOnly` hides the server's emojis, for text where custom ones don't show.
 */
export const EmojiField = forwardRef(function EmojiField({ as = "input", value, onChange, unicodeOnly = false, className = "", wrapperClassName = "", ...rest }, forwarded) {
  const inner = useRef(null);
  const button = useRef(null);
  const [open, setOpen] = useState(false);
  const selection = useRef(null);
  const Tag = as;
  const remember = (e) => {
    selection.current = [e.target.selectionStart ?? 0, e.target.selectionEnd ?? 0];
  };

  const setRef = (el) => {
    inner.current = el;
    if (typeof forwarded === "function") forwarded(el);
    else if (forwarded) forwarded.current = el;
  };

  const close = useCallback(() => setOpen(false), []);
  const pick = useCallback((text, { keepOpen = false } = {}) => {
    const el = inner.current;
    const result = insertAt(selection.current, el?.value ?? value, text, rest.maxLength);
    if (!result) return;
    const { next, caret } = result;
    selection.current = [caret, caret];
    onChange(next);
    // Picking several at once (Shift) keeps focus in the picker.
    if (keepOpen) return;
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus({ preventScroll: true });
      el.setSelectionRange?.(caret, caret);
    });
  }, [onChange, value, rest.maxLength]);

  return (
    <div className={`emoji-field ${as === "textarea" ? "is-area" : "is-line"} ${wrapperClassName}`.trim()}>
      <Tag
        ref={setRef}
        className={className}
        value={value ?? ""}
        onChange={(e) => {
          remember(e);
          onChange(e.target.value);
        }}
        onSelect={remember}
        {...rest}
      />
      <button
        ref={button}
        type="button"
        className={`emoji-trigger${open ? " open" : ""}`}
        aria-label="Add an emoji"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Add an emoji"
        onClick={() => setOpen((o) => !o)}
      >
        <SmileIcon />
      </button>
      {open && (
        <Suspense fallback={null}>
          <EmojiPicker anchorRef={button} onPick={pick} onClose={close} unicodeOnly={unicodeOnly} />
        </Suspense>
      )}
    </div>
  );
});

/** Shows one emoji (standard or custom). */
export function EmojiGlyph({ text, size = 22 }) {
  const custom = parseCustom(text);
  if (custom) return <img className="emoji-glyph" src={customEmojiUrl(custom.id, custom.animated, 64)} alt={`:${custom.name}:`} width={size} height={size} />;
  return <span className="emoji-glyph" style={{ fontSize: size * 0.9 }}>{text}</span>;
}

/**
 * For settings that are a single emoji: clicking it opens the picker.
 * Empty (optional) settings show a placeholder and can be cleared again.
 */
export function EmojiSelect({ id, value, onChange, required = false, placeholder = "⭐", label = "Emoji", unicodeOnly = false }) {
  const button = useRef(null);
  const [open, setOpen] = useState(false);
  const server = useContext(ServerEmojis);
  const close = useCallback(() => setOpen(false), []);
  const refocus = () => requestAnimationFrame(() => button.current?.focus());
  const custom = parseCustom(value);
  const name = custom ? `:${custom.name}:` : value;
  const locked = custom && server?.hiddenIds?.includes(custom.id);
  const foreign = custom && !locked && server?.emojis && !server.emojis.some((e) => e.id === custom.id);

  return (
    <div className="emoji-select">
      <button
        id={id}
        ref={button}
        type="button"
        className={`emoji-select-button${value ? "" : " empty"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={value ? `${label}: ${name}. Change it` : `Pick ${label.toLowerCase()}`}
        onClick={() => setOpen((o) => !o)}
      >
        {value ? <EmojiGlyph text={value} /> : <span className="emoji-select-placeholder" aria-hidden="true">{placeholder}</span>}
        <span className="emoji-select-caret" aria-hidden="true">▾</span>
      </button>
      {value && !required && (
        <button
          type="button"
          className="emoji-select-clear"
          aria-label={`Clear ${label.toLowerCase()}`}
          onClick={() => {
            onChange(null);
            refocus();
          }}
        >
          ✕
        </button>
      )}
      {foreign && <span className="field-help emoji-select-note">From another server. It works while Phoenix is still in that server.</span>}
      {locked && <span className="field-error emoji-select-note">Phoenix can't use this emoji: it's locked to roles Phoenix doesn't have, or the server lost it. Pick another one.</span>}
      {open && (
        <Suspense fallback={null}>
          <EmojiPicker
            anchorRef={button}
            onPick={(text) => {
              onChange(text);
              refocus();
            }}
            onClose={close}
            unicodeOnly={unicodeOnly}
            title={label}
          />
        </Suspense>
      )}
    </div>
  );
}

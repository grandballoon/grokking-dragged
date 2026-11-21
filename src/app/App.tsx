/**
 * The imperative shell: routing, the current state of the visualization on
 * screen, keyboard shortcuts and autoplay. Everything it renders comes from a
 * `VizEntry`; everything it decides is delegated to the pure helpers in
 * `core/stepping`.
 */
import { DraggableRenderer } from "dragology";
import { useEffect, useEffectEvent, useState } from "react";
import { stepBy, type VizState } from "../core/stepping";
import type { VizEntry } from "../viz/defineViz";
import { groupByBookAndChapter, VIZZES } from "./registry";

const PLAY_INTERVAL_MS = 700;

function idFromHash(): string {
  const id = window.location.hash.replace(/^#\/?/, "");
  return VIZZES.some((v) => v.id === id) ? id : VIZZES[0]!.id;
}

export function App() {
  const [id, setId] = useState(idFromHash);
  useEffect(() => {
    const onHash = () => setId(idFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const entry = VIZZES.find((v) => v.id === id)!;

  return (
    <div className="layout">
      <nav className="sidebar">
        <h1>
          Grokking, <em>dragged</em>
        </h1>
        {groupByBookAndChapter(VIZZES).map(({ book, chapters }) => (
          <section key={book}>
            <h2>{book}</h2>
            {chapters.map(({ chapter, entries }) => (
              <div key={chapter} className="chapter">
                <h3>{chapter}</h3>
                <ul>
                  {entries.map((v) => (
                    <li key={v.id}>
                      <a
                        href={`#/${v.id}`}
                        className={v.id === id ? "active" : undefined}
                      >
                        {v.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </nav>
      <main>
        {/* Remount per visualization so state never leaks between them. */}
        <VizView key={entry.id} entry={entry} />
      </main>
    </div>
  );
}

function VizView({ entry }: { entry: VizEntry }) {
  const [state, setState] = useState<VizState<unknown>>(entry.initialState);
  const [playing, setPlaying] = useState(false);
  const frameCount = entry.frameCount(state);

  // Autoplay stops by itself at the last step: `isPlaying` is derived, so
  // reaching the end clears the timer without any extra state update.
  const atEnd = state.step >= frameCount - 1;
  const isPlaying = playing && !atEnd;
  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setState((s) => stepBy(s, 1, entry.frameCount(s)));
    }, PLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isPlaying, entry]);

  const togglePlay = () => {
    if (!isPlaying && atEnd) setState({ ...state, step: 0 });
    setPlaying(!isPlaying);
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement)
      return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      setPlaying(false);
      setState(stepBy(state, e.key === "ArrowRight" ? 1 : -1, frameCount));
    } else if (e.key === " ") {
      e.preventDefault();
      togglePlay();
    }
  });
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <article>
      <header>
        <p className="eyebrow">
          {entry.book} · {entry.chapter}
        </p>
        <h2>{entry.title}</h2>
        <p className="summary">{entry.summary}</p>
        <div className="toolbar">
          <button type="button" onClick={togglePlay}>
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setState(entry.initialState);
            }}
          >
            Reset
          </button>
          <span className="hint">← → step · space plays</span>
        </div>
        {entry.drags.length > 0 && (
          <ul className="drags">
            {entry.drags.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        )}
      </header>
      <div className="canvas">
        <DraggableRenderer
          draggable={entry.draggable}
          state={state}
          onDropState={(s) => {
            setPlaying(false);
            setState(s);
          }}
          width={entry.width}
          height={entry.height}
        />
      </div>
    </article>
  );
}

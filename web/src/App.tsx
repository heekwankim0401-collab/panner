// T1 골격: index.json을 BASE_URL 기준 상대 경로로 불러와 개수만 보여준다. 목록·필터·상세는 T11.
import { useEffect, useState } from "preact/hooks";
import type { IndexFile } from "../../pipeline/types";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; index: IndexFile };

export function App() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/index.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<IndexFile>;
      })
      .then((index) => setState({ status: "ready", index }))
      .catch((error: unknown) => setState({ status: "error", message: String(error) }));
  }, []);

  return (
    <main>
      <h1>Panner</h1>
      <p class="muted">Godot proposals the engine won't build that authors say could be add-ons.</p>
      {state.status === "loading" && <p>Loading…</p>}
      {state.status === "error" && <p role="alert">Could not load data: {state.message}</p>}
      {state.status === "ready" && (
        <p>
          {state.index.meta.included} of {state.index.meta.total} proposals included
          {state.index.meta.lastSyncedAt ? ` · last synced ${state.index.meta.lastSyncedAt.slice(0, 10)}` : " · not synced yet"}
        </p>
      )}
    </main>
  );
}

// 한 페이지 화면 (SPEC 9장). 필터·정렬·페이지 계산은 filter.ts, URL 변환은 url.ts의 순수 함수를 부르기만 한다.
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import type { IndexFile } from "../../pipeline/types";
import { Filters } from "./components/Filters";
import { Pager } from "./components/Pager";
import { ProposalList } from "./components/ProposalList";
import { useDetails } from "./details";
import { applyChange, filterItems, pageItems, sortItems, type FilterState } from "./filter";
import { fromQuery, toQuery } from "./url";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; index: IndexFile };

const number = (value: number) => value.toLocaleString("en-US");

export function App() {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [state, setState] = useState<FilterState>(() => fromQuery(window.location.search));
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
  const details = useDetails();

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/index.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<IndexFile>;
      })
      .then((index) => setLoad({ status: "ready", index }))
      .catch((error: unknown) => setLoad({ status: "error", message: String(error) }));
  }, []);

  // 모든 필터·정렬·페이지를 URL에 담는다(새로고침하거나 링크를 공유해도 같은 화면).
  useEffect(() => {
    const { pathname, search, hash } = window.location;
    const query = toQuery(state);
    if (query !== search) window.history.replaceState(null, "", `${pathname}${query}${hash}`);
  }, [state]);

  const change = useCallback((next: Partial<FilterState>) => setState((current) => applyChange(current, next)), []);

  const index = load.status === "ready" ? load.index : null;
  const filtered = useMemo(
    () => (index === null ? [] : sortItems(filterItems(index.items, index.labels, state), state.sort)),
    [index, state],
  );
  const page = pageItems(filtered, state.p);

  // 남은 행보다 큰 페이지 번호는 마지막 페이지로 맞춘다(URL도 함께).
  useEffect(() => {
    if (index !== null && page.page !== state.p) change({ p: page.page });
  }, [index, page.page, state.p, change]);

  const { load: loadDetail, get: detailOf } = details;
  const toggle = useCallback(
    (n: number) => {
      if (!expanded.has(n)) loadDetail(n); // 펼칠 때만 그 묶음을 불러온다(한 번 불러오면 캐시)
      setExpanded((current) => {
        const next = new Set(current);
        if (next.has(n)) next.delete(n);
        else next.add(n);
        return next;
      });
    },
    [expanded, loadDetail],
  );

  const goToPage = (p: number) => {
    change({ p });
    window.scrollTo({ top: 0 });
  };

  return (
    <div class="app">
      <header class="header">
        <h1>Panner</h1>
        <p class="lede">
          Godot proposals the engine won't build (archived) or hasn't built yet (open) that their authors say could be an
          add-on — ranked by upvotes, weighted by status and add-on feasibility.
        </p>
        {index !== null && (
          <p class="stats">
            Last synced {index.meta.lastSyncedAt?.slice(0, 10) ?? "never"} · {number(index.meta.included)} of{" "}
            {number(index.meta.total)} proposals included · showing {number(filtered.length)}
          </p>
        )}
        <p class="note">
          Feasibility is read from the authors' own template answers, so it can be wrong. Proposals opened on or after
          2026-01-25 use a template with no add-on question.
        </p>
      </header>

      {load.status === "loading" && <p class="hint">Loading proposals…</p>}
      {load.status === "error" && <p role="alert">Could not load data: {load.message}</p>}
      {index !== null && (
        <div class="layout">
          <aside>
            <Filters state={state} labels={index.labels} onChange={change} />
          </aside>
          <main>
            <ProposalList
              items={page.items}
              labels={index.labels}
              expanded={expanded}
              detailOf={detailOf}
              onToggle={toggle}
            />
            <Pager page={page.page} pages={page.pages} onPage={goToPage} />
          </main>
        </div>
      )}
    </div>
  );
}

import { useRef } from "preact/hooks";
import type { Evidence, IndexItem } from "../../../pipeline/types";
import type { DetailState } from "../details";
import { highlightSegments } from "../highlight";
import { FEASIBILITY_NAME, issueUrl, labelName, NOANSWER_NOTE, STATUS_NAME } from "../labels";

type Props = {
  items: readonly IndexItem[];
  labels: readonly string[];
  expanded: ReadonlySet<number>;
  detailOf: (number: number) => DetailState;
  onToggle: (number: number) => void;
};

/** 목록. 행 사이를 ↑/↓(와 Home/End)로 옮기고 Enter/Space로 펼친다. */
export function ProposalList({ items, labels, expanded, detailOf, onToggle }: Props) {
  const listRef = useRef<HTMLOListElement>(null);

  const rows = () => Array.from(listRef.current?.querySelectorAll<HTMLElement>(":scope > li") ?? []);

  const onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    const row = target.closest<HTMLElement>("li.row");
    if (row === null || target !== row) return; // 링크·버튼 위에서는 그 요소의 동작을 따른다
    const all = rows();
    const index = all.indexOf(row);
    const focusAt = (next: number) => all[Math.max(0, Math.min(all.length - 1, next))]?.focus();
    if (event.key === "ArrowDown") focusAt(index + 1);
    else if (event.key === "ArrowUp") focusAt(index - 1);
    else if (event.key === "Home") focusAt(0);
    else if (event.key === "End") focusAt(all.length - 1);
    else if (event.key === "Enter" || event.key === " ") onToggle(Number(row.dataset.number));
    else return;
    event.preventDefault();
  };

  if (items.length === 0) return <p class="empty">No proposals match these filters.</p>;

  return (
    <ol class="list" ref={listRef} onKeyDown={onKeyDown} aria-label="Proposals">
      {items.map((item) => (
        <Row
          key={item.n}
          item={item}
          labels={labels}
          open={expanded.has(item.n)}
          detail={detailOf(item.n)}
          onToggle={() => onToggle(item.n)}
        />
      ))}
    </ol>
  );
}

function Row({
  item,
  labels,
  open,
  detail,
  onToggle,
}: {
  item: IndexItem;
  labels: readonly string[];
  open: boolean;
  detail: DetailState;
  onToggle: () => void;
}) {
  const detailId = `detail-${item.n}`;
  const shownLabels = item.l.slice(0, 3).map((index) => labels[index] ?? "");
  return (
    <li class={`row${open ? " open" : ""}`} tabIndex={0} data-number={item.n} aria-expanded={open}>
      <div class="row-main" onClick={(event) => (event.target as HTMLElement).closest("a, button") === null && onToggle()}>
        <span class="score" title="Opportunity score">
          {item.s.toFixed(2)}
        </span>
        <div class="row-body">
          <a class="title" href={issueUrl(item.n)} target="_blank" rel="noopener noreferrer">
            <span class="number">#{item.n}</span> {item.t}
          </a>
          <div class="meta-line">
            <span class="votes" title="Upvotes / downvotes">
              👍 {item.u}
              {item.d > 0 ? ` · 👎 ${item.d}` : ""}
            </span>
            <span class={`badge st-${item.st}`}>{STATUS_NAME[item.st]}</span>
            <span class={`badge f-${item.f}`}>{FEASIBILITY_NAME[item.f]}</span>
            {item.a && <span class="badge assigned">Assigned</span>}
            {shownLabels.map((label) => (
              <span class="badge label" key={label}>
                {labelName(label)}
              </span>
            ))}
            {item.l.length > 3 && <span class="more">+{item.l.length - 3}</span>}
          </div>
        </div>
        <button
          type="button"
          class="expand"
          aria-expanded={open}
          aria-controls={detailId}
          aria-label={open ? "Hide details" : "Show details"}
          onClick={onToggle}
        >
          {open ? "−" : "+"}
        </button>
      </div>
      {open && (
        <div class="detail" id={detailId}>
          <Detail item={item} detail={detail} />
        </div>
      )}
    </li>
  );
}

function Detail({ item, detail }: { item: IndexItem; detail: DetailState }) {
  if (detail.status === "loading" || detail.status === "idle") return <p class="hint">Loading details…</p>;
  if (detail.status === "error") return <p role="alert">Could not load details: {detail.message}</p>;
  const entry = detail.entry;
  if (entry === undefined) return <p role="alert">No details for this proposal.</p>;

  return (
    <>
      {item.f === "noanswer" && <p class="note">{NOANSWER_NOTE}</p>}
      {item.f !== "noanswer" && (
        <>
          <Answer
            question="Can it be worked around with a few lines of script?"
            text={entry.w}
            evidence={entry.ev.filter((e) => e.field === "workaround")}
          />
          <Answer
            question="Is there a reason why this should be core and not an add-on?"
            text={entry.c}
            evidence={entry.ev.filter((e) => e.field === "core")}
          />
          <Signals evidence={entry.ev} />
        </>
      )}
      <p class="detail-links">
        <a href={entry.url} target="_blank" rel="noopener noreferrer">
          Open on GitHub
        </a>
        <span class="hint">Updated {item.up}</span>
      </p>
    </>
  );
}

function Answer({ question, text, evidence }: { question: string; text: string | null; evidence: readonly Evidence[] }) {
  const phrases = evidence.filter((e) => e.at === "phrase").map((e) => e.phrase);
  return (
    <section class="answer">
      <h3>{question}</h3>
      {text === null ? (
        <p class="hint">No answer.</p>
      ) : (
        <p class="answer-text">
          {highlightSegments(text, phrases).map((segment, index) =>
            segment.mark ? (
              <mark key={index}>{segment.text}</mark>
            ) : (
              segment.text
            ),
          )}
        </p>
      )}
    </section>
  );
}

function Signals({ evidence }: { evidence: readonly Evidence[] }) {
  if (evidence.length === 0) return null;
  return (
    <p class="signals">
      <span class="hint">Signals: </span>
      {evidence.map((e, index) => (
        <span key={index} class={`signal ${e.signal}`} title={`rule ${e.rule}, weight ${e.weight}`}>
          {e.signal === "likely" ? "+" : "−"} “{e.phrase}” ({e.field === "workaround" ? "workaround" : "core"})
        </span>
      ))}
    </p>
  );
}

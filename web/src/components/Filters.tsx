import type { Feasibility } from "../../../pipeline/types";
import { DEFAULT_FILTER, FEASIBILITIES, SORT_KEYS, STATUSES, type FilterState, type SortKey, type StatusFilter } from "../filter";
import { FEASIBILITY_NAME, labelName, SORT_NAME, STATUS_NAME } from "../labels";

type Props = {
  state: FilterState;
  labels: readonly string[];
  onChange: (change: Partial<FilterState>) => void;
};

/** 다중 선택 체크박스: 빈 배열은 "전부 고름"으로 보여준다. 마지막 하나는 끌 수 없다. */
function toggled<T>(current: readonly T[], all: readonly T[], value: T, checked: boolean): T[] {
  const chosen = current.length === 0 ? [...all] : [...current];
  const next = checked ? [...new Set([...chosen, value])] : chosen.filter((item) => item !== value);
  return next.length === 0 ? chosen : next;
}

export function Filters({ state, labels, onChange }: Props) {
  const isChecked = <T,>(current: readonly T[], value: T) => current.length === 0 || current.includes(value);
  const isDefault =
    state.q === "" &&
    state.f.join() === DEFAULT_FILTER.f.join() &&
    state.st.length === 0 &&
    state.lb.length === 0 &&
    state.min === 0 &&
    state.sort === DEFAULT_FILTER.sort;

  return (
    <form class="filters" role="search" aria-label="Filter proposals" onSubmit={(event) => event.preventDefault()}>
      <div class="field">
        <label for="filter-q">Search titles</label>
        <input
          id="filter-q"
          type="search"
          value={state.q}
          placeholder="e.g. terrain"
          onInput={(event) => onChange({ q: event.currentTarget.value })}
        />
      </div>

      <fieldset class="field">
        <legend>Add-on feasibility</legend>
        {FEASIBILITIES.map((value: Feasibility) => (
          <label class="check" key={value}>
            <input
              type="checkbox"
              checked={isChecked(state.f, value)}
              onChange={(event) => onChange({ f: toggled(state.f, FEASIBILITIES, value, event.currentTarget.checked) })}
            />
            <span class={`badge f-${value}`}>{FEASIBILITY_NAME[value]}</span>
          </label>
        ))}
      </fieldset>

      <fieldset class="field">
        <legend>Status</legend>
        {STATUSES.map((value: StatusFilter) => (
          <label class="check" key={value}>
            <input
              type="checkbox"
              checked={isChecked(state.st, value)}
              onChange={(event) => onChange({ st: toggled(state.st, STATUSES, value, event.currentTarget.checked) })}
            />
            <span>{STATUS_NAME[value]}</span>
          </label>
        ))}
      </fieldset>

      <details class="field labels">
        <summary>Labels{state.lb.length > 0 ? ` (${state.lb.length} selected)` : ""}</summary>
        <p class="hint">Show proposals with any of the selected labels.</p>
        <div class="label-list">
          {labels.map((label) => (
            <label class="check" key={label}>
              <input
                type="checkbox"
                checked={state.lb.includes(label)}
                onChange={(event) =>
                  onChange({
                    lb: event.currentTarget.checked ? [...state.lb, label] : state.lb.filter((item) => item !== label),
                  })
                }
              />
              <span>{labelName(label)}</span>
            </label>
          ))}
        </div>
      </details>

      <div class="field row-fields">
        <div>
          <label for="filter-min">Min. upvotes</label>
          <input
            id="filter-min"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={state.min}
            onInput={(event) => onChange({ min: Number(event.currentTarget.value) || 0 })}
          />
        </div>
        <div>
          <label for="filter-sort">Sort by</label>
          <select id="filter-sort" value={state.sort} onChange={(event) => onChange({ sort: event.currentTarget.value as SortKey })}>
            {SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {SORT_NAME[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        class="reset"
        disabled={isDefault}
        onClick={() => onChange({ ...DEFAULT_FILTER, f: [...DEFAULT_FILTER.f], st: [], lb: [] })}
      >
        Reset to default view
      </button>
    </form>
  );
}

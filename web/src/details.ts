// 상세 묶음(detail/<floor(n/100)>.json)을 펼칠 때만 불러와 메모리에 캐시한다 (SPEC 8, 9장).
import { useCallback, useRef, useState } from "preact/hooks";
import type { DetailEntry, DetailFile } from "../../pipeline/types";

export type DetailState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; entry: DetailEntry | undefined };

const bucketOf = (number: number): number => Math.floor(number / 100);

export function useDetails(): { get: (number: number) => DetailState; load: (number: number) => void } {
  const files = useRef(new Map<number, DetailFile>());
  const pending = useRef(new Map<number, Promise<void>>());
  const errors = useRef(new Map<number, string>());
  const [, setVersion] = useState(0);
  const refresh = () => setVersion((version) => version + 1);

  const load = useCallback((number: number) => {
    const bucket = bucketOf(number);
    if (files.current.has(bucket) || pending.current.has(bucket)) return;
    errors.current.delete(bucket);
    const request = fetch(`${import.meta.env.BASE_URL}data/detail/${bucket}.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<DetailFile>;
      })
      .then((file) => {
        files.current.set(bucket, file);
      })
      .catch((error: unknown) => {
        errors.current.set(bucket, String(error));
      })
      .finally(() => {
        pending.current.delete(bucket);
        refresh();
      });
    pending.current.set(bucket, request);
    refresh();
  }, []);

  const get = useCallback((number: number): DetailState => {
    const bucket = bucketOf(number);
    const file = files.current.get(bucket);
    if (file !== undefined) return { status: "ready", entry: file[String(number)] };
    if (pending.current.has(bucket)) return { status: "loading" };
    const message = errors.current.get(bucket);
    return message === undefined ? { status: "idle" } : { status: "error", message };
  }, []);

  return { get, load };
}

// 정밀도 라벨링 CLI (SPEC 10장). 사람이 터미널에서 직접 실행한다: npm run label
// 기본 화면 상위 30개 중 data/golden.json에 아직 없는 것만 하나씩 보여주고, y/n/s를 받는 즉시 저장한다.
// 판단 기준: 두 답과 제목만 읽고 "작성자가 애드온이나 플러그인으로 구현 가능하다고 말했는가."
import { createInterface } from "node:readline/promises";
import { readRaws } from "./build-data";
import { formatEvidence, RAW_DIR, readGolden, topEntries, writeGolden, type Golden, type Label, type TopEntry } from "./eval";
import { isMainModule } from "./io";

/** 아직 라벨이 없는 항목(skip도 라벨로 친다). 순서는 상위 순서 그대로. */
export function pendingEntries(top: readonly TopEntry[], golden: Golden): TopEntry[] {
  return top.filter((entry) => golden[String(entry.item.n)] === undefined);
}

/** y/n/s(또는 yes/no/skip), 그만두기는 q. 알 수 없으면 null. */
export function parseAnswer(input: string): Label | "quit" | null {
  const answer = input.trim().toLowerCase();
  if (answer === "y" || answer === "yes") return "yes";
  if (answer === "n" || answer === "no") return "no";
  if (answer === "s" || answer === "skip") return "skip";
  if (answer === "q" || answer === "quit") return "quit";
  return null;
}

/** 라벨을 하나 더한 새 golden. 원래 객체는 바꾸지 않는다. */
export function withLabel(golden: Golden, number: number, label: Label): Golden {
  return { ...golden, [String(number)]: label };
}

/** 사람이 볼 내용: 순위, 제목, 상태, 추천, 점수, 링크, W, C(전체), 근거. */
export function describeEntry(entry: TopEntry, position: number, total: number): string {
  const { item, raw, evidence } = entry;
  const answer = (text: string | null) => (text === null ? "(no answer)" : text.replace(/\n/g, "\n   "));
  return [
    "",
    `[${position}/${total}] #${item.n} ${item.t}`,
    `   ${item.st}, +${item.u}/-${item.d}, score ${item.s} — ${raw.url}`,
    `W: ${answer(raw.answers.workaround)}`,
    `C: ${answer(raw.answers.core)}`,
    `evidence: ${formatEvidence(evidence)}`,
  ].join("\n");
}

async function main(): Promise<void> {
  const top = topEntries(readRaws(RAW_DIR));
  let golden = readGolden();
  const pending = pendingEntries(top, golden);
  if (pending.length === 0) {
    console.log(`label: all top ${top.length} are labeled. Run npm run eval.`);
    return;
  }
  console.log(`label: ${pending.length} of the top ${top.length} need a label.`);
  console.log('Did the author say it can be done as an add-on or plugin? y = yes, n = no, s = skip, q = quit');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let labeled = 0;
  try {
    for (const entry of pending) {
      console.log(describeEntry(entry, top.indexOf(entry) + 1, top.length));
      let answer = parseAnswer(await rl.question("[y/n/s/q] "));
      while (answer === null) answer = parseAnswer(await rl.question("please type y, n, s or q: "));
      if (answer === "quit") break;
      golden = withLabel(golden, entry.item.n, answer);
      writeGolden(golden); // 하나 붙일 때마다 바로 저장한다
      labeled++;
    }
  } finally {
    rl.close();
  }
  console.log(
    labeled === 0
      ? "\nlabel: nothing saved."
      : `\nlabel: saved ${labeled} label(s) to data/golden.json. Run npm run eval.`,
  );
}

if (isMainModule(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

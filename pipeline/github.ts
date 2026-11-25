// GitHub GraphQL 클라이언트와 쿼리 (SPEC 4.1). 네트워크를 쓰는 코드는 이 파일에만 둔다.
// 읽기 전용: mutation은 어떤 경우에도 쓰지 않는다.
import { graphql } from "@octokit/graphql";

export const REPO = { owner: "godotengine", name: "godot-proposals" } as const;

/** SPEC 4.1 쿼리 그대로. 필드를 더하거나 빼지 않는다. */
export const PROPOSALS_QUERY = `query Proposals($owner: String!, $name: String!, $after: String, $pageSize: Int!) {
  repository(owner: $owner, name: $name) {
    issues(first: $pageSize, after: $after, orderBy: {field: CREATED_AT, direction: ASC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number title url body state stateReason createdAt updatedAt closedAt
        comments { totalCount }
        labels(first: 20) { nodes { name } }
        reactionGroups { content reactors { totalCount } }
        assignees(first: 1) { totalCount }
        milestone { title }
      }
    }
  }
  rateLimit { cost remaining resetAt }
}`;

/** 쿼리 결과의 이슈 하나. GraphQL 목록 원소는 null일 수 있다. */
export type GqlIssueNode = {
  number: number;
  title: string;
  url: string;
  body: string;
  state: "OPEN" | "CLOSED";
  stateReason: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  comments: { totalCount: number };
  labels: { nodes: Array<{ name: string } | null> | null } | null;
  reactionGroups: Array<{ content: string; reactors: { totalCount: number } }> | null;
  assignees: { totalCount: number };
  milestone: { title: string } | null;
};

export type RateLimit = { cost: number; remaining: number; resetAt: string };

export type ProposalsPage = {
  repository: {
    issues: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: Array<GqlIssueNode | null>;
    };
  };
  rateLimit: RateLimit;
};

/** 한 페이지를 받아 오는 함수. 테스트에서는 가짜로 바꿔 끼운다. */
export type FetchPage = (after: string | null, pageSize: number) => Promise<ProposalsPage>;

export type Sleep = (ms: number) => Promise<void>;
export const realSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 기본 페이지 크기 50, 환경변수 PANNER_PAGE_SIZE로 조정 (SPEC 4.1). */
export const DEFAULT_PAGE_SIZE = 50;
/** remaining이 이 값보다 작으면 resetAt까지 기다린다 (SPEC 4.1). */
export const RATE_LIMIT_FLOOR = 100;
/** 실패 시 재시도 횟수와 첫 대기 시간 (지수 백오프: 1초, 2초, 4초). */
export const RETRIES = 3;
export const RETRY_BASE_MS = 1000;

/** 토큰이 없으면 무엇을 해야 하는지 알려 주는 오류를 던진다. */
export function requireToken(env: NodeJS.ProcessEnv): string {
  const token = env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN is not set. Create a fine-grained token with public repository read access and set it " +
        '(bash: export GITHUB_TOKEN=..., PowerShell: $env:GITHUB_TOKEN = "...").',
    );
  }
  return token;
}

export function pageSizeFrom(env: NodeJS.ProcessEnv): number {
  const raw = env.PANNER_PAGE_SIZE;
  if (raw === undefined || raw.trim() === "") return DEFAULT_PAGE_SIZE;
  const size = Number(raw);
  if (!Number.isInteger(size) || size < 1 || size > 100) {
    throw new Error(`PANNER_PAGE_SIZE must be an integer from 1 to 100, got "${raw}"`);
  }
  return size;
}

/** 실패하면 지수 백오프로 최대 `retries`번 다시 시도한다. */
export async function withRetry<T>(
  task: () => Promise<T>,
  options: { retries?: number; baseDelayMs?: number; sleep?: Sleep; log?: (line: string) => void } = {},
): Promise<T> {
  const { retries = RETRIES, baseDelayMs = RETRY_BASE_MS, sleep = realSleep, log = () => {} } = options;
  for (let attempt = 0; ; attempt++) {
    try {
      return await task();
    } catch (error) {
      if (attempt >= retries) throw error;
      const delay = baseDelayMs * 2 ** attempt;
      log(`request failed (${error instanceof Error ? error.message : String(error)}), retry ${attempt + 1}/${retries} in ${delay} ms`);
      await sleep(delay);
    }
  }
}

/** 실제 GitHub에 묻는 FetchPage. 재시도를 감싸서 돌려준다. */
export function createFetchPage(token: string, options: { sleep?: Sleep; log?: (line: string) => void } = {}): FetchPage {
  const client = graphql.defaults({ headers: { authorization: `token ${token}` } });
  return (after, pageSize) =>
    withRetry(() => client<ProposalsPage>(PROPOSALS_QUERY, { ...REPO, after, pageSize }), options);
}

/**
 * 생성일 오름차순으로 페이지를 넘기며 이슈를 하나씩 돌려준다.
 * `limit`이 있으면 그만큼만 받는다. 페이지마다 cost/remaining을 한 줄로 남기고,
 * remaining이 바닥에 가까우면 resetAt까지 기다린다.
 */
export async function* fetchProposals(
  fetchPage: FetchPage,
  options: {
    pageSize: number;
    limit?: number | null;
    sleep?: Sleep;
    now?: () => number;
    log?: (line: string) => void;
    onPage?: (rateLimit: RateLimit) => void;
  },
): AsyncGenerator<GqlIssueNode> {
  const { pageSize, limit = null, sleep = realSleep, now = Date.now, log = () => {}, onPage = () => {} } = options;
  let after: string | null = null;
  let received = 0;
  for (let page = 1; ; page++) {
    const remainingWanted = limit === null ? pageSize : Math.min(pageSize, limit - received);
    if (remainingWanted <= 0) return;
    const result: ProposalsPage = await fetchPage(after, remainingWanted);
    const { pageInfo, nodes } = result.repository.issues;
    const { rateLimit } = result;
    onPage(rateLimit);
    const issues = nodes.filter((node): node is GqlIssueNode => node !== null);
    log(`page ${page}: ${issues.length} issues, cost ${rateLimit.cost}, remaining ${rateLimit.remaining}`);
    for (const issue of issues) {
      if (limit !== null && received >= limit) return;
      received++;
      yield issue;
    }
    if (!pageInfo.hasNextPage || pageInfo.endCursor === null) return;
    after = pageInfo.endCursor;
    if (rateLimit.remaining < RATE_LIMIT_FLOOR) {
      const waitMs = Math.max(0, Date.parse(rateLimit.resetAt) - now()) + 1000;
      log(`rate limit remaining ${rateLimit.remaining} < ${RATE_LIMIT_FLOOR}, waiting ${Math.ceil(waitMs / 1000)} s until ${rateLimit.resetAt}`);
      await sleep(waitMs);
    }
  }
}

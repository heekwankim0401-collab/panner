// 가짜 GraphQL 응답 (테스트는 네트워크를 쓰지 않는다).
import type { FetchPage, GqlIssueNode, ProposalsPage, RateLimit } from "../pipeline/github";

const W = "If this enhancement will not be used often, can it be worked around with a few lines of script?";
const C = "Is there a reason why this should be core and not an add-on in the asset library?";

/** 이슈 폼 본문 (CRLF, 실제 본문처럼). */
export function formBody(workaround: string, core: string): string {
  return `### Describe the project you are working on\r\n\r\nA game.\r\n\r\n### ${W}\r\n\r\n${workaround}\r\n\r\n### ${C}\r\n\r\n${core}\r\n`;
}

export function issueNode(overrides: Partial<GqlIssueNode> & { number: number }): GqlIssueNode {
  return {
    title: `Proposal ${overrides.number}`,
    url: `https://github.com/godotengine/godot-proposals/issues/${overrides.number}`,
    body: formBody("Yes, with a plugin.", "No."),
    state: "OPEN",
    stateReason: null,
    createdAt: "2022-01-01T00:00:00Z",
    updatedAt: "2022-01-02T00:00:00Z",
    closedAt: null,
    comments: { totalCount: 0 },
    labels: { nodes: [] },
    reactionGroups: [
      { content: "THUMBS_UP", reactors: { totalCount: 1 } },
      { content: "THUMBS_DOWN", reactors: { totalCount: 0 } },
    ],
    assignees: { totalCount: 0 },
    milestone: null,
    ...overrides,
  };
}

export type FakeCall = { after: string | null; pageSize: number };

/** 노드 목록을 커서(인덱스 문자열)로 나눠 주는 FetchPage. 받은 호출을 기록한다. */
export function fakeFetchPage(
  nodes: Array<GqlIssueNode | null>,
  rateLimit: (page: number) => RateLimit = () => ({ cost: 1, remaining: 5000, resetAt: "2026-11-25T01:00:00Z" }),
): FetchPage & { calls: FakeCall[] } {
  const calls: FakeCall[] = [];
  const fetchPage = async (after: string | null, pageSize: number): Promise<ProposalsPage> => {
    calls.push({ after, pageSize });
    const start = after === null ? 0 : Number(after);
    const end = Math.min(start + pageSize, nodes.length);
    return {
      repository: {
        issues: {
          pageInfo: { hasNextPage: end < nodes.length, endCursor: end < nodes.length ? String(end) : null },
          nodes: nodes.slice(start, end),
        },
      },
      rateLimit: rateLimit(calls.length),
    };
  };
  return Object.assign(fetchPage, { calls });
}

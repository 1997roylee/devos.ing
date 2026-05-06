import { normalizeIssueKey } from "./state";
import type { LinearIssue, ResolvedProjectConfig } from "./types";

interface GraphQLResult<T> {
	data?: T;
	errors?: Array<{ message: string }>;
}

interface RawLinearIssue {
	id: string;
	identifier: string;
	title: string;
	url: string;
	state: {
		id: string;
		name: string;
	};
	labels?: {
		nodes: Array<{
			id: string;
			name: string;
		}>;
	};
}

export class LinearClient {
	constructor(private readonly config: ResolvedProjectConfig) {}

	async fetchWork(issueArg?: string): Promise<LinearIssue[]> {
		if (issueArg) {
			const issue = await this.findIssueByIdentifier(
				normalizeIssueKey(issueArg),
			);
			return issue ? [issue] : [];
		}

		const data = await this.graphql<{
			viewer: {
				assignedIssues: {
					nodes: RawLinearIssue[];
				};
			};
		}>(
			`
      query AssignedIssues($first: Int!) {
        viewer {
          assignedIssues(first: $first) {
            nodes {
              id
              identifier
              title
              url
              state { id name }
              labels { nodes { id name } }
            }
          }
        }
      }
      `,
			{ first: this.config.linear.pollLimit },
		);

		const raw = data.viewer.assignedIssues.nodes;
		return raw
			.map(mapRawIssue)
			.filter(
				(issue) => issue.state.id === this.config.linear.statusMap.assigned,
			)
			.filter((issue) => {
				if (!this.config.linear.requiredLabel) {
					return true;
				}
				return issue.labels.some(
					(label) =>
						label.name.toLowerCase() ===
						this.config.linear.requiredLabel?.toLowerCase(),
				);
			});
	}

	async markStage(
		issueId: string,
		stage: keyof ResolvedProjectConfig["linear"]["statusMap"],
	): Promise<void> {
		if (this.config.dryRun) {
			return;
		}
		const stateId = this.config.linear.statusMap[stage];
		await this.graphql(
			`
      mutation UpdateIssueState($id: String!, $stateId: String!) {
        issueUpdate(id: $id, input: { stateId: $stateId }) {
          success
        }
      }
      `,
			{ id: issueId, stateId },
		);
	}

	async comment(issueId: string, body: string): Promise<void> {
		if (this.config.dryRun) {
			return;
		}
		await this.graphql(
			`
      mutation AddComment($issueId: String!, $body: String!) {
        commentCreate(input: { issueId: $issueId, body: $body }) {
          success
        }
      }
      `,
			{ issueId, body },
		);
	}

	private async findIssueByIdentifier(
		identifier: string,
	): Promise<LinearIssue | null> {
		const data = await this.graphql<{
			issues: {
				nodes: RawLinearIssue[];
			};
		}>(
			`
      query IssueByIdentifier($identifier: String!) {
        issues(first: 1, filter: { identifier: { eq: $identifier } }) {
          nodes {
            id
            identifier
            title
            url
            state { id name }
            labels { nodes { id name } }
          }
        }
      }
      `,
			{ identifier },
		);
		const issue = data.issues.nodes[0];
		if (!issue) {
			return null;
		}
		return mapRawIssue(issue);
	}

	private async graphql<TData>(
		query: string,
		variables: Record<string, unknown>,
	): Promise<TData> {
		const response = await fetch(this.config.linear.apiUrl, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: this.config.linear.apiKey,
			},
			body: JSON.stringify({ query, variables }),
		});

		if (!response.ok) {
			throw new Error(
				`Linear API request failed: ${response.status} ${response.statusText}`,
			);
		}

		const payload = (await response.json()) as GraphQLResult<TData>;
		if (payload.errors?.length) {
			throw new Error(
				`Linear GraphQL error: ${payload.errors.map((e) => e.message).join("; ")}`,
			);
		}
		if (!payload.data) {
			throw new Error("Linear GraphQL response did not include data");
		}
		return payload.data;
	}
}

function mapRawIssue(issue: RawLinearIssue): LinearIssue {
	return {
		id: issue.id,
		identifier: issue.identifier,
		title: issue.title,
		url: issue.url,
		state: issue.state,
		labels: issue.labels?.nodes ?? [],
	};
}

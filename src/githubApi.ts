import { debug } from "@actions/core";
import { github } from "@eng-automation/integrations";
import { PullRequest, Repo } from "./types";

export const getPullRequestWithReviews = async (octokitInstance: github.GitHubInstance, repo: Repo): Promise<PullRequest[]> => {
    const prs = await github.getPullRequests({ state: "open", ...repo }, { octokitInstance });
    debug(`Found a total of ${prs.length} PRs`);

    let reviews: PullRequest[] = [];
    for (const pr of prs) {
        debug(`Fetching reviews for PR #${pr.number}`);
        const { data } = await octokitInstance.rest.pulls.listReviews({ pull_number: pr.number, ...repo });
        reviews.push({ ...pr, reviews: data });
    }

    const sortedPrs = reviews.sort((a, b) => { return b.updated_at > a.updated_at ? -1 : b.updated_at < a.updated_at ? 1 : 0 });
    return sortedPrs;
}

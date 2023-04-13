import { GitHub } from "@actions/github/lib/utils";
import { PullRequest, Repo } from "./types";
import { debug } from "@actions/core";

const listPrs = (octokit: InstanceType<typeof GitHub>, repo: Repo, per_page: number = 100, page: number = 1) => {
    return octokit.rest.pulls.list({ ...repo, per_page, state: "open", page });
}

export const getPullRequestWithReviews = async (octokit: InstanceType<typeof GitHub>, repo: Repo):Promise<PullRequest[]> => {
    const perPage = 100;
    let currentPage = 1;
    const { data } = await listPrs(octokit, repo, perPage, currentPage);
    let prs = data;
    let fullPage = prs.length > 99;
    while (fullPage) {
        currentPage++;
        debug(`Iterating on page ${currentPage} with ${prs.length} issues`);
        const { data } = await listPrs(octokit, repo, perPage, currentPage);
        prs = prs.concat(data);
        fullPage = data.length > 99;
    }

    debug(`Found a total of ${prs.length} PRs`);

    const reviews = await Promise.all(prs.map(async (pr) => {
        debug(`Fetching reviews for PR #${pr.number}`);
        const { data } = await octokit.rest.pulls.listReviews({ pull_number: pr.number, ...repo });
        return { ...pr, reviews: data };
    }))

    const sortedPrs = reviews.sort((a, b) => { return b.updated_at > a.updated_at ? -1 : b.updated_at < a.updated_at ? 1 : 0 });
    return sortedPrs;
}

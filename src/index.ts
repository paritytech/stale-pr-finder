import { getInput, setOutput } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { Context } from "@actions/github/lib/context";
import fs from "fs";

const getRepo = (ctx: Context): { owner: string, repo: string } => {
    const repo = getInput("repo", { required: false });
    const owner = getInput("owner", { required: false });

    if (repo && owner) {
        return { repo, owner };
    } else {
        return ctx.repo;
    }
}

const runAction = async (ctx: Context) => {
    const repo = getRepo(ctx);
    const token = getInput("GITHUB_TOKEN", { required: true });
    const inputDays = Number.parseInt(getInput("days-stale", { required: false }));
    const daysStale = isNaN(inputDays) ? 5 : inputDays;
    const stale = isNaN(daysStale);
    console.log("daysStale", daysStale, stale);

    const octokit = getOctokit(token);
    const prs = await octokit.rest.pulls.list(repo);
    const sortedPrs = prs.data.sort((a, b) => { return b.updated_at > a.updated_at ? -1 : b.updated_at < a.updated_at ? 1 : 0 })
    const reviews = await Promise.all(sortedPrs.map(async (pr) => {
        const { data } = await octokit.rest.pulls.listReviews({ pull_number: pr.number, ...repo });
        return { ...pr, reviews: data };
    }));

    setOutput("repo", `${repo.owner}/${repo.repo}`);
    fs.writeFileSync("prs.json", JSON.stringify(prs.data));
    fs.writeFileSync("reviews.json", JSON.stringify(reviews));
}

runAction(context);

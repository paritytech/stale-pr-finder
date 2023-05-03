import { debug, getBooleanInput, getInput, info, setOutput, summary } from "@actions/core";
import { context } from "@actions/github";
import { Context } from "@actions/github/lib/context";
import { github } from "@eng-automation/integrations";
import { writeFile } from "fs";
import moment from "moment";

import { byLabels, byNoReviews, olderThanDays } from "./filters";
import { getPullRequestWithReviews } from "./githubApi";
import { PullRequest, Repo } from "./types";

type Filters = { daysStale: number; noReviews: boolean; ignoreDrafts: boolean; requiredLabels: string[] };

const daysSinceDate = (date: string): number => moment().diff(moment(date), "days");

const writeToFile = async (fileName: string, content: string) =>
  await new Promise<void>((res, rej) => {
    writeFile(fileName, content, (err) => {
      if (err) {
        rej(err);
      } else {
        res();
      }
    });
  });

const getFiltersFromInput = (): Filters => {
  const inputDays = Number.parseInt(getInput("days-stale", { required: false }));
  const daysStale = isNaN(inputDays) ? 5 : inputDays;

  const noReviews = getInput("noComments") ? getBooleanInput("noReviews") : false;

  const ignoreDrafts = getInput("ignoreDrafts") ? getBooleanInput("ignoreDrafts") : true;

  let requiredLabels: string[] = [];
  const labels = getInput("requiredLabels");
  if (labels) {
    requiredLabels = labels.split(",");
  }

  return { daysStale, noReviews, ignoreDrafts, requiredLabels };
};

const generateMarkdownMessage = (prs: PullRequest[], repo: { owner: string; repo: string }) => {
  const messages = prs.map(
    (pr) => `  - [${pr.title}](${pr.html_url}) - Stale for ${daysSinceDate(pr.updated_at)} days`,
  );
  return `### Repo ${repo.owner}/${repo.repo} has ${prs.length} stale PRs\n${messages.join("\n")}`;
};

const filterPRs = (prs: PullRequest[] | undefined, filters: Filters) => {
  if (!prs || prs.length < 1) {
    return [];
  }

  let filteredData = prs;
  if (filters.daysStale) {
    filteredData = filteredData.filter((pr) => olderThanDays(pr, filters.daysStale));
  }
  if (filters.noReviews) {
    filteredData = filteredData.filter(byNoReviews);
  }
  if (filters.ignoreDrafts) {
    filteredData = filteredData.filter((pr) => !pr.draft);
  }
  if (filters.requiredLabels.length > 0) {
    filteredData = filteredData.filter((fd) => byLabels(fd, filters.requiredLabels));
  }

  return filteredData;
};

const getRepo = (ctx: Context): Repo => {
  let repo = getInput("repo", { required: false });
  if (!repo) {
    repo = ctx.repo.repo;
  }

  let owner = getInput("owner", { required: false });
  if (!owner) {
    owner = ctx.repo.owner;
  }

  return { repo, owner };
};

const runAction = async (ctx: Context) => {
  const repo = getRepo(ctx);
  const token = getInput("GITHUB_TOKEN", { required: true });

  const filters = getFiltersFromInput();
  debug(JSON.stringify(filters));

  const inputDays = Number.parseInt(getInput("days-stale", { required: false }));
  const daysStale = isNaN(inputDays) ? 5 : inputDays;
  const stale = isNaN(daysStale);
  const outputFile = getInput("fileOutput", { required: false });
  console.log("daysStale", daysStale, stale);

  const octokit = await github.getInstance({ authType: "token", authToken: token });
  const prs = await getPullRequestWithReviews(octokit, repo);

  const filterReviews = filterPRs(prs, filters);

  // we filter the PRs and see how many are remaining
  const amountOfStalePrs = filterReviews.length;

  info(`Found ${amountOfStalePrs} stale PRs`);
  setOutput("repo", `${repo.owner}/${repo.repo}`);
  setOutput("stale", amountOfStalePrs);
  if (amountOfStalePrs > 0) {
    const cleanedData = filterReviews.map((pr) => {
      return {
        url: pr.html_url,
        title: pr.title,
        number: pr.number,
        daysStale: daysSinceDate(pr.updated_at),
        reviewCount: pr.reviews ? pr.reviews.length : 0,
        reviews: pr.reviews.map((review) => {
          return { url: review.html_url, pr: review.pull_request_url };
        }),
      };
    });

    const jsonData = JSON.stringify(cleanedData);
    debug(jsonData);
    setOutput("data", jsonData);
    const message = generateMarkdownMessage(filterReviews, repo);
    setOutput("message", message);

    if (outputFile) {
      await writeToFile(outputFile, jsonData);
    }

    await summary
      .addHeading(`${repo.owner}/${repo.repo}`)
      .addHeading(`${amountOfStalePrs} stale PRs`, 3)
      .addTable([
        [
          { data: "Title", header: true },
          { data: "Days stale", header: true },
          { data: "Link", header: true },
        ],
        ...cleanedData.map(
          (pr) => [pr.title, pr.daysStale.toString(), `${repo.owner}/${repo.repo}#${pr.number}`] as string[],
        ),
      ])
      .addLink("See all Pull Requests", `https://github.com/${repo.owner}/${repo.repo}/pulls`)
      .write();
  } else {
    setOutput("message", `### Repo ${repo.owner}/${repo.repo} has no stale Pull Requests`);
    info(`Repo ${repo.owner}/${repo.repo} has no stale Pull Requests`);
    if (outputFile) {
      await writeToFile(outputFile, "[]");
    }
  }
};

runAction(context);

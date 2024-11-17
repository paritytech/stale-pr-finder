import moment from "moment";

import { PullRequest } from "./types";

export const olderThanDays = (pr: PullRequest, daysStale: number): boolean =>
  moment().diff(moment(pr.updated_at), "days") > daysStale;

export const byNoReviews = (pr: PullRequest): boolean => !pr.reviews || pr.reviews.length === 0;

export const withLabels = (pr: PullRequest, labels: string[]): boolean =>
  pr.labels &&
  pr.labels.map((prl) => prl.name.toLowerCase()).some((prl) => labels.map((label) => label.toLowerCase()).includes(prl));

export const withoutLabels = (pr: PullRequest, labels: string[]): boolean =>
  pr.labels &&
  !pr.labels.map((prl) => prl.name.toLowerCase()).some((prl) => labels.map((label) => label.toLowerCase()).includes(prl));

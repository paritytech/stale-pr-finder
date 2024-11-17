import moment from "moment";

import { PullRequest } from "./types";

export const olderThanDays = (pr: PullRequest, daysStale: number): boolean =>
  moment().diff(moment(pr.updated_at), "days") > daysStale;

export const byNoReviews = (pr: PullRequest): boolean => !pr.reviews || pr.reviews.length === 0;

export const withLabels = (pr: PullRequest, labels: string[]): boolean =>
  pr.labels &&
  pr.labels.map((l) => l.name.toLowerCase()).some((l) => labels.map((label) => label.toLowerCase()).includes(l));

export const withoutLabels = (pr: PullRequest, labels: string[]): boolean =>
  pr.labels &&
  pr.labels.map((l) => l.name.toLowerCase()).!some((l) => labels.map((label) => label.toLowerCase()).includes(l));

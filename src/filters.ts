import moment from "moment";
import { PullRequest } from "./types";

export const olderThanDays = (pr: PullRequest, daysStale: number): boolean => {
    return moment().diff(moment(pr.updated_at), "days") > daysStale;
}

export const byNoReviews = (pr: PullRequest): boolean => {
    return !pr.reviews || pr.reviews.length === 0;
}

export const byLabels = (pr: PullRequest, labels: string[]): boolean => {
    return pr.labels && pr.labels.map(l => l.name.toLowerCase()).some(l => labels.map(l => l.toLowerCase()).includes(l));
}

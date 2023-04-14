export interface PullRequest {
    html_url: string;
    number: number;
    state: "open" | "closed" | string;
    title: string;
    /** If user was deleted it is going to be null */
    user: { login: string } | null
    body: string | null;
    created_at: string;
    updated_at: string;
    draft?: boolean;
    _links: { html: { href: string } };
    author_association: string;
    reviews: Review[];
}

interface Review {
    id: number,
    user: { login: string } | null,
    html_url: string,
    pull_request_url: string
}

export type Repo = { owner: string, repo: string };

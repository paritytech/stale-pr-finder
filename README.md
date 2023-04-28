# Stale Pull Requests Finder
Finds outdated Pull Requestes and generates an output data & message.

Intended to be used with a notification action (Slack/Discord/Email/etc look at the example usage).

Works great with the [`workflow_dispatch`](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_dispatch) or [`schedule`](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule) action events.

## Why?

This action is intended for the case where a repository (or an organization) needs to find out what Pull Requests have been stale for a while.

By being agnostic on the result, users can use the output to generate a custom message on their favorite system.

## Example usage

You need to create a file in `.github/workflows` and add the following:

```yml
name: Find stale PRs

on:
  workflow_dispatch:

jobs:
  fetch:
    permissions:
        pull-requests: read
    runs-on: ubuntu-latest
    steps:
      - name: Fetch PRs from here
        # We add the id to access to this step outputs
        id: stale
        uses: paritytech/stale-pr-finder@main
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # optional, how many days since the last action for it to be stale
          # defaults to 5
          days-stale: 10
        # example showing how to use the content
      - name: Produce result
        run: |
          echo "There are $AMOUNT stale PRs in this repository"
          echo "$ACTION_PRS"
        env:
          # a number with the amount of stale prs in the repository
          AMOUNT: ${{ steps.stale.outputs.stale }}"
          # a formatted markdown message
          ACTION_PRS: ${{ steps.stale.outputs.message }}"
```

### Inputs
You can find all the inputs in [the action file](./action.yml) but let's walk through each one of them:

- `GITHUB_TOKEN`: Token to access to the repository Pull Requests. If you are access a different repository be sure to read the [`accessing other repositories`](#accessing-other-repositories) section.
  - **required**
  - If using on the same repo, you can simply use `${{ github.token }}`.
- `repo`: name of the repository. Example: `https://github.com/paritytech/REPO-NAME-GOES-HERE`
  - **defaults** to the repo where this action will be run.
  - Setting this value and `owner` allows you to run this action in other repositories (useful if you want to aggregate all the stale pull requests)
  - If set, be sure to read the [`accessing other repositories`](#accessing-other-repositories) section.
- `owner`: name of the organization/user where the repository is. Example: `https://github.com/OWNER-NAME/stale-pr-finder`
  - **defaults** to the organization where this action is ran.
- `days-stale`: Amount of days since the last activity for a Pull Request to be considered *stale*.
  - **default**: 5
- `noComments`: Boolean. If the action should only fetch Pull Requests that have 0 reviews (comments do not count).
  - Short for `Ignore PRs that have comments`.
  - **default**: false
- `ignoreDrafts`: Boolean. If the action should ignore Pull Requests that are [draft](https://github.blog/2019-02-14-introducing-draft-pull-requests/)
  - **default**: true
- `fileOutput`: String. File to which the output from `data` should be written. 
  - Useful in the cases where the output is too big and GitHub Actions can not handle it as a variable.
  - Make sure that the directory exists, else it will fail
- `requiredLabels`: Collections of labels separated by commas that should be required when searching for a PR.
  - Short for `Ignore PRs without any of the required labels`.
  - **optional**
  - **Important**: If set be sure to connect the names by comma.
    - Example: `feature,bug,good first issue`
    - It is **not** _case sensitive_.

#### Accessing other repositories

The action has the ability to access other repositories but if it can read it or not depends of the repository's visibility.

The default `${{ github.token }}` variable has enough permissions to read the PRs in **public repositories**.
If you want this action to access to the Pull Requests in a private repository, then you will need a `Personal Access Token` with `repo` permissions.

### Outputs
Outputs are needed for your chained actions. If you want to use this information, remember to set an `id` field in the step so you can access it.
You can find all the outputs in [the action file](./action.yml) but let's walk through each one of them:
- `stale`: Amount of stale PRs found in the step. It's only the number (`0`, `4`, etc)
- `repo`: Organization and repo name. Written in the format of `owner/repo`.
- `message`: A markdown message with a list of all the stale PRs. See the example below.
  - If no stale PRs were found, it will be `## Repo owner/repo has no PRs` instead.
- `data`: A json object with the data of the stale PRs. See the example below for the format of the data.

**The `message` and `data` objects are sorted from oldest since last change to newest.**

#### Markdown message

An example of how the markdown would be produced for this repository:
### Repo paritytech/stale-pr-finder has 3 stale PRs
  - [Stop AI from controlling the world](https://github.com/paritytech/stale-pr-finder/pull/15) - Stale for 25 days
  - [Lint the repo](https://github.com/paritytech/stale-pr-finder/pull/12) - Stale for 21 days
  - [Help me with reading](https://github.com/paritytech/stale-pr-finder/pull/3) - Stale for 18 days

You can send the data in this format to a Slack/Discord/Matrix server. You can also create a new GitHub issue with this format.

#### JSON Data
```json
[
    {
        "url": "https://github.com/paritytech/stale-pr-finder/pull/15",
        "title": "Stop AI from controlling the world",
        "number": 15,
        "daysStale": 25,
        "reviewCount": 0,
        "reviews": []
    },
    {
        "url": "https://github.com/paritytech/stale-pr-finder/pull/12",
        "title": "Lint the repo",
        "number": 12,
        "daysStale": 21,
        "reviewCount": 0,
        "reviews": []
    },
    {
        "url": "https://github.com/paritytech/stale-pr-finder/pull/3",
        "title": "Help me with reading",
        "number": 3,
        "daysStale": 18,
        "reviewCount": 0,
        "reviews": []
    }
]
```

### Using a GitHub app instead of a PAT
In some cases, specially in big organizations, it is more organized to use a GitHub app to authenticate, as it allows us to give it permissions per repository and we can fine-grain them even better. If you wish to do that, you need to create a GitHub app with the following permissions:
- Repository permissions:
	- Pull Requests
		- [x] Read

Because this project is intended to be used with a token we need to do an extra step to generate one from the GitHub app:
- After you create the app, copy the *App ID* and the *private key* and set them as secrets.
- Then you need to modify the workflow file to have an extra step:
```yml
    steps:
      - name: Generate token
        id: generate_token
        uses: tibdex/github-app-token@v1
        with:
          app_id: ${{ secrets.APP_ID }}
          private_key: ${{ secrets.PRIVATE_KEY }}
      - name: Fetch stale PRs from here
        id: stale
        uses: paritytech/stale-pr-finder@main
        with:
          days-stale: 10
          # The previous step generates a token which is used as the input for this action
          GITHUB_TOKEN: ${{ steps.generate_token.outputs.token }}
```

Be aware that this is needed only to read Pull Requests from **external private repositories**. 
If the PRs is in the same repository, or the target repository is public, the default `${{ github.token }}` has enough access to read the PRs.

## Example workflow

Let's make an example. We want to have a workflow that runs every Monday at 9 in the morning and it informs through a slack message in a channel. We can also trigger it manually if we want to.

This action needs to run on 3 different repositories:
- The current repository
- `example/abc` repository
- `example/xyz` repository

```yml
name: Find stale PRs

on:
  workflow_dispatch:
  schedule:
    - cron:  '0 9 * * 1'

jobs:
  fetch-PRs:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch pull requests from here
        id: local
        uses: paritytech/stale-pr-finder@main
        with:
          GITHUB_TOKEN: ${{ github.token }}
      - name: Fetch abc Pull Requests
        id: abc
        uses: paritytech/stale-pr-finder@main
        with:
          GITHUB_TOKEN: ${{ github.token }}
          owner: example
          repo: abc
      - name: Fetch xyz Pull Requests
        id: xyz
        uses: paritytech/stale-pr-finder@main
        with:
          GITHUB_TOKEN: ${{ github.token }}
          owner: example
          repo: xyz
      - name: Post to a Slack channel
        id: slack
        uses: slackapi/slack-github-action@v1.23.0
        with:
          channel-id: 'CHANNEL_ID'
          slack-message: "Stale PRs this week: \n$LOCAL_PR \n$ABC_PR \n$XYZ_PR"
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          LOCAL_PR: ${{ steps.local.outputs.message }}"
          ABC_PR: ${{ steps.abc.outputs.message }}"
          XYZ_PR: ${{ steps.xyz.outputs.message }}"
```

This will produce a message similar to the following:

Stale PRs this week:
### Repo example/local has 1 stale PRs
  - [Stop AI from controlling the world](https://github.com/example/local/pull/15) - Stale for 25 days
### Repo example/abc has 2 stale PRs
  - [Lint the repo](https://github.com/example/abc/pull/12) - Stale for 21 days
  - [Help me with reading](https://github.com/example/abc/pull/3) - Stale for 18 days
### Repo example/xyz has 3 stale PRs
  - [La la la](https://github.com/example/xyz/pull/15) - Stale for 25 days
  - [Help with lalilulelo](https://github.comexample/xyz/pull/12) - Stale for 21 days
  - [Fix the issue with the word 'Patriot'](https://github.com/example/xyz/pull/3) - Stale for 18 days

## Development
To work on this app, you require
- `Node 18.x`
- `yarn`

Use `yarn install` to set up the project.

`yarn build` compiles the TypeScript code to JavaScript.

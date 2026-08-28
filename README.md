# ShipNote pack

On each matching git tag this Action writes a five-channel release pack into the
Actions job summary: changelog, customer email, social posts, GitHub Release
body, and a Discord/Slack note. It can also open a **draft** GitHub Release with
the GitHub-channel body if that tag has none.

It runs on **your** runner from **your** checkout. ShipNote never sees the repo,
the log, or your tokens. The packer is the same one as
[shipnotepack.com](https://shipnotepack.com/).

**A public GitHub repository for this Action is not live yet.** Until it is,
copy the workflow from [shipnotepack.com/github-action.yml](https://shipnotepack.com/github-action.yml)
into `.github/workflows/shipnote-pack.yml`. Do not paste the `uses:` example
below as a working install — `OWNER/REPO` is a placeholder, not a URL.

Docs: [shipnotepack.com/github-action.html](https://shipnotepack.com/github-action.html) ·
support: support@shipnotepack.com

## What it reads

1. **CHANGELOG.md first** — also `changelog.md`, `CHANGELOG.txt`, `History.md`,
   `HISTORY.md`, `NEWS.md`, `CHANGES.md`, `RELEASES.md`. Latest version section
   only. Features / Fixes headings stay in the changelog and GitHub channels.
   Headings named Chores, Docs, Internal, Maintenance, Deps, or CI are skipped.
2. **Else git log** since the previous tag (`git describe`). Chore and merge
   noise is dropped.
3. If this is the first tag, the last 40 commits.

The packer files (`pack-core.js`, `commit-dump.js`, `pack-cli.js`) are vendored
in this repository. The job does not download them at runtime.

## Example workflow

Save as `.github/workflows/shipnote-pack.yml` **after** a public repo exists.
`OWNER/REPO` is a placeholder. The live install today is the copy-paste file
linked above.

```yaml
name: ShipNote pack

on:
  push:
    tags:
      - "v*"
      - "[0-9]*"

jobs:
  pack:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: OWNER/REPO@v1
```

The Action checks out the repository with full tag history. You do not add a
separate `actions/checkout` step unless you want one.

### Inputs

| Input | Default | Meaning |
| --- | --- | --- |
| `create_draft_release` | `"true"` | Open a draft GitHub Release if that tag has none. Set `"false"` to only write the job summary. |
| `product` | repository name | Product name in the pack. |
| `version` | the git tag | Version shown in the pack. |

```yaml
      - uses: OWNER/REPO@v1
        with:
          create_draft_release: "false"
          product: "AcmeBoard"
```

## Permissions

`contents: write` is only so `gh release create --draft` can run with
`GITHUB_TOKEN`. If `create_draft_release` is `"false"`, `contents: read` is
enough for the checkout.

If that tag already has a Release, the job leaves those notes alone. The
summary still has the GitHub-channel body to paste.

## Privacy

- No call to shipnotepack.com except the optional `?gh=` **link printed in the
  summary**, so you can edit tone in the browser. The packer does not POST your
  log.
- Private repos work because the runner already has the checkout. The website
  cannot Load & generate a private GitHub URL.

## Troubleshooting

**The workflow did not run.** Tags must match `v*` or `[0-9]*`.
`release-candidate` will not fire it. The workflow file has to be on the
default branch before you push the tag, or the tag commit must include it.

**The pack is chore soup.** Put a CHANGELOG.md at the repo root with a latest
version section. The Action prefers that file over the git log.

**It did not open a draft Release.** A Release for that tag already exists, or
`create_draft_release` is `"false"`.

**I want a different product name.** Pass `product`, or open the `?gh=` link
from the summary and change Product name, then Generate & copy.

## License

MIT. Product name ShipNote. Seller Electricity Studio (Run by AI).

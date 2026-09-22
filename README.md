# ContentTools test site

A small [Astro](https://astro.build) site whose markdown is edited through the
[ContentTools 2](https://github.com/jamesjnadeau/ContentTools) CMS shell. It
exists to exercise the thing no unit test can: **the round trip against a real
repository.** Open an entry, edit it, attach an image, submit — then read the
pull request and check that the diff is small.

Published twice, from one build: to
[GitHub Pages](https://jamesjnadeau.github.io/ContentTools-test/) and to
Netlify. See [Deploys](#deploys) for why there are two and what it costs.

## Layout

| path | what it is |
|---|---|
| `src/content/blog/` | the markdown the CMS edits |
| `src/content.config.ts` | Astro's schema for that frontmatter |
| `src/pages/` | the index and the post route |
| `public/images/` | media, which the CMS commits alongside the entry that references it |
| `cms-config.yml` | the runtime config a ContentTools deployment is pointed at |
| `netlify.toml` | the Netlify half of the deploy, and the path rewrite it needs |

## Editing it

1. Build ContentTools and serve `app/` and `dist/` from a static host over
   **HTTPS** (the GitHub App flow needs a secure context; a personal access
   token does not, but `sessionStorage` and the redirect both behave better
   over TLS).
2. Point the shell's `config` attribute at this repository's `cms-config.yml`.
3. Sign in with a **fine-grained personal access token** scoped to this
   repository, with **Contents** and **Pull requests** both set to *read and
   write*. Anything less is refused at the gate rather than at the first save.

The shell never merges. It opens one branch and one pull request per entry and
moves it to `ready`; a human merges on GitHub, which is what the review gate is
for. Merging to `main` deploys to both hosts.

Every pull request also gets a **Netlify preview**, posted as a comment on the
pull request itself. That is not a convenience: the review step is somebody
reading a diff, and a diff of markdown does not show what the page will look
like.

## Deploys

One build, two hosts, byte-identical output — so a difference between the two
sites is a difference in how they are served, never in what was built.

The awkward part is `base`. Astro bakes it into every generated URL at build
time, and a GitHub Pages **project** site is served under the repository name,
so `astro.config.mjs` sets `base: '/ContentTools-test'` and `dist/index.html`
links to `/ContentTools-test/blog/...` even though the file sits at
`dist/blog/...`.

Building twice, once per base, is the obvious alternative and it is worse than
it looks. `cms-config.yml` sets `media.publicPath` to
`/ContentTools-test/images`, and that prefix is written **into the markdown**
when the CMS inserts an image — into committed content, in a pull request
somebody has already reviewed. Two bases would mean every inserted image is
broken on one of the two sites, permanently, and no deploy setting fixes a path
that is already in the file.

So `netlify.toml` teaches Netlify to answer to the same prefix, with a rewrite
rather than a redirect so nothing bounces and the page's own links resolve.
`https://<site>.netlify.app/` works too, because the files really are at the
root.

### Turning Netlify on

The workflow skips Netlify entirely until two repository secrets exist, so
Pages keeps deploying on its own until you are ready:

| secret | where it comes from |
|---|---|
| `NETLIFY_AUTH_TOKEN` | Netlify → User settings → Applications → **New access token** |
| `NETLIFY_SITE_ID` | the site's Site settings → **Site ID** (create an empty site first; no repository needs connecting) |

Add both under Settings → Secrets and variables → Actions. Until then each run
says so in its summary and nothing fails.

## Running it locally

```sh
npm install
npm run dev     # http://localhost:4321/ContentTools-test/
npm run build
```

## A note on the content

The placeholder post is original filler written in the register of a gentle
painting lesson. It is deliberately varied — headings, a list, a blockquote, a
fenced block, emphasis, a link — so that saving it through the editor exercises
the markdown round trip rather than just the paragraph case.

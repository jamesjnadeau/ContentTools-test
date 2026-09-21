# ContentTools test site

A small [Astro](https://astro.build) site whose markdown is edited through the
[ContentTools 2](https://github.com/jamesjnadeau/ContentTools) CMS shell. It
exists to exercise the thing no unit test can: **the round trip against a real
repository.** Open an entry, edit it, attach an image, submit — then read the
pull request and check that the diff is small.

Published at <https://jamesjnadeau.github.io/ContentTools-test/>.

## Layout

| path | what it is |
|---|---|
| `src/content/blog/` | the markdown the CMS edits |
| `src/content.config.ts` | Astro's schema for that frontmatter |
| `src/pages/` | the index and the post route |
| `public/images/` | media, which the CMS commits alongside the entry that references it |
| `cms-config.yml` | the runtime config a ContentTools deployment is pointed at |

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
for. Merging to `main` triggers the Pages deploy.

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

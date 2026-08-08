# Kevin Scott — Portfolio

Personal portfolio site for Kevin Scott, focused on AI Systems & Performance
Engineering — making AI systems faster, cheaper, and more scalable. Built with
[Quarto](https://quarto.org/) and deployed to GitHub Pages.

Live at <https://biscuitsandgravy.ai>.

## Setup

1. Install [Quarto](https://quarto.org/docs/get-started/)
2. Clone this repository
3. Run `quarto preview` to work on the site locally
4. Run `quarto render` to build the static site into `_site/`

## Structure

- `index.qmd` — hero landing page
- `projects.qmd` — projects and open-source work
- `blog.qmd` — research writing (listing of `posts/`)
- `contact.qmd` — contact information
- `404.qmd` — custom not-found page
- `posts/` — blog/research posts
- `research/` — standalone interactive demos (e.g. Linguistic Semantic Chunking)
- `_quarto.yml` — site configuration (nav, SEO, Open Graph, search)
- `styles.css` — custom styling
- `robots.txt`, `CNAME` — crawler and custom-domain configuration

## Deployment

Pushing to `main` triggers the GitHub Actions workflow
(`.github/workflows/publish.yml`), which runs `quarto render` and publishes the
contents of `_site/` to GitHub Pages. Only rendered output is published — repo
sources and notes are not.

## License

All content © Kevin Scott. Code structure MIT licensed.

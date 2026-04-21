# AI Resume Builder

This repo now includes a simple static website you can deploy directly from GitHub Pages.

It lets a user:

- enter an OpenAI API key at the top
- paste their original resume and real skills on the left
- paste the JD and extra details on the right
- generate a tailored LaTeX resume at the bottom
- download the new `.tex` file or copy the LaTeX

The tailoring prompt is designed to stay truthful:

- it should not invent skills or experience
- it should target strong alignment with the JD when that overlap is real
- it should surface missing gaps in honesty notes

## Files for the deployable site

- [index.html](./index.html)
- [styles.css](./styles.css)
- [script.js](./script.js)

## How to run locally

Because this is a static site, you can open `index.html` directly in a browser or serve it locally with any simple static server.

Example with Python:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

## How to deploy on GitHub Pages

1. Push this repo to GitHub.
2. In GitHub, open `Settings > Pages`.
3. Set the source to deploy from your main branch.
4. Use the repository root as the site source.
5. Save and wait for Pages to publish.

The main entry page is `index.html`, so no build step is required.

## Important security note

This version is client-side only. That means the API key is entered in the browser and the browser calls the OpenAI API directly.

This is fine for personal testing, demos, or private usage, but it is not ideal for a public production app. For a public deployment, the safer setup is:

- frontend on GitHub Pages, Vercel, or Netlify
- backend proxy for OpenAI requests
- server-side secret storage instead of exposing API usage from the browser

## OpenAI API behavior

The frontend calls the Chat Completions API and requests structured JSON output, then turns that JSON into LaTeX.

Relevant official docs:

- [Chat Completions API](https://platform.openai.com/docs/api-reference/chat/create?lang=curl)
- [Structured Outputs guide](https://platform.openai.com/docs/guides/structured-outputs?api-mode=chat)

## Existing Python version

The earlier Python/Streamlit prototype is still in the repo under:

- [app.py](./app.py)
- [resume_builder](./resume_builder)

You can keep that as a local prototype, but the static site is the easiest one to deploy straight from GitHub.

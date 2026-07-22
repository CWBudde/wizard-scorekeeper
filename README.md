# Wizard Scorekeeper

A fast, mobile-friendly scorekeeper for the Wizard card game. It records predictions and tricks, calculates scores automatically, keeps a complete editable history, and stores the current game locally in the browser.

## Features

- 3–6 players with the correct number of rounds for a 60-card deck
- Wizard scoring: exact prediction = 20 + 10 per trick; otherwise −10 per missed trick
- Validation that played tricks add up to the current round
- Live projected totals and standings
- Editable round history and final ranking
- Automatic local persistence—no account or server required
- Responsive, accessible interface
- Continuous deployment to GitHub Pages

## Live app

[Open Wizard Scorekeeper](https://cwbudde.github.io/wizard-scorekeeper/)

## Development

```sh
npm install
npm run dev
```

Run all checks:

```sh
npm test
npm run lint
npm run build
```

## Deployment

Every push to `main` runs the test/build pipeline and deploys `dist` to GitHub Pages. The repository's Pages source should be set to **GitHub Actions**.

## Privacy

Game data stays in the browser's local storage. Nothing is sent to a server.

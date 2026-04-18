# Trackra

Mobile-first static wallet tracker: live balances in USD and Nigerian Naira (EVM + Solana). No backend — runs entirely in the browser.

## Run locally

```bash
cd Trackra
python3 -m http.server 8080
```

Open [http://localhost:8080/tracker.html](http://localhost:8080/tracker.html). Do not open HTML files as `file://` — browsers block API calls from local files.

## GitHub Pages

1. Push this repo to GitHub.
2. **Settings → Pages**: Source **Deploy from a branch**, branch **main** (or **master**), folder **/ (root)**.
3. After the first deploy, open `https://<user>.github.io/<repo>/` and `.../tracker.html`.
4. In **Helius** and **Moralis** dashboards, add your Pages URL under API key **allowed domains / referrers** (e.g. `https://yourname.github.io`). Otherwise some calls may fail outside localhost.

## API keys

Keys are read from `js/api.js`. For a **public** repo, treat them as public: restrict usage by domain in each provider’s dashboard and rotate keys if they leak.

## License

Use at your own risk for read-only portfolio / demo purposes.

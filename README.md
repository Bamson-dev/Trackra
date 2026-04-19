# Trackra — Track Crypto in Naira. Instantly.

A real-time crypto portfolio tracker built specifically for Nigerian and African crypto users. Paste any public wallet address and see your full portfolio value in seconds, including live Naira conversion.

**GitHub Repository:** github.com/bamson-dev/Trackra  
**Built by:** Bamidele Matthew — github.com/bamson-dev

---

## Why Trackra

Most wallet trackers are built for advanced global users. They show values in dollars only, have complex interfaces, and require account creation before you can see anything.

Trackra is different. It is built for the Nigerian crypto user who wants to know one thing fast: how much is my crypto worth in Naira right now?

No signup. No private keys. No seed phrases. Just paste your wallet address and track.

---

## Features

- Real-time token balances from the blockchain
- Live USD and Naira conversion using live FX rates
- USDT tracking for Nigerian freelancers paid in crypto
- Support for 4 networks: Ethereum, BNB Chain, Polygon, and Solana
- Full transaction history with incoming and outgoing labels
- Currency toggle: view values in USD, NGN, or both
- Mobile first design built for phone users
- 100% read only, no private keys ever requested
- No account creation required

---

## Supported Networks

- Ethereum (ETH)
- BNB Chain (BNB)
- Polygon (MATIC/POL)
- Solana (SOL)

All USDT variants across these networks are tracked automatically.

---

## How It Works

1. Paste any public wallet address
2. Select the network
3. Click Track Wallet
4. See your full portfolio in USD and Naira instantly

---

## Tech Stack

- HTML5, CSS3, Vanilla JavaScript
- Moralis API (Ethereum, BNB, Polygon blockchain data)
- Helius API (Solana blockchain data)
- ExchangeRate API (live NGN conversion)
- CoinGecko API (token pricing)
- Mobile-first responsive design with dark premium UI

---

## Why This Does Not Work on GitHub Pages

This project currently only works when run locally on localhost. Here is why:

### The Problem: CORS Restrictions on Free API Tiers

The Moralis API (used for Ethereum, BNB, and Polygon data) requires domain whitelisting to allow browser requests. This feature is only available on paid plans starting at $49/month.

When you try to use the tracker on GitHub Pages:
- The browser makes a request to Moralis API
- Moralis sees the request is from `bamson-dev.github.io`
- Moralis blocks it with a CORS error because the domain is not whitelisted
- The tracker cannot fetch wallet data

### Why Localhost Works

When you run the project locally with `python3 -m http.server 8080`, requests come from `localhost`, which browsers treat differently. CORS restrictions do not apply the same way, so the API calls succeed.

### Solutions (Not Implemented)

To make this work on a live domain, you would need either:

1. **Upgrade to Moralis paid plan** ($49/month minimum) to whitelist your GitHub Pages domain
2. **Deploy a backend proxy server** (not possible on GitHub Pages, which only hosts static files) to make API calls server-side where CORS does not apply
3. **Use a different blockchain API** with a more generous free tier that allows public domain requests

For a portfolio project, none of these options are cost-effective or practical.

---

## Running Locally

Since the live site does not work due to API restrictions, here is how to run Trackra on your computer:

### Prerequisites

- Python 3 installed on your computer

### Steps

1. Clone this repository:
   ```
   git clone https://github.com/bamson-dev/Trackra.git
   ```

2. Navigate into the project folder:
   ```
   cd Trackra
   ```

3. Start a local server:
   ```
   python3 -m http.server 8080
   ```

4. Open your browser and go to:
   ```
   http://localhost:8080/index.html
   ```

5. Click "Track Wallet" in the navigation or go directly to:
   ```
   http://localhost:8080/tracker.html
   ```

6. Click "Try Demo Wallet" to load Vitalik Buterin's public Ethereum address and see the tracker in action

**Important:** Do NOT open the HTML files directly by double-clicking them. This uses the `file://` protocol which blocks API calls. Always use the local server.

---

## Demo Wallet

The "Try Demo Wallet" button automatically loads this public Ethereum address:

**Address:** `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`  
**Network:** Ethereum

This is Vitalik Buterin's public wallet address, commonly used for testing and demos.

You can also paste any other public wallet address for Ethereum, BNB Chain, Polygon, or Solana networks.

---

## Project Structure

```
trackra/
├── index.html          # Landing page
├── tracker.html        # Wallet tracker page
├── css/
│   ├── main.css       # Global styles
│   ├── dashboard.css  # Tracker page styles
│   └── responsive.css # Mobile responsiveness
├── js/
│   ├── api.js         # API integration (Moralis, Helius, ExchangeRate)
│   ├── ui.js          # UI rendering (summary cards, token table, transactions)
│   └── app.js         # App logic (validation, state management, event handlers)
└── README.md
```

---

## Security

- Trackra never requests private keys or seed phrases
- Wallet addresses are never stored anywhere
- All data is fetched read-only from public blockchain APIs
- No backend, no database, no user data collected
- The app runs entirely in your browser

---

## What I Learned Building This

- How to integrate multiple blockchain APIs (Moralis and Helius) in a single project
- How to normalize different API response shapes into a consistent data structure
- How to build a mobile-first dark fintech UI from scratch without any CSS framework
- How to handle API errors gracefully so users always see a useful message
- The difference between EVM and Solana wallet address formats and validation
- The limitations of free API tiers and CORS restrictions when deploying frontend-only apps
- Why some projects require a backend proxy to work on live domains

---

## Known Limitations

1. **Does not work on GitHub Pages** — Only works on localhost due to Moralis API CORS restrictions on free tier
2. **No portfolio history** — Only shows current balances, not historical performance
3. **Limited token price coverage** — Some obscure tokens may show "Price unavailable" if not listed on CoinGecko
4. **Transaction history limited to 20** — API free tier limits prevent loading full transaction history
5. **No Bitcoin support** — BTC uses different address formats and APIs, not currently supported

---

## Future Improvements (If Deployed with Backend)

- Add Bitcoin wallet tracking
- Add portfolio value charts over time
- Add price alerts via email or SMS
- Add CSV export for tax reporting
- Add support for more African currencies beyond NGN
- Add wallet nickname/labeling for tracking multiple wallets
- Add USD/NGN price history charts

---

## Why This Matters for Nigerian Users

Nigerian freelancers and remote workers are increasingly paid in cryptocurrency, especially USDT. They need to know:

- How much is my USDT worth in Naira right now?
- What is my total crypto portfolio value in local currency?
- Can I track this without creating an account or sharing private keys?

Trackra solves this specific problem for this specific audience.

---

## About the Developer

Bamidele Matthew is a software developer and Meta ads strategist 

**GitHub:** github.com/bamson-dev  
**LinkedIn:** linkedin.com/in/bamidelematthew

---

## License

MIT License. Free to use, modify, and distribute.

---

## Questions?

If you are reviewing this project and want to see it working, please run it locally following the instructions above. The GitHub Pages deployment does not work due to API limitations explained in this README.

For any questions about the project, reach out via GitHub.

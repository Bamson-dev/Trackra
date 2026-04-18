const MORALIS_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjhiNTgyMzM5LTJhYjYtNGIwNC05ZmI1LWIzNmRiZDUwYTE4MSIsIm9yZ0lkIjoiNTEwMzUyIiwidXNlcklkIjoiNTI1MDk0IiwidHlwZUlkIjoiNzdkZDFlNGItNjVhZS00ZDQ3LTg4NGYtODY0MmY4MmYyZTM3IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NzY1MjMwNzksImV4cCI6NDkzMjI4MzA3OX0.gLpia3GQ4R4aXHuwb5iKV-ltKO5TjNeJfvqHu71G_ow";
const HELIUS_KEY = "742e7e92-be3e-46bf-9d75-b6f2ef81d5af";
const FX_KEY = "f3cbe6e069015f2225c4dcc0";

const CHAIN_MAP = {
  eth: "eth",
  bsc: "bsc",
  polygon: "polygon"
};

/** Public RPC — used when Helius rejects the browser origin (common on GitHub Pages until the key’s domain allowlist includes your site). */
const PUBLIC_SOLANA_RPC = "https://api.mainnet-beta.solana.com";

let ngnRateCache = null;
let solPriceCache = null;
let evmNativePriceCache = null;

/**
 * POST JSON-RPC to Helius first, then fall back to Solana public RPC (same request body).
 */
async function postSolanaRpc(method, params) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: "trackra",
    method,
    params
  });
  const endpoints = [
    `https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(HELIUS_KEY)}`,
    PUBLIC_SOLANA_RPC
  ];
  let lastErr = null;
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        lastErr = new Error(`Solana RPC HTTP ${res.status}`);
        continue;
      }
      if (json?.error) {
        lastErr = new Error(json.error.message || "Solana RPC error");
        continue;
      }
      return json;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr || new Error("Solana RPC unavailable");
}

async function getNgnRate() {
  if (ngnRateCache) return ngnRateCache;
  try {
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${FX_KEY}/latest/USD`);
    if (!res.ok) throw new Error("FX fetch failed");
    const json = await res.json();
    ngnRateCache = json?.conversion_rates?.NGN || 0;
  } catch {
    ngnRateCache = 0;
  }
  return ngnRateCache;
}

async function fetchMoralisTokens(address, network) {
  const chain = CHAIN_MAP[network];
  const url = new URL(`https://deep-index.moralis.io/api/v2.2/wallets/${address}/tokens`);
  url.searchParams.set("chain", chain);
  const res = await fetch(url, { headers: { "X-API-Key": MORALIS_KEY } });
  if (!res.ok) {
    const originHint =
      res.status === 401 || res.status === 403
        ? " In Moralis, open this API key → allowed URLs → add your live site (e.g. https://yourname.github.io)."
        : "";
    throw new Error(`Token fetch failed (${res.status}).${originHint}`);
  }
  const json = await res.json();
  /* Moralis returns { result: [...] } — not a bare array */
  if (Array.isArray(json)) return json;
  return json?.result || [];
}

async function fetchMoralisTransactions(address, network) {
  const chain = CHAIN_MAP[network];
  const url = new URL(`https://deep-index.moralis.io/api/v2.2/${address}`);
  url.searchParams.set("chain", chain);
  url.searchParams.set("limit", "20");
  const res = await fetch(url, { headers: { "X-API-Key": MORALIS_KEY } });
  if (!res.ok) {
    const originHint =
      res.status === 401 || res.status === 403
        ? " In Moralis, allow your GitHub Pages URL for this API key."
        : "";
    throw new Error(`Transaction fetch failed (${res.status}).${originHint}`);
  }
  const json = await res.json();
  return json?.result || [];
}

async function fetchSolanaBalance(address) {
  const json = await postSolanaRpc("getBalance", [address]);
  const balance = (json?.result?.value || 0) / 1e9;
  // #region agent log
  fetch('http://127.0.0.1:7889/ingest/485cd955-1c15-4f9c-9862-3f57fb0a2ed8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f87d21'},body:JSON.stringify({sessionId:'f87d21',runId:'initial-2',hypothesisId:'N2',location:'js/api.js:109',message:'solana balance fetched',data:{addressPrefix:String(address||'').slice(0,6),balance},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return balance;
}

async function fetchSolanaTokens(address) {
  const json = await postSolanaRpc("getTokenAccountsByOwner", [
    address,
    { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
    { encoding: "jsonParsed" }
  ]);
  const accounts = json?.result?.value || [];
  // #region agent log
  fetch('http://127.0.0.1:7889/ingest/485cd955-1c15-4f9c-9862-3f57fb0a2ed8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f87d21'},body:JSON.stringify({sessionId:'f87d21',runId:'initial-2',hypothesisId:'N2',location:'js/api.js:119',message:'solana token accounts fetched',data:{addressPrefix:String(address||'').slice(0,6),accountCount:accounts.length},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return accounts;
}

async function fetchSolanaTransactions(address) {
  const url = new URL(`https://api.helius.xyz/v0/addresses/${address}/transactions`);
  url.searchParams.set("api-key", HELIUS_KEY);
  url.searchParams.set("limit", "20");
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const hint =
        res.status === 401 || res.status === 403
          ? ` (${res.status}: add your GitHub Pages URL to the Helius API key allowed domains, or txs stay empty.)`
          : ` (HTTP ${res.status})`;
      throw new Error(`Sol tx fetch failed${hint}`);
    }
    return res.json();
  } catch (e) {
    /* Do not fail the whole tracker — balances/tokens still work via RPC fallback */
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[Trackra] Transaction history unavailable:", e);
    }
    return [];
  }
}

async function fetchEvmNativeSpotPrices() {
  if (evmNativePriceCache) return evmNativePriceCache;
  try {
    const url = new URL("https://api.coingecko.com/api/v3/simple/price");
    url.searchParams.set("ids", "ethereum,binancecoin,matic-network");
    url.searchParams.set("vs_currencies", "usd");
    const res = await fetch(url);
    if (!res.ok) throw new Error("EVM native price fetch failed");
    const json = await res.json();
    evmNativePriceCache = {
      eth: Number(json?.ethereum?.usd || 0),
      bsc: Number(json?.binancecoin?.usd || 0),
      polygon: Number(json?.["matic-network"]?.usd || 0)
    };
  } catch {
    evmNativePriceCache = { eth: 0, bsc: 0, polygon: 0 };
  }
  return evmNativePriceCache;
}

async function fetchSolanaSpotPrices() {
  if (solPriceCache) return solPriceCache;
  try {
    const url = new URL("https://api.coingecko.com/api/v3/simple/price");
    url.searchParams.set("ids", "solana,marinade-staked-sol,jupiter-exchange-solana,bonk");
    url.searchParams.set("vs_currencies", "usd");
    const res = await fetch(url);
    if (!res.ok) throw new Error("Sol price fetch failed");
    const json = await res.json();
    solPriceCache = {
      SOL: Number(json?.solana?.usd || 0),
      USDT: 1,
      USDC: 1,
      MSOL: Number(json?.["marinade-staked-sol"]?.usd || 0),
      JUP: Number(json?.["jupiter-exchange-solana"]?.usd || 0),
      BONK: Number(json?.bonk?.usd || 0)
    };
    // #region agent log
    fetch('http://127.0.0.1:7889/ingest/485cd955-1c15-4f9c-9862-3f57fb0a2ed8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f87d21'},body:JSON.stringify({sessionId:'f87d21',runId:'initial-2',hypothesisId:'N3',location:'js/api.js:181',message:'solana prices fetched',data:{SOL:solPriceCache.SOL,USDT:solPriceCache.USDT,USDC:solPriceCache.USDC},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  } catch {
    solPriceCache = { SOL: 0, USDT: 1, USDC: 1, MSOL: 0, JUP: 0, BONK: 0 };
    // #region agent log
    fetch('http://127.0.0.1:7889/ingest/485cd955-1c15-4f9c-9862-3f57fb0a2ed8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f87d21'},body:JSON.stringify({sessionId:'f87d21',runId:'initial-2',hypothesisId:'N3',location:'js/api.js:186',message:'solana prices fallback used',data:{SOL:0,USDT:1,USDC:1},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }
  return solPriceCache;
}

async function fetchSolanaMintPrices(mints) {
  const uniqueMints = [...new Set((mints || []).filter(Boolean))];
  if (!uniqueMints.length) return {};
  const endpoints = [
    `https://lite-api.jup.ag/price/v2?ids=${encodeURIComponent(uniqueMints.join(","))}`,
    `https://price.jup.ag/v6/price?ids=${encodeURIComponent(uniqueMints.join(","))}`
  ];
  try {
    let lastErr = null;
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const data = json?.data || {};
        const byMint = {};
        uniqueMints.forEach((mint) => {
          byMint[mint] = Number(data?.[mint]?.price || 0);
        });
        // #region agent log
        fetch('http://127.0.0.1:7889/ingest/485cd955-1c15-4f9c-9862-3f57fb0a2ed8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f87d21'},body:JSON.stringify({sessionId:'f87d21',runId:'post-fix-2',hypothesisId:'F2',location:'js/api.js:227',message:'solana mint prices fetched',data:{endpoint,requested:uniqueMints.length,priced:Object.values(byMint).filter((v)=>Number(v)>0).length},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        return byMint;
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
      }
    }
    throw lastErr || new Error("All Jupiter endpoints failed");
  } catch (e) {
    // #region agent log
    fetch('http://127.0.0.1:7889/ingest/485cd955-1c15-4f9c-9862-3f57fb0a2ed8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f87d21'},body:JSON.stringify({sessionId:'f87d21',runId:'post-fix-2',hypothesisId:'F2',location:'js/api.js:236',message:'solana mint prices failed',data:{errorMessage:String(e&&e.message?e.message:e),requested:uniqueMints.length},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return {};
  }
}

window.TrackraAPI = {
  getNgnRate,
  fetchMoralisTokens,
  fetchMoralisTransactions,
  fetchEvmNativeSpotPrices,
  fetchSolanaBalance,
  fetchSolanaTokens,
  fetchSolanaTransactions,
  fetchSolanaSpotPrices,
  fetchSolanaMintPrices
};

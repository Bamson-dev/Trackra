const MORALIS_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjhiNTgyMzM5LTJhYjYtNGIwNC05ZmI1LWIzNmRiZDUwYTE4MSIsIm9yZ0lkIjoiNTEwMzUyIiwidXNlcklkIjoiNTI1MDk0IiwidHlwZUlkIjoiNzdkZDFlNGItNjVhZS00ZDQ3LTg4NGYtODY0MmY4MmYyZTM3IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NzY1MjMwNzksImV4cCI6NDkzMjI4MzA3OX0.gLpia3GQ4R4aXHuwb5iKV-ltKO5TjNeJfvqHu71G_ow";
const HELIUS_KEY = "742e7e92-be3e-46bf-9d75-b6f2ef81d5af";
const FX_KEY = "f3cbe6e069015f2225c4dcc0";

const CHAIN_MAP = {
  eth: "eth",
  bsc: "bsc",
  polygon: "polygon"
};

const PUBLIC_SOLANA_RPC = "https://api.mainnet-beta.solana.com";

let ngnRateCache = null;
let solPriceCache = null;
let evmNativePriceCache = null;

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
  const moralisUrl = `https://deep-index.moralis.io/api/v2.2/wallets/${address}/tokens?chain=${chain}`;
  const url = `https://corsproxy.io/?${encodeURIComponent(moralisUrl)}`;
  
  const res = await fetch(url, { 
    headers: { 
      "X-API-Key": MORALIS_KEY 
    } 
  });
  
  if (!res.ok) {
    throw new Error(`Token fetch failed (${res.status})`);
  }
  const json = await res.json();
  if (Array.isArray(json)) return json;
  return json?.result || [];
}

async function fetchMoralisTransactions(address, network) {
  const chain = CHAIN_MAP[network];
  const moralisUrl = `https://deep-index.moralis.io/api/v2.2/${address}?chain=${chain}&limit=20`;
  const url = `https://corsproxy.io/?${encodeURIComponent(moralisUrl)}`;
  
  const res = await fetch(url, { 
    headers: { 
      "X-API-Key": MORALIS_KEY 
    } 
  });
  
  if (!res.ok) {
    throw new Error(`Transaction fetch failed (${res.status})`);
  }
  const json = await res.json();
  return json?.result || [];
}

async function fetchSolanaBalance(address) {
  const json = await postSolanaRpc("getBalance", [address]);
  return (json?.result?.value || 0) / 1e9;
}

async function fetchSolanaTokens(address) {
  const json = await postSolanaRpc("getTokenAccountsByOwner", [
    address,
    { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
    { encoding: "jsonParsed" }
  ]);
  return json?.result?.value || [];
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
  } catch {
    solPriceCache = { SOL: 0, USDT: 1, USDC: 1, MSOL: 0, JUP: 0, BONK: 0 };
  }
  return solPriceCache;
}

async function fetchDexscreenerSolPrices(mints) {
  const byMint = {};
  for (let i = 0; i < mints.length; i += 30) {
    const chunk = mints.slice(i, i + 30);
    const url = `https://api.dexscreener.com/latest/dex/tokens/${chunk.join(",")}`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      const pairs = json?.pairs || [];
      pairs.forEach((p) => {
        const addr = p.baseToken?.address;
        if (!addr) return;
        const px = Number(p.priceUsd || 0);
        if (px <= 0) return;
        if (!byMint[addr] || px > byMint[addr]) byMint[addr] = px;
      });
    } catch {
      /* next chunk */
    }
  }
  return byMint;
}

async function fetchJupiterV3MintPrices(mints) {
  const byMint = {};
  for (let i = 0; i < mints.length; i += 50) {
    const chunk = mints.slice(i, i + 50);
    const url = `https://api.jup.ag/price/v3?ids=${chunk.join(",")}`;
    try {
      let res = await fetch(url);
      if (res.status === 429) res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      if (!json || typeof json !== "object") continue;
      Object.keys(json).forEach((mint) => {
        const px = Number(json[mint]?.usdPrice || 0);
        if (px > 0) byMint[mint] = px;
      });
    } catch {
      /* next chunk */
    }
  }
  return byMint;
}

async function fetchSolanaMintPrices(mints) {
  const uniqueMints = [...new Set((mints || []).filter(Boolean))];
  if (!uniqueMints.length) return {};
  const [jup, dex] = await Promise.all([
    fetchJupiterV3MintPrices(uniqueMints),
    fetchDexscreenerSolPrices(uniqueMints)
  ]);
  const byMint = {};
  uniqueMints.forEach((m) => {
    const a = Number(jup[m] || 0);
    const b = Number(dex[m] || 0);
    const best = Math.max(a, b);
    if (best > 0) byMint[m] = best;
  });
  return byMint;
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

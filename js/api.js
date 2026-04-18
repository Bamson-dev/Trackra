const MORALIS_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjhiNTgyMzM5LTJhYjYtNGIwNC05ZmI1LWIzNmRiZDUwYTE4MSIsIm9yZ0lkIjoiNTEwMzUyIiwidXNlcklkIjoiNTI1MDk0IiwidHlwZUlkIjoiNzdkZDFlNGItNjVhZS00ZDQ3LTg4NGYtODY0MmY4MmYyZTM3IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NzY1MjMwNzksImV4cCI6NDkzMjI4MzA3OX0.gLpia3GQ4R4aXHuwb5iKV-ltKO5TjNeJfvqHu71G_ow";
const HELIUS_KEY = "742e7e92-be3e-46bf-9d75-b6f2ef81d5af";
const FX_KEY = "f3cbe6e069015f2225c4dcc0";

const CHAIN_MAP = {
  eth: "eth",
  bsc: "bsc",
  polygon: "polygon"
};

let ngnRateCache = null;
let solPriceCache = null;
let evmNativePriceCache = null;

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
  if (!res.ok) throw new Error(`Token fetch failed (${res.status})`);
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
  if (!res.ok) throw new Error("Transaction fetch failed");
  const json = await res.json();
  return json?.result || [];
}

async function fetchSolanaBalance(address) {
  const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "trackra",
      method: "getBalance",
      params: [address]
    })
  });
  if (!res.ok) throw new Error("SOL balance fetch failed");
  const json = await res.json();
  if (json?.error) throw new Error(json.error.message || "SOL balance RPC error");
  return (json?.result?.value || 0) / 1e9;
}

async function fetchSolanaTokens(address) {
  const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "trackra",
      method: "getTokenAccountsByOwner",
      params: [
        address,
        { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { encoding: "jsonParsed" }
      ]
    })
  });
  if (!res.ok) throw new Error("Sol token fetch failed");
  const json = await res.json();
  if (json?.error) throw new Error(json.error.message || "Sol token RPC error");
  return json?.result?.value || [];
}

async function fetchSolanaTransactions(address) {
  const url = new URL(`https://api.helius.xyz/v0/addresses/${address}/transactions`);
  url.searchParams.set("api-key", HELIUS_KEY);
  url.searchParams.set("limit", "20");
  const res = await fetch(url);
  if (!res.ok) throw new Error("Sol tx fetch failed");
  return res.json();
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

window.TrackraAPI = {
  getNgnRate,
  fetchMoralisTokens,
  fetchMoralisTransactions,
  fetchEvmNativeSpotPrices,
  fetchSolanaBalance,
  fetchSolanaTokens,
  fetchSolanaTransactions,
  fetchSolanaSpotPrices
};

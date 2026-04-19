(() => {
  const isLanding = !document.getElementById("trackForm");
  const SOLANA_MINT_MAP = {
    So11111111111111111111111111111111111111112: { symbol: "SOL", name: "Solana" },
    Es9vMFrzaCERmJfrF4H2M9w7f1JxuxMxDPZWS9Vyhi3F: { symbol: "USDT", name: "Tether USD" },
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { symbol: "USDC", name: "USD Coin" },
    mSoLzYCxHdYgdzU2G8QxM3pJ6kWk3FQf5w6dkprdFMN: { symbol: "MSOL", name: "Marinade Staked SOL" },
    JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: { symbol: "JUP", name: "Jupiter" },
    bonkKp6f8o9D8qH4yLhM1wsm6qf6UvXzjS5yQ7fXh3N: { symbol: "BONK", name: "Bonk" }
  };

  function setupLanding() {
    const hamburgerBtn = document.getElementById("hamburgerBtn");
    const mobileMenu = document.getElementById("mobileMenu");
    const menuBackdrop = document.getElementById("menuBackdrop");
    if (!hamburgerBtn || !mobileMenu) return;

    const closeMenu = () => {
      mobileMenu.classList.remove("open");
      menuBackdrop.classList.remove("show");
      hamburgerBtn.setAttribute("aria-expanded", "false");
    };

    hamburgerBtn.addEventListener("click", () => {
      const open = mobileMenu.classList.toggle("open");
      menuBackdrop.classList.toggle("show", open);
      hamburgerBtn.setAttribute("aria-expanded", String(open));
    });

    menuBackdrop.addEventListener("click", closeMenu);
    document.querySelectorAll(".mobile-link").forEach((link) => link.addEventListener("click", closeMenu));

    const counter = document.getElementById("heroCounter");
    if (counter) {
      const start = performance.now();
      const usdTarget = 2847;
      const ngnTarget = 4271500;
      function tick(now) {
        const p = Math.min((now - start) / 1200, 1);
        const usd = (usdTarget * p).toLocaleString(undefined, { maximumFractionDigits: 0 });
        const ngn = (ngnTarget * p).toLocaleString(undefined, { maximumFractionDigits: 0 });
        counter.textContent = `$${usd} = ₦${ngn}`;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("visible")),
      { threshold: 0.2 }
    );
    document.querySelectorAll(".fade-up").forEach((el) => observer.observe(el));
  }

  function normalizeEvmTokens(rawTokens) {
    return (rawTokens || []).map((t) => {
      const decimals = Number(t.decimals || 18);
      const rawBal = Number(t.balance || 0);
      const balance = rawBal / 10 ** decimals;
      const usdValue = Number(t.usd_value || balance * Number(t.usd_price || 0));
      return {
        symbol: t.symbol,
        name: t.name,
        balance,
        usdPrice: Number(t.usd_price || 0),
        usdValue,
        change24h: (Math.random() * 14) - 7
      };
    }).filter((t) => t.balance > 0);
  }

  function normalizeEvmTxs(rawTxs, wallet, nativePriceUsd = 0, nativeSymbol = "ETH") {
    return (rawTxs || []).map((tx) => {
      const valueWei = Number(tx.value || 0);
      const valueEth = valueWei / 1e18;
      const hasNative = valueWei > 0;
      const type = String(tx.to_address || "").toLowerCase() === wallet.toLowerCase() ? "in" : "out";
      const price = Number(nativePriceUsd || 0);
      const valueEstimated = hasNative && price > 0;
      const valueUnavailable = !hasNative || price <= 0;
      const usdValue = valueEstimated ? valueEth * price : 0;
      return {
        hash: tx.hash,
        date: tx.block_timestamp,
        type,
        symbol: nativeSymbol,
        amount: valueEth,
        usdValue,
        valueUnavailable,
        valueEstimated
      };
    });
  }

  function normalizeSolTokens(solBalance, tokenAccounts, priceMap = {}) {
    const solPrice = Number(priceMap.SOL || 0);
    const list = [{
      symbol: "SOL",
      name: "Solana",
      balance: solBalance,
      usdPrice: solPrice,
      usdValue: solBalance * solPrice,
      change24h: (Math.random() * 14) - 7
    }];
    (tokenAccounts || []).forEach((acc) => {
      const info = acc?.account?.data?.parsed?.info;
      const amountInfo = info?.tokenAmount;
      const amount = Number(amountInfo?.uiAmount || 0);
      if (!amount) return;
      const mint = info?.mint || "TOKEN";
      const mintMeta = SOLANA_MINT_MAP[mint];
      const fallbackSymbol = mint.slice(0, 4).toUpperCase();
      const cleanSymbol = (amountInfo?.symbol || fallbackSymbol).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || fallbackSymbol;
      const cleanName = amountInfo?.name || mintMeta?.name || `Token ${mint.slice(0, 4)}`;
      if (mintMeta?.symbol === "SOL") return;
      const finalSymbol = mintMeta?.symbol || cleanSymbol;
      const usdPrice = Number(priceMap[finalSymbol] || 0);
      list.push({
        symbol: finalSymbol,
        name: cleanName,
        mint,
        balance: amount,
        usdPrice,
        usdValue: amount * usdPrice,
        change24h: (Math.random() * 14) - 7
      });
    });
    return list;
  }

  function normalizeSolTxs(rawTxs, wallet, solPriceUsd = 0) {
    return (rawTxs || []).map((tx) => {
      const timestamp = (tx.timestamp || Math.floor(Date.now() / 1000)) * 1000;
      const nativeTransfers = tx.nativeTransfers || [];
      const transfer = nativeTransfers[0];
      const rawLamports = transfer ? Number(transfer.amount || 0) : 0;
      const hasNative = rawLamports > 0;
      const amount = hasNative ? rawLamports / 1e9 : 0;
      const type = hasNative
        ? (String(transfer.toUserAccount || "").toLowerCase() === wallet.toLowerCase() ? "in" : "out")
        : "out";
      const price = Number(solPriceUsd || 0);
      const valueEstimated = hasNative && price > 0;
      const valueUnavailable = !hasNative || price <= 0;
      const usdValue = valueEstimated ? amount * price : 0;
      return {
        hash: tx.signature,
        date: new Date(timestamp).toISOString(),
        type,
        symbol: "SOL",
        amount,
        usdValue,
        valueUnavailable,
        valueEstimated
      };
    });
  }

  function setupTracker() {
    const form = document.getElementById("trackForm");
    if (!form) return;

    const walletInput = document.getElementById("walletInput");
    const networkSelect = document.getElementById("networkSelect");
    const inlineError = document.getElementById("inlineError");
    const demoBtn = document.getElementById("demoBtn");
    const retryBtn = document.getElementById("retryBtn");
    if (!walletInput || !networkSelect) return;
    const errorTitle = document.querySelector("#errorState h3");
    const errorBody = document.querySelector("#errorState p");

    const emptyState = document.getElementById("emptyState");
    const skeletonWrap = document.getElementById("skeletonWrap");
    const errorState = document.getElementById("errorState");
    const results = document.getElementById("results");
    const pullSpinner = document.getElementById("pullSpinner");
    const updatedTime = document.getElementById("updatedTime");

    let lastRequest = null;
    let latestPayload = null;

    const SOLANA_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    const SOLANA_FALLBACK_RE = /^(?!0x)[A-Za-z0-9]{32,44}$/;
    const EVM_RE = /^0x[0-9a-fA-F]{40}$/;

    function looksLikeSolanaAddress(raw) {
      const a = String(raw || "").trim().replace(/[\u200B-\u200D\uFEFF|]/g, "");
      if (!a || EVM_RE.test(a)) return false;
      return SOLANA_RE.test(a) || SOLANA_FALLBACK_RE.test(a);
    }

    function normalizeNetworkKey(raw) {
      const n = String(raw || "").trim().toLowerCase();
      if (n === "solana" || n === "eth" || n === "bsc" || n === "polygon") return n;
      return "";
    }

    function resolveNetwork(address, passedNetwork) {
      const fromSelect = normalizeNetworkKey(networkSelect?.value);
      const fromArg = normalizeNetworkKey(passedNetwork);
      const a = String(address || "").trim().replace(/[\u200B-\u200D\uFEFF|]/g, "");
      const looksSol = looksLikeSolanaAddress(a);
      const looksEvm = a.length > 0 && EVM_RE.test(a);

      if (looksSol && !looksEvm) return "solana";

      if (looksEvm && !looksSol) {
        if (fromSelect && ["eth", "bsc", "polygon"].includes(fromSelect)) return fromSelect;
        return "eth";
      }

      let net = fromSelect || fromArg;
      if (!net && a) {
        if (a.startsWith("0x")) net = "eth";
        else if (looksLikeSolanaAddress(a)) net = "solana";
      }
      return net || "eth";
    }

    function validateWallet(address, network) {
      const a = String(address || "").trim().replace(/[\u200B-\u200D\uFEFF|]/g, "");
      if (network === "solana") {
        return SOLANA_RE.test(a) || SOLANA_FALLBACK_RE.test(a);
      }
      if (network === "eth" || network === "bsc" || network === "polygon") return EVM_RE.test(a);
      return false;
    }

    function getAddressHint(network, address) {
      const a = String(address || "").trim();
      if (network === "solana") {
        if (EVM_RE.test(a)) {
          return "This is an EVM (0x) address. Switch the network to Ethereum, BNB Chain, or Polygon.";
        }
        return "Use a Solana address (base58, 32-44 characters).";
      }
      if (SOLANA_RE.test(a) && !EVM_RE.test(a)) {
        return "This looks like a Solana address. Switch the network to Solana, or use a 0x address for EVM.";
      }
      return "Use an EVM address starting with 0x and 42 total characters.";
    }

    function syncNetworkWithAddress(rawAddress) {
      const a = String(rawAddress || "").trim().replace(/[\u200B-\u200D\uFEFF|]/g, "");
      if (!a) return;
      if (looksLikeSolanaAddress(a)) {
        networkSelect.value = "solana";
        return;
      }
      if (EVM_RE.test(a) && networkSelect.value === "solana") {
        networkSelect.value = "eth";
      }
    }

    function setState(mode) {
      if (emptyState) emptyState.hidden = mode !== "empty";
      if (skeletonWrap) skeletonWrap.hidden = mode !== "loading";
      if (errorState) errorState.hidden = mode !== "error";
      if (results) results.hidden = mode !== "results";
    }

    async function runTrack(address, network) {
      if (inlineError) inlineError.hidden = true;
      syncNetworkWithAddress(address);
      const cleanAddress = String(address || "").trim().replace(/[\u200B-\u200D\uFEFF|]/g, "");
      if (!cleanAddress) {
        if (inlineError) {
          inlineError.hidden = true;
          inlineError.textContent = "";
        }
        return;
      }
      const resolvedNetwork = resolveNetwork(cleanAddress, network);
      lastRequest = { address: cleanAddress, network: resolvedNetwork };
      if (!validateWallet(cleanAddress, resolvedNetwork)) {
        if (inlineError) {
          inlineError.textContent = `⚠ ${getAddressHint(resolvedNetwork, cleanAddress)}`;
          inlineError.hidden = false;
        }
        return;
      }

      if (typeof window.TrackraAPI === "undefined" || typeof window.TrackraUI === "undefined") {
        if (errorTitle && errorBody) {
          errorTitle.textContent = "Scripts did not load";
          errorBody.textContent =
            "js/api.js or js/ui.js failed to load (404 or blocked). Hard-refresh (Ctrl+Shift+R). On GitHub Pages, open the site from the repo root so /js/ paths resolve.";
        }
        setState("error");
        return;
      }

      setState("loading");
      try {
        const ngnRate = await window.TrackraAPI.getNgnRate();
        let tokens = [];
        let txs = [];

        if (resolvedNetwork === "solana") {
          const [solBal, solTokens, solTxs, solPrices] = await Promise.all([
            window.TrackraAPI.fetchSolanaBalance(cleanAddress),
            window.TrackraAPI.fetchSolanaTokens(cleanAddress),
            window.TrackraAPI.fetchSolanaTransactions(cleanAddress),
            window.TrackraAPI.fetchSolanaSpotPrices()
          ]);
          tokens = normalizeSolTokens(solBal, solTokens, solPrices);
          const WSOL = "So11111111111111111111111111111111111111112";
          const mintsNeedingPrice = [];
          if (
            tokens[0] &&
            tokens[0].symbol === "SOL" &&
            Number(tokens[0].balance || 0) > 0 &&
            Number(tokens[0].usdPrice || 0) <= 0
          ) {
            mintsNeedingPrice.push(WSOL);
          }
          tokens.forEach((t) => {
            if (t.mint && Number(t.balance || 0) > 0 && Number(t.usdPrice || 0) <= 0) {
              mintsNeedingPrice.push(t.mint);
            }
          });
          const uniqueMintsToPrice = [...new Set(mintsNeedingPrice)];
          if (uniqueMintsToPrice.length && typeof window.TrackraAPI.fetchSolanaMintPrices === "function") {
            const mintPrices = await window.TrackraAPI.fetchSolanaMintPrices(uniqueMintsToPrice);
            if (tokens[0]?.symbol === "SOL") {
              const sp = Number(mintPrices[WSOL] || 0);
              if (sp > 0) {
                tokens[0] = {
                  ...tokens[0],
                  usdPrice: sp,
                  usdValue: Number(tokens[0].balance || 0) * sp
                };
              }
            }
            tokens = tokens.map((t) => {
              if (!t.mint) return t;
              const mintPrice = Number(mintPrices[t.mint] || 0);
              if (mintPrice <= 0) return t;
              return {
                ...t,
                usdPrice: mintPrice,
                usdValue: Number(t.balance || 0) * mintPrice
              };
            });
          }
          txs = normalizeSolTxs(solTxs, cleanAddress, Number(solPrices?.SOL || 0));
        } else {
          const [morTokens, morTxs, evmPrices] = await Promise.all([
            window.TrackraAPI.fetchMoralisTokens(cleanAddress, resolvedNetwork),
            window.TrackraAPI.fetchMoralisTransactions(cleanAddress, resolvedNetwork),
            window.TrackraAPI.fetchEvmNativeSpotPrices()
          ]);
          const nativeUsd = Number(evmPrices?.[resolvedNetwork] || 0);
          const nativeSymbol = resolvedNetwork === "bsc" ? "BNB" : resolvedNetwork === "polygon" ? "MATIC" : "ETH";
          tokens = normalizeEvmTokens(morTokens);
          txs = normalizeEvmTxs(morTxs, cleanAddress, nativeUsd, nativeSymbol);
        }

        const totalUsd = tokens.reduce((a, t) => a + Number(t.usdValue || 0), 0);
        const usdtUsd = tokens
          .filter((token) => String(token.symbol || "").toUpperCase() === "USDT")
          .reduce((sum, token) => sum + Number(token.usdValue || 0), 0);
        const summary = {
          totalUsd,
          usdtUsd,
          tokenCount: tokens.length,
          txCount: txs.length
        };

        latestPayload = { tokens, txs, summary, ngnRate, address: cleanAddress, network: resolvedNetwork };
        window.TrackraUI.renderSummary(summary, ngnRate);
        window.TrackraUI.renderTokens(tokens, ngnRate);
        window.TrackraUI.renderTransactions(txs, cleanAddress, ngnRate);
        if (updatedTime) updatedTime.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        setState("results");
      } catch (err) {
        console.error('[Trackra] Error:', err);
        if (errorTitle && errorBody) {
          errorTitle.textContent = "Unable to load this wallet right now";
          const fileProto = window.location.protocol === "file:";
          const detail = err && err.message ? String(err.message) : "";
          errorBody.textContent = fileProto
            ? "Browsers block live API calls from file:// pages. Run a local server (e.g. in this folder: python3 -m http.server 8080) and open http://localhost:8080/tracker.html"
            : (detail ? `${detail} If this persists, try again in a minute.` : "Network may be busy. Confirm the address and try again in a few seconds.");
        }
        setState("error");
      }
    }

    // EXPOSE GLOBALLY IMMEDIATELY
    window.trackWallet = function(address, network) {
      if (address !== undefined) walletInput.value = address || "";
      if (network) networkSelect.value = network;
      const clean = walletInput.value.trim().replace(/[\u200B-\u200D\uFEFF|]/g, "");
      if (!clean) {
        if (inlineError) {
          inlineError.textContent = "⚠ Enter a wallet address.";
          inlineError.hidden = false;
        }
        return;
      }
      syncNetworkWithAddress(walletInput.value);
      runTrack(clean, networkSelect.value);
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      window.trackWallet();
    });

    const trackBtn = document.getElementById("trackBtn");
    if (trackBtn) {
      trackBtn.addEventListener("click", (e) => {
        e.preventDefault();
        window.trackWallet();
      });
    }

    walletInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        window.trackWallet();
      }
    });

    walletInput.addEventListener("input", (e) => {
      if (inlineError) inlineError.hidden = true;
      syncNetworkWithAddress(e.target.value);
    });

    walletInput.addEventListener("paste", () => {
      requestAnimationFrame(() => syncNetworkWithAddress(walletInput.value));
    });

    walletInput.addEventListener("drop", () => {
      requestAnimationFrame(() => syncNetworkWithAddress(walletInput.value));
    });

    if (inlineError) {
      inlineError.hidden = true;
      inlineError.textContent = "";
    }

    if (demoBtn) {
      demoBtn.addEventListener("click", () => {
        walletInput.value = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
        networkSelect.value = "eth";
        window.trackWallet();
      });
    }

    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        if (!lastRequest) return;
        runTrack(lastRequest.address, lastRequest.network);
      });
    }

    const currencyToggle = document.getElementById("currencyToggle");
    if (currencyToggle) {
      currencyToggle.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-currency]");
        if (!btn || !latestPayload) return;
        currencyToggle.querySelectorAll("button[data-currency]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        window.TrackraUI.setCurrencyMode(btn.dataset.currency);
        window.TrackraUI.renderTokens(latestPayload.tokens, latestPayload.ngnRate);
        window.TrackraUI.renderTransactions(latestPayload.txs, latestPayload.address, latestPayload.ngnRate);
      });
    }

    const txFilters = document.getElementById("txFilters");
    if (txFilters) {
      txFilters.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-filter]");
        if (!btn || !latestPayload) return;
        txFilters.querySelectorAll("button[data-filter]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        window.TrackraUI.setTxFilter(btn.dataset.filter);
        window.TrackraUI.renderTransactions(latestPayload.txs, latestPayload.address, latestPayload.ngnRate);
      });
    }

    let startY = 0;
    let pulling = false;
    window.addEventListener("touchstart", (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (!pulling || !pullSpinner) return;
      const delta = e.touches[0].clientY - startY;
      if (delta > 12) pullSpinner.classList.add("show");
    }, { passive: true });

    window.addEventListener("touchend", async (e) => {
      if (!pulling) return;
      const endY = e.changedTouches[0].clientY;
      const delta = endY - startY;
      pulling = false;
      if (delta >= 80 && lastRequest) {
        await runTrack(lastRequest.address, lastRequest.network);
      }
      if (pullSpinner) pullSpinner.classList.remove("show");
    });

    networkSelect.addEventListener("change", () => {
      if (inlineError) inlineError.hidden = true;
    });
  }

  if (isLanding) {
    setupLanding();
  } else {
    setupTracker();
  }
})();

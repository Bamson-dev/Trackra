const TOKEN_COLORS = {
  ETH: "#627eea",
  BNB: "#f0b90b",
  USDT: "#26a17b",
  MATIC: "#8247e5",
  POL: "#8247e5",
  SOL: "#9945ff"
};

const uiState = {
  currencyMode: "both",
  txFilter: "all"
};

const fmt = {
  usd: (v) => `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  ngn: (v) => `₦${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
  token: (v) => Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 6 }),
  pct: (v) => `${Number(v || 0) >= 0 ? "+" : ""}${Number(v || 0).toFixed(2)}%`
};

function animateCount(el, endValue, formatter) {
  const duration = 1200;
  const start = performance.now();
  function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = formatter(endValue * p);
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function valueByMode(usd, ngn) {
  if (uiState.currencyMode === "usd") return fmt.usd(usd);
  if (uiState.currencyMode === "ngn") return fmt.ngn(ngn);
  return `${fmt.usd(usd)} · ${fmt.ngn(ngn)}`;
}

function formatTxValueHtml(tx, ngnRate) {
  if (tx.valueUnavailable) {
    return '<span class="table-unavailable">Unavailable</span>';
  }
  const usd = Number(tx.usdValue || 0);
  const ngn = usd * Number(ngnRate || 0);
  const est = tx.valueEstimated ? '<span class="tx-estimated">Est.</span> ' : "";
  const body = valueByMode(usd, ngn);
  return `${est}<span class="tx-value-amount">${body}</span>`;
}

function renderSummary(summary, ngnRate) {
  const root = document.getElementById("summaryGrid");
  root.innerHTML = "";
  const cards = [
    { label: "Total (USD)", value: summary.totalUsd, className: "", f: fmt.usd, color: "var(--green)" },
    { label: "Total (NGN)", value: summary.totalUsd * ngnRate, className: "", f: fmt.ngn, color: "var(--gold)" },
    { label: "USDT Value", value: summary.usdtUsd || 0, className: "", f: fmt.usd, color: "var(--green)" },
    { label: "Tx Count (20)", value: summary.txCount, className: "", f: (v) => Math.round(v).toString(), color: "var(--blue)" }
  ];

  cards.forEach((card) => {
    const el = document.createElement("article");
    el.className = "summary-card";
    el.innerHTML = `<p>${card.label}</p><h3></h3>`;
    el.querySelector("h3").style.color = card.color;
    root.appendChild(el);
    animateCount(el.querySelector("h3"), card.value, card.f);
  });
}

function renderTokens(tokens, ngnRate) {
  const root = document.getElementById("tokensContainer");
  const mobile = document.createElement("div");
  mobile.className = "token-list";

  tokens.forEach((t, idx) => {
    const card = document.createElement("article");
    const symbol = (t.symbol || "?").toUpperCase();
    const changeClass = Number(t.change24h || 0) >= 0 ? "pos" : "neg";
    const hasPrice = Number(t.usdPrice || 0) > 0;
    const hasValue = Number(t.usdValue || 0) > 0;
    card.className = `token-card ${symbol === "USDT" ? "usdt-highlight" : ""}`;
    card.style.animation = `fadeInUp .35s ease ${idx * 0.05}s both`;
    card.innerHTML = `
      <div class="token-row">
        <div class="token-main">
          <div class="token-dot" style="background:${TOKEN_COLORS[symbol] || '#848e9c'}">${symbol.slice(0,1)}</div>
          <div class="token-text"><strong>${symbol}</strong><small>${t.name || symbol}</small></div>
        </div>
        <span class="change-badge ${changeClass}">${fmt.pct(t.change24h || 0)}</span>
      </div>
      <div class="token-row">
        <div><strong>${fmt.token(t.balance)}</strong><div class="muted">Balance</div></div>
        <div style="text-align:right"><strong class="value-text">${valueByMode(t.usdValue, t.usdValue * ngnRate)}</strong><div class="muted">Value</div></div>
      </div>
      ${!hasPrice && !hasValue ? '<div class="price-unavailable">Price unavailable</div>' : ""}
      ${symbol === "USDT" ? '<div class="usdt-pop">Popular with Nigerian users</div>' : ""}
    `;
    mobile.appendChild(card);
  });

  const table = document.createElement("div");
  table.className = "desktop-table";
  table.innerHTML = `<table><thead><tr><th>Token</th><th>Balance</th><th>Price</th><th>Value USD</th><th>Value NGN</th><th>24h Change</th></tr></thead><tbody>${tokens
    .map(
      (t) => {
        const unavailable = Number(t.usdPrice || 0) <= 0 && Number(t.usdValue || 0) <= 0;
        const priceCell = unavailable ? '<span class="table-unavailable">Unavailable</span>' : fmt.usd(t.usdPrice);
        const usdCell = unavailable ? '<span class="table-unavailable">Unavailable</span>' : fmt.usd(t.usdValue);
        const ngnCell = unavailable ? '<span class="table-unavailable">Unavailable</span>' : fmt.ngn(t.usdValue * ngnRate);
        return `<tr class="${(t.symbol || "").toUpperCase() === "USDT" ? "usdt-highlight" : ""}"><td>${t.symbol || "-"}</td><td>${fmt.token(t.balance)}</td><td>${priceCell}</td><td>${usdCell}</td><td>${ngnCell}</td><td>${fmt.pct(t.change24h || 0)}</td></tr>`;
      }
    )
    .join("")}</tbody></table>`;

  root.innerHTML = "";
  root.append(mobile, table);
}

function renderTransactions(transactions, walletAddress, ngnRate = 1) {
  const filtered = transactions.filter((tx) => {
    if (uiState.txFilter === "all") return true;
    return (tx.type || "").toLowerCase() === uiState.txFilter;
  });

  const root = document.getElementById("transactionsContainer");
  const mobile = document.createElement("div");
  mobile.className = "tx-list";

  filtered.forEach((tx) => {
    const hash = tx.hash || "";
    const shortHash = hash ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : "n/a";
    const badgeClass = tx.type === "in" ? "badge-in" : "badge-out";
    const valueRow = formatTxValueHtml(tx, ngnRate);
    const card = document.createElement("article");
    card.className = "tx-card";
    card.innerHTML = `
      <div class="tx-row"><span class="${badgeClass}">${(tx.type || "").toUpperCase()}</span><span class="muted">${new Date(tx.date).toLocaleDateString()}</span></div>
      <div class="tx-row"><strong>${tx.symbol || "--"}</strong><strong>${fmt.token(tx.amount)}</strong></div>
      <div class="tx-row tx-value-row"><span class="muted">Value</span><div class="tx-value-wrap">${valueRow}</div></div>
      <div class="tx-row"><span class="muted">${shortHash}</span><button class="copy-btn" data-hash="${hash}" aria-label="Copy hash">⧉</button></div>
    `;
    mobile.appendChild(card);
  });

  const table = document.createElement("div");
  table.className = "desktop-table";
  table.innerHTML = `<table><thead><tr><th>Date</th><th>Type</th><th>Token</th><th>Amount</th><th>Value</th><th>Hash</th></tr></thead><tbody>${filtered
    .map(
      (tx) => `<tr><td>${new Date(tx.date).toLocaleString()}</td><td>${(tx.type || "").toUpperCase()}</td><td>${tx.symbol || "--"}</td><td>${fmt.token(tx.amount)}</td><td class="tx-value-cell">${formatTxValueHtml(tx, ngnRate)}</td><td><button class="copy-btn" data-hash="${tx.hash || ""}">${(tx.hash || "").slice(0, 6)}...${(tx.hash || "").slice(-4)}</button></td></tr>`
    )
    .join("")}</tbody></table>`;

  root.innerHTML = "";
  root.append(mobile, table);

  root.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const original = btn.textContent;
      await navigator.clipboard.writeText(btn.dataset.hash || "");
      btn.textContent = "✓";
      setTimeout(() => { btn.textContent = original; }, 2000);
    });
  });
}

function setCurrencyMode(mode) {
  uiState.currencyMode = mode;
}

function setTxFilter(mode) {
  uiState.txFilter = mode;
}

window.TrackraUI = {
  renderSummary,
  renderTokens,
  renderTransactions,
  setCurrencyMode,
  setTxFilter,
  fmt
};

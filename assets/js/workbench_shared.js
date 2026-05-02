(() => {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatInt(value) {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) return "-";
    return num.toLocaleString("en-US");
  }

  function formatMaybeNumber(value, digits = 3) {
    if (value === null || value === undefined || value === "") return "-";
    const num = Number(value);
    if (!Number.isFinite(num)) return escapeHtml(value);
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    });
  }

  function pickText(item, lang, zhKey, enKey, fallback = "-") {
    if (!item) return fallback;
    const primary = lang === "zh" ? item[zhKey] : item[enKey];
    const secondary = lang === "zh" ? item[enKey] : item[zhKey];
    const value = primary || secondary || fallback;
    return String(value);
  }

  function joinList(values, fallback = "-") {
    if (!Array.isArray(values) || !values.length) return fallback;
    return values.filter(Boolean).join(" / ");
  }

  function createTable(headers, rows, emptyText) {
    const thead = `<tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`;
    const body = rows.length
      ? rows
          .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
          .join("")
      : `<tr><td colspan="${headers.length}">${escapeHtml(emptyText)}</td></tr>`;
    return `<div class="table-wrap"><table>${thead}${body}</table></div>`;
  }

  function metricCards(items) {
    return items
      .map(
        (item) => `
        <div class="metric">
          <h3>${escapeHtml(item.label)}</h3>
          <strong>${escapeHtml(String(item.value))}</strong>
        </div>
      `,
      )
      .join("");
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.status}`);
    }
    return response.json();
  }

  function parseQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name) || "";
  }

  function updateQueryParam(name, value) {
    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set(name, value);
    } else {
      url.searchParams.delete(name);
    }
    window.history.replaceState({}, "", url);
  }

  window.World500WorkbenchShared = {
    createTable,
    escapeHtml,
    fetchJson,
    formatInt,
    formatMaybeNumber,
    joinList,
    metricCards,
    parseQueryParam,
    pickText,
    updateQueryParam,
  };
})();

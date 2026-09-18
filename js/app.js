import {
  parseCSV,
  searchUniquePokemon,
  findDetailsRows,
  shouldHighlight,
  NO_RESULT_MESSAGE,
} from "./search.js";

const CSV_URL = new URL("../pokedex_descriptions.csv", import.meta.url);

const state = {
  rows: [],
  ready: false,
  pendingSearch: false,
  searched: false,
  searchWord: "",
  mainSelected: null,
  details: [],
  activeDetailsId: "",
};

const els = {};

function $(id) {
  return document.getElementById(id);
}

function hideContextMenu() {
  els.contextMenu.classList.remove("visible");
  els.contextMenu.dataset.targetId = "";
}

function showContextMenu(event, entryId) {
  els.contextMenu.style.left = `${event.clientX}px`;
  els.contextMenu.style.top = `${event.clientY}px`;
  els.contextMenu.dataset.targetId = entryId;
  els.contextMenu.classList.add("visible");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    els.toast.hidden = true;
  }, 1400);
}

function copyText(description) {
  const done = () => {
    console.log("説明文をクリップボードにコピーしました。");
    console.log(description);
    showToast("コピーしたよ");
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(description).then(done).catch(done);
  } else {
    done();
  }
}

function copySelectedFromActive() {
  const selected = els.detailsBody.querySelector(".dex-entry.selected");
  if (!selected) return;
  copyText(selected.dataset.description ?? "");
}

function setStatus(html) {
  els.status.innerHTML = html;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function markLiteral(text, word) {
  const source = String(text);
  if (!word) return escapeHtml(source);
  const lower = source.toLowerCase();
  const needle = String(word).toLowerCase();
  if (!needle || !lower.includes(needle)) return escapeHtml(source);
  let out = "";
  let i = 0;
  while (i < source.length) {
    const hit = lower.indexOf(needle, i);
    if (hit < 0) {
      out += escapeHtml(source.slice(i));
      break;
    }
    out += escapeHtml(source.slice(i, hit));
    out += `<mark>${escapeHtml(source.slice(hit, hit + needle.length))}</mark>`;
    i = hit + needle.length;
  }
  return out;
}

function clearTree(body) {
  body.replaceChildren();
}

function addNameRow(body, name) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "tree-row single";
  row.dataset.name = name;
  row.textContent = name;
  row.addEventListener("click", () => {
    body.querySelectorAll(".tree-row.selected").forEach((el) => el.classList.remove("selected"));
    row.classList.add("selected");
    state.mainSelected = name;
    openDetails(name);
  });
  body.appendChild(row);
}

function renderIdle() {
  els.mainBody.innerHTML = `
    <div class="empty-state" id="idle-empty">
      <div class="empty-orb" aria-hidden="true"></div>
      <p class="empty-title">まだ、だれも出てきていないよ</p>
      <p class="empty-text">
        カタカナの名前か、図鑑に出てくるひらがな・漢字で探してね。<br />
        ゲームのタイトル（ファイアレッドなど）ではヒットしないよ。
      </p>
    </div>`;
}

function renderZero() {
  els.mainBody.innerHTML = `
    <div class="zero-state">
      <div class="empty-orb" aria-hidden="true"></div>
      <p class="zero-title">${escapeHtml(NO_RESULT_MESSAGE)}</p>
      <p class="zero-text">ゲーム名ではなく、図鑑の文かポケモンの名前で探してみてね。</p>
    </div>`;
}

function renderNameList(names) {
  clearTree(els.mainBody);
  state.mainSelected = null;
  if (!names.length) {
    renderZero();
    return;
  }
  for (const name of names) addNameRow(els.mainBody, name);
  els.mainBody.scrollTop = 0;
}

function runSearch() {
  if (!state.ready) {
    state.pendingSearch = true;
    return;
  }
  state.pendingSearch = false;
  const searchWord = els.entry.value;
  const result = searchUniquePokemon(state.rows, searchWord);
  if (!result.ok) {
    setStatus("その書き方では検索できないよ（正規表現として開けない）");
    return;
  }
  state.searchWord = searchWord;
  state.searched = true;
  renderNameList(result.names);
  if (!result.names.length) {
    setStatus(escapeHtml(NO_RESULT_MESSAGE));
  } else {
    setStatus(`<strong>${result.names.length}</strong> ひき みつけた！`);
  }
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.query === searchWord);
  });
}

function openDetails(pokemonName) {
  const existing = state.details.find((item) => item.name === pokemonName);
  if (existing) {
    state.activeDetailsId = existing.id;
    renderDetailsDock();
    return;
  }
  const id = `details-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const matched = findDetailsRows(state.rows, pokemonName);
  state.details.push({
    id,
    name: pokemonName,
    rows: matched,
    searchWord: state.searchWord,
  });
  state.activeDetailsId = id;
  renderDetailsDock();
}

function closeDetails(id) {
  state.details = state.details.filter((item) => item.id !== id);
  if (state.activeDetailsId === id) {
    state.activeDetailsId = state.details.at(-1)?.id ?? "";
  }
  renderDetailsDock();
}

function renderDetailsDock() {
  const dock = els.detailsDock;
  if (!state.details.length) {
    dock.hidden = true;
    els.detailTabs.replaceChildren();
    els.detailsBody.replaceChildren();
    return;
  }
  dock.hidden = false;
  els.detailTabs.replaceChildren();
  for (const item of state.details) {
    const tab = document.createElement("div");
    tab.className = `detail-tab${item.id === state.activeDetailsId ? " active" : ""}`;
    const label = document.createElement("button");
    label.type = "button";
    label.className = "tab-label";
    label.textContent = item.name;
    label.addEventListener("click", () => {
      state.activeDetailsId = item.id;
      renderDetailsDock();
    });
    const close = document.createElement("button");
    close.type = "button";
    close.className = "tab-close";
    close.setAttribute("aria-label", "閉じる");
    close.textContent = "×";
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      closeDetails(item.id);
    });
    tab.append(label, close);
    els.detailTabs.appendChild(tab);
  }

  const active = state.details.find((item) => item.id === state.activeDetailsId) ?? state.details[0];
  els.detailsBody.replaceChildren();
  if (!active.rows.length) {
    const empty = document.createElement("div");
    empty.className = "zero-state";
    empty.innerHTML = `<p class="zero-title">${escapeHtml(NO_RESULT_MESSAGE)}</p>`;
    els.detailsBody.appendChild(empty);
    return;
  }
  for (const row of active.rows) {
    appendDetailRow(els.detailsBody, row[1], row[2], shouldHighlight(row[2], active.searchWord), active.searchWord);
  }
  const firstHit = els.detailsBody.querySelector(".dex-entry.highlight");
  if (firstHit) firstHit.scrollIntoView({ block: "nearest" });
}

function appendDetailRow(body, version, description, highlight, searchWord) {
  const row = document.createElement("article");
  const entryId = `entry-${Math.random().toString(16).slice(2)}`;
  row.className = "dex-entry tree-row";
  row.id = entryId;
  if (highlight) row.classList.add("highlight");
  row.dataset.description = description;

  const v = document.createElement("div");
  v.className = "cell cell-version";
  v.textContent = version;

  const d = document.createElement("p");
  d.className = "cell cell-description";
  d.innerHTML = markLiteral(description, highlight ? searchWord : "");

  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "copy-btn";
  copy.textContent = "コピー";
  copy.addEventListener("click", (event) => {
    event.stopPropagation();
    body.querySelectorAll(".dex-entry.selected").forEach((el) => el.classList.remove("selected"));
    row.classList.add("selected");
    copyText(description);
  });

  row.append(v, d, copy);
  row.addEventListener("click", () => {
    body.querySelectorAll(".dex-entry.selected").forEach((el) => el.classList.remove("selected"));
    row.classList.add("selected");
  });
  body.appendChild(row);
}

async function loadData() {
  setStatus("図鑑をひらいています…");
  els.button.disabled = true;
  const response = await fetch(CSV_URL);
  if (!response.ok) {
    throw new Error(`CSV を読み込めませんでした (${response.status})`);
  }
  const text = await response.text();
  state.rows = parseCSV(text);
  state.ready = true;
  document.body.dataset.ready = "true";
  els.button.disabled = false;
  if (!state.searched) setStatus("ことばを入れて、Enter か「単語検索」");
  if (state.pendingSearch) runSearch();
}

function setup() {
  els.entry = $("search-entry");
  els.button = $("search-button");
  els.mainBody = $("main-tree-body");
  els.contextMenu = $("context-menu");
  els.status = $("status");
  els.detailsDock = $("details-dock");
  els.detailTabs = $("detail-tabs");
  els.detailsBody = $("details-body");
  els.toast = $("toast");

  $("search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    runSearch();
  });

  els.entry.addEventListener("keydown", (event) => {
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === "Enter") {
      event.preventDefault();
      runSearch();
    }
  });

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      els.entry.value = chip.dataset.query ?? "";
      els.entry.focus();
      runSearch();
    });
  });

  els.contextMenu.querySelector(".context-menu-item").addEventListener("click", () => {
    const id = els.contextMenu.dataset.targetId;
    const entry = document.getElementById(id);
    if (entry) copyText(entry.dataset.description ?? "");
    hideContextMenu();
  });

  els.detailsBody.addEventListener("contextmenu", (event) => {
    const entry = event.target.closest(".dex-entry");
    if (!entry) return;
    event.preventDefault();
    entry.click();
    showContextMenu(event, entry.id);
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".context-menu")) hideContextMenu();
  });
  document.addEventListener("scroll", hideContextMenu, true);
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
      if (event.target === els.entry) return;
      copySelectedFromActive();
    }
  });

  els.entry.focus();
}

setup();

loadData().catch((error) => {
  setStatus(escapeHtml(String(error.message || error)));
  els.mainBody.textContent = String(error.message || error);
});

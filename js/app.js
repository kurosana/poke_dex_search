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
  searchWord: "",
  mainSelected: null,
  zIndex: 10,
  cascade: 0,
};

const els = {};

function $(id) {
  return document.getElementById(id);
}

function bringToFront(win) {
  state.zIndex += 1;
  win.style.zIndex = String(state.zIndex);
}

function enableDrag(win, bar) {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let origLeft = 0;
  let origTop = 0;

  bar.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    if (event.target.closest(".titlebar-btn")) return;
    dragging = true;
    win.classList.add("dragging");
    bringToFront(win);
    startX = event.clientX;
    startY = event.clientY;
    const rect = win.getBoundingClientRect();
    const desktop = els.desktop.getBoundingClientRect();
    origLeft = rect.left - desktop.left + els.desktop.scrollLeft;
    origTop = rect.top - desktop.top + els.desktop.scrollTop;
    event.preventDefault();
  });

  window.addEventListener("mousemove", (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    win.style.left = `${Math.max(0, origLeft + dx)}px`;
    win.style.top = `${Math.max(0, origTop + dy)}px`;
  });

  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    win.classList.remove("dragging");
  });
}

function hideContextMenu() {
  els.contextMenu.classList.remove("visible");
  els.contextMenu.dataset.targetWindow = "";
}

function showContextMenu(event, detailsId) {
  els.contextMenu.style.left = `${event.clientX}px`;
  els.contextMenu.style.top = `${event.clientY}px`;
  els.contextMenu.dataset.targetWindow = detailsId;
  els.contextMenu.classList.add("visible");
}

function copyDescriptionFrom(detailsWin) {
  if (!detailsWin) return;
  const selected = detailsWin.querySelector(".tree-row.selected");
  if (!selected) return;
  const description = selected.dataset.description ?? "";
  const done = () => {
    console.log("説明文をクリップボードにコピーしました。");
    console.log(description);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(description).then(done).catch(done);
  } else {
    done();
  }
}

function clearTree(body) {
  body.replaceChildren();
}

function addNameRow(body, name, selectable) {
  const row = document.createElement("div");
  row.className = "tree-row single";
  row.dataset.name = name;
  const cell = document.createElement("div");
  cell.className = "cell cell-name";
  cell.textContent = name;
  row.appendChild(cell);
  if (selectable) {
    row.addEventListener("click", () => {
      body.querySelectorAll(".tree-row.selected").forEach((el) => el.classList.remove("selected"));
      row.classList.add("selected");
      state.mainSelected = name;
    });
    row.addEventListener("dblclick", () => {
      body.querySelectorAll(".tree-row.selected").forEach((el) => el.classList.remove("selected"));
      row.classList.add("selected");
      state.mainSelected = name;
      openDetails(name);
    });
  }
  body.appendChild(row);
}

function renderNameList(names) {
  const body = els.mainBody;
  clearTree(body);
  state.mainSelected = null;
  if (!names.length) {
    addNameRow(body, NO_RESULT_MESSAGE, true);
    return;
  }
  for (const name of names) {
    addNameRow(body, name, true);
  }
  body.scrollTop = 0;
}

function runSearch() {
  if (!state.ready) return;
  const searchWord = els.entry.value;
  const result = searchUniquePokemon(state.rows, searchWord);
  if (!result.ok) return;
  state.searchWord = searchWord;
  renderNameList(result.names);
}

function openDetails(pokemonName) {
  const detailsId = `details-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const win = document.createElement("div");
  win.className = "tk-window details";
  win.id = detailsId;
  win.tabIndex = -1;

  const offset = 48 + (state.cascade % 6) * 28;
  state.cascade += 1;
  win.style.left = `${offset + 80}px`;
  win.style.top = `${offset}px`;

  win.innerHTML = `
    <div class="titlebar">
      <div class="titlebar-title">${escapeHtml(pokemonName)} の詳細</div>
      <div class="titlebar-buttons">
        <button type="button" class="titlebar-btn close" aria-label="閉じる">×</button>
      </div>
    </div>
    <div class="tk-client">
      <div class="tree-wrap">
        <div class="tree">
          <div class="tree-heading">
            <span class="col-version">バージョン</span>
            <span class="col-description">説明</span>
          </div>
          <div class="tree-body"></div>
        </div>
      </div>
    </div>
  `;

  els.desktop.appendChild(win);
  bringToFront(win);
  enableDrag(win, win.querySelector(".titlebar"));
  win.querySelector(".titlebar-btn.close").addEventListener("click", () => {
    hideContextMenu();
    win.remove();
  });
  win.addEventListener("mousedown", () => {
    bringToFront(win);
    win.focus();
  });

  const body = win.querySelector(".tree-body");
  const matched = findDetailsRows(state.rows, pokemonName);
  if (!matched.length) {
    appendDetailRow(body, "", NO_RESULT_MESSAGE, false);
  } else {
    for (const row of matched) {
      appendDetailRow(
        body,
        row[1],
        row[2],
        shouldHighlight(row[2], state.searchWord)
      );
    }
  }

  win.addEventListener("contextmenu", (event) => {
    if (!event.target.closest(".tree-body")) return;
    event.preventDefault();
    showContextMenu(event, detailsId);
  });

  win.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
      copyDescriptionFrom(win);
    }
  });

  win.focus();
}

function appendDetailRow(body, version, description, highlight) {
  const row = document.createElement("div");
  row.className = "tree-row";
  if (highlight) row.classList.add("highlight");
  row.dataset.description = description;

  const v = document.createElement("div");
  v.className = "cell cell-version";
  v.textContent = version;

  const d = document.createElement("div");
  d.className = "cell cell-description";
  d.textContent = description;

  row.appendChild(v);
  row.appendChild(d);

  row.addEventListener("click", () => {
    body.querySelectorAll(".tree-row.selected").forEach((el) => el.classList.remove("selected"));
    row.classList.add("selected");
  });

  body.appendChild(row);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function loadData() {
  const response = await fetch(CSV_URL);
  if (!response.ok) {
    throw new Error(`CSV を読み込めませんでした (${response.status})`);
  }
  const text = await response.text();
  state.rows = parseCSV(text);
  state.ready = true;
}

function setup() {
  els.desktop = $("desktop");
  els.mainWindow = $("main-window");
  els.entry = $("search-entry");
  els.button = $("search-button");
  els.mainBody = $("main-tree-body");
  els.contextMenu = $("context-menu");

  enableDrag(els.mainWindow, $("main-titlebar"));
  bringToFront(els.mainWindow);

  els.button.addEventListener("click", runSearch);
  els.entry.addEventListener("keydown", (event) => {
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === "Enter") {
      event.preventDefault();
      runSearch();
    }
  });

  $("main-close").addEventListener("click", () => {
    els.mainWindow.classList.add("hidden");
  });

  els.contextMenu.querySelector(".context-menu-item").addEventListener("click", () => {
    const id = els.contextMenu.dataset.targetWindow;
    copyDescriptionFrom(document.getElementById(id));
    hideContextMenu();
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".context-menu")) hideContextMenu();
  });
  document.addEventListener("scroll", hideContextMenu, true);

  els.entry.focus();
}

setup();

loadData().catch((error) => {
  clearTree(els.mainBody);
  addNameRow(els.mainBody, String(error.message || error), false);
});

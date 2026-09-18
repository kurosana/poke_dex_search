/**
 * pandas.Series.str.contains(pattern, case=False) 相当の検索。
 * 既定は正規表現・大文字小文字無視・部分一致（re.search）。
 */

export function parseCSV(text) {
  const normalized = String(text).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const first = line.indexOf(",");
    const second = line.indexOf(",", first + 1);
    if (first < 0 || second < 0) continue;
    rows.push([
      line.slice(0, first),
      line.slice(first + 1, second),
      line.slice(second + 1),
    ]);
  }
  return rows;
}

export function compileSearch(pattern) {
  try {
    return { ok: true, regex: new RegExp(pattern, "i") };
  } catch {
    return { ok: false, regex: null };
  }
}

export function searchUniquePokemon(rows, searchWord) {
  const compiled = compileSearch(searchWord);
  if (!compiled.ok) {
    return { ok: false, names: null };
  }
  const names = [];
  const seen = new Set();
  const re = compiled.regex;
  for (const row of rows) {
    re.lastIndex = 0;
    const nameHit = re.test(row[0]);
    re.lastIndex = 0;
    const descHit = re.test(row[2]);
    if (nameHit || descHit) {
      if (!seen.has(row[0])) {
        seen.add(row[0]);
        names.push(row[0]);
      }
    }
  }
  return { ok: true, names };
}

export function findDetailsRows(rows, pokemonName) {
  const compiled = compileSearch(pokemonName);
  if (!compiled.ok) return [];
  const re = compiled.regex;
  const matched = [];
  for (const row of rows) {
    re.lastIndex = 0;
    if (re.test(row[0])) matched.push(row);
  }
  return matched;
}

export function shouldHighlight(description, searchWord) {
  if (searchWord == null) return false;
  return String(description).toLowerCase().includes(String(searchWord).toLowerCase());
}

export const NO_RESULT_MESSAGE = "該当するデータは見つかりませんでした。";

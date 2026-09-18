import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseCSV,
  searchUniquePokemon,
  findDetailsRows,
  shouldHighlight,
  NO_RESULT_MESSAGE,
} from "../js/search.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const csv = readFileSync(join(root, "pokedex_descriptions.csv"), "utf8");
const rows = parseCSV(csv);

let failed = 0;
function assert(cond, message) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", message);
  } else {
    console.log("ok:", message);
  }
}

assert(rows.length === 28008, `row count ${rows.length}`);
assert(rows[0][0] === "フシギダネ", "first pokemon");
assert(rows[0][2].startsWith(" "), "description keeps leading space");

const empty = searchUniquePokemon(rows, "");
assert(empty.ok && empty.names.length === 1021, `empty search ${empty.names.length}`);
assert(empty.names[0] === "フシギダネ", "empty search starts with フシギダネ");

const pika = searchUniquePokemon(rows, "ピカチュウ");
assert(
  JSON.stringify(pika.names) === JSON.stringify(["ピカチュウ", "ライチュウ", "パチリス", "ミミッキュ"]),
  `ピカチュウ names ${pika.names}`
);

const hiraPika = searchUniquePokemon(rows, "ぴかちゅう");
assert(hiraPika.ok && hiraPika.names.length === 0, "hiragana pikachu is 0");

const denki = searchUniquePokemon(rows, "でんき");
assert(denki.names.length === 49, `でんき ${denki.names.length}`);
assert(denki.names[0] === "ピカチュウ", "でんき starts with ピカチュウ");

const kanji = searchUniquePokemon(rows, "電気");
assert(kanji.names.length === 55, `電気 ${kanji.names.length}`);

const tane = searchUniquePokemon(rows, "たね");
assert(tane.names.length === 81, `たね ${tane.names.length}`);
assert(
  JSON.stringify(tane.names.slice(0, 4)) === JSON.stringify(["フシギダネ", "フシギバナ", "アーボック", "ピッピ"]),
  `たね order ${tane.names.slice(0, 4)}`
);

const fire = searchUniquePokemon(rows, "ファイアレッド");
assert(fire.names.length === 0, "game title is not searched");

const fushigi = searchUniquePokemon(rows, "フシギ");
assert(
  JSON.stringify(fushigi.names) === JSON.stringify(["フシギダネ", "フシギソウ", "フシギバナ"]),
  `フシギ ${fushigi.names}`
);

const dot = searchUniquePokemon(rows, ".");
assert(dot.names.length === 1021, "dot regex matches all");

const broken = searchUniquePokemon(rows, "(");
assert(!broken.ok && broken.names === null, "invalid regex does not update");

const lizard = findDetailsRows(rows, "リザード");
const lizardNames = [...new Set(lizard.map((r) => r[0]))];
assert(
  JSON.stringify(lizardNames) === JSON.stringify(["リザード", "リザードン"]),
  `details リザード ${lizardNames}`
);

const mew = findDetailsRows(rows, "ミュウ");
const mewNames = [...new Set(mew.map((r) => r[0]))];
assert(
  JSON.stringify(mewNames) === JSON.stringify(["ミュウツー", "ミュウ"]),
  `details ミュウ ${mewNames}`
);

const raichu = findDetailsRows(rows, "ライチュウ");
const highlighted = raichu.filter((r) => shouldHighlight(r[2], "ピカチュウ"));
assert(highlighted.length === 2, `ライチュウ highlight ${highlighted.length}`);
assert(shouldHighlight("abc", ""), "empty search highlights all");
assert(!shouldHighlight("でんきの ポケモン", "."), "highlight is literal not regex");
assert(NO_RESULT_MESSAGE.includes("見つかりませんでした"), "no-result message");

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall tests passed");

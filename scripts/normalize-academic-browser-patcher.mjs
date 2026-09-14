import fs from "fs";
const path = "scripts/patch-academic-browser.mjs";
let source = fs.readFileSync(path, "utf8");
source = source.replaceAll("String.raw`", "`");
fs.writeFileSync(path, source);

#!/usr/bin/env node
"use strict";

var path = require("path");
var fs = require("fs");
var os = require("os");
var cli = require("../pack-cli.js");

var fails = 0;
function assert(name, cond) {
  if (cond) {
    console.log("ok  " + name);
    return;
  }
  fails += 1;
  console.log("FAIL  " + name);
}

function capture(argv) {
  var saved = process.stdout.write;
  var out = "";
  process.stdout.write = function (chunk) {
    out += chunk;
    return true;
  };
  var code;
  try {
    code = cli.main(argv);
  } finally {
    process.stdout.write = saved;
  }
  return { code: code, out: out };
}

var fixtures = path.join(__dirname, "fixtures");
var changelog = path.join(fixtures, "CHANGELOG.md");
var gitlog = path.join(fixtures, "git-log.txt");
var date = "2026-08-16";

var fromNotes = capture([
  "--product", "AcmeBoard",
  "--version", "v1.8.0",
  "--date", date,
  "--tone", "technical",
  "--git-log", changelog
]);
assert("changelog fixture exits 0", fromNotes.code === 0);
assert("changelog has five channels",
  /## Changelog/.test(fromNotes.out) &&
  /## Customer email/.test(fromNotes.out) &&
  /## Social posts/.test(fromNotes.out) &&
  /## GitHub Release body/.test(fromNotes.out) &&
  /## Discord \/ Slack/.test(fromNotes.out)
);
assert("changelog keeps Features", /### Features/.test(fromNotes.out));
assert("changelog keeps Fixes", /### Fixes/.test(fromNotes.out));
assert("changelog skips Chores heading", !/### Chores/.test(fromNotes.out));
assert("changelog skips bump lodash", !/bump lodash/i.test(fromNotes.out));
assert("changelog keeps CSV export", /CSV export/i.test(fromNotes.out));
assert("changelog ignores previous version", !/Offline mobile/i.test(fromNotes.out));

var fromLog = capture([
  "--product", "jsonc-lint",
  "--version", "v0.9.0",
  "--date", date,
  "--tone", "technical",
  "--git-log", gitlog
]);
assert("git-log fixture exits 0", fromLog.code === 0);
assert("git-log has five channels",
  /## Changelog/.test(fromLog.out) &&
  /## Customer email/.test(fromLog.out) &&
  /## Social posts/.test(fromLog.out) &&
  /## GitHub Release body/.test(fromLog.out) &&
  /## Discord \/ Slack/.test(fromLog.out)
);
assert("git-log keeps trailing commas", /trailing commas/i.test(fromLog.out));
assert("git-log drops chore bump", !/bump lodash/i.test(fromLog.out));
assert("git-log drops merge", !/merge branch/i.test(fromLog.out));

var tmp = path.join(os.tmpdir(), "shipnote-action-empty.txt");
fs.writeFileSync(tmp, "chore: only noise\n");
var empty = capture([
  "--product", "noise",
  "--version", "v0.0.1",
  "--date", date,
  "--git-log", tmp
]);
assert("all-noise git log is non-zero", empty.code !== 0);

if (fails) {
  console.log(fails + " failed");
  process.exit(1);
}
console.log("action fixture tests ok");

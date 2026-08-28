#!/usr/bin/env node
/* ShipNote pack CLI — Node, no deps.
 * Reads bullets or a git log, prints the five-channel pack.
 * Used by the copy-paste GitHub Action on the customer's runner.
 */
"use strict";

var fs = require("fs");
var path = require("path");
var pack = require(path.join(__dirname, "pack-core.js"));
var dump = require(path.join(__dirname, "commit-dump.js"));

function usage() {
  return [
    "Usage: node pack-cli.js [options]",
    "",
    "  --product NAME     Product name (default: repo folder or 'Release')",
    "  --version VER      Version or tag (e.g. v1.4.0)",
    "  --date YYYY-MM-DD  Release date (default: today UTC)",
    "  --tone TONE        neutral | technical | friendly (default: technical)",
    "  --git-log FILE     git log / --oneline / CHANGELOG.md to convert",
    "  --bullets FILE     already-bulleted notes (one per line)",
    "  --json             print pack JSON instead of markdown",
    "  --channel NAME     markdown of one channel: changelog|email|social|github|chat|full",
    "",
    "If neither --git-log nor --bullets is set, read stdin.",
    "Does not invent features. Does not send your log anywhere."
  ].join("\n");
}

function argValue(argv, name) {
  var i = argv.indexOf(name);
  if (i === -1) return "";
  return argv[i + 1] || "";
}

function todayUtc() {
  var d = new Date();
  var m = String(d.getUTCMonth() + 1).padStart(2, "0");
  var day = String(d.getUTCDate()).padStart(2, "0");
  return d.getUTCFullYear() + "-" + m + "-" + day;
}

function readInput(file) {
  if (!file || file === "-") {
    return fs.readFileSync(0, "utf8");
  }
  return fs.readFileSync(file, "utf8");
}

function main(argv) {
  if (argv.indexOf("-h") !== -1 || argv.indexOf("--help") !== -1) {
    process.stdout.write(usage() + "\n");
    return 0;
  }
  var product = argValue(argv, "--product") || "Release";
  var version = argValue(argv, "--version");
  var dateIso = argValue(argv, "--date") || todayUtc();
  var tone = argValue(argv, "--tone") || "technical";
  if (["neutral", "technical", "friendly"].indexOf(tone) === -1) {
    process.stderr.write("unknown --tone (use neutral, technical, or friendly)\n");
    return 2;
  }
  var gitLog = argValue(argv, "--git-log");
  var bulletsFile = argValue(argv, "--bullets");
  var asJson = argv.indexOf("--json") !== -1;
  var channel = argValue(argv, "--channel") || "full";
  var channels = { changelog: "changelog", email: "email", social: "social", github: "github", chat: "chat", full: "fullMarkdown" };
  if (!channels[channel]) {
    process.stderr.write("unknown --channel (use changelog, email, social, github, chat, full)\n");
    return 2;
  }

  var raw;
  var bullets;
  var groups = null;
  if (gitLog) {
    raw = readInput(gitLog);
    var converted = dump.commitDumpToBullets(raw);
    bullets = converted.bullets || [];
    groups = converted.groups || null;
    if (!version && converted.version) version = converted.version;
  } else if (bulletsFile) {
    raw = readInput(bulletsFile);
    bullets = pack.parseBullets(raw);
  } else if (!process.stdin.isTTY) {
    raw = readInput("-");
    if (dump.looksLikeDump(raw)) {
      var fromDump = dump.commitDumpToBullets(raw);
      bullets = fromDump.bullets || [];
      groups = fromDump.groups || null;
      if (!version && fromDump.version) version = fromDump.version;
    } else {
      bullets = pack.parseBullets(raw);
    }
  } else {
    process.stderr.write(usage() + "\n");
    return 2;
  }

  if (!bullets.length) {
    process.stderr.write("No release bullets after dropping chore/merge noise.\n");
    return 1;
  }

  var result = pack.buildPack(product, version, dateIso, bullets, tone, "", null, groups);
  if (asJson) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    var out = result[channels[channel]] || "";
    process.stdout.write(out);
    if (out.slice(-1) !== "\n") process.stdout.write("\n");
  }
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (err) {
    process.stderr.write(String(err && err.message ? err.message : err) + "\n");
    process.exit(1);
  }
}

module.exports = { main: main };

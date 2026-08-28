/* ShipNote commit-dump parser — browser + Node.
 * Turns a pasted git log / GitHub compare dump into release bullets.
 * Client-side only. Does not invent features.
 */
(function (root) {
  "use strict";

  var COMMIT_HEADER = /^commit\s+([0-9a-f]{7,40})\b/i;
  var ONELINE = /^[0-9a-f]{7,40}\s+(\S.*)$/i;
  var HASH_ONLY = /^[0-9a-f]{7,40}$/i;
  var COMMIT_SPLIT = /(?=^commit\s+[0-9a-f]{7,})/im;
  var CONVENTIONAL = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|hotfix|bugfix)(\([^)]+\))?!?:\s*/i;
  var DROP_TYPE = /^(chore|test|ci|build|style|wip)(\(|:|!|\b)/i;
  var DROP_SUBJECT = /^(merge (branch|remote|pull|commit)|rebase\b|reword\b|squash\b|bump (deps|dependencies|lockfile|go|golang|node|python|ruby|java|actions?|workflows?)|bumped deps|bump deps|address(ed|ing)? review\b|reconcile\b|update agents\.md\b|wip\b|fmt( only)?$|lint( only)?$|internal[:\s]|todo:|fixme:|hack:)/i;
  var SKIP_LINE = /^(author:|date:|commit:|signed-off-by:|co-authored-by:|change-id:|reviewed-by:|commits on\b|committed\b|verified\b)/i;
  var TAG_RE = /\btag:\s*(v?\d+\.\d+(?:\.\d+)?)\b/i;
  var PAREN_TAG = /\((?:tag:\s*)?(v?\d+\.\d+(?:\.\d+)?)\)/;
  var CHANGELOG_HEAD = /^(#{1,3})\s*\[?(v?\d+\.\d+(?:\.\d+)?)\]?(?:\s+[-–—].*)?$/;
  var CHANGELOG_GROUP = /^(added|changed|fixed|removed|deprecated|security|features?|fixes|bug fixes|breaking)/i;
  var CHANGELOG_DIFF = /^\[(diff|compare|full changelog)\]/i;

  function changelogGroupHeading(title) {
    var t = String(title || "")
      .toLowerCase()
      .replace(/:$/, "")
      .trim();
    if (/^added$|^features?$/.test(t)) return "Features";
    if (/^fixed$|^fixes$|^bug fixes$/.test(t)) return "Fixes";
    if (/^security$/.test(t)) return "Security";
    if (/^breaking/.test(t)) return "Breaking changes";
    if (/^changed$|^changes$/.test(t)) return "Changes";
    if (/^removed$/.test(t)) return "Removed";
    if (/^deprecated$/.test(t)) return "Deprecated";
    return "";
  }

  function splitLines(text) {
    return String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  }

  function stripPrefix(subject) {
    return subject.replace(CONVENTIONAL, "").trim();
  }

  function shouldDrop(subject) {
    if (!subject) return true;
    if (DROP_TYPE.test(subject)) return true;
    if (DROP_SUBJECT.test(subject)) return true;
    if (/^merge pull request/i.test(subject)) return true;
    return false;
  }

  function cleanSubject(raw) {
    var s = String(raw || "").trim();
    s = s.replace(/^[-*•]\s+/, "");
    s = s.replace(/^\d+[.)]\s+/, "");
    var oneline = s.match(ONELINE);
    if (oneline) s = oneline[1].trim();
    s = s.replace(/^["'`]+|["'`]+$/g, "");
    s = s.replace(/\s+/g, " ").trim();
    return s;
  }

  function parseFullGitLog(text) {
    var chunks = String(text).split(COMMIT_SPLIT);
    var subjects = [];
    var version = "";
    chunks.forEach(function (chunk) {
      if (!COMMIT_HEADER.test(chunk.trim())) return;
      var tag = chunk.match(TAG_RE) || chunk.match(PAREN_TAG);
      if (tag && !version) version = tag[1];
      var lines = splitLines(chunk);
      var bodyStart = -1;
      for (var i = 1; i < lines.length; i++) {
        if (lines[i].trim() === "") {
          bodyStart = i + 1;
          break;
        }
      }
      if (bodyStart < 0) return;
      var subject = "";
      for (var j = bodyStart; j < lines.length; j++) {
        var line = lines[j].replace(/^\s{4}/, "").trim();
        if (!line) {
          if (subject) break;
          continue;
        }
        if (SKIP_LINE.test(line)) continue;
        subject = cleanSubject(line);
        break;
      }
      if (subject) subjects.push(subject);
    });
    return { subjects: subjects, version: version };
  }

  function parseLooseLines(text) {
    var subjects = [];
    var version = "";
    splitLines(text).forEach(function (raw) {
      var line = raw.trim();
      if (!line) return;
      if (HASH_ONLY.test(line)) return;
      if (SKIP_LINE.test(line)) return;
      if (COMMIT_HEADER.test(line)) {
        var tag = line.match(PAREN_TAG);
        if (tag && !version) version = tag[1];
        return;
      }
      var cleaned = cleanSubject(line);
      if (!cleaned) return;
      if (cleaned.length < 4) return;
      subjects.push(cleaned);
    });
    return { subjects: subjects, version: version };
  }

  function parseChangelog(text) {
    var lines = splitLines(text);
    var subjects = [];
    var version = "";
    var inSection = false;
    var sectionLevel = 0;
    var inFence = false;
    var groups = [];
    var currentGroup = null;
    var sawNamedGroup = false;
    var skipGroup = false;

    function isSkippedChangelogHeading(title) {
      var t = String(title || "")
        .toLowerCase()
        .replace(/:$/, "")
        .trim();
      return /^(chores?|docs?|documentation|internal|maintenance|dependencies|deps|ci|tests?|misc|meta)$/.test(t);
    }

    function pushNote(note) {
      if (skipGroup) return;
      var cleaned = cleanSubject(note);
      if (!cleaned) return;
      subjects.push(cleaned);
      if (currentGroup) currentGroup.bullets.push(cleaned);
    }

    lines.forEach(function (raw) {
      var line = raw.trim();
      if (/^```/.test(line)) {
        inFence = !inFence;
        return;
      }
      if (inFence || !line) return;
      if (/^<!--/.test(line) || CHANGELOG_DIFF.test(line)) return;
      var head = line.match(CHANGELOG_HEAD);
      if (head) {
        if (!inSection) {
          inSection = true;
          sectionLevel = head[1].length;
          version = version || head[2];
          return;
        }
        if (head[1].length <= sectionLevel) {
          inSection = false;
          currentGroup = null;
          skipGroup = false;
        }
        return;
      }
      if (!inSection) return;
      if (/^#{1,6}\s/.test(line)) {
        var title = line.replace(/^#{1,6}\s+/, "");
        title = title.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
        title = title.replace(/\s+\([^)]*#\d+[^)]*\)/g, "");
        title = cleanSubject(title);
        if (!title) return;
        var named = changelogGroupHeading(title);
        if (named) {
          skipGroup = false;
          sawNamedGroup = true;
          currentGroup = { heading: named, bullets: [] };
          groups.push(currentGroup);
          return;
        }
        if (isSkippedChangelogHeading(title)) {
          skipGroup = true;
          currentGroup = null;
          return;
        }
        if (/:$/.test(title)) return;
        pushNote(title);
        return;
      }
      if (/^keep a changelog/i.test(line)) return;
      if (/^\d+[.)]\s/.test(line)) return;
      pushNote(line);
    });

    if (!sawNamedGroup && subjects.length) {
      groups = [{ heading: "Features", bullets: subjects.slice() }];
    }
    return { subjects: subjects, version: version, groups: groups };
  }

  function looksLikeChangelog(text) {
    var raw = String(text || "");
    if (raw.trim().length < 20) return false;
    var heads = 0;
    var bullets = 0;
    var h4 = 0;
    splitLines(raw).forEach(function (line) {
      var t = line.trim();
      if (CHANGELOG_HEAD.test(t)) heads += 1;
      if (/^[-*+]\s+\S/.test(t)) bullets += 1;
      if (/^#{4,6}\s+\S/.test(t)) h4 += 1;
    });
    if (heads >= 1 && bullets >= 2) return true;
    if (heads >= 1 && h4 >= 2) return true;
    if (/^#(\s+)?changelog\b/im.test(raw) && bullets >= 3) return true;
    return false;
  }

  function looksLikeCommitDump(text) {
    var raw = String(text || "");
    if (raw.trim().length < 20) return false;
    var lines = splitLines(raw).map(function (l) { return l.trim(); }).filter(Boolean);
    if (lines.length < 2) return false;

    var commitHeaders = 0;
    var onelines = 0;
    var conventionals = 0;
    var alreadyBullets = 0;
    lines.forEach(function (line) {
      if (COMMIT_HEADER.test(line)) commitHeaders += 1;
      else if (ONELINE.test(line)) onelines += 1;
      if (CONVENTIONAL.test(cleanSubject(line))) conventionals += 1;
      if (/^[-*•]\s+\S/.test(line) && !ONELINE.test(line.replace(/^[-*•]\s+/, ""))) alreadyBullets += 1;
    });

    if (commitHeaders >= 1 && /^(Author|Date):/m.test(raw)) return true;
    if (commitHeaders >= 2) return true;
    if (onelines >= 2) return true;
    if (conventionals >= 3 && alreadyBullets < conventionals) return true;
    return false;
  }

  function uniqueSubjects(subjects) {
    var seen = Object.create(null);
    var out = [];
    subjects.forEach(function (raw) {
      var subject = stripPrefix(raw);
      if (shouldDrop(raw) || shouldDrop(subject)) return;
      if (!subject || subject.length < 4) return;
      var key = subject.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(subject);
    });
    return out;
  }

  function looksLikeDump(text) {
    return looksLikeChangelog(text) || looksLikeCommitDump(text);
  }

  function commitDumpToBullets(text) {
    var raw = String(text || "");
    var parsed;
    if (looksLikeChangelog(raw) && !looksLikeCommitDump(raw)) {
      parsed = parseChangelog(raw);
    } else if (COMMIT_HEADER.test(raw) && /^(Author|Date):/m.test(raw)) {
      parsed = parseFullGitLog(raw);
    } else {
      parsed = parseLooseLines(raw);
    }
    var bullets = uniqueSubjects(parsed.subjects);
    var groups = (parsed.groups || [])
      .map(function (g) {
        return { heading: g.heading, bullets: uniqueSubjects(g.bullets || []) };
      })
      .filter(function (g) {
        return g.heading && g.bullets.length;
      });
    return {
      bullets: bullets,
      version: parsed.version || "",
      dropped: Math.max(0, parsed.subjects.length - bullets.length),
      groups: groups
    };
  }

  function toTextarea(result) {
    return (result.bullets || []).map(function (b) { return "- " + b; }).join("\n");
  }

  var api = {
    looksLikeCommitDump: looksLikeCommitDump,
    looksLikeChangelog: looksLikeChangelog,
    looksLikeDump: looksLikeDump,
    commitDumpToBullets: commitDumpToBullets,
    toTextarea: toTextarea
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.ShipNoteCommitDump = api;
})(typeof window !== "undefined" ? window : globalThis);

/* ShipNote pack-core — browser + Node.
 * parseBullets → polishBullet → buildPack. One implementation for the
 * website and the copy-paste GitHub Action. Does not invent features.
 */
(function (root) {
  "use strict";

function parseBullets(raw) {
  return raw
    .split(/\r?\n/)
    .map(function (line) {
      return line.replace(/^\s*[-*•]\s*/, "").replace(/^\s*\d+[.)]\s*/, "").trim();
    })
    .filter(function (line) {
      if (!line) return false;
      // Drop pure internal noise lines from free sample quality
      if (/^(bumped deps|bump deps|chore:|wip\b)/i.test(line)) return false;
      if (/^internal[:\s]/i.test(line)) return false;
      if (/^(todo|fixme|hack):\s*/i.test(line)) return false;
      if (/^(merge branch|merge remote|merge pull)/i.test(line)) return false;
      if (/^(rebase|reword|squash)\b/i.test(line)) return false;
      if (/^(npm|pnpm|yarn|pip|cargo|go) (install|update|lock)/i.test(line)) return false;
      if (/^update (package-lock|yarn\.lock|pnpm-lock|Cargo\.lock)/i.test(line)) return false;
      if (/^bump (deps|dependencies|lockfile)\b/i.test(line)) return false;
      if (/^fmt( only)?$/i.test(line)) return false;
      if (/^lint( only)?$/i.test(line)) return false;
      return true;
    });
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function polishBullet(line) {
  var t = line.replace(/\s+/g, " ").replace(/\.$/, "").trim();
  // Strip common git / PR prefixes before canned matches
  t = t.replace(/^(feat|fix|chore|docs|perf|refactor|style|test)(\([^)]*\))?:\s*/i, "");
  // Keep Add/Fix when the rest is a flag or code span (gh --worktree, `RESTWithNext`).
  t = t.replace(/^(fix|fixed|fixes)\s+(?!`|--)/i, "");
  t = t.replace(/^(add|added|adds)\s+(?!`|--)/i, "");
  t = t.replace(/^(improve|improved|improves)\s+(?!`|--)/i, "");
  t = t.replace(/^(update|updated|updates)\s+(?!`|--)/i, "");
  t = t.replace(/\s+by\s+@[\w-]+(?:\[bot\])?(?:\s+in\s+\S+)?$/i, "");
  t = t.replace(/\s+\(#\d+\)$/g, "");

  // Longer phrases first so prefixes do not double up
  var canned = [
    [/^(export\s+)?timeout(s)? on big csvs$/i, "CSV exports no longer time out on large workspaces"],
    [/^export timeout(s)?$/i, "Exports are more reliable on large files"],
    [/^subject line invoice bug showed wrong plan$/i, "Invoice email subjects now show the correct plan name"],
    [/^subject line invoice bug$/i, "Invoice email subjects now include the plan name"],
    [/^invoice (subject|email).*(wrong|bug|plan)/i, "Invoice email subjects now show the correct plan name"],
    [/^parse trailing commas in nested objects$/i, "Nested objects can include trailing commas"],
    [/^false positive on template strings$/i, "Template strings no longer trigger false positives"],
    [/^faster walk for large monorepos$/i, "Large monorepos walk faster"],
    [/^cli examples for ci$/i, "Docs now include CLI examples for CI"],
    [/^crash when rename project during sync$/i, "Fixed a rare crash when renaming a project mid-sync"],
    [/^rename project during sync$/i, "Fixed a rare crash when renaming a project mid-sync"],
    [/^dark mode toggle( to settings)?$/i, "Added a dark mode toggle in settings"],
    [/^add dark mode( toggle)?( to settings)?$/i, "Added a dark mode toggle in settings"],
    [/^offline mode for mobile$/i, "Mobile can work offline"],
    [/^comments disappear after refresh$/i, "Fixed comments that disappeared after a refresh"],
    [/^dashboard loads 2x faster$/i, "Dashboard loads about twice as fast"],
    [/^dashboard loads ~?2× faster$/i, "Dashboard loads about twice as fast"],
    [/^team invites with role picker$/i, "Team invites now include a role picker"],
    // Common real PR paste patterns (quality pass 2026-08-05 / 05b)
    [/^npe (when|on|if) /i, "Fixed a null-pointer crash when "],
    [/^null( ?pointer)? (exception|error|crash) (when|on|if) /i, "Fixed a null-pointer crash when "],
    [/^memory leak in /i, "Fixed a memory leak in "],
    [/^race condition (in|on|when) /i, "Fixed a race condition "],
    [/^typo in /i, "Fixed a typo in "],
    [/^404 on /i, "Fixed a missing page for "],
    [/^broken link(s)? (to|for|in) /i, "Fixed broken links "],
    [/^slow (query|queries) (on|for) /i, "Sped up queries for "],
    [/^pagination (broken|bug|issue)/i, "Fixed broken pagination"],
    [/^webhook(s)? (retry|retries|failed|failing)/i, "Webhooks retry more reliably after failures"],
    [/^rate limit(ing)? (on|for) /i, "Clearer rate limits for "],
    [/^sso (login|sign-?in) (fail|broken|bug)/i, "SSO sign-in is more reliable"],
    [/^oauth (callback|redirect) (broken|fail)/i, "OAuth redirects complete more reliably"],
    [/^csrf (token )?(missing|invalid|broken)/i, "CSRF protection is more reliable"],
    [/^cors (error|issue|block)/i, "Cross-origin requests complete more reliably"],
    [/^timezone (bug|issue|wrong)/i, "Timezones display correctly"],
    [/^date (format|formatting) (bug|issue|wrong)/i, "Dates format correctly across locales"],
    [/^email (deliverability|bounce|spam)/i, "Outbound email delivers more reliably"],
    [/^search (broken|bug|returns wrong)/i, "Search results are more accurate"],
    [/^filter(s)? (broken|not working|bug)/i, "Filters apply correctly"],
    [/^sort(ing)? (broken|wrong|bug)/i, "Sort order is correct"],
    [/^upload (fail|fails|failing|broken)/i, "File uploads complete more reliably"],
    [/^download (fail|fails|failing|broken)/i, "Downloads complete more reliably"],
    [/^copy to clipboard (fail|broken|bug)/i, "Copy to clipboard works more reliably"],
    [/^infinite scroll (broken|bug)/i, "Infinite scroll loads the next page correctly"],
    [/^keyboard (nav|navigation|shortcut)/i, "Keyboard navigation is more complete"],
    [/^(a11y|accessibility)\s+/i, "Accessibility improvements for "],
    [/^flaky test(s)?/i, "Stabilized flaky tests"],
    [/^reduce bundle size/i, "Smaller JavaScript bundle"],
    [/^bump (node|python|go|ruby|java) /i, "Updated runtime dependency: "],
    [/^migrate to /i, "Migrated to "],
    [/^deprecate /i, "Deprecated "],
    [/^deprecated? \/v1\//i, "Deprecated legacy /v1/ endpoints in favor of documented successors"],
    [/^add \/v2\//i, "Added /v2/ endpoints with clearer pagination"],
    [/^cursor pagination/i, "List endpoints support cursor pagination"],
    [/^rate limit headers/i, "Rate-limit headers are present on all routes"],
    [/^migration guide/i, "Published a migration guide for the new API surface"],
    [/^breaking change:?\s*/i, "Breaking change: "],
    [/^sunset /i, "Scheduled sunset for "],
    [/^5xx (retry|retries)/i, "Automatic retries after 5xx responses"],
    [/^idempotency[- ]key/i, "Idempotency keys prevent double-processing"],
    [/^remove unused /i, "Removed unused "],
    [/^log(ging)? (noise|spam|too verbose)/i, "Quieter, more useful logs"],
    [/^panic (when|on|if) /i, "Fixed a crash when "],
    [/^segfault (when|on|if) /i, "Fixed a crash when "],
    [/^deadlock (in|on|when) /i, "Fixed a deadlock "],
    [/^retry (logic|on failure)/i, "Retries after transient failures"],
    [/^idempoten(t|cy)/i, "Operations are safer to retry"],
    [/^feature flag /i, "Feature flag for "],
    [/^dark mode (flash|flicker)/i, "Dark mode no longer flashes on load"],
    // 2026-08-06 PR-paste expansion
    [/^fix (?:the )?n\+1 quer(?:y|ies)/i, "Removed N+1 queries"],
    [/^n\+1 quer(?:y|ies)/i, "Removed N+1 queries"],
    [/^cache (miss|stampede|invalidation)/i, "Cache behavior is more reliable under load"],
    [/^stale cache/i, "Stale cache entries refresh correctly"],
    [/^connection pool (exhaust|leak|timeout)/i, "Database connection pool is more stable"],
    [/^db (timeout|lock|deadlock)/i, "Database contention is reduced"],
    [/^migration (fail|failed|broken)/i, "Database migrations complete more reliably"],
    [/^schema (drift|mismatch)/i, "Schema stays in sync across environments"],
    [/^hotfix for /i, "Hotfix for "],
    [/^revert /i, "Reverted "],
    [/^feature flag for /i, "Feature flag for "],
    [/^enable (feature )?flag /i, "Enabled feature flag for "],
    [/^disable (feature )?flag /i, "Disabled feature flag for "],
    [/^p95 (latency|response) /i, "Improved p95 latency for "],
    [/^reduce p95 /i, "Improved p95 latency for "],
    [/^timeout on /i, "Fewer timeouts on "],
    [/^hang(s|ing)? (on|when) /i, "Fixed a hang when "],
    [/^blank (screen|page) (on|when) /i, "Fixed a blank page when "],
    [/^white screen of death/i, "Fixed a blank page crash on load"],
    [/^crash on launch/i, "Fixed a crash on app launch"],
    [/^anr (on|when) /i, "Fixed an app freeze when "],
    [/^battery drain/i, "Reduced battery drain on mobile"],
    [/^push notification(s)? (broken|fail)/i, "Push notifications deliver more reliably"],
    [/^deep link(s)? (broken|fail)/i, "Deep links open the right screen more reliably"],
    [/^clipboard paste (broken|fail)/i, "Paste from clipboard works more reliably"],
    [/^drag and drop (broken|fail)/i, "Drag and drop works more reliably"],
    [/^undo (broken|fail)/i, "Undo works more reliably"],
    [/^autosave (broken|fail|lost)/i, "Autosave is more reliable"],
    [/^lost work on refresh/i, "Work no longer disappears after a refresh"],
    [/^session (expire|expiry|timeout) too (soon|aggressive)/i, "Sessions last a more reasonable time"],
    [/^login loop/i, "Sign-in no longer loops"],
    [/^password reset (broken|fail)/i, "Password reset completes more reliably"],
    [/^2fa|mfa|totp (broken|fail)/i, "Two-factor sign-in is more reliable"],
    [/^invite email (not|never) (arriving|sending)/i, "Invite emails deliver more reliably"],
    [/^billing portal (broken|fail)/i, "Billing portal opens more reliably"],
    [/^proration (bug|wrong)/i, "Plan prorations calculate correctly"],
    [/^tax (calc|calculation) (bug|wrong)/i, "Tax calculations are more accurate"],
    [/^csv import (broken|fail)/i, "CSV imports complete more reliably"],
    [/^export empty/i, "Exports no longer return empty files"],
    [/^pdf (render|generation) (broken|fail)/i, "PDF generation is more reliable"],
    [/^image upload (broken|fail|orient)/i, "Image uploads complete more reliably"],
    [/^heic (support|upload)/i, "HEIC images upload more reliably"],
    [/^a11y: /i, "Accessibility: "],
    [/^axe: /i, "Accessibility fix: "],
    [/^focus trap/i, "Focus stays inside dialogs correctly"],
    [/^screen reader/i, "Screen reader labels are clearer"],
    [/^contrast (ratio|fail)/i, "Text contrast meets accessibility targets"],
    // 2026-08-06 evening quality expansion (roadmap N3)
    [/^flaky e2e/i, "Stabilized flaky end-to-end tests"],
    [/^ci (red|failing|flake)/i, "CI is greener and less flaky"],
    [/^docker (build|image) (slow|fail)/i, "Docker builds complete more reliably"],
    [/^k8s|kubernetes (crash|oom|restart)/i, "Workloads restart more cleanly under load"],
    [/^oom (when|on|if) /i, "Fixed out-of-memory crashes when "],
    [/^heap (pressure|grow)/i, "Heap usage stays more stable under load"],
    [/^gc pause/i, "Shorter garbage-collection pauses"],
    [/^cold start/i, "Faster cold starts"],
    [/^lambda timeout/i, "Fewer function timeouts under load"],
    [/^queue (backlog|lag)/i, "Queues drain faster under load"],
    [/^worker (stuck|stall)/i, "Background workers make progress more reliably"],
    [/^cron (miss|skip|fail)/i, "Scheduled jobs run more reliably"],
    [/^stripe (webhook|invoice) (fail|broken)/i, "Billing webhooks process more reliably"],
    [/^polar (checkout|webhook)/i, "Checkout webhooks process more reliably"],
    [/^sentry (noise|spam)/i, "Error reporting is quieter and more useful"],
    [/^log spam/i, "Quieter, more useful logs"],
    [/^redundant api call/i, "Fewer redundant API calls"],
    [/^double submit/i, "Forms no longer double-submit"],
    [/^race on save/i, "Saves no longer race each other"],
    [/^optimistic ui (rollback|glitch)/i, "Optimistic UI updates settle correctly"],
    [/^stale closure/i, "UI state stays in sync after async updates"],
    [/^hydration mismatch/i, "Server and client markup match more reliably"],
    [/^ssr (flash|mismatch)/i, "Server-rendered pages flash less on load"],
    [/^prefers-reduced-motion/i, "Animations respect reduced-motion preferences"],
    [/^rtl (layout|support)/i, "Right-to-left layouts render more correctly"],
    [/^i18n (missing|fallback)/i, "Missing translations fall back more gracefully"],
    [/^copy (wrong|stale) string/i, "UI copy matches the current product language"],
    // 2026-08-07 PR-paste expansion (auth session / SSR / queue / indie common)
    [/^session (cookie|token) (lost|drop|cleared)/i, "Sessions no longer drop unexpectedly"],
    [/^session fixation/i, "Session fixation risk is reduced"],
    [/^refresh token (rotate|rotation|reuse)/i, "Refresh tokens rotate more safely"],
    [/^jwt (expire|expiry|clock skew)/i, "Token expiry handles clock skew more reliably"],
    [/^cookie (samesite|secure|httponly)/i, "Auth cookies use safer defaults"],
    [/^remember me (broken|fail)/i, "Remember-me sign-in is more reliable"],
    [/^magic link (expire|broken|fail)/i, "Magic-link sign-in completes more reliably"],
    [/^passkey|webauthn (broken|fail)/i, "Passkey sign-in is more reliable"],
    [/^ssr (stream|streaming) (fail|broken)/i, "Server-streamed pages complete more reliably"],
    [/^rsc (error|fail|mismatch)/i, "Server components render more reliably"],
    [/^edge runtime (fail|crash)/i, "Edge runtime handlers fail less often"],
    [/^middleware (redirect|loop)/i, "Middleware redirects no longer loop"],
    [/^queue (dead letter|dlq)/i, "Failed jobs land in a dead-letter path more cleanly"],
    [/^job (retry|retries) storm/i, "Job retries back off instead of storming"],
    [/^consumer lag/i, "Queue consumers catch up faster under load"],
    [/^at-least-once (duplicate|dedupe)/i, "At-least-once delivery dedupes more cleanly"],
    [/^outbox pattern/i, "Outbox writes keep side effects in sync"],
    [/^webhook signature (fail|invalid)/i, "Webhook signatures verify more reliably"],
    [/^replay attack/i, "Webhook replay protection is stronger"],
    // 2026-08-08 PR-paste expansion (roadmap N3 free pack quality)
    [/^hotfix:?\s*/i, "Hotfix: "],
    [/^security:?\s*/i, "Security: "],
    [/^patch:?\s*/i, "Patch: "],
    [/^build\(deps\):\s*/i, "Updated dependencies: "],
    [/^dependabot:?\s*/i, "Dependency update: "],
    [/^renovate:?\s*/i, "Dependency update: "],
    [/^ci:?\s*/i, "CI: "],
    [/^release:?\s*/i, "Release: "],
    [/^docs:?\s*/i, "Docs: "],
    [/^perf:?\s*/i, "Performance: "],
    [/^refactor:?\s*/i, "Refactor: "],
    [/^test:?\s*/i, "Tests: "],
    [/^style:?\s*/i, "Style: "],
    [/^resolve(d)? merge conflict/i, "Resolved merge conflicts"],
    [/^fix merge conflict/i, "Resolved merge conflicts"],
    [/^address(ed)? (pr |review )?feedback/i, "Addressed review feedback"],
    [/^address(ed)? (pr |code )?review/i, "Addressed review feedback"],
    [/^respond(ed)? to review/i, "Addressed review feedback"],
    [/^cleanup leftover/i, "Removed leftover debug code"],
    [/^remove console\.(log|debug|warn)/i, "Removed leftover debug logging"],
    [/^remove debugger/i, "Removed leftover debugger statements"],
    [/^fix flaky (spec|test)/i, "Stabilized a flaky test"],
    [/^skip flaky/i, "Stabilized flaky tests"],
    [/^pin (version|dependency)/i, "Pinned a dependency for stability"],
    [/^unpin /i, "Unpinned "],
    [/^upgrade to node /i, "Upgraded to Node "],
    [/^upgrade to python /i, "Upgraded to Python "],
    [/^upgrade to go /i, "Upgraded to Go "],
    [/^switch to bun/i, "Switched package tooling toward Bun"],
    [/^switch to pnpm/i, "Switched package tooling toward pnpm"],
    [/^enable turbo/i, "Faster monorepo builds with Turborepo"],
    [/^enable nx/i, "Faster monorepo builds with Nx"],
    [/^fix turbo cache/i, "Remote build cache is more reliable"],
    [/^storybook (build|deploy) (fail|broken)/i, "Storybook builds complete more reliably"],
    [/^chromatic (fail|flake)/i, "Visual regression checks are less flaky"],
    [/^playwright (flake|timeout)/i, "Playwright e2e runs more reliably"],
    [/^cypress (flake|timeout)/i, "Cypress e2e runs more reliably"],
    [/^vite (hmr|dev) (broken|fail)/i, "Local dev reloads more reliably"],
    [/^webpack (oom|slow)/i, "Bundler builds complete more reliably"],
    [/^esbuild (fail|crash)/i, "esbuild completes more reliably"],
    [/^tailwind (purge|content) (bug|miss)/i, "Tailwind styles include the right classes"],
    [/^css module(s)? (leak|clash)/i, "CSS modules no longer clash across components"],
    [/^z-index (bug|war)/i, "Stacking order is more predictable"],
    [/^scroll jump/i, "Scroll position no longer jumps unexpectedly"],
    [/^layout shift/i, "Less layout shift on load"],
    [/^cls (score|regression)/i, "Less cumulative layout shift"],
    [/^lcp (regress|slow)/i, "Largest contentful paint is faster"],
    [/^ttfb (regress|slow)/i, "Time to first byte is faster"],
    [/^font (flash|swap|cls)/i, "Web fonts load with less layout shift"],
    [/^favicon (404|missing)/i, "Favicon loads correctly"],
    [/^og image (missing|wrong)/i, "Social preview images are correct"],
    [/^canonical (url|link) (wrong|missing)/i, "Canonical URLs are correct"],
    [/^sitemap (stale|missing)/i, "Sitemap stays up to date"],
    [/^robots\.txt (block|wrong)/i, "Robots rules match what we intend to index"],
    [/^404 after deploy/i, "Fewer 404s after deploy"],
    [/^cache bust(ing)? (fail|broken)/i, "Asset cache-busting works after deploys"],
    [/^service worker (stale|loop)/i, "Service worker updates without trapping old assets"],
    [/^pwa (install|update) (broken|fail)/i, "PWA install and update flows are more reliable"],
    [/^offline cache (stale|wrong)/i, "Offline cache serves fresher content"],
    [/^indexeddb (quota|fail)/i, "Local storage handles quota more gracefully"],
    [/^localstorage (quota|fail)/i, "Local storage handles quota more gracefully"],
    [/^safari (only|specific) (bug|crash)/i, "Safari-specific bugs are reduced"],
    [/^ios (keyboard|viewport) (bug|jump)/i, "iOS keyboard and viewport behave more predictably"],
    [/^android (back|gesture) (bug|break)/i, "Android back navigation is more reliable"],
    [/^keyboard dismiss/i, "On-screen keyboard dismisses more cleanly"],
    [/^safe area (inset|padding)/i, "Safe-area insets respect notched devices"],
    [/^notch (overlap|cut)/i, "UI clears the device notch correctly"],
    [/^status bar (color|style)/i, "Status bar styling matches the screen"],
    [/^haptic(s)? (missing|wrong)/i, "Haptic feedback fires more consistently"],
    [/^biometric (auth|login) (fail|broken)/i, "Biometric unlock is more reliable"],
    [/^camera permission (denied|loop)/i, "Camera permission prompts are clearer"],
    [/^location permission (denied|loop)/i, "Location permission prompts are clearer"],
    [/^notification permission (denied|loop)/i, "Notification permission prompts are clearer"],
    [/^background fetch (fail|kill)/i, "Background fetch completes more reliably"],
    [/^file picker (cancel|empty)/i, "File pickers handle cancel more cleanly"],
    [/^drag drop (mobile|touch)/i, "Touch drag-and-drop is more reliable"],
    [/^long press (menu|broken)/i, "Long-press menus open more reliably"],
    [/^context menu (broken|missing)/i, "Context menus open more reliably"],
    [/^tooltip (clip|overflow)/i, "Tooltips stay visible inside the viewport"],
    [/^popover (clip|overflow)/i, "Popovers stay visible inside the viewport"],
    [/^modal (scroll|lock) (broken|fail)/i, "Modal scroll locking is more reliable"],
    [/^dialog (focus|escape) (broken|fail)/i, "Dialog focus and Escape handling are more reliable"],
    [/^toast (stack|queue) (bug|miss)/i, "Toast notifications stack more cleanly"],
    [/^snackbar (miss|overlap)/i, "Snackbars appear without overlapping critical UI"],
    [/^skeleton (flash|layout)/i, "Loading skeletons match final content size better"],
    [/^spinner (forever|stuck)/i, "Loading indicators stop when work completes"],
    [/^infinite loading/i, "Loading states resolve when work completes"],
    [/^empty state (wrong|missing)/i, "Empty states show the right message"],
    [/^error boundary (missing|generic)/i, "Error boundaries show clearer recovery paths"],
    [/^retry button (missing|broken)/i, "Retry actions work after failures"],
    [/^offline banner (missing|stale)/i, "Offline banners update when connectivity returns"],
    [/^reconnect (banner|toast)/i, "Reconnect notices appear when the network returns"],
    [/^websocket (ping|pong|heartbeat)/i, "WebSocket heartbeats keep connections healthier"],
    [/^sse reconnect/i, "Server-sent events reconnect more cleanly"],
    [/^graphql (n\+1|dataloader)/i, "GraphQL resolvers avoid N+1 work more often"],
    [/^apollo (cache|normalize)/i, "Client cache normalization is more correct"],
    [/^react query (stale|invalidate)/i, "Query cache invalidation is more correct"],
    [/^swr (revalidate|stale)/i, "SWR revalidation behaves more predictably"],
    [/^zustand (persist|hydrate)/i, "Client state rehydrates more reliably"],
    [/^redux (persist|rehydrate)/i, "Client state rehydrates more reliably"],
    [/^rate limit 429 storm/i, "Clients handle 429 backoffs more gracefully"],
    [/^circuit breaker/i, "Circuit breakers open under dependency failure"],
    [/^graceful shutdown/i, "Services shut down without dropping in-flight work"],
    [/^zero-downtime deploy/i, "Deploys complete with less user-visible downtime"],
    [/^blue.?green|canary (deploy|rollout)/i, "Rollouts fail over more cleanly"],
    [/^feature store/i, "Feature flags resolve more consistently"],
    [/^config drift/i, "Config stays consistent across environments"],
    [/^secret (rotate|rotation)/i, "Secrets rotate without breaking live traffic"],
    [/^env var (missing|typo)/i, "Missing environment variables fail more clearly"],
    [/^dns (ttl|cache|fail)/i, "DNS resolution is more reliable"],
    [/^tls (handshake|cert) (fail|expire)/i, "TLS handshakes and certs fail less often"],
    [/^websocket (reconnect|drop)/i, "WebSocket connections reconnect more reliably"],
    [/^sse (disconnect|drop)/i, "Server-sent events reconnect more reliably"],
    [/^graphql (n\+1|dataloader)/i, "GraphQL resolvers avoid N+1 loads"],
    [/^subscription (leak|memory)/i, "Realtime subscriptions clean up more reliably"],
    // 2026-08-07 evening: deploy / CI / security PR paste
    [/^deploy (fail|failed|broken)/i, "Deploys complete more reliably"],
    [/^rollback (deploy|release)/i, "Rollbacks complete more cleanly"],
    [/^ci pipeline (slow|fail|red)/i, "CI pipelines finish more reliably"],
    [/^flaky (unit |integration )?test/i, "Stabilized flaky tests"],
    [/^github action(s)? (fail|broken)/i, "GitHub Actions runs complete more reliably"],
    [/^docker compose (fail|broken)/i, "Local compose environments start more reliably"],
    [/^secret scan(ning)?/i, "Secret scanning catches more leaks before merge"],
    [/^dependabot (noise|spam)/i, "Dependency alerts are quieter and more useful"],
    [/^sast|semgrep|codeql/i, "Static analysis catches more issues before ship"],
    [/^csp (header|violation)/i, "Content-security-policy headers are tighter"],
    [/^hsts/i, "HTTPS strict-transport headers are correct"],
    [/^xss (fix|vector)/i, "Cross-site scripting risks are reduced"],
    [/^sql injection/i, "SQL injection risks are reduced"],
    [/^csrf (token|check)/i, "CSRF checks are more reliable"],
    [/^open redirect/i, "Open redirects are blocked more reliably"],
    [/^ssrf/i, "Server-side request forgery risks are reduced"],
    [/^path traversal/i, "Path traversal risks are reduced"],
    [/^rate limit bypass/i, "Rate-limit bypasses are harder"],
    [/^privilege escalation/i, "Privilege checks are stricter"],
    [/^idor/i, "Object-level authorization is stricter"],
    [/^audit log/i, "Audit logs capture more security-relevant events"],
    [/^canary (token|deploy)/i, "Canary releases fail over more cleanly"],
    [/^feature flag cleanup/i, "Stale feature flags are cleaned up"],
    [/^migrations? down/i, "Down migrations complete more safely"],
    [/^schema migration lock/i, "Schema migrations take locks more carefully"],
    // 2026-08-08 mobile / TestFlight PR paste
    [/^anr (on|when|in) /i, "Fixed an app freeze when "],
    [/^anr$/i, "Fixed app freezes (ANR) under load"],
    [/^testflight (crash|notes)/i, "TestFlight notes and crash fixes are clearer"],
    [/^app store (review|reject|rejection)/i, "App Store review issues are addressed more cleanly"],
    [/^play store (reject|crash)/i, "Play Store crash and policy issues are reduced"],
    [/^att (prompt|tracking)/i, "App Tracking Transparency prompts behave more reliably"],
    [/^push (permission|prompt)/i, "Push permission prompts complete more reliably"],
    [/^deep link (ios|android)/i, "Deep links open the right screen more reliably on mobile"],
    [/^background fetch/i, "Background fetch completes more reliably"],
    [/^battery drain (ios|android|mobile)/i, "Battery drain on mobile is reduced"],
    [/^widget (ios|android) (crash|fail)/i, "Home-screen widgets update more reliably"],
    [/^share sheet (broken|fail)/i, "Share sheet actions complete more reliably"],
    [/^keyboard (cover|overlap)/i, "Keyboards no longer cover critical inputs"],
    [/^safe area (inset|notch)/i, "Layouts respect safe-area insets more correctly"],
    [/^dark mode (ios|android)/i, "Dark mode on mobile is more consistent"]
  ];
  // Regex replacements that need capture groups are applied after the table below.
  for (var i = 0; i < canned.length; i++) {
    var re = canned[i][0];
    var repl = canned[i][1];
    var m = t.match(re);
    if (m) {
      // Trailing-space replacements keep the unmatched tail ("npe when X" → "Fixed … when X").
      if (/\s$/.test(repl)) {
        var rest = t.slice(m[0].length).replace(/^\s+/, "");
        if (rest) return capitalize((repl + rest).replace(/\s+/g, " ").trim());
      }
      return repl;
    }
  }

  // Generic user-facing voice - prefer complete sentences, avoid "Fixed fixed …"
  if (/^crash when /i.test(t)) {
    t = "Fixed a crash when " + t.replace(/^crash when /i, "");
  } else if (/\bdisappear|disappeared|missing after|gone after\b/i.test(t) && !/^fixed /i.test(t)) {
    t = "Fixed " + t.charAt(0).toLowerCase() + t.slice(1);
  } else if (/crash|error|broken/i.test(t) && !/^fix(ed)? /i.test(t)) {
    t = "Fixed " + t.charAt(0).toLowerCase() + t.slice(1);
  } else if (/\bbug\b/i.test(t) && !/^fixed /i.test(t)) {
    // "subject line invoice bug showed wrong plan" → readable sentence
    if (/showed wrong|wrong plan|missing/i.test(t)) {
      t = t
        .replace(/\bbug\b/i, "")
        .replace(/\s+/g, " ")
        .replace(/showed wrong/i, "now shows the correct")
        .trim();
      t = capitalize(t);
    } else {
      t = "Fixed " + t.charAt(0).toLowerCase() + t.slice(1);
    }
  } else if (/\b(\d+)x faster\b/i.test(t)) {
    t = t.replace(/\b(\d+)x faster\b/i, "about $1× faster");
    t = capitalize(t);
    if (!/^(improved|faster)/i.test(t)) {
      // "dashboard loads about 2× faster" is already good
    }
  } else if (/timeout|slow|speed|faster|perf/i.test(t) && !/^(improved|faster)/i.test(t) && !/loads about/i.test(t)) {
    t = "Improved " + t.charAt(0).toLowerCase() + t.slice(1);
  } else if (/^dark mode/i.test(t)) {
    t = "Added " + t.charAt(0).toLowerCase() + t.slice(1);
    if (!/settings|toggle/i.test(t)) t += " in settings";
  } else if (/^offline /i.test(t)) {
    t = capitalize(t);
  } else if (/invite|role picker|permissions/i.test(t) && !/^team /i.test(t)) {
    t = capitalize(t);
  } else if (/invoice|billing|subject/i.test(t)) {
    t = capitalize(t);
    if (!/now /i.test(t) && /missing|wrong|bug/i.test(t)) {
      t = t.replace(/missing the plan name/i, "now include the plan name");
    }
  } else {
    t = capitalize(t);
  }

  // Light cleanup of awkward fragments
  t = t.replace(/\s+/g, " ").replace(/\bfixed fixed\b/i, "Fixed").trim();
  t = t.replace(/\s+bug\s+/i, " ").replace(/\s+/g, " ").trim();
  t = t.replace(/^Improved dashboard loads about/i, "Dashboard loads about");
  return t;
}

function shortTitleFromBullet(b) {
  var t = String(b || "")
    .replace(/^We (fixed|improved|added) /i, "")
    .replace(/^Fixed (a |an |the )?/i, "")
    .replace(/^Improved /i, "")
    .replace(/^Added /i, "")
    .replace(/^Resolved /i, "")
    .replace(/\.$/, "")
    .trim();
  if (t.length > 56) t = t.slice(0, 53).replace(/\s+\S*$/, "");
  return t;
}

function titleFromBullets(version, bullets) {
  var ver = (version || "").trim();
  // A version is a title only when it is a phrase ("Summer cleanup"), not v1.2.3 or v-dev.
  if (ver && /\s/.test(ver) && /[a-zA-Z]{3,}/.test(ver) && !/^v?\d/.test(ver)) {
    return ver;
  }
  var themes = [];
  var joined = bullets.join(" ").toLowerCase();
  // Only canned sample phrases — "Fix RESTWithNext" is not "stability fixes",
  // and "X-Oauth-Scopes" is not "sign-in polish".
  if (/\bcsv\b|export timeout|no longer time out|exports that keep/.test(joined)) themes.push("faster exports");
  if (/invoice email|plan name|clearer billing/.test(joined)) themes.push("clearer billing");
  if (/\boffline\b/.test(joined)) themes.push("offline support");
  if (/role picker|team invites/.test(joined)) themes.push("team invites");
  if (/twice as fast|2×|dashboard loads/.test(joined)) themes.push("snappier performance");
  if (/deprecat|migration-facing|sunset|cursor pagination/.test(joined)) themes.push("API migration notes");
  if (/idempotency|webhook retry|5xx/.test(joined)) themes.push("API reliability");
  if (/crash when|null-pointer|comments that disappeared/.test(joined)) themes.push("stability fixes");
  if (/\bsso\b|oauth redirect|sign-in is more reliable/.test(joined)) themes.push("sign-in polish");
  if (/dark mode/.test(joined)) themes.push("UI polish");
  if (themes.length) {
    var title = themes.slice(0, 2).map(capitalize).join(", ");
    if (themes.length === 1) title = capitalize(themes[0]);
    return title;
  }
  var fromBullet = shortTitleFromBullet(bullets[0] || "");
  if (fromBullet) return capitalize(fromBullet);
  return "What shipped this week";
}

function formatDate(iso) {
  if (!iso) return new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  var d = new Date(iso + "T12:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function benefitSubject(product, title, polished) {
  var joined = polished.join(" ").toLowerCase();
  if (/export|csv|download/.test(joined) && /invoice|billing|subject/.test(joined)) {
    return "You can export faster - and invoices finally make sense";
  }
  if (/offline/.test(joined) && /invite|role|team/.test(joined)) {
    return "Offline mobile and cleaner team invites";
  }
  if (/offline/.test(joined)) {
    return "Work continues when the network does not";
  }
  if (/export|csv|download/.test(joined)) {
    return "Exports that keep up with your data";
  }
  if (/dashboard|twice as fast|snappier|loads about/.test(joined)) {
    return "A snappier " + (product || "product") + " dashboard";
  }
  if (/invoice|billing|subject|payment/.test(joined)) {
    return "Billing details that scan at a glance";
  }
  if (/invite|role picker|permissions/.test(joined)) {
    return "Team invites that match how you work";
  }
  if (/deprecat|migration|sunset|breaking|v2\/|\/v1\//.test(joined)) {
    return (product ? product + ": " : "") + "migration notes and what still works";
  }
  if (/crash when|null-pointer|comments that disappeared/.test(joined)) {
    return "A quieter, stabler " + (product || "product");
  }
  if (polished.length === 1) {
    return (product ? product + ": " : "") + title;
  }
  return (product ? product + " update - " : "") + title;
}

function narrativeLead(polished) {
  if (polished.length === 0) {
    return "A small release with changes you will feel right away.";
  }
  var joined = polished.join(" ").toLowerCase();
  if (/deprecat|migration|sunset|breaking/.test(joined)) {
    return (
      "This release includes migration-facing changes you should plan for. " +
      polished[0].replace(/\.$/, "") +
      (polished.length > 1
        ? ", and " +
          polished[1].charAt(0).toLowerCase() +
          polished[1].slice(1).replace(/\.$/, "") +
          "."
        : ".")
    );
  }
  if (polished.length === 1) {
    return "A focused release: " + polished[0].replace(/\.$/, "") + ".";
  }
  if (polished.length === 2) {
    return (
      "A small release with two fixes you will feel right away. " +
      polished[0].replace(/\.$/, "") +
      ", and " +
      polished[1].charAt(0).toLowerCase() +
      polished[1].slice(1).replace(/\.$/, "") +
      "."
    );
  }
  if (polished.length === 3) {
    return (
      "A small release with three changes you will feel right away. " +
      polished[0].replace(/\.$/, "") +
      ", " +
      polished[1].charAt(0).toLowerCase() +
      polished[1].slice(1).replace(/\.$/, "") +
      ", and " +
      polished[2].charAt(0).toLowerCase() +
      polished[2].slice(1).replace(/\.$/, "") +
      "."
    );
  }
  return (
    "A small release with changes you will feel right away. " +
    polished
      .slice(0, 2)
      .map(function (b, i) {
        var t = b.replace(/\.$/, "");
        return i === 0 ? t : t.charAt(0).toLowerCase() + t.slice(1);
      })
      .join(", ") +
    ", plus " +
    (polished.length - 2) +
    " more below."
  );
}

function mapPainHook(painHook) {
  var s = String(painHook || "");
  if (!s) return "";
  if (/export|csv/i.test(s)) return "export timeouts";
  if (/invoice|billing|subject/i.test(s)) return "messy invoice subjects";
  if (/crash|rename|npe|null/i.test(s)) return "that rename-during-sync crash";
  if (/comment|disappear|refresh/i.test(s)) return "comments vanishing after refresh";
  if (/offline/i.test(s)) return "no offline mobile mode";
  if (/dashboard|faster|performance|load time/i.test(s)) return "a sluggish dashboard";
  if (/invite|role/i.test(s)) return "clunky team invites";
  if (/dark mode/i.test(s)) return "missing dark mode";
  if (/race|watcher|webhook|pagination/i.test(s)) return "watcher races and flaky webhooks";
  if (/deprecat|migration|sunset|legacy|\/v1\//i.test(s)) return "painful API migrations";
  if (/rate limit/i.test(s)) return "harsh rate limits";
  if (/cursor pagination/i.test(s)) return "clunky list pagination";
  return "";
}

function applyTone(text, tone) {
  if (!text || !tone || tone === "neutral") return text;
  if (tone === "technical") {
    return text
      .replace(/^Fixed a rare crash when /i, "Resolved a crash when ")
      .replace(/^Fixed a null-pointer crash when /i, "Resolved NPE when ")
      .replace(/^Fixed a race condition /i, "Resolved race ")
      .replace(/^Fixed a memory leak in /i, "Patched memory leak in ")
      .replace(/^Fixed broken pagination$/i, "Repaired pagination edge cases")
      .replace(/^CSV exports no longer time out on large workspaces$/i, "CSV export path no longer times out on large workspaces")
      .replace(/^Mobile can work offline$/i, "Client supports offline use")
      .replace(/^Dashboard loads about twice as fast$/i, "Dashboard load time improved ~2×")
      .replace(/^You can export faster/i, "Export throughput improved")
      .replace(/\babout 3× faster\b/i, "~3× faster")
      .replace(/\babout twice as fast\b/i, "~2× faster");
  }
  if (tone === "friendly") {
    return text
      .replace(/^Fixed a rare crash when /i, "We fixed a rare crash when ")
      .replace(/^Fixed /i, "We fixed ")
      .replace(/^Improved /i, "We improved ")
      .replace(/^Added /i, "We added ")
      .replace(/^CSV exports no longer time out on large workspaces$/i, "Big CSV exports should finish without timing out")
      .replace(/^Invoice email subjects now include the plan name$/i, "Invoice subjects finally show the plan name")
      .replace(/^Mobile can work offline$/i, "You can keep going on mobile even offline")
      .replace(/^We We /i, "We ");
  }
  return text;
}

function polishPriorNotes(raw) {
  // Continuity notes: rephrase only; drop empty/chore; never invent themes.
  var lines = parseBullets(raw || "");
  return lines
    .map(function (b) {
      return polishBullet(b);
    })
    .filter(Boolean)
    .slice(0, 6);
}

function countPhrase(n, heading) {
  var base = String(heading || "").toLowerCase();
  if (n === 1) {
    if (base === "features") return "1 feature";
    if (base === "fixes") return "1 fix";
    if (base === "breaking changes") return "1 breaking change";
    if (base.charAt(base.length - 1) === "s") return "1 " + base.slice(0, -1);
    return "1 " + base;
  }
  return n + " " + base;
}

function packLead(product, ver, polished, tone, groups) {
  var bits = [];
  if (groups && groups.length) {
    groups.forEach(function (g) {
      var n = (g.bullets || []).length;
      if (!n || !g.heading) return;
      bits.push(countPhrase(n, g.heading));
    });
  }
  var who = ((product || "") + (ver ? " " + ver : "")).trim();
  if (bits.length) {
    if (tone === "technical") {
      return (who || "This tag") + " — " + bits.join(", ") + ".";
    }
    if (tone === "friendly") {
      return (who || "This release") + " is out: " + bits.join(" and ") + ".";
    }
    return (who || "This release") + " includes " + bits.join(" and ") + ".";
  }
  if (tone === "technical") {
    if (!polished.length) return "Release notes for this tag.";
    if (polished.length === 1) return "This tag: " + polished[0].replace(/\.$/, "") + ".";
    return (who || "This tag") + " — " + polished[0].replace(/\.$/, "") + ". Details below.";
  }
  var lead = narrativeLead(polished);
  if (tone === "friendly") {
    lead = lead.replace(/^A small release/, "A friendly little release").replace(/^A focused release/, "A focused little release");
  }
  return lead;
}

function groupLines(groups, tone) {
  if (!groups || !groups.length) return null;
  var lines = [];
  var used = 0;
  groups.forEach(function (g) {
    var items = (g && g.bullets ? g.bullets : []).map(function (b) {
      return applyTone(polishBullet(b), tone);
    }).filter(Boolean);
    if (!items.length) return;
    if (g.heading) {
      if (lines.length) lines.push("");
      lines.push("### " + g.heading);
      lines.push("");
    }
    items.forEach(function (b) {
      lines.push("- " + b);
    });
    used += items.length;
  });
  return used ? lines : null;
}

function buildPack(product, version, dateIso, bullets, tone, priorRaw, priorMeta, groups) {
  tone = tone || "neutral";
  var polished = bullets.map(function (b) {
    return applyTone(polishBullet(b), tone);
  });
  var priorPolished = polishPriorNotes(priorRaw || "").map(function (b) {
    return applyTone(b, tone);
  });
  var title = titleFromBullets(version, polished);
  var ver = (version || "").trim();
  var heading = ver ? ver + " - " + title : title;
  var dateLabel = formatDate(dateIso);

  var changelogLines = [
    "## " + heading,
    "",
    "_" + dateLabel + (product ? " · " + product : "") + "_",
    ""
  ];
  var grouped = groupLines(groups, tone);
  if (grouped) {
    changelogLines = changelogLines.concat(grouped);
  } else {
    polished.forEach(function (b) {
      changelogLines.push("- " + b);
    });
  }
  if (priorPolished.length) {
    changelogLines.push("");
    changelogLines.push("### Continues from (your last-ship notes)");
    changelogLines.push("");
    priorPolished.forEach(function (b) {
      changelogLines.push("- " + b);
    });
    changelogLines.push("");
    changelogLines.push(
      "_Continuity section is only what you pasted as last-ship notes — not customer history._"
    );
  }
  var changelog = changelogLines.join("\n");

  var lead = packLead(product, ver, polished, tone, groups);
  var emailSubject = benefitSubject(product, title, polished);
  if (groups && groups.length) {
    emailSubject = lead.replace(/\.$/, "");
  }
  if (tone === "technical" && /You can export faster/i.test(emailSubject)) {
    emailSubject = "Export throughput and invoice subject fixes";
  } else if (tone === "friendly" && /A quieter, stabler/i.test(emailSubject)) {
    emailSubject = "A calmer " + (product || "product") + " this week";
  }

  var greeting = tone === "technical" ? "Hello," : tone === "friendly" ? "Hey -" : "Hi there -";
  var signOff =
    tone === "technical"
      ? "Regards,\n" + (product || "Product") + " maintainers"
      : tone === "friendly"
        ? "Thanks for building with " + (product || "us") + " - we mean it.\n\n- The " + (product || "product") + " team"
        : "Thanks for shipping with " + (product || "us") + ".\n\n- The " + (product || "product") + " team";

  var continuity = "";
  var prior = priorMeta || null;
  // Prefer explicit last-ship notes; fall back to caller-supplied prior pack metadata only
  if (priorPolished.length) {
    var priorShort = priorPolished
      .slice(0, 2)
      .map(function (b) {
        return b
          .replace(/^We (fixed|improved|added) /i, "")
          .replace(/^Fixed (a |an |the )?/i, "")
          .replace(/^Improved /i, "")
          .replace(/^Added /i, "");
      })
      .join("; ");
    continuity =
      "P.S. Following up on last ship (" +
      priorShort +
      ") — this note only rephrases what you pasted as last-ship notes.";
    if (tone === "friendly") {
      continuity =
        "P.S. Building on last time (" +
        priorShort +
        "). Edit or delete if you do not want continuity in the send.";
    } else if (tone === "technical") {
      continuity =
        "Note (continuity): rephrased from last-ship notes you provided — " +
        priorShort +
        ". Delete this line if it should not ship with the email.";
    }
  } else if (prior && (prior.version || prior.title)) {
    continuity =
      "P.S. Last pack for " +
      (product || "this product") +
      " in this browser was" +
      (prior.version ? " " + prior.version : "") +
      (prior.title ? " (" + prior.title + ")" : "") +
      " — continuity note only; not a claim about customer history.";
    if (tone === "friendly") {
      continuity =
        "P.S. In this browser the last " +
        (product || "product") +
        " pack I drafted was" +
        (prior.version ? " " + prior.version : "") +
        (prior.title ? " — " + prior.title : "") +
        ". Edit or delete this line if you do not want it in the send.";
    } else if (tone === "technical") {
      continuity =
        "Note (local only): prior draft for " +
        (product || "this product") +
        (prior.version ? " @" + prior.version : "") +
        (prior.title ? " — " + prior.title : "") +
        " was stored in this browser. Not customer history; remove if unused.";
    }
  }

  var emailBody = [
    "Subject: " + emailSubject,
    "",
    greeting,
    "",
    lead,
    "",
    polished.map(function (b) {
      return "• " + b;
    }).join("\n"),
    "",
    signOff
  ];
  if (continuity) {
    emailBody.push("", continuity);
  }
  emailBody = emailBody.join("\n");

  var shortList = polished.slice(0, 3).map(function (b) {
    return b
      .replace(/^We (fixed|improved|added) /i, "")
      .replace(/^Fixed (a |an |the )?/i, "")
      .replace(/^Improved /i, "")
      .replace(/^Added /i, "")
      .replace(/^Resolved /i, "")
      .replace(/^Patched /i, "")
      .replace(/^Repaired /i, "");
  });
  // Social 1: tight ship announcement with themes, not a raw bullet dump
  var social1 =
    "Shipped" +
    (ver ? " " + ver : "") +
    (product ? " of " + product : "") +
    ": " +
    title +
    ". " +
    (shortList[0] ? capitalize(shortList[0]) + "." : "");
  if (tone === "friendly") {
    social1 =
      "Just shipped" +
      (ver ? " " + ver : "") +
      (product ? " of " + product : "") +
      " - " +
      title +
      ". " +
      (shortList[0] ? capitalize(shortList[0]) + "." : "");
  } else if (tone === "technical") {
    var sameTitle =
      shortList[0] &&
      title &&
      shortList[0].replace(/\.$/, "").toLowerCase() === title.replace(/\.$/, "").toLowerCase();
    social1 =
      "Release" +
      (ver ? " " + ver : "") +
      (product ? " (" + product + ")" : "") +
      ": " +
      title +
      (shortList[0] && !sameTitle ? " — " + shortList[0] : "") +
      ".";
  }
  // Optional honest continuity (only if maker pasted last-ship notes)
  if (priorPolished.length) {
    var contBit =
      tone === "technical"
        ? " Builds on last-ship notes you provided."
        : " Continues last ship (from your notes).";
    if ((social1 + contBit).length <= 280) social1 += contBit;
  }
  if (social1.length > 260) {
    social1 =
      "Shipped" +
      (ver ? " " + ver : "") +
      (product ? " of " + product : "") +
      ": " +
      title +
      ".";
  }

  // Social 2: benefit-first only when we mapped a known pain.
  // Never "If you hit <feature bullet from a git log>".
  var painHook = mapPainHook(shortList[0] || "");
  var social2;
  if (!painHook) {
    social2 =
      (product ? product : "This release") +
      (ver ? " " + ver : "") +
      " is tagged. " +
      (title || shortList[0] || "See the changelog") +
      ".";
  } else if (tone === "technical") {
    social2 =
      "If you hit " +
      painHook +
      ", upgrade to " +
      (ver || "this release") +
      (product ? " (" + product + ")" : "") +
      ".";
  } else if (tone === "friendly") {
    social2 =
      "If " +
      painHook +
      " has been bugging you - this one's for you. " +
      (product ? product + " " : "") +
      (ver || "update") +
      " is live.";
  } else {
    social2 =
      "Still fighting " +
      painHook +
      "? This release is for you. " +
      (product ? product + " " : "") +
      (ver || "update") +
      " is live.";
  }

  var joinedLower = polished.join(" ").toLowerCase();
  var nextTheme = "speed, clarity, or stability";
  if (/\bcsv\b|export timeout|no longer time out|twice as fast|dashboard loads/.test(joinedLower)) {
    nextTheme = "exports, performance, or something else on your critical path";
  } else if (/invoice email|plan name/.test(joinedLower)) {
    nextTheme = "billing clarity, receipts, or the next finance pain";
  } else if (/\boffline\b/.test(joinedLower)) {
    nextTheme = "mobile offline, sync, or desktop parity";
  } else if (/role picker|team invites/.test(joinedLower)) {
    nextTheme = "invites, roles, or workspace permissions";
  } else if (/crash when|null-pointer|comments that disappeared/.test(joinedLower)) {
    nextTheme = "stability, edge cases, or a quiet week";
  } else if (/\bsso\b|oauth redirect|sign-in is more reliable/.test(joinedLower)) {
    nextTheme = "sign-in, invites, or account recovery";
  } else if (/deprecat|migration-facing|sunset|cursor pagination/.test(joinedLower)) {
    nextTheme = "migration windows, rate limits, or the next API pain";
  }
  var social3 =
    "What should " +
    (product || "we") +
    " polish next - " +
    nextTheme +
    "? Reply and tell us.";
  if (tone === "technical") {
    social3 = "Feedback welcome on " + nextTheme + " for " + (product || "the next release") + ".";
  } else if (tone === "friendly") {
    social3 =
      "Curious what you want next from " +
      (product || "us") +
      " - " +
      nextTheme +
      "? Hit reply.";
  }

  // Social 4: longer LinkedIn-style post (free panel; still from your bullets only)
  var liBullets = polished
    .slice(0, 4)
    .map(function (b) {
      return "• " + b;
    })
    .join("\n");
  var social4 =
    "Shipped" +
    (ver ? " " + ver : "") +
    (product ? " of " + product : "") +
    ".\n\n" +
    lead +
    "\n\n" +
    liBullets +
    "\n\n" +
    (tone === "technical"
      ? "Notes above match what we merged - no invented scope."
      : "If this release solves a pain for you, reply with what we should polish next.");
  if (social4.length > 1200) {
    social4 =
      "Shipped" +
      (ver ? " " + ver : "") +
      (product ? " of " + product : "") +
      ": " +
      title +
      ".\n\n" +
      liBullets +
      "\n\nMore in the release notes.";
  }

  var social = ["1. " + social1, "2. " + social2, "3. " + social3, "4. " + social4].join("\n\n");

  // GitHub Release body - free panel; paste into github.com releases "Describe this release"
  var githubLines = ["## What's new", "", lead, ""];
  if (grouped) {
    githubLines = githubLines.concat(grouped);
  } else {
    githubLines.push("### Changes", "");
    polished.forEach(function (b) {
      githubLines.push("- " + b);
    });
  }
  githubLines.push("");
  githubLines.push("---");
  githubLines.push("");
  githubLines.push(
    "Full notes for " +
      (product || "this release") +
      (ver ? " " + ver : "") +
      " · " +
      dateLabel
  );
  var github = githubLines.join("\n");

  // Discord / Slack paste (free): short channel announcement from same bullets only
  var chatBullets = polished
    .slice(0, 4)
    .map(function (b) {
      return "• " + b;
    })
    .join("\n");
  var chatHead =
    "**" +
    (product || "Release") +
    (ver ? " " + ver : "") +
    "** — " +
    title;
  if (tone === "technical") {
    chatHead =
      "`" +
      (product || "release") +
      (ver ? "@" + ver : "") +
      "` shipped — " +
      title;
  } else if (tone === "friendly") {
    chatHead =
      "Just shipped " +
      (product ? product + " " : "") +
      (ver || "an update") +
      ": " +
      title;
  }
  var chat =
    chatHead +
    "\n\n" +
    chatBullets +
    "\n\n" +
    (tone === "technical"
      ? "_Paste into #releases / eng — same scope as the tag, no invented claims._"
      : "_Paste into Discord or Slack — edit the voice to match your community._");

  var fullMarkdown = [
    "# ShipNote pack - " + (product || "Release") + (ver ? " " + ver : ""),
    "",
    "## Changelog",
    "",
    changelog,
    "",
    "## Customer email",
    "",
    emailBody,
    "",
    "## Social posts",
    "",
    social,
    "",
    "## GitHub Release body",
    "",
    github,
    "",
    "## Discord / Slack",
    "",
    chat,
    ""
  ].join("\n");

  return {
    product: product,
    version: ver,
    tone: tone,
    title: title,
    changelog: changelog,
    email: emailBody,
    social: social,
    github: github,
    chat: chat,
    fullMarkdown: fullMarkdown
  };
}


  var api = {
    parseBullets: parseBullets,
    capitalize: capitalize,
    polishBullet: polishBullet,
    shortTitleFromBullet: shortTitleFromBullet,
    titleFromBullets: titleFromBullets,
    formatDate: formatDate,
    benefitSubject: benefitSubject,
    narrativeLead: narrativeLead,
    packLead: packLead,
    applyTone: applyTone,
    polishPriorNotes: polishPriorNotes,
    buildPack: buildPack
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.ShipNotePack = api;
})(typeof window !== "undefined" ? window : globalThis);

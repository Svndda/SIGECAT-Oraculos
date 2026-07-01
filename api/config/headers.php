<?php
declare(strict_types=1);

// Baseline security response headers, applied to every request before routing.
// These are cheap, broadly-compatible hardening headers for a JSON API:
//  - nosniff      : stop browsers from MIME-sniffing responses.
//  - frame DENY   : the API is never meant to be embedded in a frame.
//  - no-referrer  : never leak the API URL (which may carry tokens) via Referer.
//  - no-store     : keep auth responses out of shared/browser caches.
// HSTS is intentionally left to the TLS-terminating proxy, which knows whether
// the deployment is served exclusively over HTTPS.
if (!headers_sent()) {
  header('X-Content-Type-Options: nosniff');
  header('X-Frame-Options: DENY');
  header('Referrer-Policy: no-referrer');
  header('Cache-Control: no-store');
}

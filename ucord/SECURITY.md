# Security notes

## Protections in this prototype

- User-entered text is length-limited, normalized, and HTML-escaped before it is inserted into the page. Values used in database paths, theme colors, visibility options, image sources, and account names are checked against narrow allowlists.
- Uploaded profile pictures and emoji are restricted to PNG, JPEG, GIF, or WebP, size and dimensions are bounded, and accepted files are decoded and re-encoded as browser-generated raster image data before use.
- Message, discovery, membership, and voice data are normalized and capped before rendering or passing signaling data to WebRTC. Database paths and request/response bodies also have size limits.
- Sensitive application data is not mirrored into the browser's local cache. The session stored in the current tab is still only a client-side convenience, not an authentication credential.
- The page uses a Content Security Policy. The included development server adds clickjacking, MIME-sniffing, referrer, permissions, and cache headers, binds to localhost, and serves only the app entrypoint and files under `src`.

## Important limitation

This is not ready for real accounts, private conversations, or sensitive information. The current app talks directly to a Realtime Database whose rules allow open access. A modified browser client can bypass every client-side check, read or change records, forge a session, impersonate users, join private spaces, and automate spam. The password verifier is also stored in that same database and could be copied for offline guessing. Client-side validation and page headers cannot enforce database authorization.

Before public use, move authentication to a trusted service and enforce access in backend/database rules: bind records to authenticated user IDs; restrict private data to authorized members; verify server ownership, invite validity, visibility, quotas, and uploads on a trusted backend; and add rate limits and abuse monitoring. Configure equivalent security headers at the production host. Do not reuse real passwords in this prototype.

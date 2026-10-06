Authentication and deployment

Authentication uses HttpOnly cookies. Production cookies are Secure and host-only (__Host-exam_session). Tokens are never returned to the frontend or read from localStorage; old bearer tokens are rejected. Every user must sign in again after this update.

Set a random JWT_SECRET of at least 32 characters in production. Use HTTPS and exact ALLOWED_ORIGINS. The trust proxy setting assumes one trusted reverse proxy; configure it for your hosting topology to prevent forged client IPs.

Same-site deployments use COOKIE_SAME_SITE=lax. Separate frontend/API sites require COOKIE_SAME_SITE=none and HTTPS; browsers that block third-party cookies require a same-site API proxy or shared site domain. Requests use credentials and a custom X-Exam-Request header. Mutations reject requests without that header, and the server CORS allowlist blocks foreign browser origins. External clients using bearer authentication must migrate to the cookie flow.

Login uses the account password. Previously enrolled authenticators are no longer required. Legacy enrollment fields remain hidden and unused; no MFA key or setup endpoint is needed. Password recovery endpoints remain disabled until verified email delivery is implemented.

Sessions and request limits

Tokens expire after eight hours unless JWT_EXPIRES_IN overrides the duration. Each request checks session revocation and account status. Password changes invalidate older sessions. Students retain one active login; staff can use multiple devices. Admins can revoke individual sessions; open clients check every thirty seconds. History is deleted thirty days after expiry.

API, login, and recovery attempt limits use atomic MongoDB counters shared by all instances using the same database and JWT_SECRET. Database failures fail closed with HTTP 503. Counters use fixed windows and expire automatically through a TTL index. Account lockouts add a fifteen-minute lock after ten failed password attempts.

Device names and user-agent strings are unverified information supplied by clients. They are never used for authorization or trusted-device decisions. This implementation does not cryptographically attest device hardware. HttpOnly cookies prevent JavaScript from reading the session token, but XSS can still issue requests while a user is signed in; continue to prevent XSS and review dependencies. Existing student password generation policy is unchanged.

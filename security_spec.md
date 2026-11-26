# Security Specification — Pulso Social

## 1. Data Invariants
1. **Single-Owner Personal Backend**: Only the verified agency administrator (`remanensfoto@gmail.com` with `email_verified == true`, or a UID explicitly present in `/admins/{uid}`) may create, update, or delete documents in `/agencySettings/{settingsId}` or `/reports/{reportId}`.
2. **Public Presentation Visibility Without PII**: Published reports (`isPublished == true`) and `/agencySettings/default` contain strictly brand/marketing statistics and zero PII (no emails, phone numbers, or addresses). Clients can read published reports directly or inside Google Sites iframes without signing in, while unpublished draft reports (`isPublished == false`) remain private to the admin.
3. **Immutable Ownership & Timestamps**: `ownerId` must equal `request.auth.uid` on create and remain immutable on update. `createdAt` must equal `request.time` on create and remain immutable on update. `updatedAt` must equal `request.time` on create and update.
4. **Strict Volumetric & Structural Guards**: All document IDs match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), all strings enforce explicit `.size()` bounds matching `firebase-blueprint.json`, `topPosts` arrays are capped at `size() <= 2` with element validation, and all numeric metrics are non-negative numbers.
5. **Admin Allowlist Immutability**: `/admins/{userId}` forbids all client writes (`create`, `update`, `delete`) and only allows an authenticated user to `get` their own document.

## 2. The "Dirty Dozen" Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Report Create**: Unauthenticated user tries to create `/reports/hack-1`.
2. **Non-Admin Authenticated Write**: Verified non-admin user (`other@example.com`) tries to update `/reports/demo-1`.
3. **Email Spoofing (Unverified Admin Email)**: User with email `remanensfoto@gmail.com` and `email_verified: false` tries to create `/reports/spoof-1`.
4. **Shadow / Ghost Field Injection**: Admin tries to create `/reports/shadow-1` with an extra undeclared field `isVerified: true`.
5. **OwnerId Spoofing**: Admin tries to create `/reports/owner-1` with `ownerId: "someone-else-uid"` instead of `request.auth.uid`.
6. **Immutable Field Tampering**: Admin tries to update `/reports/demo-1` changing `createdAt` or `ownerId`.
7. **Forged Client Timestamp**: Admin tries to create `/reports/time-1` with a client-generated timestamp instead of `request.time`.
8. **ID Poisoning**: Admin tries to write `/reports/invalid$id!with*bad@chars` or an ID > 128 chars.
9. **Oversized Array Poisoning**: Admin tries to save `facebook.topPosts` with 3 items (exceeds `size() <= 2`).
10. **Negative / Invalid Type Metric Poisoning**: Admin tries to update `facebook.reach` to `-500` or `"10000"`.
11. **Draft Leak to Public**: Unauthenticated client tries to `get` or `list` a draft report where `isPublished == false`.
12. **Self-Assigned Admin Escalation**: Authenticated user tries to create `/admins/{theirUid}` with `{ role: "admin" }`.

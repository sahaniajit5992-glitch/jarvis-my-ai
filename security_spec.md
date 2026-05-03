# Phase 0: Payload-First Security TDD

## 1. Data Invariants
- A User document can only be created, read, updated, or deleted by the user whose UID matches `userId`.
- A Message document must belong to the user (`userId` matches the authenticated user) and be stored in their own subcollection.
- Timestamps (`createdAt`, `updatedAt`, `timestamp`) must match the server request time.
- Roles are not implemented.

## 2. The "Dirty Dozen" Payloads
1. User identity spoofing: User A creates a user profile setting `userId` to User B's UID.
2. Cross-user message injection: User A writes a message to `users/UserB/messages/msg1`.
3. State bypassing: Ignoring `hasOnly()` checks when updating `isMuted`.
4. Extraneous fields: Adding an unknown field `isAdmin: true` to the User document.
5. Unauthorized read: User A attempts to read `users/UserB`.
6. Message spoofing: Providing an incorrect `userId` matching another user.
7. Type poisoning: Providing a string instead of boolean for `isMuted`.
8. List length exhaustion: Messages text larger than expected.
9. ID poisoning: Malicious characters in `userId` or `messageId`.
10. Immutable modification: Updating `createdAt`.
11. Update gap attack: Skipping `isValidMessage()` during update.
12. Temporal manipulation: Sending a past timestamp for `updatedAt`.

## 3. Test Runner
We will create `firestore.rules.test.ts`. Wait, this environment might restrict testing but I will write the rules to be mathematically impossible to bypass.

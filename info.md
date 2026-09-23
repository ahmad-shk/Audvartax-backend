Yes. I audited the **current `main` branch** of `mUZImil/foremint-backend`, not just the practices from our previous discussion. I also checked the recent commit history, which is useful because several important hardening practices were introduced after the earlier audit. The repository is now organized into application, auth, billing, commercial, health, and users modules, with shared core/config/middleware layers.

I would classify the result into **implemented concrete practices**, **abstract engineering principles**, and **remaining gaps**.

# 1. Concrete practices currently implemented

## A. Security

1. **Authentication-protected application APIs**

   - Application access is tied to the authenticated user.

2. **Authentication-protected billing APIs**

   - Billing operations operate against the authenticated identity rather than trusting a client-supplied user ID.

3. **Ownership authorization**

   - Application lookup verifies `application.userId === userId`.
   - This prevents one authenticated user from accessing another user's application.

4. **Ownership checks for documents**

   - Document retrieval/upload is tied to both the authenticated user and application ownership.

5. **Password hashing with Argon2id**

   - Passwords are never stored directly.
   - Argon2id is explicitly selected.

6. **Session-based authentication**

   - Authentication uses server-side sessions rather than trusting frontend identity state.

7. **Session expiration**

   - Sessions expire after a defined lifetime.
   - Expired sessions are removed when encountered.

8. **Safe public-user projection**

   - `passwordHash` is explicitly removed before user information is returned.

9. **Google credential cryptographic verification**

   - Google credentials are not blindly trusted.
   - Issuer, audience, algorithm, key ID, expiry, email verification, and RSA signature are checked.

10. **Google signing-key caching**

    - Google's JWK set is cached according to cache-control information, with bounded expiration.

11. **HTTP security headers**

    - Helmet is enabled.

12. **`X-Powered-By` disabled**

    - Express technology disclosure is reduced.

13. **CORS restriction**

    - CORS is configured around the known frontend origin and credentials.

14. **Rate limiting**

    - A global request rate limit is applied.

15. **JSON body-size limitation**

    - Normal JSON requests are limited to 1 MB.

16. **File upload size limitation**

    - Documents are capped at 10 MB.

17. **MIME-type allowlisting**

    - Only PDF/JPEG/PNG/WebP are accepted.

18. **File-signature validation**

    - The backend checks actual file signatures rather than trusting the supplied MIME type.

19. **Filename sanitization**

    - Uploaded filenames are normalized to a restricted character set and bounded length.

20. **Application lock enforcement**

    - Paid, processing, completed, and cancelled applications cannot receive new documents.

---

# 2. Application-domain integrity

21. **Explicit application state machine**

Current states include:

- `draft`
- `in_review`
- `ready_for_payment`
- `paid`
- `processing`
- `completed`
- `cancelled`

22. **Explicit allowed state transitions**

- Customer-controlled transitions are explicitly defined rather than allowing arbitrary status changes.

23. **Paid cannot be set through normal application update**

- The backend explicitly prevents a customer from changing an application to `paid`.

24. **Dedicated payment-owned transition**

- `markApplicationPaid()` exists separately from customer application updates.

25. **Immutable commercial lifecycle after payment**

- Paid/processing/completed/cancelled applications are locked.

26. **Deletion restrictions**

- Locked applications cannot be deleted.

27. **Server-side readiness validation**

- An application cannot simply claim it is ready for payment.
- Required application information is validated server-side.

28. **Service-specific validation**

- Different services have different required information.

29. **Commercial selection validation**

- Service, package, variant, jurisdiction, and add-ons are checked against the backend commercial catalog.

30. **Canonical commercial catalog**

- Services and their commercial options are defined centrally rather than scattered across controllers.

31. **Variant validation**

- Services supporting variants require valid variants.

32. **Package validation**

- Invalid packages are rejected.

33. **Jurisdiction validation**

- Invalid formation jurisdictions are rejected.

34. **Add-on validation**

- Unknown add-ons are rejected.

35. **Duplicate add-on normalization**

- Pricing iterates over `new Set(addOnSlugs)`, preventing duplicate add-on entries.

36. **Commercial/application consistency validation**

- For USA LLC, the selected formation state must agree with the application's formation-state answer.

37. **USA LLC member cardinality validation**

- Single-member LLC → exactly one member.
- Multi-member LLC → at least two.

38. **Ownership percentage validation**

- Individual ownership percentages must be valid and collectively total 100%.

39. **Member identity integrity**

- Member identity changes can invalidate the previous member identity relationship.

40. **Stale member-document invalidation**

- Documents belonging to invalidated/removed members are cleaned up.

41. **Service-specific document requirements**

- The backend determines which documents must exist before submission/checkout.

42. **Document-to-member ownership validation**

- A member document must reference an actual member belonging to the application.

43. **Application-document ownership separation**

- Application-level documents cannot arbitrarily specify a member owner ID.

---

# 3. Billing/payment integrity

This is one of the strongest parts of the current backend.

44. **Backend-owned pricing**

The client does not determine the payable amount.

45. **Canonical commercial catalog drives billing**

- Billing pricing comes from the backend commercial catalog.

46. **No client-supplied payment amount**

- We explicitly removed the client price as an authority.

47. **Pricing snapshot**

- Billing orders store calculated line items/subtotal/total rather than recalculating the historical order from mutable client state.

48. **Line-item representation**

- Billing uses explicit line items with quantity, unit amount, total, currency, and key.

49. **Canonical variant pricing**

- ITIN and International EIN variants are priced through the commercial catalog.

50. **Jurisdiction filing fees**

- USA LLC state fees are incorporated into backend pricing.

51. **Add-on pricing**

- Defined catalog add-ons can contribute to the backend-calculated total.

52. **Payment readiness gate**

- A billing order cannot be created for an arbitrary application state.

53. **`ready_for_payment` requirement**

- The application must actually be ready before billing is created.

54. **Existing-order reuse**

- Creating billing for an application with an existing order returns the existing order rather than blindly creating another one.

55. **Billing order persistence**

- Billing orders survive backend restarts through persistent storage.

56. **Pending-order commercial lock**

- Once a pending billing order exists, commercial selections cannot be modified.

57. **Duplicate-payment protection**

- A paid order/application cannot be paid again.

58. **Concurrent payment protection**

- Payment operations are serialized per application using a lock.

59. **Atomicity-minded payment flow**

- The order is marked paid, then the application is transitioned.
- If application transition fails, the billing order is rolled back to pending.

60. **Separation of customer mutation and payment mutation**

- Payment has its own domain transition instead of abusing generic customer update functionality.

61. **Billing/application synchronization**

- The backend treats the billing state and application state as related domain state rather than independent UI flags.

---

# 4. Document-management practices

62. **Dedicated document service**

63. **Dedicated document storage abstraction**

64. **Document metadata separated from binary storage**

65. **Storage key abstraction**

- Application/document identity is represented independently from physical storage.

66. **Replacement semantics**

- Uploading the same logical document replaces the previous reference.

67. **Idempotent document replacement**

- Repeated replacement does not create uncontrolled duplicate logical documents.

68. **Cleanup of replaced files**

- Old physical files are deleted after successful replacement.

69. **Compensating cleanup**

- If storage succeeds but metadata persistence fails, the newly written file is deleted.

70. **Actionable storage errors**

- Storage failures are converted into controlled domain errors.

71. **Rejected documents are not exposed**

- Retrieval excludes rejected document references.

---

# 5. Architecture practices

72. **Modular backend architecture**

Current modules include:

- auth
- users
- applications
- billing
- commercial
- health

73. **Controller/service/store separation**

74. **Domain types separated from implementation**

75. **Routes separated from controllers**

76. **Shared core layer**

77. **Centralized error abstraction**

78. **Centralized error handler**

79. **Centralized configuration**

80. **Centralized JSON persistence abstraction**

81. **Storage abstraction**

- Application persistence does not need to know the underlying persistence mechanism.

82. **Document storage abstraction**

- The domain does not directly depend on a particular file-storage implementation.

83. **Commercial catalog abstraction**

- Billing consumes commercial definitions rather than duplicating pricing knowledge.

84. **Compatibility-adapter pattern**

- The billing catalog was deliberately evolved into an adapter around the canonical commercial catalog.

85. **Vercel-compatible entry point**

- The repository has an API entry point designed for the deployment environment.

86. **ESM-consistent imports**

- Recent work explicitly fixed middleware imports for the Vercel TypeScript build.

---

# 6. Validation/error-handling practices

87. **Explicit domain errors**

Examples include:

- `APPLICATION_LOCKED`
- `INVALID_STATUS_TRANSITION`
- `INVALID_PAYMENT_STATE`
- `INVALID_SERVICE`
- `INVALID_VARIANT`
- `INVALID_PACKAGE`
- `INVALID_JURISDICTION`
- `INVALID_ADD_ON`
- `MISSING_APPLICATION_DATA`
- `MISSING_DOCUMENT`
- `INVALID_FILE_TYPE`
- `FILE_TOO_LARGE`
- `INVALID_FILE_CONTENT`

This is substantially better than returning generic `"Something went wrong"` errors.

88. **HTTP semantics**

- Authentication failures → 401.
- Conflicts → 409.
- unavailable configuration → 503.
- missing routes → 404.

89. **Centralized error response format**

- API errors use a structured `{ success, error }` pattern.

90. **Actionable validation errors**

- Backend tells the client what type of validation failed rather than only returning a generic failure.

91. **Controlled failure instead of leaking raw exceptions**

- Domain failures are translated through the error-handling layer.

---

# 7. Persistence/data practices

92. **Server-side persistence**

- Application state is no longer dependent on browser/localStorage.

93. **Persistent billing state**

- Billing orders are persisted.

94. **Persistent sessions**

- Sessions are stored server-side.

95. **Persistent users**

- User accounts are stored server-side.

96. **Asynchronous persistence**

- Store operations are async rather than pretending filesystem/database operations are synchronous.

97. **Generic `JsonStore` abstraction**

- JSON persistence is centralized rather than duplicated throughout modules.

98. **Data-path stability**

- Recent work deliberately preserved application and billing storage paths during refactoring.

99. **Future database migration boundary**

- The persistence abstraction provides a natural replacement point for PostgreSQL/Drizzle.

---

# 8. Concurrency practices

100. **Account creation lock**

- Because JSON storage lacks database uniqueness constraints, concurrent account creation is serialized.

101. **Explicit future database invariant**

- The implementation itself documents that the eventual database should enforce email uniqueness through a database constraint/transaction.

102. **Payment lock**

- Concurrent payment requests for the same application are serialized.

103. **Compare-before-write behavior**

- Important state transitions re-read authoritative state before mutation.

104. **Rollback after partial state transition**

- Payment handles the possibility that one side succeeds while the other fails.

---

# 9. Testing/engineering practices

105. **Backend test runner exists**

106. **Application service tests exist**

107. **Application ownership tests**

108. **Application persistence tests**

109. **Lifecycle tests**

110. **Document lifecycle testing**

- The commit history explicitly shows tests around USA LLC member/document lifecycle.

111. **CI pipeline**

- Backend CI includes typecheck/build/test stages.

112. **Dependency lockfile**

- `package-lock.json` is maintained.

113. **Deterministic dependency installation**

- Dependency-locking was explicitly hardened.

114. **Production typecheck separation**

- Unconfigured test files were excluded from the production typecheck rather than allowing test configuration to contaminate production builds.

115. **Incremental regression-oriented development**

- Major backend hardening has been done in small, isolated commits rather than one enormous rewrite.

---

# 10. Operational/API practices

116. **API versioning**

Current API namespace:

`/api/v1/...`

117. **Health endpoint**

118. **Root API status endpoint**

119. **404 fallback**

120. **Structured API responses**

121. **HTTP request logging**

- `pino-http` is integrated.

122. **Centralized application logger**

- Logging is abstracted through the logger utility.

123. **Environment configuration**

- Environment values are centralized rather than scattered throughout application code.

124. **Explicit deployment compatibility**

- The recent Vercel/ESM work demonstrates that deployment constraints are being treated as engineering constraints rather than patched manually at the end.

---

# 11. Abstract practices

This is the part you specifically asked for.

These are **higher-level engineering principles that the backend embodies**, rather than individual implementation techniques.

## A. Trust-boundary principles

125. **Never trust the client with authoritative business state.**

126. **Treat the frontend as a requester, not an authority.**

127. **Re-validate important business decisions server-side.**

128. **Derive identity from authentication context rather than request claims.**

129. **Derive money from server-controlled commercial definitions rather than UI state.**

130. **Derive lifecycle permissions from server state rather than button visibility.**

---

## B. State-management principles

131. **Explicit state machines over implicit state.**

132. **Monotonic lifecycle progression where appropriate.**

133. **Illegal states should be unrepresentable or rejected.**

134. **State transitions should have explicit owners.**

135. **Customer state changes and system-owned state changes should be separated.**

136. **Immutable-after-commit principle**

- Once an economically meaningful commitment occurs, mutable customer input should be frozen.

137. **State synchronization across related aggregates**

- Application and billing cannot evolve independently without consequences.

---

## C. Consistency principles

138. **Single source of truth**

139. **Canonical data ownership**

140. **No duplicated business rules**

141. **Snapshot important historical business decisions**

142. **Prevent mutable state from rewriting historical commercial meaning**

143. **Compensating actions when true transactions are unavailable**

144. **Consistency before convenience**

---

## D. Security principles

145. **Defense in depth**

146. **Least privilege**

147. **Explicit authorization rather than implicit access**

148. **Validate at trust boundaries**

149. **Allowlist rather than blocklist where possible**

150. **Minimize sensitive data exposure**

151. **Fail closed**

152. **Never assume UI restrictions are security controls**

153. **Treat uploaded files as hostile input**

154. **Separate authentication from authorization**

---

## E. Domain-driven design principles

155. **Business rules belong near the domain rather than inside UI code.**

156. **Domain concepts deserve explicit names.**

157. **Domain invariants should be centralized.**

158. **Services orchestrate business operations.**

159. **Stores handle persistence concerns.**

160. **Controllers handle transport concerns.**

161. **Storage mechanisms should not define business semantics.**

162. **Commercial catalog represents a domain concept rather than arbitrary constants.**

---

## F. Reliability principles

163. **Idempotency**

164. **Concurrency awareness**

165. **Partial-failure awareness**

166. **Rollback/compensation**

167. **Persistent state across process restarts**

168. **Deterministic dependencies**

169. **Controlled failure modes**

170. **Actionable failure reporting**

171. **Avoid race conditions around uniqueness and payment**

---

## G. Evolution principles

172. **Abstraction before infrastructure replacement**

- JSON storage can eventually be replaced by PostgreSQL without forcing the domain layer to understand PostgreSQL.

173. **Migration-friendly architecture**

174. **Compatibility layers instead of destructive rewrites**

175. **Preserve existing data paths/contracts during refactoring**

176. **Incremental hardening**

177. **Regression-oriented changes**

178. **Separate current implementation from future infrastructure**

179. **Deployment constraints treated as architecture constraints**

---

# 12. The deepest architectural principles currently present

If I reduce the entire backend to its most important abstract ideas, I would say Foremint currently follows these **15 core principles**:

1. **Server authority**
2. **Explicit domain state**
3. **Explicit state transitions**
4. **Ownership-based authorization**
5. **Defense in depth**
6. **Canonical business rules**
7. **Single source of commercial truth**
8. **Immutable business commitments**
9. **Persistence independence**
10. **Separation of concerns**
11. **Idempotency**
12. **Concurrency safety**
13. **Compensating failure handling**
14. **Incremental evolution**
15. **Frontend/backend trust-boundary separation**

And the most important architectural sentence remains:

> **The frontend displays and requests; the backend authenticates, authorizes, validates, calculates, persists, and decides.**

That principle is now visible throughout the application, document, commercial, and billing domains—not merely as a frontend convention.

---

Abstract rules
Trust:
Never trust client authority.
Authenticate before authorizing.
Authorize before accessing data.
Validate again at every security boundary.
Never derive security decisions from UI state.
State:
Every important lifecycle needs explicit states.
Every state transition needs an owner.
Illegal transitions must fail closed.
Committed business state should become immutable where appropriate.
Related state must transition consistently.
Money:
The client never determines what it owes.
Pricing comes from a canonical catalog.
Financial records should be historically immutable.
Payment operations must be idempotent.
Payment settlement must eventually reconcile with the external provider.
Data:
One canonical source of truth per domain fact.
Persistence mechanism should not dictate domain behavior.
Sensitive data requires explicit lifecycle management.
Historical facts should not be silently rewritten.
Data should be minimized, classified, retained, and deleted deliberately.
Reliability:
Assume requests can be duplicated.
Assume requests can arrive concurrently.
Assume processes can crash halfway through an operation.
Assume external services can fail.
Design compensation or transactions before they are needed.
Security:
Defense in depth.
Least privilege.
Allowlist inputs.
Fail closed.
Never expose secrets unnecessarily.
Treat uploaded files as hostile.
Treat external credentials as untrusted until cryptographically verified.
Architecture:
Controllers translate HTTP.
Services enforce business behavior.
Repositories/stores handle persistence.
Infrastructure implements external concerns.
Domain rules should not be duplicated.
Infrastructure should be replaceable.
Evolution:
Prefer additive evolution over destructive rewrites.
Preserve existing contracts unless intentionally versioning them.
Make one architectural change at a time.
Test the invariant after each change.
Do not mark a future architecture as implemented.

;; Certification Contract
;; Clarity v2
;; Manages certifications for mineral batches, including issuance, revocation, and expiration

(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-BATCH u101)
(define-constant ERR-INVALID-CERTIFIER u102)
(define-constant ERR-CERTIFICATION-EXISTS u103)
(define-constant ERR-CERTIFICATION-NOT-FOUND u104)
(define-constant ERR-CERTIFICATION-EXPIRED u105)
(define-constant ERR-PAUSED u106)
(define-constant ERR-INVALID-CERTIFICATION-TYPE u107)
(define-constant ERR-INVALID-EXPIRY u108)
(define-constant ERR-ZERO-ADDRESS u109)
(define-constant ERR-ALREADY-VERIFIED u110)

;; Contract metadata
(define-constant CONTRACT-NAME "EthicalTrace Certification")
(define-constant VERSION "1.0.0")

;; Admin and contract state
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var certifier-count uint u0)

;; Certification types (e.g., conflict-free, carbon-assessed)
(define-constant CERT-TYPE-CONFLICT-FREE u1)
(define-constant CERT-TYPE-CARBON-ASSESSED u2)
(define-constant CERT-TYPE-RMI-COMPLIANT u3)

;; Data structures
(define-map certifiers principal { active: bool, added-at: uint })
(define-map certifications { batch-id: uint, cert-type: uint } {
  issuer: principal,
  issued-at: uint,
  expiry: uint,
  status: bool,
  metadata: (string-utf8 256)
})
(define-map batch-verifications { batch-id: uint, cert-type: uint, verifier: principal } bool)

;; Private helper: is-admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Private helper: ensure not paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-PAUSED))
)

;; Private helper: is-valid-cert-type
(define-private (is-valid-cert-type (cert-type uint))
  (or (is-eq cert-type CERT-TYPE-CONFLICT-FREE)
      (is-eq cert-type CERT-TYPE-CARBON-ASSESSED)
      (is-eq cert-type CERT-TYPE-RMI-COMPLIANT))
)

;; Private helper: is-valid-batch-id
(define-private (is-valid-batch-id (batch-id uint))
  (> batch-id u0)
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (ok true)
  )
)

;; Pause/unpause the contract
(define-public (set-paused (pause bool))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (ok pause)
  )
)

;; Add a certifier
(define-public (add-certifier (certifier principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq certifier 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (is-none (map-get? certifiers certifier)) (err ERR-INVALID-CERTIFIER))
    (map-set certifiers certifier { active: true, added-at: block-height })
    (var-set certifier-count (+ (var-get certifier-count) u1))
    (ok true)
  )
)

;; Remove a certifier
(define-public (remove-certifier (certifier principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-some (map-get? certifiers certifier)) (err ERR-INVALID-CERTIFIER))
    (map-set certifiers certifier { active: false, added-at: (unwrap-panic (get added-at (map-get? certifiers certifier))) })
    (var-set certifier-count (- (var-get certifier-count) u1))
    (ok true)
  )
)

;; Issue a certification
(define-public (issue-certification (batch-id uint) (cert-type uint) (expiry uint) (metadata (string-utf8 256)))
  (begin
    (ensure-not-paused)
    (asserts! (is-valid-batch-id batch-id) (err ERR-INVALID-BATCH))
    (asserts! (is-some (map-get? certifiers tx-sender)) (err ERR-INVALID-CERTIFIER))
    (asserts! (get active (unwrap-panic (map-get? certifiers tx-sender))) (err ERR-INVALID-CERTIFIER))
    (asserts! (is-valid-cert-type cert-type) (err ERR-INVALID-CERTIFICATION-TYPE))
    (asserts! (> expiry block-height) (err ERR-INVALID-EXPIRY))
    (asserts! (is-none (map-get? certifications { batch-id: batch-id, cert-type: cert-type })) (err ERR-CERTIFICATION-EXISTS))
    (map-set certifications
      { batch-id: batch-id, cert-type: cert-type }
      { issuer: tx-sender, issued-at: block-height, expiry: expiry, status: true, metadata: metadata }
    )
    (ok true)
  )
)

;; Revoke a certification
(define-public (revoke-certification (batch-id uint) (cert-type uint))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-valid-batch-id batch-id) (err ERR-INVALID-BATCH))
    (asserts! (is-valid-cert-type cert-type) (err ERR-INVALID-CERTIFICATION-TYPE))
    (asserts! (is-some (map-get? certifications { batch-id: batch-id, cert-type: cert-type })) (err ERR-CERTIFICATION-NOT-FOUND))
    (let ((cert (unwrap-panic (map-get? certifications { batch-id: batch-id, cert-type: cert-type }))))
      (asserts! (< block-height (get expiry cert)) (err ERR-CERTIFICATION-EXPIRED))
      (map-set certifications { batch-id: batch-id, cert-type: cert-type }
        (merge cert { status: false }))
      (ok true)
    )
  )
)

;; Verify a certification by a third party
(define-public (verify-certification (batch-id uint) (cert-type uint))
  (begin
    (ensure-not-paused)
    (asserts! (is-valid-batch-id batch-id) (err ERR-INVALID-BATCH))
    (asserts! (is-valid-cert-type cert-type) (err ERR-INVALID-CERTIFICATION-TYPE))
    (asserts! (is-some (map-get? certifications { batch-id: batch-id, cert-type: cert-type })) (err ERR-CERTIFICATION-NOT-FOUND))
    (asserts! (is-none (map-get? batch-verifications { batch-id: batch-id, cert-type: cert-type, verifier: tx-sender })) (err ERR-ALREADY-VERIFIED))
    (let ((cert (unwrap-panic (map-get? certifications { batch-id: batch-id, cert-type: cert-type }))))
      (asserts! (< block-height (get expiry cert)) (err ERR-CERTIFICATION-EXPIRED))
      (asserts! (get status cert) (err ERR-CERTIFICATION-NOT-FOUND))
      (map-set batch-verifications { batch-id: batch-id, cert-type: cert-type, verifier: tx-sender } true)
      (ok true)
    )
  )
)

;; Read-only: check certification status
(define-read-only (get-certification-status (batch-id uint) (cert-type uint))
  (match (map-get? certifications { batch-id: batch-id, cert-type: cert-type })
    cert (ok {
      issuer: (get issuer cert),
      issued-at: (get issued-at cert),
      expiry: (get expiry cert),
      status: (get status cert),
      metadata: (get metadata cert)
    })
    (err ERR-CERTIFICATION-NOT-FOUND)
  )
)

;; Read-only: check if address is certifier
(define-read-only (is-certifier (account principal))
  (match (map-get? certifiers account)
    certifier (ok (get active certifier))
    (err ERR-INVALID-CERTIFIER)
  )
)

;; Read-only: get certifier count
(define-read-only (get-certifier-count)
  (ok (var-get certifier-count))
)

;; Read-only: get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: check if paused
(define-read-only (is-paused)
  (ok (var-get paused))
)
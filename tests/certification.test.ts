import { describe, it, expect, beforeEach } from "vitest";

interface Certification {
  issuer: string;
  issuedAt: bigint;
  expiry: bigint;
  status: boolean;
  metadata: string;
}

interface Certifier {
  active: boolean;
  addedAt: bigint;
}

const mockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  paused: false,
  certifierCount: 0n,
  certifiers: new Map<string, Certifier>(),
  certifications: new Map<string, Certification>(),
  verifications: new Map<string, boolean>(),
  blockHeight: 1000n,

  isAdmin(caller: string): boolean {
    return caller === this.admin;
  },

  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number } {
    if (!this.isAdmin(caller)) return { error: 100 };
    this.paused = pause;
    return { value: pause };
  },

  addCertifier(caller: string, certifier: string): { value: boolean } | { error: number } {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (certifier === "SP000000000000000000002Q6VF78") return { error: 109 };
    if (this.certifiers.has(certifier)) return { error: 102 };
    this.certifiers.set(certifier, { active: true, addedAt: this.blockHeight });
    this.certifierCount += 1n;
    return { value: true };
  },

  removeCertifier(caller: string, certifier: string): { value: boolean } | { error: number } {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (!this.certifiers.has(certifier)) return { error: 102 };
    const certifierData = this.certifiers.get(certifier)!;
    this.certifiers.set(certifier, { active: false, addedAt: certifierData.addedAt });
    this.certifierCount -= 1n;
    return { value: true };
  },

  issueCertification(
    caller: string,
    batchId: bigint,
    certType: bigint,
    expiry: bigint,
    metadata: string
  ): { value: boolean } | { error: number } {
    if (this.paused) return { error: 106 };
    if (!this.certifiers.has(caller) || !this.certifiers.get(caller)!.active) return { error: 102 };
    if (certType < 1n || certType > 3n) return { error: 107 };
    if (expiry <= this.blockHeight) return { error: 108 };
    const key = `${batchId}-${certType}`;
    if (this.certifications.has(key)) return { error: 103 };
    this.certifications.set(key, {
      issuer: caller,
      issuedAt: this.blockHeight,
      expiry,
      status: true,
      metadata,
    });
    return { value: true };
  },

  revokeCertification(caller: string, batchId: bigint, certType: bigint): { value: boolean } | { error: number } {
    if (!this.isAdmin(caller)) return { error: 100 };
    const key = `${batchId}-${certType}`;
    if (!this.certifications.has(key)) return { error: 104 };
    const cert = this.certifications.get(key)!;
    if (this.blockHeight >= cert.expiry) return { error: 105 };
    this.certifications.set(key, { ...cert, status: false });
    return { value: true };
  },

  verifyCertification(caller: string, batchId: bigint, certType: bigint): { value: boolean } | { error: number } {
    if (this.paused) return { error: 106 };
    const certKey = `${batchId}-${certType}`;
    if (!this.certifications.has(certKey)) return { error: 104 };
    const cert = this.certifications.get(certKey)!;
    if (this.blockHeight >= cert.expiry) return { error: 105 };
    if (!cert.status) return { error: 104 };
    const verKey = `${batchId}-${certType}-${caller}`;
    if (this.verifications.has(verKey)) return { error: 110 };
    this.verifications.set(verKey, true);
    return { value: true };
  },

  getCertificationStatus(batchId: bigint, certType: bigint): { value: Certification } | { error: number } {
    const key = `${batchId}-${certType}`;
    const cert = this.certifications.get(key);
    if (!cert) return { error: 104 };
    return {
      value: {
        issuer: cert.issuer,
        issuedAt: cert.issuedAt,
        expiry: cert.expiry,
        status: cert.status,
        metadata: cert.metadata,
      },
    };
  },
};

describe("EthicalTrace Certification Contract", () => {
  beforeEach(() => {
    mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.paused = false;
    mockContract.certifierCount = 0n;
    mockContract.certifiers = new Map();
    mockContract.certifications = new Map();
    mockContract.verifications = new Map();
    mockContract.blockHeight = 1000n;
  });

  it("should add a certifier when called by admin", () => {
    const result = mockContract.addCertifier(mockContract.admin, "ST2CY5...");
    expect(result).toEqual({ value: true });
    expect(mockContract.certifiers.get("ST2CY5...")).toEqual({ active: true, addedAt: 1000n });
    expect(mockContract.certifierCount).toBe(1n);
  });

  it("should prevent non-admin from adding certifier", () => {
    const result = mockContract.addCertifier("ST2CY5...", "ST3NB...");
    expect(result).toEqual({ error: 100 });
  });

  it("should prevent adding zero address as certifier", () => {
    const result = mockContract.addCertifier(mockContract.admin, "SP000000000000000000002Q6VF78");
    expect(result).toEqual({ error: 109 });
  });

  it("should remove a certifier when called by admin", () => {
    mockContract.addCertifier(mockContract.admin, "ST2CY5...");
    const result = mockContract.removeCertifier(mockContract.admin, "ST2CY5...");
    expect(result).toEqual({ value: true });
    expect(mockContract.certifiers.get("ST2CY5...")).toEqual({ active: false, addedAt: 1000n });
    expect(mockContract.certifierCount).toBe(0n);
  });

  it("should issue a certification by valid certifier", () => {
    mockContract.addCertifier(mockContract.admin, "ST2CY5...");
    const result = mockContract.issueCertification("ST2CY5...", 1n, 1n, 2000n, "Conflict-free");
    expect(result).toEqual({ value: true });
    const cert = mockContract.getCertificationStatus(1n, 1n);
    expect(cert).toEqual({
      value: {
        issuer: "ST2CY5...",
        issuedAt: 1000n,
        expiry: 2000n,
        status: true,
        metadata: "Conflict-free",
      },
    });
  });

  it("should prevent issuing certification with invalid type", () => {
    mockContract.addCertifier(mockContract.admin, "ST2CY5...");
    const result = mockContract.issueCertification("ST2CY5...", 1n, 4n, 2000n, "Invalid");
    expect(result).toEqual({ error: 107 });
  });

  it("should prevent issuing certification with expired block height", () => {
    mockContract.addCertifier(mockContract.admin, "ST2CY5...");
    const result = mockContract.issueCertification("ST2CY5...", 1n, 1n, 500n, "Conflict-free");
    expect(result).toEqual({ error: 108 });
  });

  it("should revoke a certification by admin", () => {
    mockContract.addCertifier(mockContract.admin, "ST2CY5...");
    mockContract.issueCertification("ST2CY5...", 1n, 1n, 2000n, "Conflict-free");
    const result = mockContract.revokeCertification(mockContract.admin, 1n, 1n);
    expect(result).toEqual({ value: true });
    const cert = mockContract.getCertificationStatus(1n, 1n);
    if ("value" in cert) {
      expect(cert.value.status).toBe(false);
    } else {
      throw new Error("Expected certification status to be available");
    }
  });

  it("should allow verification of a certification", () => {
    mockContract.addCertifier(mockContract.admin, "ST2CY5...");
    mockContract.issueCertification("ST2CY5...", 1n, 1n, 2000n, "Conflict-free");
    const result = mockContract.verifyCertification("ST3NB...", 1n, 1n);
    expect(result).toEqual({ value: true });
    expect(mockContract.verifications.get("1-1-ST3NB...")).toBe(true);
  });

  it("should prevent verification of non-existent certification", () => {
    const result = mockContract.verifyCertification("ST3NB...", 1n, 1n);
    expect(result).toEqual({ error: 104 });
  });

  it("should prevent duplicate verification", () => {
    mockContract.addCertifier(mockContract.admin, "ST2CY5...");
    mockContract.issueCertification("ST2CY5...", 1n, 1n, 2000n, "Conflict-free");
    mockContract.verifyCertification("ST3NB...", 1n, 1n);
    const result = mockContract.verifyCertification("ST3NB...", 1n, 1n);
    expect(result).toEqual({ error: 110 });
  });

  it("should not allow actions when paused", () => {
    mockContract.setPaused(mockContract.admin, true);
    const certResult = mockContract.issueCertification("ST2CY5...", 1n, 1n, 2000n, "Conflict-free");
    const verResult = mockContract.verifyCertification("ST3NB...", 1n, 1n);
    expect(certResult).toEqual({ error: 106 });
    expect(verResult).toEqual({ error: 106 });
  });
});
import { jest, describe, it, expect } from "@jest/globals";

// Mock env before importing
jest.unstable_mockModule("../../src/config/env.js", () => ({
  env: { SECRET_KEY: "test-encryption-secret-key-1234" },
}));

const { security } = await import("../../src/utils/encryptDecrypt.js");

describe("Encryption / Decryption", () => {
  const plainText = "MySecurePassword123!";

  it("should encrypt a plaintext string", () => {
    const encrypted = security.encryption(plainText);
    expect(encrypted).toBeDefined();
    expect(typeof encrypted).toBe("string");
    // format: salt:iv:encrypted (hex:hex:hex)
    const parts = encrypted.split(":");
    expect(parts.length).toBe(3);
  });

  it("encrypted value should differ from plaintext", () => {
    const encrypted = security.encryption(plainText);
    expect(encrypted).not.toBe(plainText);
  });

  it("should decrypt back to original plaintext", () => {
    const encrypted = security.encryption(plainText);
    const decrypted = security.decryption(encrypted);
    expect(decrypted).toBe(plainText);
  });

  it("should produce different ciphertexts for same input (random salt/iv)", () => {
    const enc1 = security.encryption(plainText);
    const enc2 = security.encryption(plainText);
    expect(enc1).not.toBe(enc2); // different salt + IV each time
  });

  it("comparison should return true for matching password", () => {
    const encrypted = security.encryption(plainText);
    const result = security.comparison(plainText, encrypted);
    expect(result).toBe(true);
  });

  it("comparison should return false for wrong password", () => {
    const encrypted = security.encryption(plainText);
    const result = security.comparison("WrongPassword", encrypted);
    expect(result).toBe(false);
  });

  it("comparison should return false for tampered ciphertext", () => {
    const result = security.comparison(plainText, "bad:data:here");
    expect(result).toBe(false);
  });
});

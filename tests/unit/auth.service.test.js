import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// ── Mocks ────────────────────────────────────────────────────────────
const mockAuthRepo = {
  findUserByEmailOrPhone: jest.fn(),
  createUser: jest.fn(),
  findUserById: jest.fn(),
  updateUserById: jest.fn(),
};

const mockSecurity = {
  encryption: jest.fn(),
  comparison: jest.fn(),
};

let mockJwtSign = jest.fn();

jest.unstable_mockModule("../../src/repositories/auth.repo.js", () => ({
  authRepo: mockAuthRepo,
}));
jest.unstable_mockModule("../../src/utils/encryptDecrypt.js", () => ({
  security: mockSecurity,
}));
jest.unstable_mockModule("jsonwebtoken", () => ({
  default: { sign: (...args) => mockJwtSign(...args) },
}));
jest.unstable_mockModule("../../src/config/env.js", () => ({
  env: { JWT_SECRET: "test-secret", JWT_EXPIRY: "1d" },
}));

const { authService } = await import("../../src/services/auth.service.js");

// ── Helpers ──────────────────────────────────────────────────────────
const fakeUser = {
  id: 1,
  full_name: "John Doe",
  email: "john@test.com",
  phone: "91234567",
  role: "CUSTOMER",
  password_ecrypt: "encrypted-pw",
};

beforeEach(() => jest.clearAllMocks());

// =====================================================================
// register()
// =====================================================================
describe("authService.register", () => {
  it("should throw 400 when email, phone or password is missing", async () => {
    await expect(
      authService.register({ name: "A", email: "", phone: "", password: "" }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should throw 400 when name is empty/blank", async () => {
    await expect(
      authService.register({
        name: "  ",
        email: "a@b.com",
        phone: "123",
        password: "12345678",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should throw 400 when password < 8 chars", async () => {
    await expect(
      authService.register({
        name: "Joe",
        email: "a@b.com",
        phone: "123",
        password: "short",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should throw 409 when user already exists", async () => {
    mockAuthRepo.findUserByEmailOrPhone.mockResolvedValue(fakeUser);
    await expect(
      authService.register({
        name: "Joe",
        email: "john@test.com",
        phone: "91234567",
        password: "password123",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("should create user, encrypt password, sign token and return", async () => {
    mockAuthRepo.findUserByEmailOrPhone.mockResolvedValue(null);
    mockSecurity.encryption.mockReturnValue("encrypted-pw");
    mockAuthRepo.createUser.mockResolvedValue(fakeUser);
    mockJwtSign.mockReturnValue("fake-jwt");

    const result = await authService.register({
      name: "John Doe",
      email: "john@test.com",
      phone: "91234567",
      password: "password123",
      role: "CUSTOMER",
    });

    expect(mockSecurity.encryption).toHaveBeenCalledWith("password123");
    expect(mockAuthRepo.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "john@test.com",
        password_ecrypt: "encrypted-pw",
      }),
    );
    expect(result.token).toBe("fake-jwt");
    expect(result.user.email).toBe("john@test.com");
  });

  it("should throw 500 when createUser returns falsy", async () => {
    mockAuthRepo.findUserByEmailOrPhone.mockResolvedValue(null);
    mockSecurity.encryption.mockReturnValue("enc");
    mockAuthRepo.createUser.mockResolvedValue(null);

    await expect(
      authService.register({
        name: "Joe",
        email: "a@b.com",
        phone: "123",
        password: "password123",
      }),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});

// =====================================================================
// login()
// =====================================================================
describe("authService.login", () => {
  it("should throw 400 when no email and no phone", async () => {
    await expect(
      authService.login(null, "password123", null),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should throw 400 when no password", async () => {
    await expect(
      authService.login("a@b.com", null, null),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should throw 404 when user not found", async () => {
    mockAuthRepo.findUserByEmailOrPhone.mockResolvedValue(null);
    await expect(
      authService.login("no@user.com", "pass1234", null),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should throw 401 when password is wrong", async () => {
    mockAuthRepo.findUserByEmailOrPhone.mockResolvedValue(fakeUser);
    mockSecurity.comparison.mockReturnValue(false);

    await expect(
      authService.login("john@test.com", "wrongpass", null),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("should return token and user on successful login", async () => {
    mockAuthRepo.findUserByEmailOrPhone.mockResolvedValue(fakeUser);
    mockSecurity.comparison.mockReturnValue(true);
    mockJwtSign.mockReturnValue("login-jwt");

    const result = await authService.login(
      "john@test.com",
      "password123",
      null,
    );
    expect(result.token).toBe("login-jwt");
    expect(result.user.id).toBe(1);
    expect(result.user.email).toBe("john@test.com");
  });
});

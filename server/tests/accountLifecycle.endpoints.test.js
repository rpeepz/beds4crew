const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";

const express = require("express");
const cookieParser = require("cookie-parser");
const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { MongoMemoryServer } = require("mongodb-memory-server");

jest.setTimeout(60000);

const authRoutes = require("../routes/auth");
const userRoutes = require("../routes/user");
const ticketRoutes = require("../routes/tickets");
const User = require("../models/User");
const Ticket = require("../models/Ticket");
const emailService = require("../utils/emailService");
const { generateTokens } = require("../utils/tokenHelpers");

const makeAuthCookie = (userDoc) => {
  const { accessToken } = generateTokens(userDoc);
  return `b4c_access=${accessToken}`;
};

const createUser = async (overrides = {}) => {
  const password = overrides.password || "Passw0rd!";
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    firstName: "Test",
    lastName: "User",
    email: overrides.email || `user-${Date.now()}-${Math.random()}@example.com`,
    password: hashedPassword,
    role: "guest",
    isActive: true,
    ...overrides,
  });

  return { user, password };
};

describe("Account lifecycle endpoints", () => {
  let mongoServer;
  let app;
  let reactivationTokenFromEmail = null;
  let deletionTokenFromEmail = null;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: "beds4crew-test" });

    jest.spyOn(emailService, "sendAccountReactivationEmail").mockImplementation(async (_email, _firstName, token) => {
      reactivationTokenFromEmail = token;
      return { success: true };
    });

    jest.spyOn(emailService, "sendAccountDeletionEmail").mockImplementation(async (_email, _firstName, token) => {
      deletionTokenFromEmail = token;
      return { success: true };
    });

    jest.spyOn(emailService, "send").mockResolvedValue({ success: true });

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use("/api/auth", authRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/tickets", ticketRoutes);
  });

  afterEach(async () => {
    reactivationTokenFromEmail = null;
    deletionTokenFromEmail = null;
    await Promise.all([
      User.deleteMany({}),
      Ticket.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  test("deactivate endpoint disables account and sets hold period", async () => {
    const { user, password } = await createUser();

    const res = await request(app)
      .post("/api/users/me/deactivate")
      .set("Cookie", makeAuthCookie(user))
      .send({ password });

    expect(res.status).toBe(200);
    expect(res.body?.user?.isActive).toBe(false);
    expect(res.body?.user?.reactivationEligibleAt).toBeTruthy();

    const saved = await User.findById(user._id).lean();
    expect(saved.isActive).toBe(false);
    expect(saved.accountDisabledAt).toBeTruthy();
    expect(saved.reactivationEligibleAt).toBeTruthy();
  });

  test("disabled account is blocked from protected non-allowlisted endpoints", async () => {
    const { user } = await createUser({ isActive: false, accountDisabledAt: new Date() });

    const res = await request(app)
      .post("/api/users/wishlist/507f1f77bcf86cd799439011")
      .set("Cookie", makeAuthCookie(user));

    expect(res.status).toBe(423);
    expect(res.body?.code).toBe("ACCOUNT_DISABLED");
  });

  test("disabled account can still submit support tickets", async () => {
    const { user } = await createUser({ isActive: false, accountDisabledAt: new Date() });

    const res = await request(app)
      .post("/api/tickets")
      .set("Cookie", makeAuthCookie(user))
      .send({
        subject: "Need help while disabled",
        message: "Testing support flow access",
        source: "test",
      });

    expect(res.status).toBe(201);
    expect(res.body?.ticket?.id).toBeTruthy();
  });

  test("reactivation request enforces 30-day hold", async () => {
    const now = Date.now();
    const { user } = await createUser({
      isActive: false,
      accountDisabledAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      reactivationEligibleAt: new Date(now + 10 * 24 * 60 * 60 * 1000),
    });

    const res = await request(app)
      .post("/api/auth/reactivation/request")
      .set("Cookie", makeAuthCookie(user))
      .send({});

    expect(res.status).toBe(429);
    expect(res.body?.message).toMatch(/not available yet/i);
  });

  test("reactivation request then confirm reactivates account", async () => {
    const now = Date.now();
    const { user } = await createUser({
      isActive: false,
      accountDisabledAt: new Date(now - 40 * 24 * 60 * 60 * 1000),
      reactivationEligibleAt: new Date(now - 5 * 60 * 1000),
    });

    const requestRes = await request(app)
      .post("/api/auth/reactivation/request")
      .set("Cookie", makeAuthCookie(user))
      .send({});

    expect(requestRes.status).toBe(200);
    expect(reactivationTokenFromEmail).toBeTruthy();

    const confirmRes = await request(app)
      .post("/api/auth/reactivation/confirm")
      .send({ token: reactivationTokenFromEmail });

    expect(confirmRes.status).toBe(200);

    const saved = await User.findById(user._id).lean();
    expect(saved.isActive).toBe(true);
    expect(saved.reactivationToken).toBeNull();
  });

  test("delete request sends token and confirm-delete removes account", async () => {
    const { user, password } = await createUser();

    const requestDeleteRes = await request(app)
      .post("/api/users/me/request-delete")
      .set("Cookie", makeAuthCookie(user))
      .send({ password });

    expect(requestDeleteRes.status).toBe(200);
    expect(deletionTokenFromEmail).toBeTruthy();

    const confirmDeleteRes = await request(app)
      .post("/api/users/confirm-delete")
      .send({ token: deletionTokenFromEmail });

    expect(confirmDeleteRes.status).toBe(200);

    const deleted = await User.findById(user._id).lean();
    expect(deleted).toBeNull();
  });
});

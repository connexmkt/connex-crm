import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
}));

vi.mock("@/lib/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
  })),
}));

import { checkAuth } from "@/lib/auth/require-auth";

describe("checkAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 'unauthenticated' quando não há usuário na sessão", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const result = await checkAuth();

    expect(result).toEqual({ ok: false, reason: "unauthenticated" });
  });

  it("permite qualquer usuário autenticado, independentemente do papel", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const result = await checkAuth();

    expect(result).toEqual({ ok: true, userId: "user-1" });
  });
});

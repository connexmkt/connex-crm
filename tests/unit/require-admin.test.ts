import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserMock, singleMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  singleMock: vi.fn(),
}));

vi.mock("@/lib/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: singleMock,
        }),
      }),
    }),
  })),
}));

import { checkAdmin } from "@/lib/auth/require-admin";

describe("checkAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 'unauthenticated' quando não há usuário na sessão", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const result = await checkAdmin();

    expect(result).toEqual({ ok: false, reason: "unauthenticated" });
  });

  it("retorna 'forbidden' para usuários com papel Gestor", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    singleMock.mockResolvedValue({ data: { role: "Gestor" }, error: null });

    const result = await checkAdmin();

    expect(result).toEqual({ ok: false, reason: "forbidden" });
  });

  it("retorna 'forbidden' para usuários com papel Analista", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    singleMock.mockResolvedValue({ data: { role: "Analista" }, error: null });

    const result = await checkAdmin();

    expect(result).toEqual({ ok: false, reason: "forbidden" });
  });

  it("permite usuários com papel Admin", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    singleMock.mockResolvedValue({ data: { role: "Admin" }, error: null });

    const result = await checkAdmin();

    expect(result).toEqual({ ok: true, userId: "admin-1" });
  });

  it("retorna 'forbidden' quando a busca do perfil falha", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    singleMock.mockResolvedValue({ data: null, error: new Error("not found") });

    const result = await checkAdmin();

    expect(result).toEqual({ ok: false, reason: "forbidden" });
  });
});

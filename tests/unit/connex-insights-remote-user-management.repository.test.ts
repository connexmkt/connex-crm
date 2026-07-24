import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ConnexInsightsRemoteRepository } from "@/lib/repositories/connex-insights-remote.repository";

type SelectResult = { data: unknown; error: unknown };
type MutationResult = { error: unknown };

function createAdminClientMock(options: {
  selectResult?: SelectResult;
  updateResult?: MutationResult;
  authError?: unknown;
}) {
  const eqForSelect = vi.fn(() => ({
    maybeSingle: vi.fn(async () => options.selectResult ?? { data: null, error: null }),
  }));
  const selectFn = vi.fn(() => ({ eq: eqForSelect }));

  const eqForUpdate = vi.fn(async () => options.updateResult ?? { error: null });
  const updateFn = vi.fn(() => ({ eq: eqForUpdate }));

  const fromFn = vi.fn(() => ({ select: selectFn, update: updateFn }));
  const updateUserById = vi.fn(async () => ({ error: options.authError ?? null }));

  const client = {
    from: fromFn,
    auth: { admin: { updateUserById } },
  } as unknown as SupabaseClient;

  return { client, selectFn, eqForSelect, updateFn, eqForUpdate, updateUserById };
}

describe("ConnexInsightsRemoteRepository.getUserById", () => {
  it("retorna o usuário mapeado quando encontrado", async () => {
    const { client, selectFn, eqForSelect } = createAdminClientMock({
      selectResult: {
        data: {
          id: "user-1",
          display_name: "Ana Souza",
          status: "SUSPENDED",
          tenant_id: "tenant-1",
        },
        error: null,
      },
    });

    const result = await ConnexInsightsRemoteRepository.getUserById(client, "user-1");

    expect(result).toEqual({
      id: "user-1",
      displayName: "Ana Souza",
      status: "SUSPENDED",
      tenantId: "tenant-1",
    });
    expect(selectFn).toHaveBeenCalledWith("id, display_name, status, tenant_id");
    expect(eqForSelect).toHaveBeenCalledWith("id", "user-1");
  });

  it("retorna null quando o usuário não existe", async () => {
    const { client } = createAdminClientMock({ selectResult: { data: null, error: null } });

    const result = await ConnexInsightsRemoteRepository.getUserById(client, "user-inexistente");

    expect(result).toBeNull();
  });

  it("propaga o erro quando a consulta falha", async () => {
    const { client } = createAdminClientMock({
      selectResult: { data: null, error: new Error("connection refused") },
    });

    await expect(ConnexInsightsRemoteRepository.getUserById(client, "user-1")).rejects.toThrow(
      "connection refused",
    );
  });
});

describe("ConnexInsightsRemoteRepository.setUserStatus", () => {
  it("atualiza app_metadata.profile_status no Auth e status em profiles", async () => {
    const { client, updateUserById, updateFn, eqForUpdate } = createAdminClientMock({});

    await ConnexInsightsRemoteRepository.setUserStatus(client, "user-1", "SUSPENDED");

    expect(updateUserById).toHaveBeenCalledWith("user-1", {
      app_metadata: { profile_status: "SUSPENDED" },
    });
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ status: "SUSPENDED" }),
    );
    expect(eqForUpdate).toHaveBeenCalledWith("id", "user-1");
  });

  it("lança erro e não escreve em profiles quando a atualização do Auth falha", async () => {
    const { client, updateFn } = createAdminClientMock({
      authError: new Error("Auth indisponível"),
    });

    await expect(
      ConnexInsightsRemoteRepository.setUserStatus(client, "user-1", "ACTIVE"),
    ).rejects.toThrow("Auth indisponível");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("lança erro quando a escrita em profiles falha após o Auth ter sido atualizado", async () => {
    const { client, updateUserById } = createAdminClientMock({
      updateResult: { error: new Error("db indisponível") },
    });

    await expect(
      ConnexInsightsRemoteRepository.setUserStatus(client, "user-1", "ACTIVE"),
    ).rejects.toThrow("db indisponível");
    // O Auth já foi atualizado (falha segura) antes da escrita em profiles falhar.
    expect(updateUserById).toHaveBeenCalledOnce();
  });
});

describe("ConnexInsightsRemoteRepository.resetUserPassword", () => {
  it("atualiza a senha e força app_metadata.profile_status = INACTIVE, depois profiles.status", async () => {
    const { client, updateUserById, updateFn, eqForUpdate } = createAdminClientMock({});

    await ConnexInsightsRemoteRepository.resetUserPassword(client, "user-1", "NovaSenha123!");

    expect(updateUserById).toHaveBeenCalledWith("user-1", {
      password: "NovaSenha123!",
      app_metadata: { profile_status: "INACTIVE" },
    });
    expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ status: "INACTIVE" }));
    expect(eqForUpdate).toHaveBeenCalledWith("id", "user-1");
  });

  it("lança erro quando a atualização de senha no Auth falha", async () => {
    const { client, updateFn } = createAdminClientMock({
      authError: new Error("Auth indisponível"),
    });

    await expect(
      ConnexInsightsRemoteRepository.resetUserPassword(client, "user-1", "NovaSenha123!"),
    ).rejects.toThrow("Auth indisponível");
    expect(updateFn).not.toHaveBeenCalled();
  });
});

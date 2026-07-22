import { afterEach, describe, expect, it, vi } from "vitest";
import { logProvisioningEvent } from "@/lib/logging/connex-insights-provisioning-logger";

describe("logProvisioningEvent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("nunca inclui a senha temporária no log de sucesso, mesmo se passada por engano", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    logProvisioningEvent({
      endpoint: "/api/aplicacoes/connex-insights/usuarios",
      method: "POST",
      requestId: "req-1",
      durationMs: 42,
      success: true,
      // Campo indevido — nunca deve aparecer no log de saída.
      temporaryPassword: "S3nhaSecreta!",
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const loggedLine = logSpy.mock.calls[0][0] as string;
    expect(loggedLine).not.toContain("S3nhaSecreta!");
    expect(loggedLine.toLowerCase()).not.toContain("password");
  });

  it("nunca inclui a senha temporária no log de falha, mesmo se passada por engano", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logProvisioningEvent({
      endpoint: "/api/aplicacoes/connex-insights/usuarios",
      method: "POST",
      requestId: "req-2",
      durationMs: 10,
      success: false,
      errorMessage: "upstream failure",
      senha: "OutraSenhaSecreta!",
    });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const loggedLine = errorSpy.mock.calls[0][0] as string;
    expect(loggedLine).not.toContain("OutraSenhaSecreta!");
  });

  it("preserva os campos estruturados esperados", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    logProvisioningEvent({
      endpoint: "/api/aplicacoes/connex-insights/usuarios",
      method: "POST",
      requestId: "req-3",
      userId: "user-1",
      durationMs: 5,
      success: true,
    });

    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(parsed).toMatchObject({
      scope: "connex-insights-provisioning",
      endpoint: "/api/aplicacoes/connex-insights/usuarios",
      method: "POST",
      requestId: "req-3",
      userId: "user-1",
      durationMs: 5,
      success: true,
    });
  });
});

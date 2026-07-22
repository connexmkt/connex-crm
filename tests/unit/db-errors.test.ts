import { describe, expect, it } from "vitest";
import { isUniqueConstraintError, toErrorMessage } from "@/lib/utils/db-errors";

describe("isUniqueConstraintError", () => {
  it("reconhece violação de UNIQUE do Prisma (P2002)", () => {
    expect(isUniqueConstraintError({ code: "P2002" })).toBe(true);
  });

  it("reconhece violação de UNIQUE do Postgres/PostgREST (23505)", () => {
    expect(isUniqueConstraintError({ code: "23505" })).toBe(true);
  });

  it("retorna false para outros códigos de erro", () => {
    expect(isUniqueConstraintError({ code: "P2025" })).toBe(false);
    expect(isUniqueConstraintError({ code: "23503" })).toBe(false);
  });

  it("retorna false para valores não-objeto", () => {
    expect(isUniqueConstraintError(null)).toBe(false);
    expect(isUniqueConstraintError(undefined)).toBe(false);
    expect(isUniqueConstraintError("erro qualquer")).toBe(false);
  });
});

describe("toErrorMessage", () => {
  it("extrai a mensagem de instâncias de Error", () => {
    expect(toErrorMessage(new Error("falhou"))).toBe("falhou");
  });

  it("retorna a própria string quando o erro é uma string", () => {
    expect(toErrorMessage("erro cru")).toBe("erro cru");
  });

  it("retorna mensagem padrão para tipos desconhecidos", () => {
    expect(toErrorMessage({ foo: "bar" })).toBe("Erro desconhecido");
  });
});

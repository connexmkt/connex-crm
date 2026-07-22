import { describe, expect, it } from "vitest";
import { criarUsuarioSchema } from "@/app/aplicacoes/schemas/criar-usuario.schema";

const validInput = {
  name: "Ana Souza",
  email: "ana@zehmotoca.com.br",
  login: "ana.souza",
  tenantId: "5f4a2b3c-6e6a-4c4f-9b1a-1a2b3c4d5e6f",
};

describe("criarUsuarioSchema", () => {
  it("aceita um payload válido", () => {
    expect(criarUsuarioSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejeita nome com menos de 2 caracteres", () => {
    const result = criarUsuarioSchema.safeParse({ ...validInput, name: "A" });
    expect(result.success).toBe(false);
  });

  it("rejeita e-mail inválido", () => {
    const result = criarUsuarioSchema.safeParse({ ...validInput, email: "não-é-email" });
    expect(result.success).toBe(false);
  });

  it("rejeita login com caracteres inválidos (maiúsculas, espaços, símbolos)", () => {
    expect(criarUsuarioSchema.safeParse({ ...validInput, login: "Ana Souza" }).success).toBe(false);
    expect(criarUsuarioSchema.safeParse({ ...validInput, login: "ana@souza" }).success).toBe(false);
  });

  it("aceita login com ponto, hífen e underscore", () => {
    expect(criarUsuarioSchema.safeParse({ ...validInput, login: "ana.souza-1_x" }).success).toBe(true);
  });

  it("rejeita tenantId que não é um UUID", () => {
    const result = criarUsuarioSchema.safeParse({ ...validInput, tenantId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

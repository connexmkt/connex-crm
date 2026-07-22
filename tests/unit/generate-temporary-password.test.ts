import { describe, expect, it } from "vitest";
import { generateTemporaryPassword } from "@/lib/utils/generate-temporary-password";

describe("generateTemporaryPassword", () => {
  it("gera senha com o comprimento padrão de 12 caracteres", () => {
    expect(generateTemporaryPassword()).toHaveLength(12);
  });

  it("gera senha com o comprimento solicitado", () => {
    expect(generateTemporaryPassword(16)).toHaveLength(16);
  });

  it("respeita a política mínima: ao menos 1 maiúscula, 1 minúscula e 1 dígito", () => {
    for (let i = 0; i < 50; i += 1) {
      const password = generateTemporaryPassword();
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[0-9]/);
    }
  });

  it("rejeita comprimento menor que 8 (política mínima do Connex Insights)", () => {
    expect(() => generateTemporaryPassword(7)).toThrow();
  });

  it("gera senhas distintas a cada chamada (aleatoriedade)", () => {
    const passwords = new Set(Array.from({ length: 20 }, () => generateTemporaryPassword()));
    expect(passwords.size).toBe(20);
  });
});

import { randomBytes, randomInt } from "node:crypto";

const UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const ALL_CHARS = UPPERCASE + LOWERCASE + DIGITS;

/**
 * Gera uma senha temporária criptograficamente segura, compatível com a
 * política de senha do Connex Insights (mínimo 8 caracteres, ao menos 1
 * letra e 1 número — ver research.md § D5).
 *
 * Nunca gravada em texto plano; retornada uma única vez ao admin (FR-014,
 * FR-015).
 */
export function generateTemporaryPassword(length = 12): string {
  if (length < 8) {
    throw new Error("A senha temporária deve ter no mínimo 8 caracteres");
  }

  // Garante ao menos 1 maiúscula, 1 minúscula e 1 dígito.
  const guaranteed = [
    UPPERCASE[randomInt(UPPERCASE.length)],
    LOWERCASE[randomInt(LOWERCASE.length)],
    DIGITS[randomInt(DIGITS.length)],
  ];

  const remainingLength = length - guaranteed.length;
  const randomChars = Array.from(randomBytes(remainingLength)).map(
    (byte) => ALL_CHARS[byte % ALL_CHARS.length],
  );

  const chars = [...guaranteed, ...randomChars];

  // Embaralha para não deixar os 3 primeiros caracteres em posição previsível.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

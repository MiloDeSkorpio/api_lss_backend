export function sonEquivalentesNum(dec: number, hex: string): boolean {
  const hexAsDec = parseInt(hex, 16);
  if (isNaN(hexAsDec)) throw new Error(`Hex inválido: ${hex}`);
  return hexAsDec === dec;
}
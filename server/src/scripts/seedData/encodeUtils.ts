/**
 * Small, pure deterministic transforms used to BUILD each demo
 * challenge's puzzle text from its real flag at seed time — same
 * precedent as the main Sentry repo's resetForTesting.ts, which
 * generates its XOR ciphertext from the real flag rather than hand-
 * typing an encoded value that could silently drift out of sync.
 */

export function rot13(text: string): string {
  return text.replace(/[a-zA-Z]/g, (ch) => {
    const base = ch <= 'Z' ? 65 : 97;
    return String.fromCharCode(((ch.charCodeAt(0) - base + 13) % 26) + base);
  });
}

/** Self-inverse over printable ASCII 33-126; applying it twice is a no-op. */
export function rot47(text: string): string {
  return text.replace(/[!-~]/g, (ch) => String.fromCharCode(((ch.charCodeAt(0) - 33 + 47) % 94) + 33));
}

export function reverseString(text: string): string {
  return text.split('').reverse().join('');
}

export function toBase64(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64');
}

/** Repeating-key XOR, hex-encoded — key may be 1+ bytes. */
export function xorHex(plaintext: string, key: string): string {
  const bytes = Buffer.from(plaintext, 'utf8');
  const keyBytes = Buffer.from(key, 'utf8');
  const out = Buffer.alloc(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
  return out.toString('hex');
}

/** Plain hex of the UTF-8 bytes, byte ORDER reversed (not just the hex chars). */
export function hexOfReversedBytes(text: string): string {
  const bytes = Array.from(Buffer.from(text, 'utf8')).reverse();
  return Buffer.from(bytes).toString('hex');
}

/** Hex of the UTF-8 bytes, with each byte's two hex NIBBLES swapped (AB -> BA). */
export function nibbleSwappedHex(text: string): string {
  const hex = Buffer.from(text, 'utf8').toString('hex');
  const pairs = hex.match(/.{2}/g) ?? [];
  return pairs.map((pair) => pair[1] + pair[0]).join('');
}

/** Each byte shifted +7 mod 256, then the whole byte array reversed. */
export function shiftedReversedBytes(text: string): number[] {
  const bytes = Array.from(Buffer.from(text, 'utf8'));
  const shifted = bytes.map((b) => (b + 7) % 256);
  return shifted.reverse();
}

/** Plain ASCII codes, in order, as a comma-separated string. */
export function asciiCodes(text: string): string {
  return Array.from(Buffer.from(text, 'utf8')).join(', ');
}

/**
 * Classic Vigenère: only A-Za-z is shifted (case preserved); every other
 * character (digits, `{`, `}`, `_`) passes through unchanged AND does not
 * consume a key position — so a known-plaintext prefix like `SENTRYDEMO{`
 * (10 letters before the first non-letter) is enough to recover a short
 * repeating key via a known-plaintext attack.
 */
export function vigenereEncode(text: string, key: string): string {
  const keyUpper = key.toUpperCase();
  let keyIndex = 0;
  return text
    .split('')
    .map((ch) => {
      if (!/[A-Za-z]/.test(ch)) return ch;
      const isUpper = ch === ch.toUpperCase();
      const shift = keyUpper.charCodeAt(keyIndex % keyUpper.length) - 65;
      keyIndex++;
      const code = ch.toUpperCase().charCodeAt(0) - 65;
      const shiftedCh = String.fromCharCode(((code + shift) % 26) + 65);
      return isUpper ? shiftedCh : shiftedCh.toLowerCase();
    })
    .join('');
}

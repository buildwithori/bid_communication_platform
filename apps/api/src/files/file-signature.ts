export function matchesFileSignature(mimeType: string, bytes: Uint8Array) {
  const startsWith = (signature: number[]) =>
    signature.every((value, index) => bytes[index] === value);
  const normalized = mimeType.toLowerCase();

  if (normalized === "application/pdf") {
    return startsWith([0x25, 0x50, 0x44, 0x46, 0x2d]);
  }
  if (
    normalized ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    normalized ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    normalized ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return startsWith([0x50, 0x4b, 0x03, 0x04]);
  }
  if (
    normalized === "application/msword" ||
    normalized === "application/vnd.ms-excel" ||
    normalized === "application/vnd.ms-powerpoint"
  ) {
    return startsWith([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  }
  if (normalized === "text/csv") {
    return bytes.length > 0 && !bytes.includes(0);
  }
  return false;
}

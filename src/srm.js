// Tetris Rosy Retrospection .SRM format
// SRAM is 8KB mapped at GB address A000-BFFF
// .srm files are typically 32KB (padded/mirrored)

export const SRM_SIZE = 32768;
export const TYPE_B_OFFSET = 0x0000; // maps to GB $A000 (WRAM $D000)
export const TYPE_A_OFFSET = 0x0654; // maps to GB $A654 (WRAM $D654)
export const TYPE_A_GROUPS = 10; // 10 normal levels (heart levels not saved to SRAM)
export const TYPE_B_GROUPS = 60; // 10 levels × 6 heights
export const GROUP_SIZE = 27; // 3 scores (9 bytes) + 3 names (18 bytes)

// GB Tetris tile ID <-> ASCII mapping
// Tile 0x0A = 'A', 0x0B = 'B', ... 0x23 = 'Z', 0x60 = blank
const TILE_TO_CHAR = {};
const CHAR_TO_TILE = {};
for (let i = 0; i <= 25; i++) {
  const ch = String.fromCharCode(65 + i);
  TILE_TO_CHAR[0x0a + i] = ch;
  CHAR_TO_TILE[ch] = 0x0a + i;
}
TILE_TO_CHAR[0x60] = " ";
TILE_TO_CHAR[0x00] = " ";
TILE_TO_CHAR[0x2f] = " ";
CHAR_TO_TILE[" "] = 0x60;

// 3-byte BCD little-endian -> integer
export function decodeBCD(b0, b1, b2) {
  let result = 0;
  let multiplier = 1;
  for (const byte of [b0, b1, b2]) {
    const lo = byte & 0x0f;
    const hi = (byte >> 4) & 0x0f;
    if (lo > 9 || hi > 9) return 0;
    result += lo * multiplier;
    multiplier *= 10;
    result += hi * multiplier;
    multiplier *= 10;
  }
  return result;
}

// integer -> 3-byte BCD little-endian
export function encodeBCD(value) {
  value = Math.min(999999, Math.max(0, Math.floor(value)));
  const bytes = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const lo = value % 10;
    value = Math.floor(value / 10);
    const hi = value % 10;
    value = Math.floor(value / 10);
    bytes[i] = (hi << 4) | lo;
  }
  return bytes;
}

// 6 tile-ID bytes -> string
export function decodeName(bytes) {
  return Array.from(bytes)
    .map((b) => TILE_TO_CHAR[b] || " ")
    .join("");
}

// string -> 6 tile-ID bytes
export function encodeName(str) {
  const padded = str.toUpperCase().padEnd(6, " ").slice(0, 6);
  return Array.from(padded).map((ch) => CHAR_TO_TILE[ch] ?? 0x60);
}

// Parse a 27-byte group into 3 score entries
export function parseGroup(data, offset) {
  const entries = [];
  for (let i = 0; i < 3; i++) {
    const sOff = offset + i * 3;
    const nOff = offset + 9 + i * 6;
    entries.push({
      score: decodeBCD(data[sOff], data[sOff + 1], data[sOff + 2]),
      name: decodeName(data.slice(nOff, nOff + 6)),
    });
  }
  return entries;
}

// Write 3 score entries into data at offset
export function writeGroup(data, offset, entries) {
  for (let i = 0; i < 3; i++) {
    const isEmpty = entries[i].score === 0 && entries[i].name.trim().length === 0;
    const sBytes = encodeBCD(entries[i].score);
    const nBytes = isEmpty
      ? [0, 0, 0, 0, 0, 0]
      : encodeName(entries[i].name);
    for (let j = 0; j < 3; j++) data[offset + i * 3 + j] = sBytes[j];
    for (let j = 0; j < 6; j++) data[offset + 9 + i * 6 + j] = nBytes[j];
  }
}

// RetroArch RZIP magic: "#RZIPv"
const RZIP_MAGIC = [0x23, 0x52, 0x5a, 0x49, 0x50, 0x76];

function isRZIP(data) {
  return RZIP_MAGIC.every((b, i) => data[i] === b);
}

// Decompress RetroArch RZIP-wrapped save file
// Format: 8-byte header, 4-byte chunk size (unused), 8-byte full content size,
//         then chunks of [4-byte compressed length + zlib data]
async function decompressRZIP(data) {
  // Chunk header starts at offset 20: 4-byte LE compressed size
  const chunkSize = data[20] | (data[21] << 8) | (data[22] << 16) | (data[23] << 24);
  const compressed = data.slice(24, 24 + chunkSize);
  const ds = new DecompressionStream("deflate");
  const writer = ds.writable.getWriter();
  writer.write(compressed);
  writer.close();
  const reader = ds.readable.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLen = chunks.reduce((s, c) => s + c.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

// Parse entire .srm into structured data (handles RZIP-compressed files)
export async function parseSRM(buffer) {
  let data = new Uint8Array(buffer);
  if (isRZIP(data)) {
    data = await decompressRZIP(data);
  }

  const typeA = [];
  for (let i = 0; i < TYPE_A_GROUPS; i++) {
    typeA.push(parseGroup(data, TYPE_A_OFFSET + i * GROUP_SIZE));
  }

  const typeB = [];
  for (let i = 0; i < TYPE_B_GROUPS; i++) {
    typeB.push(parseGroup(data, TYPE_B_OFFSET + i * GROUP_SIZE));
  }

  return { typeA, typeB, raw: data };
}

// Merge multiple group arrays by keeping the top 3 scores per group index
export function mergeGroups(groupsArray) {
  const groupCount = groupsArray[0].length;
  const merged = [];
  for (let i = 0; i < groupCount; i++) {
    const allEntries = groupsArray.flatMap((groups) => groups[i]);
    allEntries.sort((a, b) => b.score - a.score);
    merged.push(allEntries.slice(0, 3));
  }
  return merged;
}

// Serialize structured data back to .srm bytes
export function buildSRM(typeA, typeB, existingData) {
  const data = existingData
    ? new Uint8Array(existingData)
    : new Uint8Array(SRM_SIZE);

  for (let i = 0; i < TYPE_A_GROUPS; i++) {
    writeGroup(data, TYPE_A_OFFSET + i * GROUP_SIZE, typeA[i]);
  }
  for (let i = 0; i < TYPE_B_GROUPS; i++) {
    writeGroup(data, TYPE_B_OFFSET + i * GROUP_SIZE, typeB[i]);
  }

  return data;
}

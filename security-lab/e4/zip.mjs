import fs from 'node:fs';
import path from 'node:path';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function safeName(value) {
  const name = String(value).replaceAll('\\', '/');
  if (!name || name.startsWith('/') || /^[A-Za-z]:/.test(name) || name.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('ZIP_UNSAFE_ENTRY_NAME');
  }
  return name;
}

export function createZip(entries, outputPath) {
  if (!Array.isArray(entries) || entries.length > 65_535) throw new Error('ZIP_ENTRY_COUNT_LIMIT');
  const localParts = [];
  const centralParts = [];
  const names = new Set();
  let offset = 0;

  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const name = safeName(entry.name);
    if (names.has(name)) throw new Error('ZIP_DUPLICATE_ENTRY');
    names.add(name);
    const filename = Buffer.from(name, 'utf8');
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    if (filename.length > 65_535 || data.length > 0xffffffff || offset > 0xffffffff) throw new Error('ZIP32_SIZE_LIMIT');
    const checksum = crc32(data);
    const local = Buffer.alloc(30 + filename.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(33, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(filename.length, 26);
    local.writeUInt16LE(0, 28);
    filename.copy(local, 30);
    localParts.push(local, data);

    const central = Buffer.alloc(46 + filename.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(33, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(filename.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    filename.copy(central, 46);
    centralParts.push(central);
    offset += local.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  if (offset + centralDirectory.length > 0xffffffff) throw new Error('ZIP32_SIZE_LIMIT');
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  const bytes = Buffer.concat([...localParts, centralDirectory, end]);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, bytes, { flag: 'wx' });
  return { bytes: bytes.length, files: entries.length };
}

export function readZip(zipPath) {
  const bytes = fs.readFileSync(zipPath);
  const min = Math.max(0, bytes.length - 65_557);
  let endOffset = -1;
  for (let i = bytes.length - 22; i >= min; i--) {
    if (bytes.readUInt32LE(i) === 0x06054b50) { endOffset = i; break; }
  }
  if (endOffset < 0) throw new Error('ZIP_EOCD_MISSING');
  const disk = bytes.readUInt16LE(endOffset + 4);
  const centralDisk = bytes.readUInt16LE(endOffset + 6);
  const count = bytes.readUInt16LE(endOffset + 10);
  const centralSize = bytes.readUInt32LE(endOffset + 12);
  const centralOffset = bytes.readUInt32LE(endOffset + 16);
  if (disk !== 0 || centralDisk !== 0 || count > 65_535 || centralOffset + centralSize !== endOffset) throw new Error('ZIP_LAYOUT_UNSUPPORTED');

  const files = new Map();
  let cursor = centralOffset;
  for (let index = 0; index < count; index++) {
    if (bytes.readUInt32LE(cursor) !== 0x02014b50) throw new Error('ZIP_CENTRAL_DIRECTORY_INVALID');
    const method = bytes.readUInt16LE(cursor + 10);
    const checksum = bytes.readUInt32LE(cursor + 16);
    const compressedSize = bytes.readUInt32LE(cursor + 20);
    const size = bytes.readUInt32LE(cursor + 24);
    const nameSize = bytes.readUInt16LE(cursor + 28);
    const extraSize = bytes.readUInt16LE(cursor + 30);
    const commentSize = bytes.readUInt16LE(cursor + 32);
    const localOffset = bytes.readUInt32LE(cursor + 42);
    const name = safeName(bytes.subarray(cursor + 46, cursor + 46 + nameSize).toString('utf8'));
    cursor += 46 + nameSize + extraSize + commentSize;
    if (files.has(name) || method !== 0 || compressedSize !== size) throw new Error('ZIP_ENTRY_UNSUPPORTED_OR_DUPLICATE');
    if (bytes.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('ZIP_LOCAL_HEADER_INVALID');
    const localMethod = bytes.readUInt16LE(localOffset + 8);
    const localChecksum = bytes.readUInt32LE(localOffset + 14);
    const localCompressed = bytes.readUInt32LE(localOffset + 18);
    const localSize = bytes.readUInt32LE(localOffset + 22);
    const localNameSize = bytes.readUInt16LE(localOffset + 26);
    const localExtraSize = bytes.readUInt16LE(localOffset + 28);
    const localName = bytes.subarray(localOffset + 30, localOffset + 30 + localNameSize).toString('utf8');
    const dataStart = localOffset + 30 + localNameSize + localExtraSize;
    const data = bytes.subarray(dataStart, dataStart + size);
    if (localName !== name || localMethod !== method || localChecksum !== checksum || localCompressed !== compressedSize || localSize !== size || data.length !== size || crc32(data) !== checksum) {
      throw new Error('ZIP_ENTRY_INTEGRITY_FAILED');
    }
    files.set(name, data);
  }
  if (cursor !== centralOffset + centralSize) throw new Error('ZIP_CENTRAL_DIRECTORY_SIZE_MISMATCH');
  return files;
}

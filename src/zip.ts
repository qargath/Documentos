export function zipStore(files: { name: string; bytes: Uint8Array }[]): Uint8Array {
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const name = new TextEncoder().encode(safeName(file.name))
    const crc = crc32(file.bytes)
    const local = new Uint8Array(30 + name.length + file.bytes.length)
    const view = new DataView(local.buffer)
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(6, 0x0800, true)
    view.setUint16(8, 0, true)
    view.setUint16(10, 0, true)
    view.setUint16(12, 0, true)
    view.setUint32(14, crc, true)
    view.setUint32(18, file.bytes.length, true)
    view.setUint32(22, file.bytes.length, true)
    view.setUint16(26, name.length, true)
    view.setUint16(28, 0, true)
    local.set(name, 30)
    local.set(file.bytes, 30 + name.length)
    locals.push(local)

    const central = new Uint8Array(46 + name.length)
    const directory = new DataView(central.buffer)
    directory.setUint32(0, 0x02014b50, true)
    directory.setUint16(4, 20, true)
    directory.setUint16(6, 20, true)
    directory.setUint16(8, 0x0800, true)
    directory.setUint16(10, 0, true)
    directory.setUint16(12, 0, true)
    directory.setUint16(14, 0, true)
    directory.setUint32(16, crc, true)
    directory.setUint32(20, file.bytes.length, true)
    directory.setUint32(24, file.bytes.length, true)
    directory.setUint16(28, name.length, true)
    directory.setUint16(30, 0, true)
    directory.setUint16(32, 0, true)
    directory.setUint16(34, 0, true)
    directory.setUint16(36, 0, true)
    directory.setUint32(38, 0, true)
    directory.setUint32(42, offset, true)
    central.set(name, 46)
    centrals.push(central)
    offset += local.length
  }

  const directorySize = centrals.reduce((sum, entry) => sum + entry.length, 0)
  const end = new Uint8Array(22)
  const ending = new DataView(end.buffer)
  ending.setUint32(0, 0x06054b50, true)
  ending.setUint16(4, 0, true)
  ending.setUint16(6, 0, true)
  ending.setUint16(8, files.length, true)
  ending.setUint16(10, files.length, true)
  ending.setUint32(12, directorySize, true)
  ending.setUint32(16, offset, true)
  ending.setUint16(20, 0, true)

  const total = offset + directorySize + end.length
  const archive = new Uint8Array(total)
  let cursor = 0
  for (const chunk of [...locals, ...centrals, end]) {
    archive.set(chunk, cursor)
    cursor += chunk.length
  }
  return archive
}

function safeName(name: string) {
  const cleaned = name.replace(/[\\/\u0000-\u001f]/g, '-').trim()
  return cleaned || 'parte.pdf'
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

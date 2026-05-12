/**
 * FIT File Parser — Browser-native binary parser for Garmin FIT activity files.
 * Extracts running dynamics: cadence, HR, elevation, GCT, vertical oscillation,
 * stride length, and GCT balance from Garmin's binary FIT protocol.
 *
 * Reference: Garmin FIT SDK — https://developer.garmin.com/fit/protocol/
 */

const FIT_HEADER_SIZE = 12;
const FIT_MAGIC = ".FIT";

// Field definition numbers for "record" messages (mesg_num = 20)
const FIELD = {
  TIMESTAMP: 253,
  HEART_RATE: 3,
  CADENCE: 4,
  ALTITUDE: 2,
  SPEED: 6,
  POSITION_LAT: 0,
  POSITION_LONG: 1,
  ENHANCED_ALTITUDE: 78,
  ENHANCED_SPEED: 73,
  VERTICAL_OSCILLATION: 39,
  STANCE_TIME: 40,           // ground contact time (ms)
  STANCE_TIME_BALANCE: 43,   // GCT balance (%)
  STEP_LENGTH: 85,           // stride length (mm)
};

// Base types and their byte widths (subset needed for running data)
const BASE_TYPE_SIZES = {
  0: 1, 1: 1, 2: 1, 3: 1, 4: 2, 5: 2, 6: 4, 7: 4,
  8: 4, 9: 4, 10: 1, 11: 2, 12: 4, 13: 1, 14: 8, 15: 8, 16: 8,
  131: 2, 132: 4, 133: 1, 134: 2, 135: 4, 136: 1, 137: 2, 138: 4, 139: 8, 140: 8, 141: 8, 142: 8
};

/**
 * Parse a FIT file ArrayBuffer into an array of record rows suitable for FormForward.
 * @param {ArrayBuffer} buffer
 * @returns {{ rows: Array<Object>, summary: Object }}
 */
export function parseFitFile(buffer) {
  const view = new DataView(buffer);
  const fileSize = buffer.byteLength;

  // ──── Validate FIT header ────
  if (fileSize < 14) throw new Error("File too small to be a valid FIT file.");
  const headerSize = view.getUint8(0);
  const protocolVersion = view.getUint8(1);
  const dataSize = view.getUint32(4, true);

  // Check ".FIT" signature
  const sig = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  if (sig !== FIT_MAGIC) throw new Error(`Not a valid FIT file (signature: "${sig}").`);

  // ──── Parse data records ────
  const definitions = new Map();
  const records = [];
  let offset = headerSize;
  const endOfData = headerSize + dataSize;

  while (offset < endOfData && offset < fileSize) {
    const recordHeader = view.getUint8(offset);
    offset += 1;

    const isDefinition = (recordHeader & 0x40) !== 0;
    const isCompressedTimestamp = (recordHeader & 0x80) !== 0;
    const localMesgType = isCompressedTimestamp
      ? (recordHeader >> 5) & 0x03
      : recordHeader & 0x0f;

    if (isCompressedTimestamp) {
      // Compressed timestamp data message
      const def = definitions.get(localMesgType);
      if (!def) { offset += skipUnknownDataMessage(localMesgType); continue; }
      const row = readDataFields(view, offset, def, fileSize);
      offset = row._nextOffset;
      if (def.globalMesgNum === 20) records.push(row);
      continue;
    }

    if (isDefinition) {
      // Definition message
      offset += 1; // reserved
      const arch = view.getUint8(offset); offset += 1;
      const littleEndian = arch === 0;
      const globalMesgNum = littleEndian ? view.getUint16(offset, true) : view.getUint16(offset, false);
      offset += 2;
      const numFields = view.getUint8(offset); offset += 1;

      const fields = [];
      for (let f = 0; f < numFields; f++) {
        const fieldDefNum = view.getUint8(offset); offset += 1;
        const fieldSize = view.getUint8(offset); offset += 1;
        const baseType = view.getUint8(offset); offset += 1;
        fields.push({ fieldDefNum, fieldSize, baseType });
      }

      // Check for developer fields (bit 5 set in record header)
      const hasDeveloperData = (recordHeader & 0x20) !== 0;
      let devFields = [];
      if (hasDeveloperData) {
        const numDevFields = view.getUint8(offset); offset += 1;
        for (let d = 0; d < numDevFields; d++) {
          const devFieldNum = view.getUint8(offset); offset += 1;
          const devFieldSize = view.getUint8(offset); offset += 1;
          const devIndex = view.getUint8(offset); offset += 1;
          devFields.push({ devFieldNum, devFieldSize, devIndex });
        }
      }

      definitions.set(localMesgType, { globalMesgNum, fields, devFields, littleEndian });
    } else {
      // Normal data message
      const def = definitions.get(localMesgType);
      if (!def) {
        // Can't parse without definition, skip
        break;
      }
      const row = readDataFields(view, offset, def, fileSize);
      offset = row._nextOffset;
      if (def.globalMesgNum === 20) records.push(row);
    }
  }

  // ──── Transform into FormForward row format ────
  const rows = records
    .filter(r => r[FIELD.TIMESTAMP] != null)
    .map(r => {
      // FIT timestamps are seconds since Dec 31, 1989 00:00:00 UTC
      const fitEpoch = 631065600; // seconds between Unix epoch and FIT epoch
      const unixTimestamp = (r[FIELD.TIMESTAMP] || 0) + fitEpoch;
      const date = new Date(unixTimestamp * 1000);

      const cadence = r[FIELD.CADENCE] != null ? r[FIELD.CADENCE] * 2 : null; // Garmin stores half-cadence for running
      const hr = r[FIELD.HEART_RATE] ?? null;
      const elevation = r[FIELD.ENHANCED_ALTITUDE] != null
        ? (r[FIELD.ENHANCED_ALTITUDE] / 5) - 500
        : r[FIELD.ALTITUDE] != null
          ? (r[FIELD.ALTITUDE] / 5) - 500
          : null;
      const speed = r[FIELD.ENHANCED_SPEED] != null
        ? r[FIELD.ENHANCED_SPEED] / 1000
        : r[FIELD.SPEED] != null
          ? r[FIELD.SPEED] / 1000
          : null;
      const pace = speed && speed > 0 ? (1 / speed) / 60 * 1000 : null; // min/km

      const vo = r[FIELD.VERTICAL_OSCILLATION] != null ? r[FIELD.VERTICAL_OSCILLATION] / 10 : null; // mm
      const gct = r[FIELD.STANCE_TIME] != null ? r[FIELD.STANCE_TIME] / 10 : null; // ms
      const gctBalance = r[FIELD.STANCE_TIME_BALANCE] != null ? r[FIELD.STANCE_TIME_BALANCE] / 100 : null; // %
      const strideLength = r[FIELD.STEP_LENGTH] != null ? r[FIELD.STEP_LENGTH] / 1000 : null; // m

      return {
        time: date.toISOString(),
        cadence,
        heart_rate: hr,
        elevation: elevation != null ? Math.round(elevation * 10) / 10 : null,
        pace: pace != null ? Math.round(pace * 100) / 100 : null,
        vertical_oscillation_mm: vo != null ? Math.round(vo * 10) / 10 : null,
        ground_contact_time_ms: gct != null ? Math.round(gct) : null,
        stride_length_m: strideLength != null ? Math.round(strideLength * 100) / 100 : null,
        gct_balance: gctBalance != null ? Math.round(gctBalance * 10) / 10 : null
      };
    })
    .filter(r => r.cadence != null || r.heart_rate != null);

  // Build summary
  const validCadence = rows.filter(r => r.cadence != null).map(r => r.cadence);
  const validHR = rows.filter(r => r.heart_rate != null).map(r => r.heart_rate);
  const validPace = rows.filter(r => r.pace != null && r.pace > 0 && r.pace < 20).map(r => r.pace);

  return {
    rows,
    summary: {
      totalRecords: rows.length,
      durationMinutes: rows.length > 0 ? Math.round((new Date(rows[rows.length - 1].time) - new Date(rows[0].time)) / 60000) : 0,
      avgCadence: validCadence.length ? Math.round(validCadence.reduce((s, v) => s + v, 0) / validCadence.length) : null,
      avgHR: validHR.length ? Math.round(validHR.reduce((s, v) => s + v, 0) / validHR.length) : null,
      avgPace: validPace.length ? Math.round(validPace.reduce((s, v) => s + v, 0) / validPace.length * 100) / 100 : null,
      startTime: rows[0]?.time || null,
      endTime: rows[rows.length - 1]?.time || null
    }
  };
}

/**
 * Read all field values from a data message.
 */
function readDataFields(view, offset, def, fileSize) {
  const row = {};
  const le = def.littleEndian;

  for (const field of def.fields) {
    if (offset + field.fieldSize > fileSize) {
      offset = fileSize;
      break;
    }

    const value = readFieldValue(view, offset, field.fieldSize, field.baseType, le);
    if (value !== null && value !== undefined) {
      row[field.fieldDefNum] = value;
    }
    offset += field.fieldSize;
  }

  // Skip developer fields
  for (const devField of (def.devFields || [])) {
    offset += devField.devFieldSize;
  }

  row._nextOffset = offset;
  return row;
}

/**
 * Read a single field value based on its base type.
 */
function readFieldValue(view, offset, size, baseType, littleEndian) {
  try {
    const type = baseType & 0x7F;
    const isInvalid = (val, max) => val === max; // FIT uses max value as "invalid"

    switch (type) {
      case 0: case 13: case 10: { // enum, byte, bool (uint8)
        const v = view.getUint8(offset);
        return v === 0xFF ? null : v;
      }
      case 1: { // sint8
        const v = view.getInt8(offset);
        return v === 0x7F ? null : v;
      }
      case 2: case 131: { // uint8, uint8z
        const v = view.getUint8(offset);
        return v === 0xFF ? null : v;
      }
      case 3: { // sint16
        const v = view.getInt16(offset, littleEndian);
        return v === 0x7FFF ? null : v;
      }
      case 4: case 132: { // uint16, uint16z
        if (size < 2) return null;
        const v = view.getUint16(offset, littleEndian);
        return v === 0xFFFF ? null : v;
      }
      case 5: { // sint32
        if (size < 4) return null;
        const v = view.getInt32(offset, littleEndian);
        return v === 0x7FFFFFFF ? null : v;
      }
      case 6: case 134: { // uint32, uint32z
        if (size < 4) return null;
        const v = view.getUint32(offset, littleEndian);
        return v === 0xFFFFFFFF ? null : v;
      }
      case 7: { // string
        let str = "";
        for (let i = 0; i < size; i++) {
          const ch = view.getUint8(offset + i);
          if (ch === 0) break;
          str += String.fromCharCode(ch);
        }
        return str || null;
      }
      case 8: case 9: { // float32, float64
        if (size === 4) {
          const v = view.getFloat32(offset, littleEndian);
          return isNaN(v) ? null : v;
        }
        if (size === 8) {
          const v = view.getFloat64(offset, littleEndian);
          return isNaN(v) ? null : v;
        }
        return null;
      }
      default:
        // Unknown type — skip
        return null;
    }
  } catch {
    return null;
  }
}

function skipUnknownDataMessage() {
  return 0; // Can't skip without definition
}

export const PAT = [
  0x47, // sync byte
  // tei:0 pusi:1 tp:0 pid:0 0000 0000 0000
  0x40, 0x00,
  // tsc:01 afc:01 cc:0000 pointer_field:0000 0000
  0x50, 0x00,
  // tid:0000 0000 ssi:0 0:0 r:00 sl:0000 0000 0000
  0x00, 0x00, 0x00,
  // tsi:0000 0000 0000 0000
  0x00, 0x00,
  // r:00 vn:00 000 cni:1 sn:0000 0000 lsn:0000 0000
  0x01, 0x00, 0x00,
  // pn:0000 0000 0000 0001
  0x00, 0x01,
  // r:000 pmp:0 0000 0010 0000
  0x00, 0x10,
  // crc32:0000 0000 0000 0000 0000 0000 0000 0000
  0x00, 0x00, 0x00, 0x00
];

export const generatePMT = (options) => {
  var PMT = [
    0x47, // sync byte
    // tei:0 pusi:1 tp:0 pid:0 0000 0010 0000
    0x40, 0x10,
    // tsc:01 afc:01 cc:0000 pointer_field:0000 0000
    0x50, 0x00,
    // tid:0000 0010 ssi:0 0:0 r:00 sl:0000 0001 1100
    0x02, 0x00, 0x1c,
    // pn:0000 0000 0000 0001
    0x00, 0x01,
    // r:00 vn:00 000 cni:1 sn:0000 0000 lsn:0000 0000
    0x01, 0x00, 0x00,
    // r:000 ppid:0 0011 1111 1111
    0x03, 0xff,
    // r:0000 pil:0000 0000 0000
    0x00, 0x00];

    if (options.hasVideo) {
      // h264
      PMT = PMT.concat([
        // st:0001 1010 r:000 epid:0 0000 0001 0001
        0x1b, 0x00, 0x11,
        // r:0000 esil:0000 0000 0000
        0x00, 0x00
      ]);
    }

    if (options.hasAudio) {
      // adts
      PMT = PMT.concat([
        // st:0000 1111 r:000 epid:0 0000 0001 0010
        0x0f, 0x00, 0x12,
        // r:0000 esil:0000 0000 0000
        0x00, 0x00
      ]);
    }

    if (options.hasMetadata) {
      // timed metadata
      PMT = PMT.concat([
        // st:0001 0111 r:000 epid:0 0000 0001 0011
        0x15, 0x00, 0x13,
        // r:0000 esil:0000 0000 0000
        0x00, 0x00
      ]);
    }

    // crc
    return PMT.concat([0x00, 0x00, 0x00, 0x00]);
};

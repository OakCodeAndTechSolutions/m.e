/**
 * Real DIN device proportions in board units.
 *
 * The board is authored in its own units: one 18 mm module pitch is 0.17 units, so
 * 1 mm = 0.17 / 18 units. Keeping every device dimension in millimetres here is what
 * makes the board read as real equipment rather than a scaled toy.
 */
export const MM = 0.17 / 18;

/** Metres per board unit — the room mounts the board at this scale (true size). */
export const BOARD_METRES_PER_UNIT = 0.018 / 0.17;

/**
 * Side profile of a modular device (DIN 43880 size 1), from the rail mounting face:
 * full-height body with terminal shoulders, and a 45 mm "nose" that is the only part
 * passing through the escutcheon.
 */
export const DIN = {
  /** Overall body height (terminal shoulders), mm. */
  height: 91 * MM,
  /** Front nose height — the standard 45 mm escutcheon cut-out. */
  noseHeight: 45 * MM,
  /** Rail face to shoulder front, where the escutcheon sits. */
  shoulderDepth: 46 * MM,
  /** Rail face to nose front. */
  noseDepth: 66 * MM,
  /** Chamfer on the shoulder's top/bottom front edge. */
  shoulderChamfer: 4 * MM,
  /** Terminal screw centres above/below the device centre. */
  screwY: 34 * MM,
  screwRadius: 2.6 * MM,
  /** Cable entry depth behind the shoulder face (directly under the screw clamp). */
  clampBehindShoulder: 12 * MM,
  /** Small gap between adjacent modules so the joins read. */
  gap: 0.25 * MM,
} as const;

/**
 * Module-local Z planes. The device group origin is `moduleBodyZ()`; the rear sits
 * on the DIN rail and the planes below follow from the profile.
 */
export const DIN_Z = {
  rear: -0.265,
  get shoulder() {
    return this.rear + DIN.shoulderDepth;
  },
  get nose() {
    return this.rear + DIN.noseDepth;
  },
  get clamp() {
    return this.rear + DIN.shoulderDepth - DIN.clampBehindShoulder;
  },
} as const;

/**
 * Layout on the 45 mm nose face, top to bottom, in module-local Y: printed rating label
 * (with the T test button at its right), toggle opening, dangerous-voltage label.
 */
export const NOSE_LAYOUT = {
  label: { y: 0.128, height: 0.165 },
  test: { x: 0.044, y: 0.098, size: 0.04 },
  toggle: { y: -0.042, openingHeight: 0.13 },
  warning: { y: -0.175, height: 0.05 },
} as const;

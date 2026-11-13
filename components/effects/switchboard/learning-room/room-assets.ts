/** Real CC-BY product models. Sources: public/models/learning-room/CREDITS.md */
export const ROOM_GLB = {
  fridge: '/models/learning-room/optimized/real/fridge-french.glb?v=10',
  oven: '/models/learning-room/optimized/real/oven.glb?v=15',
  cooktop: '/models/learning-room/optimized/real/cooktop-lutz.glb?v=12',
  dishwasher: '/models/learning-room/optimized/real/dishwasher-phoria.glb?v=23',
  /** One wall canopy — never stack a second chimney mesh on top. */
  hood: '/models/learning-room/optimized/real/hood-wall.glb?v=3',
  toaster: '/models/learning-room/optimized/real/toaster.glb?v=8',
  sink: '/models/learning-room/optimized/real/sink.glb?v=8',
  tap: '/models/learning-room/optimized/real/tap.glb?v=8',
  pot: '/models/learning-room/optimized/kitchen/pot.glb?v=1',
  roast: '/models/learning-room/optimized/kitchen/roast.glb?v=1',
  /** White double GPO plate — splash double only. */
  gpoDouble: '/models/learning-room/optimized/real/gpo-double.glb?v=8',
  switch: '/models/learning-room/optimized/switch.glb?v=12',
  isolator: '/models/learning-room/optimized/isolator.glb?v=12',
  dimmer: '/models/learning-room/optimized/dimmer.glb?v=1',
  television: '/models/learning-room/optimized/real/tv-samsung.glb?v=1',
} as const;

const house = (name: string, version = 1) =>
  '/models/learning-room/optimized/house/' + name + '.glb?v=' + version;

export const HOUSE_GLB = {
  'hardwood-floor': house('hardwood-floor', 2),
  'kitchen-island': house('kitchen-island', 2),
  'dining-table': house('dining-table', 2),
  'dining-chair': house('dining-chair', 2),
  sofa: house('sofa', 3),
  'coffee-table': house('coffee-table', 2),
  'media-console': house('media-console', 2),
  pendant: house('pendant'),
  'potted-gum': house('potted-gum', 2),
  'board-door': house('board-door'),
  'rcbo-body': house('rcbo-body', 2),
  'isolator-body': house('isolator-body', 2),
  'rcbo-toggle': house('rcbo-toggle', 2),
  'isolator-toggle': house('isolator-toggle', 2),
  'rcbo-test': house('rcbo-test', 2),
} as const;

export function preloadRoomModelPaths(): string[] {
  return [...Object.values(ROOM_GLB), ...Object.values(HOUSE_GLB)];
}

/** Poly Haven and ambientCG CC0 materials. */
export const POLYHAVEN = {
  tiles: {
    diff: '/models/learning-room/optimized/polyhaven/textures/tiles/long_white_tiles_diff_2k.jpg',
    nor: '/models/learning-room/optimized/polyhaven/textures/tiles/long_white_tiles_nor_gl_2k.jpg',
    arm: '/models/learning-room/optimized/polyhaven/textures/tiles/long_white_tiles_arm_2k.jpg',
  },
  marble: {
    diff: '/models/learning-room/optimized/polyhaven/textures/marble/marble_01_diff_1k.jpg',
    nor: '/models/learning-room/optimized/polyhaven/textures/marble/marble_01_nor_gl_1k.jpg',
    arm: '/models/learning-room/optimized/polyhaven/textures/marble/marble_01_arm_1k.jpg',
  },
  /** ambientCG Marble015 — seamless cream slab, not tiled stone. */
  marbleSlab: {
    diff: '/models/learning-room/optimized/ambientcg/marble-015/color.jpg',
    nor: '/models/learning-room/optimized/ambientcg/marble-015/normal.jpg',
    rough: '/models/learning-room/optimized/ambientcg/marble-015/roughness.jpg',
  },
  laminate: {
    diff: '/models/learning-room/optimized/polyhaven/textures/laminate/laminate_floor_02_diff_1k.jpg',
    nor: '/models/learning-room/optimized/polyhaven/textures/laminate/laminate_floor_02_nor_gl_1k.jpg',
    arm: '/models/learning-room/optimized/polyhaven/textures/laminate/laminate_floor_02_arm_1k.jpg',
  },
  oakVeneer: {
    diff: '/models/learning-room/optimized/polyhaven/textures/oak-veneer/oak_veneer_01_diff_1k.jpg',
    nor: '/models/learning-room/optimized/polyhaven/textures/oak-veneer/oak_veneer_01_nor_gl_1k.jpg',
    arm: '/models/learning-room/optimized/polyhaven/textures/oak-veneer/oak_veneer_01_arm_1k.jpg',
  },
  /** Poly Haven CC0 — charcoal rib knit for the lounge rug. */
  knittedFleece: {
    diff: '/models/learning-room/optimized/polyhaven/textures/knitted-fleece/knitted_fleece_diff_1k.jpg',
    nor: '/models/learning-room/optimized/polyhaven/textures/knitted-fleece/knitted_fleece_nor_gl_1k.jpg',
    rough:
      '/models/learning-room/optimized/polyhaven/textures/knitted-fleece/knitted_fleece_rough_1k.jpg',
  },
  pine: {
    diff: '/models/learning-room/optimized/polyhaven/textures/pine/coated_pine_diff_1k.jpg',
    nor: '/models/learning-room/optimized/polyhaven/textures/pine/coated_pine_nor_gl_1k.jpg',
    arm: '/models/learning-room/optimized/polyhaven/textures/pine/coated_pine_arm_1k.jpg',
  },
  /**
   * Fresh MGP10 radiata for the open frame: Poly Haven Plywood face veneer, its diffuse
   * re-toned pale and yellow (scripts/optimize-room-assets.mjs), normal and ARM as-is.
   */
  mgpPine: {
    diff: '/models/learning-room/optimized/polyhaven/textures/plywood/mgp-pine_diff_1k.jpg',
    nor: '/models/learning-room/optimized/polyhaven/textures/plywood/plywood_nor_gl_1k.jpg',
    arm: '/models/learning-room/optimized/polyhaven/textures/plywood/plywood_arm_1k.jpg',
  },
  /** ambientCG Wood048 — pale construction pine, not furniture stain. */
  treatedPine: {
    diff: '/models/learning-room/optimized/ambientcg/wood-048/color.jpg',
    nor: '/models/learning-room/optimized/ambientcg/wood-048/normal.jpg',
    rough: '/models/learning-room/optimized/ambientcg/wood-048/roughness.jpg',
  },
  /** ambientCG Foil001 — silver sisalation behind the open frame. */
  foilSarking: {
    diff: '/models/learning-room/optimized/ambientcg/foil-001/color.jpg',
    nor: '/models/learning-room/optimized/ambientcg/foil-001/normal.jpg',
    rough: '/models/learning-room/optimized/ambientcg/foil-001/roughness.jpg',
    metal: '/models/learning-room/optimized/ambientcg/foil-001/metalness.jpg',
  },
} as const;

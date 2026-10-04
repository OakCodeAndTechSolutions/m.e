/** Real CC-BY product models. Sources: public/models/learning-room/CREDITS.md */
export const ROOM_GLB = {
  cabinetDrawers: '/models/learning-room/real/cabinet-drawers.glb?v=8',
  /** Modular kitchen cupboard kit — one closed two-door unit per bay. */
  cabinetDoors: '/models/learning-room/real/cabinets-modular.glb?v=3',
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
  /** Generated AU 1-gang GPO for singles (fridge / DW / splash). */
  gpoSingle: '/models/learning-room/gpo-single.glb?v=4',
  switch: '/models/learning-room/optimized/switch.glb?v=12',
  isolator: '/models/learning-room/optimized/isolator.glb?v=12',
  dimmer: '/models/learning-room/optimized/dimmer.glb?v=1',
  /** Sketchfab CC-BY lounge furniture — same Objaverse source as the kitchen. */
  sofa: '/models/learning-room/optimized/real/sofa-modern.glb?v=1',
  coffeeTable:
    '/models/learning-room/polyhaven/modern_coffee_table_01/modern_coffee_table_01_1k.gltf?v=1',
  television: '/models/learning-room/optimized/real/tv-samsung.glb?v=1',
  tvCabinet: '/models/learning-room/optimized/real/tv-byas.glb?v=1',
  /** Poly Haven CC0 pliers — player avatar https://polyhaven.com/a/pliers */
  pliers: '/models/learning-room/real/pliers/pliers.gltf?v=4',
} as const;

/** Models in the idle camera. Pliers load when the player enters. Unused cabinet GLBs stay off this list. */
const IDLE_ROOM_MODELS = [
  ROOM_GLB.fridge,
  ROOM_GLB.oven,
  ROOM_GLB.cooktop,
  ROOM_GLB.dishwasher,
  ROOM_GLB.hood,
  ROOM_GLB.toaster,
  ROOM_GLB.sink,
  ROOM_GLB.tap,
  ROOM_GLB.pot,
  ROOM_GLB.roast,
  ROOM_GLB.gpoDouble,
  ROOM_GLB.switch,
  ROOM_GLB.isolator,
  ROOM_GLB.dimmer,
  ROOM_GLB.sofa,
  ROOM_GLB.coffeeTable,
  ROOM_GLB.television,
  ROOM_GLB.tvCabinet,
] as const;

export function preloadRoomModelPaths(): string[] {
  return [...IDLE_ROOM_MODELS];
}

/** Poly Haven CC0 materials / HDRI — same source as the pliers. */
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

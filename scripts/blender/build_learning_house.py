"""Build the original learning-house meshes with Blender's background Python API."""

from math import copysign, cos, pi, sin
import json
from pathlib import Path
from random import Random

import bmesh
import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
MODELS = ROOT / 'public/models/learning-room/optimized'
OUTPUT = MODELS / 'house'
SOURCE = ROOT / '.cache/learning-house/learning-house.blend'
DIN_PROFILE = json.loads((ROOT / 'components/effects/switchboard/din-profile.json').read_text())
OUTPUT.mkdir(parents=True, exist_ok=True)
SOURCE.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'


def linear(hex_color):
    srgb = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return (*[v / 12.92 if v < .04045 else ((v + .055) / 1.055) ** 2.4 for v in srgb], 1)


def material(name, color, roughness=.55, metal=0, texture=None, normal=None, normal_strength=.45):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = linear(color)
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = mat.diffuse_color
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metal
    for path, is_normal in ((texture, False), (normal, True)):
        if not path:
            continue
        node = mat.node_tree.nodes.new('ShaderNodeTexImage')
        node.image = path if isinstance(path, bpy.types.Image) else bpy.data.images.load(
            str(MODELS / path), check_existing=True)
        if is_normal:
            node.image.colorspace_settings.name = 'Non-Color'
            bump = mat.node_tree.nodes.new('ShaderNodeNormalMap')
            bump.inputs['Strength'].default_value = normal_strength
            mat.node_tree.links.new(node.outputs['Color'], bump.inputs['Color'])
            mat.node_tree.links.new(bump.outputs['Normal'], shader.inputs['Normal'])
        else:
            mat.node_tree.links.new(node.outputs['Color'], shader.inputs['Base Color'])
    return mat


WOOD = 'polyhaven/textures/oak-veneer/oak_veneer_01_'
OAK = material('Satin quarter-cut oak', 'b48a61', .48, texture=WOOD + 'diff_1k.jpg',
               normal=WOOD + 'nor_gl_1k.jpg', normal_strength=.24)
FLOOR = material('Satin Australian hardwood', 'b48a61', .43, texture=WOOD + 'diff_1k.jpg',
                 normal=WOOD + 'nor_gl_1k.jpg', normal_strength=.13)
STONE = material('Honed warm stone', 'd5c6b0', .54, texture='ambientcg/marble-015/color.jpg',
                 normal='ambientcg/marble-015/normal.jpg', normal_strength=.14)
OLIVE = material('Matte olive laminate', '656c54', .73)


def woven_fabric(name, color):
    size = 128
    rng = Random(7)
    pixels = []
    base = linear(color)[:3]

    def encode_srgb(value):
        return 12.92 * value if value < .0031308 else 1.055 * value ** (1 / 2.4) - .055

    for y in range(size):
        for x in range(size):
            # Broad yarns cross in a basket weave. Each yarn has a soft core and shaded edges.
            warp_over = ((x // 8) + (y // 8)) % 2 == 0
            across, along = (x, y) if warp_over else (y, x)
            rib = sin(pi * ((across % 8) + .5) / 8)
            shade = .79 + .24 * rib + .034 * sin(along * pi / 8) + rng.uniform(-.055, .055)
            pixels.extend((*[encode_srgb(min(1, shade * v)) for v in base], 1))
    tile = bpy.data.images.new(name + ' weave', size, size, alpha=False)
    tile.pixels.foreach_set(pixels)
    tile.pack()
    return material(name, color, .92, texture=tile,
                    normal='polyhaven/textures/knitted-fleece/knitted_fleece_nor_gl_1k.jpg',
                    normal_strength=.34)


LINEN = woven_fabric('Oat basket-weave upholstery', 'c9bba8')
RUST = woven_fabric('Clay scatter-cushion fabric', '9c654f')
MOSS = woven_fabric('Moss scatter-cushion fabric', '6e7654')
SEAM = material('Folded upholstery seam', 'a3917c', .94)
PEAR = material('Green pear skin', '7d8649', .58)
CORD = material('Natural paper cord', 'a98c62', .91)
CORD_LIGHT = material('Unbleached paper cord', 'bb9d73', .91)
CHAIR_FABRIC = material('Natural dining chair upholstery', 'c9bba8', .92)
FOOT_WOOD = material('Oiled timber sofa feet', '8d6b45', .49)
BARK = material('Grey-brown gum bark', '877c6e', .84)
CERAMIC = material('Glazed ivory ceramic', 'e7ddc6', .27)
BRASS = material('Satin antique brass', 'bc975f', .39, .73)
BLACK = material('Charcoal fittings', '252728', .49, .17)
WHITE = material('Warm white powder coat', 'eae9e3', .39, .13)
SEAL = material('Light grey moulding', 'babbb4', .66)
SOIL = material('Potting mix', '473a2f', .97)
LEAF = [material('Gum leaf ' + str(i), c, .61) for i, c in enumerate(('728875', '52695d', '899b7e'))]
DEVICE_PC = material('Satin ivory moulded polymer', 'eeefec', .39)
DEVICE_SEAM = material('Mould joint shadow', 'b1b5b2', .64)
TERMINAL_STEEL = material('Zinc plated combination head screw', 'aeb4b9', .43, .79)
RECESS_STEEL = material('Steel inside the drive recess', '666e72', .52, .67)
TUNNEL = material('Dark terminal tunnel liner', '303438', .67)
CLAMP = material('Tinned terminal cage', 'a7aeb1', .38, .77)
DIN_TAB = material('Yellow DIN locking latch', 'd4bc34', .55)
GRIP_GREEN = material('Green moulded grip', '288048', .52)
GRIP_RED = material('Red isolator grip', 'ba322b', .53)


def xyz(at):
    """Accept scene X/up/depth and write Blender X/Y/up."""
    return (at[0], -at[2], at[1])


def finish(obj, name, mat):
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def bevel(obj, radius, segments=3):
    mod = obj.modifiers.new('Soft manufactured edges', 'BEVEL')
    mod.width = radius
    mod.segments = segments
    mod.harden_normals = True
    for p in obj.data.polygons:
        p.use_smooth = True
    normals = obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    normals.keep_sharp = True


def box(name, at, dims, mat, radius=.004, grain='height', segments=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz(at))
    obj = finish(bpy.context.object, name, mat)
    obj.scale = (dims[0], dims[2], dims[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    uv = obj.data.uv_layers.active.data
    # Map grain along the component, with different offsets on adjacent boards.
    for poly in obj.data.polygons:
        axis = max(range(3), key=lambda i: abs(poly.normal[i]))
        axes = [i for i in range(3) if i != axis]
        along = (0 if grain == 'width' else 2)
        if along not in axes:
            along = max(axes, key=lambda i: obj.dimensions[i])
        across = next(i for i in axes if i != along)
        for idx in poly.loop_indices:
            co = obj.data.vertices[obj.data.loops[idx].vertex_index].co
            if mat == LINEN:
                uv[idx].uv = (co[across] / .034, co[along] / .034)
            else:
                uv[idx].uv = (co[across] / .52 + at[0] * .71, co[along] / 1.16 + at[2] * .19)
    bevel(obj, radius, segments)
    return obj


def rod(name, a, b, r, mat, r_end=None, sides=12):
    a, b = Vector(xyz(a)), Vector(xyz(b))
    diff = b - a
    bpy.ops.mesh.primitive_cone_add(
        vertices=sides, radius1=r, radius2=r if r_end is None else r_end,
        depth=diff.length, location=(a + b) / 2,
    )
    obj = finish(bpy.context.object, name, mat)
    obj.rotation_euler = diff.to_track_quat('Z', 'Y').to_euler()
    for p in obj.data.polygons:
        p.use_smooth = len(p.vertices) == 4
    return obj


def profile(name, at, rings, mat, sides=48, sx=1, sz=1):
    """Lathe a cross section in metres. A small inner radius avoids degenerate faces."""
    verts = [xyz((at[0] + r * cos(i * 2 * pi / sides) * sx, at[1] + y,
                  at[2] + r * sin(i * 2 * pi / sides) * sz))
             for y, r in rings for i in range(sides)]
    faces = [(j * sides + i, (j + 1) * sides + i, (j + 1) * sides + (i + 1) % sides,
              j * sides + (i + 1) % sides) for j in range(len(rings) - 1) for i in range(sides)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    uv = mesh.uv_layers.new().data
    for p in mesh.polygons:
        p.use_smooth = True
        for idx in p.loop_indices:
            vertex = mesh.loops[idx].vertex_index
            x, y, z = mesh.vertices[vertex].co
            if mat == OAK and abs(p.normal.z) < .65:
                side = vertex % sides
                if side == 0 and p.index % sides == sides - 1:
                    side = sides
                uv[idx].uv = (side / sides, z / .95 + at[0] * .71)
            else:
                uv[idx].uv = (y / .52 + .5, x / 1.16 + .5)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj, name, mat)


def vase(at, scale=1):
    profile('Thrown ceramic vase', at, [(y * scale, r * scale) for y, r in (
        (0, .001), (0, .063), (.012, .072), (.065, .079), (.13, .065),
        (.17, .033), (.198, .03), (.203, .029), (.203, .025), (.14, .02),
        (.018, .018), (.017, .001),
    )], CERAMIC)


def island():
    box('Recessed shadow plinth', (0, .055, -.025), (1.91, .11, .62), BLACK, .014)
    box('Painted cabinet body', (0, .49, -.045), (2.03, .77, .65), OLIVE, .012)
    for x in (-.674, 0, .674):
        for y, h in ((.704, .277), (.344, .43)):
            box('Drawer front', (x, y, -.385), (.667, h, .022), OLIVE)
            rod('Drawer pull', (x - .077, y + h / 2 - .045, -.421), (x + .077, y + h / 2 - .045, -.421), .005, BRASS)
            for dx in (-.055, .055):
                rod('Pull mount', (x + dx, y + h / 2 - .045, -.395), (x + dx, y + h / 2 - .045, -.421), .004, BRASS)
    box('Veneer rear panel', (0, .495, .284), (2.055, .77, .035), OAK, .013)
    for i in range(51):
        x = (i - 25) * .039
        box('Radiused veneer flute', (x, .496, .306), (.029, .754, .021), OAK, .005, segments=2)
    box('Honed stone overhang', (0, .916, 0), (2.18, .028, .91), STONE, .003, 'width')
    vase((-.62, .93, .12), .85)
    profile('Stoneware fruit bowl', (.6, .93, -.05), [(0, .001), (0, .069), (.012, .09),
            (.057, .135), (.073, .141), (.073, .134), (.04, .109), (.013, .06), (.013, .001)], CERAMIC)
    for i in range(5):
        at = (.6 + cos(i * 2.4) * .074, .992, -.05 + sin(i * 2.4) * .064)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=.034, location=xyz(at))
        fruit = finish(bpy.context.object, 'Green pear', PEAR)
        fruit.scale.z = 1.2
        for p in fruit.data.polygons:
            p.use_smooth = True


def dining():
    profile('Oval solid-oak top', (0, 0, 0), [(.708, .001), (.708, .46), (.716, .493),
            (.739, .5), (.75, .489), (.75, .001)], OAK, sx=1.48, sz=.83)
    for x in (-.42, .42):
        box('Trestle stretcher', (x, .625, 0), (.092, .12, .55), OAK, .025)
        for side in (-1, 1):
            rod('Splayed solid timber leg', (x * 1.13, .002, side * .305), (x, .65, side * .188), .025, OAK, .039)
    vase((.22, .75, .02))


def chair():
    box('Oak seat frame', (0, .427, 0), (.465, .043, .438), OAK, .037)
    box('Paper cord insert', (0, .452, -.007), (.403, .018, .372), CORD, .023)
    for i in range(25):
        x = (i - 12) * .0155
        rod('Woven warp', (x, .462, -.183), (x, .462, .174), .002, CORD_LIGHT, sides=6)
    for side in (-1, 1):
        rod('Front leg', (side * .218, 0, -.22), (side * .176, .441, -.161), .017, OAK, .027)
        rod('Rear upright', (side * .216, 0, .211), (side * .176, .822, .185), .017, OAK, .023)
    box('Curved padded backrest', (0, .779, .186), (.391, .105, .045), CHAIR_FABRIC, .021)


def hardwood_floor():
    """Stagger the end joints and sample different grain for every board."""
    rng = Random(23)
    width, depth, board_width = 8.4, 7.0, .138
    vertices, faces, texcoords, colors = [], [], [], []
    for row in range(61):
        x0, x1 = row * board_width, min((row + 1) * board_width, width)
        z0 = 0
        while z0 < depth - .001:
            length = rng.uniform(.54, 1) if z0 == 0 else rng.uniform(1.05, 2.2)
            z1 = min(depth, z0 + length)
            if depth - z1 < .28:
                z1 = depth
            tint, warm = rng.uniform(.64, 1), rng.uniform(.92, 1)
            u0, v0 = rng.random(), rng.random()
            direction = rng.choice((-1, 1))
            first = len(vertices)
            for inset, y, shade in ((0, -.00045, .67), (.0007, 0, 1)):
                for x, z in ((x0 + inset, z0 + inset), (x0 + inset, z1 - inset),
                             (x1 - inset, z1 - inset), (x1 - inset, z0 + inset)):
                    vertices.append(xyz((x, y, z)))
                    texcoords.append((u0 + (x - x0) / .36, v0 + direction * (z - z0) / 1.35))
                    colors.append((shade * tint, shade * tint * warm, shade * tint * warm ** 2, 1))
            faces.extend((first + i, first + (i + 1) % 4, first + 4 + (i + 1) % 4,
                          first + 4 + i) for i in range(4))
            faces.append(tuple(range(first + 4, first + 8)))
            z0 = z1
    mesh = bpy.data.meshes.new('Staggered hardwood boards')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    uv = mesh.uv_layers.new()
    for loop in mesh.loops:
        uv.data[loop.index].uv = texcoords[loop.vertex_index]
    tint = mesh.color_attributes.new(name='Board tones', type='FLOAT_COLOR', domain='POINT')
    for vertex, color in zip(tint.data, colors):
        vertex.color = color
    mesh.color_attributes.active_color = tint
    obj = bpy.data.objects.new(mesh.name, mesh)
    bpy.context.collection.objects.link(obj)
    finish(obj, mesh.name, FLOOR)


def cushion(name, at, dims, mat, phase, rotation=(0, 0, 0), seam_mat=SEAM, wrinkles=1):
    """Crowned loose cushion with a pinched seam and slight, irregular compression."""
    steps = 48
    rings = ((.015, -.40), (.54, -.48), (.80, -.47), (.93, -.41), (.985, -.29),
             (1, -.15), (.985, 0), (1, .16), (.98, .31), (.91, .41),
             (.76, .47), (.49, .49), (.015, .50))
    w, h, depth = dims
    verts = []
    for scale, height in rings:
        for i in range(steps):
            a = 2 * pi * i / steps
            s, c = sin(a), cos(a)
            wrinkle = wrinkles * (sin(a * 7 + phase) + .32 * sin(a * 13 - phase))
            outline = scale * (1 + .013 * wrinkle * scale ** 4)
            x = w * .5 * outline * copysign(abs(c) ** .30, c)
            z = depth * .5 * outline * copysign(abs(s) ** .32, s)
            y = h * (height + scale ** 2 * (.024 * wrinkle + .06 * cos(a + phase)))
            verts.append(xyz((x, y, z)))
    faces = [tuple(reversed(range(steps)))]
    for j in range(len(rings) - 1):
        for i in range(steps):
            a, b = j * steps + i, j * steps + (i + 1) % steps
            faces.append((a, b, b + steps, a + steps))
    faces.append(tuple(range(len(verts) - steps, len(verts))))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    uv = mesh.uv_layers.new()
    for face in mesh.polygons:
        face.use_smooth = True
        face_axis = max(range(3), key=lambda axis: abs(face.normal[axis]))
        axes = [axis for axis in range(3) if axis != face_axis]
        for index in face.loop_indices:
            vertex = mesh.vertices[mesh.loops[index].vertex_index].co
            uv.data[index].uv = tuple(vertex[axis] / .033 + phase for axis in axes)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = xyz(at)
    obj.rotation_euler = rotation
    finish(obj, name, mat)

    curve = bpy.data.curves.new(name + ' welt', 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = .0015
    curve.bevel_resolution = 0
    spline = curve.splines.new('POLY')
    spline.points.add(steps - 1)
    for point, (x, y, z) in zip(spline.points, verts[6 * steps:7 * steps]):
        point.co = (x * 1.01, y * 1.01, z, 1)
    spline.use_cyclic_u = True
    welt = bpy.data.objects.new(curve.name, curve)
    bpy.context.collection.objects.link(welt)
    welt.location = obj.location
    welt.rotation_euler = rotation
    finish(welt, curve.name, seam_mat)


def sofa():
    box('Low upholstered deck', (0, .175, 0), (2.68, .196, .89), LINEN, .039)
    box('Inset shadow base', (0, .065, -.012), (2.57, .105, .79), BLACK, .019)
    for x in (-1.12, 1.12):
        for z in (-.32, .32):
            rod('Timber foot', (x, .009, z), (x, .12, z), .036, FOOT_WOOD, .043)
    for x in (-1.26, 1.26):
        cushion('Padded arm with stitched welt', (x, .376, -.015), (.205, .37, .894), LINEN, x, wrinkles=.24)
    box('Upholstered back shell', (0, .482, -.366), (2.48, .539, .16), LINEN, .044)
    for i, x in enumerate((-.766, .001, .768)):
        cushion('Crowned seat cushion', (x, .329, .065), (.752, .148, .716), LINEN, i * 1.38)
        cushion('Leaning loose back cushion', (x, .569 + .005 * i, -.246), (.748, .167, .414),
                LINEN, 1.4 + i * 1.9, rotation=(-1.40 + i * .028, 0, (i - 1) * .016))
    for x, angle, mat in ((-.94, -.22, RUST), (.92, .26, MOSS)):
        cushion('Soft woven scatter cushion', (x, .527, -.072), (.358, .122, .351), mat, x,
                rotation=(-1.25, angle, .06), seam_mat=mat)


def coffee():
    profile('Soft oval timber top', (0, 0, 0), [(.342, .001), (.342, .465),
            (.349, .49), (.38, .5), (.391, .49), (.391, .001)], OAK, sx=1.18, sz=.60)
    for x in (-.31, .31):
        profile('Tapered column', (x, 0, 0), [(0, .001), (0, .10), (.01, .113),
                (.33, .145), (.35, .14), (.35, .001)], OAK, sx=.83)


def console():
    box('Rounded oak cabinet body', (0, .253, 0), (1.6, .394, .438), OAK, .022, 'width')
    for x in (-.535, 0, .535):
        box('Inset door shadow gap', (x, .253, -.212), (.518, .337, .021), BLACK)
        box('Solid veneer door', (x, .253, -.225), (.499, .322, .018), OAK, .009)
        box('Recessed brass pull', (x, .378, -.236), (.085, .009, .007), BRASS, .003)
    for x in (-.69, .69):
        for z in (-.15, .15):
            rod('Concealed charcoal foot', (x, 0, z), (x, .085, z), .024, BLACK)


def pendant():
    # Origin at the ceiling. Keep the diffuser separate in React for the switched glow.
    rod('Ceiling rose', (0, -.018, 0), (0, 0, 0), .046, BRASS, sides=32)
    rod('Fabric drop', (0, -.38, 0), (0, -.018, 0), .004, BLACK)
    rod('Pendant ferrule', (0, -.426, 0), (0, -.365, 0), .023, BRASS, sides=28)
    profile('Spun opal ceramic shade', (0, 0, 0), [(-.418, .027), (-.427, .051),
            (-.459, .113), (-.499, .179), (-.548, .213), (-.572, .22), (-.576, .217),
            (-.576, .21), (-.554, .207), (-.521, .185), (-.48, .135), (-.452, .084),
            (-.432, .027), (-.418, .027)][::-1], CERAMIC)


def gum():
    profile('Tapered stoneware planter', (0, 0, 0), [(0, .001), (0, .148), (.012, .164),
            (.327, .21), (.341, .21), (.344, .202), (.337, .191), (.277, .18), (.277, .001)], CERAMIC)
    profile('Potting mix surface', (0, .297, 0), [(0, .187), (0, .001)], SOIL)
    for b in range(7):
        a = b * 2.4
        tx, tz = cos(a), sin(a)
        peak = 1.36 + (b % 4) * .13
        bend = (tx * .13, .87, tz * .13)
        top = (tx * .39, peak, tz * .39)
        rod('Gum stem', (0, .29, 0), bend, .012, BARK, .007)
        rod('Gum branch', bend, top, .007, BARK, .0018)
        for j in range(9):
            t = .15 + j * .103
            x = bend[0] + (top[0] - bend[0]) * t
            y = bend[1] + (top[1] - bend[1]) * t
            z = bend[2] + (top[2] - bend[2]) * t
            angle = a + (1 if j % 2 else -1) * 1.04
            dx, dz = cos(angle), sin(angle)
            length = .16 - j * .005
            positions = [(x, y, z), (x + dx * length * .48 - dz * .027, y + .019, z + dz * length * .48 + dx * .027),
                         (x + dx * length, y - .02, z + dz * length),
                         (x + dx * length * .48 + dz * .027, y - .013, z + dz * length * .48 - dx * .027),
                         (x + dx * length * .54, y + .015, z + dz * length * .54)]
            mesh = bpy.data.meshes.new('Gum leaf')
            mesh.from_pydata([xyz(p) for p in positions], [], [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)])
            mesh.update()
            leaf = bpy.data.objects.new('Lanceolate leaf', mesh)
            bpy.context.collection.objects.link(leaf)
            finish(leaf, 'Lanceolate leaf', LEAF[(b + j) % 3])


def board_door():
    # Centred on the door; +Z points into the room in glTF.
    scale = .018 / .17
    w, h = (2.53 + .006 / scale) * scale, (3.35 + .006 / scale) * scale
    box('Folded powder-coated door', (0, 0, -.0028), (w, h, .006), WHITE, .0023)
    box('Pressed face with softened shoulder', (0, 0, .0003), (w - .012, h - .012, .003), WHITE, .00125)
    box('Lower identification strip', (0, -.134, .002), (.091, .017, .001), SEAL, .0004)
    x = w / 2 - .017
    profile('Quarter-turn latch bezel', (x, 0, 0), [(0, .001), (0, .0073),
            (.0027, .0073), (.0036, .0053), (.0036, .001)], BRASS, sides=28).rotation_euler.x = pi / 2
    box('Recessed latch keyway', (x, 0, .0037), (.007, .0012, .0008), BLACK, .0003)


def cutout(obj, cutter):
    mod = obj.modifiers.new('Tooling recess', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.object = cutter
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


def block_tool(at, size, radius=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz(at))
    tool = bpy.context.object
    tool.scale = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if radius:
        mod = tool.modifiers.new('Mould tool corner radius', 'BEVEL')
        mod.width = radius
        mod.segments = 3
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return tool


def round_tool(at, depth, radius):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=radius, depth=depth, location=xyz(at))
    obj = bpy.context.object
    obj.rotation_euler.x = pi / 2
    return obj


def module_shell(isolator):
    # Local metre origin matches DIN_Z.rear in the live board.
    d = {key: value / 1000 for key, value in DIN_PROFILE.items()}
    half, nose_half = d['height'] / 2, d['noseHeight'] / 2
    shoulder, nose = d['shoulderDepth'], d['noseDepth']
    chamfer = d['shoulderChamfer']
    section = [
        (-half, 0), (-half, shoulder - chamfer), (-half + chamfer, shoulder),
        (-nose_half, shoulder), (-nose_half, nose - .0022), (-nose_half + .0022, nose),
        (nose_half - .0015, nose), (nose_half, nose - .003), (nose_half, shoulder),
        (half - chamfer, shoulder), (half, shoulder - chamfer), (half, 0),
        (.0177, 0), (.0177, .0027), (-.0177, .0027), (-.0177, 0),
    ]
    n = len(section)
    vertices = [xyz((side * d['width'] / 2, y, z)) for side in (-1, 1) for y, z in section]
    faces = [tuple(reversed(range(n))), tuple(range(n, n * 2))]
    faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    mesh = bpy.data.meshes.new('Split case')
    mesh.from_pydata(vertices, [], faces)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    shell = bpy.data.objects.new('Insulating shell with drilled recesses', mesh)
    bpy.context.collection.objects.link(shell)
    finish(shell, shell.name, DEVICE_PC)

    toggle_y = d['toggleY']
    cutout(shell, block_tool((0, toggle_y, nose - .002),
            (d['toggleOpeningWidth'], d['toggleOpeningHeight'], .013), .0014))
    box('Moulded back of rocker well', (0, toggle_y, nose - .0082),
        (d['toggleOpeningWidth'] - .00085, d['toggleOpeningHeight'] - .00085, .0009), DEVICE_SEAM, .00042, segments=1)

    if not isolator:
        cutout(shell, round_tool((d['testX'], d['testY'], nose), .008, d['testSize'] / 2 + .00048))
        well = round_tool((d['testX'], d['testY'], nose - .0027), .0015, d['testSize'] / 2 + .00034)
        finish(well, 'Test plunger well', TUNNEL)

    for side in (-1, 1):
        for x in ([0] if isolator else [-d['terminalOffset'], d['terminalOffset']]):
            r = d['screwRadius'] + (.0005 if isolator else 0)
            screw_y = side * d['screwY']
            cutout(shell, round_tool((x, screw_y, shoulder - .0024), .014, r))
            clamp_z = shoulder - d['clampBehindShoulder']
            throat = .0078 if isolator else .0061
            cutout(shell, block_tool((x, side * (half - .004), clamp_z), (throat, .017, .0066)))
            cage_x = throat / 2 - .00045
            for lip in (-1, 1):
                box('Tunnel terminal side wall', (x + lip * cage_x, side * (half - .0055), clamp_z),
                    (.00065, .007, .0054), CLAMP, .00012, segments=1)
            box('Serrated terminal clamp bed', (x, side * (half - .0055), clamp_z - .00255),
                (throat - .001, .007, .00065), CLAMP, .00012, segments=1)
            for tooth in range(4):
                box('Terminal clamp serration', (x, side * (half - .0033 - tooth * .00125), clamp_z - .0021),
                    (throat - .0014, .00038, .00035), CLAMP, .00008, segments=1)
            screw = round_tool((x, screw_y, shoulder - .0038), .0026, r - .0006)
            finish(screw, 'Recessed combination screw', TERMINAL_STEEL)
            for dims in ((r * 1.55, .00102, .002), (.00093, r * 1.12, .002)):
                cutout(screw, block_tool((x, screw_y, shoulder - .00245), dims))
                box('Drive recess floor', (x, screw_y, shoulder - .00341),
                    (dims[0] * .96, dims[1] * .94, .00011), RECESS_STEEL, .00002, segments=1)
            bevel(screw, .00018, 1)

    # Case weld lines, small tooling bosses and a clipped-on rail latch are separate parts.
    for side in (-1, 1):
        for y, z in ((.032, .011), (-.032, .012), (.027, .030), (-.027, .031)):
            plug = rod('Housing rivet recess', (side * .00864, y, z), (side * .00893, y, z),
                       .00112, DEVICE_SEAM, sides=12)
            bevel(plug, .00008, 1)
    for side in (-1, 1):
        box('Case weld witness line', (0, side * .045, .015), (.00032, .0011, .024),
            DEVICE_SEAM, .0001, segments=1)
    box('DIN catch slider', (0, -.0404, .0062), (.009, .012, .007), DIN_TAB, .0008, segments=1)
    box('DIN release tool lip', (0, -.0467, .0097), (.011, .0048, .0048), DIN_TAB, .00075, segments=1)
    bevel(shell, .00036, 2)


def module_grip(isolator):
    # Origin is the hinge axis. Rotation about local X lifts or drops the whole grip.
    material = GRIP_RED if isolator else GRIP_GREEN
    rod('Moulded switch cam', (-.0058, 0, 0), (.0058, 0, 0), .0055, DEVICE_PC, sides=20)
    box('Reinforced toggle neck', (0, -.00035, .0061), (.0094, .0043, .0086), DEVICE_PC, .00145, segments=2)
    box('Rounded grip rim', (0, -.00035, .0102), (.0148, .0045, .0036), DEVICE_PC, .0013, segments=2)
    box('Coloured grip insert', (0, -.00035, .012), (.0132, .0031, .00105), material, .00047, segments=2)
    for i in range(7):
        box('Raised grip rib', ((i - 3) * .00174, -.00035, .01257),
            (.00062, .00195, .00053), material, .00023, segments=1)


def test_plunger():
    r = DIN_PROFILE['testSize'] / 2000
    cap = round_tool((0, 0, 0), .0032, r)
    finish(cap, 'Satin test plunger', DEVICE_PC)
    bevel(cap, .00032, 2)
    box('Recessed T stem', (0, -.00013, .001625), (.00023, .0015, .000075), TUNNEL, .00002, segments=1)
    box('Recessed T top', (0, .00062, .001625), (.00124, .00023, .000075), TUNNEL, .00002, segments=1)


def export_asset(name, build, placement):
    before = set(scene.objects)
    build()
    objects = sorted(set(scene.objects) - before, key=lambda obj: obj.name)
    collection = bpy.data.collections.new(name.replace('-', ' ').title())
    scene.collection.children.link(collection)
    for obj in objects:
        collection.objects.link(obj)
        for old in list(obj.users_collection):
            if old != collection:
                old.objects.unlink(obj)

    # Keep the editable components in the blend. Batch evaluated meshes by material in GLB.
    depsgraph = bpy.context.evaluated_depsgraph_get()
    batches = {}
    for obj in objects:
        mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph), depsgraph=depsgraph)
        mesh.transform(obj.matrix_world)
        batch = bpy.data.objects.new(obj.name + ' (export)', mesh)
        scene.collection.objects.link(batch)
        batches.setdefault(mesh.materials[0].name, []).append(batch)
    merged = []
    for mat_name, batch in batches.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in batch:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = batch[0]
        if len(batch) > 1:
            bpy.ops.object.join()
        batch[0].name = mat_name
        merged.append(batch[0])
    bpy.ops.object.select_all(action='DESELECT')
    for obj in merged:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUTPUT / (name + '.glb')), export_format='GLB',
                              use_selection=True, export_vertex_color='ACTIVE')
    for obj in merged:
        bpy.data.objects.remove(obj, do_unlink=True)
    for obj in objects:
        obj.location += Vector(xyz(placement))


for name, build, placement in (
    ('hardwood-floor', hardwood_floor, (0, 0, 0)),
    ('kitchen-island', island, (2.67, 0, 2.15)),
    ('dining-table', dining, (6.85, 0, 2.6)),
    ('dining-chair', chair, (6.46, 0, 3.27)),
    ('sofa', sofa, (2.855, 0, 4.5)),
    ('coffee-table', coffee, (2.92, 0, 5.48)),
    ('media-console', console, (2.92, 0, 6.78)),
    ('pendant', pendant, (2.23, 2.7, 2.15)),
    ('potted-gum', gum, (7.76, 0, 5.95)),
    ('board-door', board_door, (0, 1.5, 5.35)),
    ('rcbo-body', lambda: module_shell(False), (7.16, .9, 6.9)),
    ('isolator-body', lambda: module_shell(True), (7.08, .9, 6.9)),
    ('rcbo-toggle', lambda: module_grip(False), (7.16, .885, 7.015)),
    ('isolator-toggle', lambda: module_grip(True), (7.08, .885, 7.015)),
    ('rcbo-test', test_plunger, (7.18, .925, 7.015)),
):
    export_asset(name, build, placement)

bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.file.pack_all()
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE), compress=True)

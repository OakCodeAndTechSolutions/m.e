# Interactive home

Walk around and use the fittings directly. The switchboard wall stays open so the
timber frame, TPS runs and switch boxes are visible. A short action hint appears
when you point at a reachable fitting.

Desktop supports WASD, arrow keys, drag to look, click fittings, F to use nearby
objects, Shift/wheel to zoom and Escape to step back. Touch supports a movement
stick, dragging and direct taps. Click the switchboard door to open or close it;
walking leaves the inspection view, while dragging pans across the board. Device toggles and
T (test) buttons have separate, non-overlapping targets. Drags, secondary-button
zooms and clicks beyond 2.4 m do not operate electrical fittings.

Action hints appear around reachable fittings. With the board open, use left and
right arrows to select a device, F to toggle it and T to run its test.

Direct 3D interactions use `roomPlayReducer`. Socket switches operate independently
of appliance controls and circuit supply. Supply loss stops active appliances;
restoration does not automatically restart them. Door and tap actions remain
mechanical. Downlights, pendants and task lights in the kitchen follow the
lighting switch. The lounge dimmer controls lounge fixtures. The walkthrough
takes place at dusk. If no room lighting is available, a locator illuminates the
switchboard. If a lighting circuit is available and its switch is off, a soft
pool of light marks the switch. Use **Trace wiring** near the board to highlight a circuit and
identify its destination. With the door open, choose **Remove inner cover** or
tap the escutcheon to expose all connections. **Refit inner cover** restores the
panel. Choose **Inspect this breaker** after selecting a circuit to read the
face markings and use its toggle and test button in close-up.

The model represents an **indoor distribution board supplied from an upstream
main switchboard**. The incoming active, neutral and protective earth are a
submain; the service, meter, main earthing electrode and MEN connection are
upstream and outside this room. There is deliberately no second MEN link here.
The local main isolator disconnects downstream active supply, not the incoming
active. An isolator is not an automatic protective device.

The outer door provides access to operating handles and test buttons. A separate
fixed escutcheon hides terminals in normal view. Circuit tracing inside the
enclosure uses a visual cutaway. Seven connected circuits have Type A, 30 mA RCBO
representations. Unused ways are labelled spare and start off. A test needs both
supply and a closed RCBO.

The board is true size and flush-mounted: an 18 mm pole pitch, a flush tub in
the stud cavity and a frame and door just proud of the studs, centred at
1.5 m. The Blender moulds and scene share their millimetre dimensions in
`switchboard/din-profile.json`. The RCBO has a 45 mm nose, paired recessed
combination screws, tunnel terminals, and a yellow DIN catch. Its moving grip and
test plunger are separate meshes. The main isolator has one central active
terminal at each end. Only the noses pass through the escutcheon.

Device fronts follow common Australian domestic hardware, unbranded: a white handle
that is up for ON (I) and down for OFF (O), a green grip on RCBOs and a red one on
the main switch. The mechanical flag indicates contact position (red closed,
green open). Labels carry the rating, sensitivity, Type A marking and breaking
capacity. The cutaway shows the shrouded comb, separate neutral and earth links,
and the short, numbered TPS jackets at the protected entries. Red active and
black neutral conductors run in parallel behind the DIN rail, then sweep forward
into their device tunnels. The green and yellow earth cores take short routes to
the earth link.

This is an illustrative simulation, not an AS/NZS 3000 compliance certification
or an installation design. Ratings are examples; cable sizing, protective-device
coordination, fault impedance and trip-time calculations are not simulated.

Public references checked for the representation:

- [Queensland Electrical Safety Office: safety switches](https://www.electricalsafety.qld.gov.au/electrical-safety-home/safety-switches)
- [Clipsal MAX9 slim RCBO photos and dimensions](https://www.clipsal.com/products/circuit-protection/max9/residual-current-breaker-with-overcurrent-protection-rcbo-1pn-20a-30ma-c-curve-6000a-a-type-mx9r3120?itemno=MX9R3120)
- [Energy Safe Victoria: MEN continuity and duplicate MEN connections](https://www.energysafe.vic.gov.au/industry-guidance/electrical/electrical-technical-information/eis-004-battery-installation-neutral-continuity-and-men-connection)

Existing CC-BY product models and CC0 textures retain their credits under
`public/models/learning-room/CREDITS.md`. The Blender assets use the existing CC0 surface maps.

## Rendering and assets

The preview renders on demand; walking renders continuously, and hidden pages pause.
Entering fullscreen moves a persistent portal host rather than recreating WebGL.
HUD hints have a separate context so they do not reconcile the house while walking.
Shadow maps refresh after asset arrivals and door changes. Sustained slow frames
gradually lower pixel density without replacing the lighting or recompiling the scene.

`node scripts/optimize-room-assets.mjs` generates the runtime copies under
`public/models/learning-room/optimized/`. It requires the installed `sharp` image
library (also used by Next.js). Textures are capped at 1024px and unused GLB buffer
data is stripped. Geometry, names and hinge coordinates
are preserved. Original assets and attribution stay in their existing locations.


The idle preview is daylit. The walkthrough dims the outdoor fill and reflections
to dusk, so the switched fittings visibly light their own areas. Reflections use a
small Lightformer environment. Downlight pools are spotlights, and the lounge wall
lights (`WallLight.tsx`) carry dimmable point lights.

Desktop uses half-resolution ambient occlusion when the frame budget allows it.
Touch devices start at 1× pixel density and render directly, as do desktop devices
after a sustained drop in frame rate. Both paths use Neutral tone mapping.

## Blender house kit

The furniture, island, pendant shades, potted gum, switchboard door and breaker
parts are original meshes built in Blender at room scale. Photo references are listed in
`public/models/learning-room/CREDITS.md`. From the repository root, run Blender
5.2 to rebuild the runtime models and an editable, packed scene. Run
`node scripts/fetch-room-materials.mjs` first to prepare the CC0 wool and flooring maps.

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python-exit-code 1 --python scripts/blender/build_learning_house.py
```

The builder writes GLBs to `public/models/learning-room/optimized/house/` and an
editable file to `.cache/learning-house/learning-house.blend`. The GLBs have meshes
batched by material for the browser. In Blender, the parts stay separate for editing.
After changing the room, recapture `public/images/room-poster.jpg` at 1905 × 840
from the idle camera.

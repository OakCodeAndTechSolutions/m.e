# Interactive home

The room is the interface: walk around and click the actual fittings. The only
persistent scene controls are Exit and the wiring/walls switch. A brief movement
hint dismisses on use; an object hint appears only while pointing at a fitting.
There are no room jump buttons, filters or duplicate appliance/circuit panels.

Desktop supports WASD, arrow keys, drag to look, click fittings, F to use nearby
objects, Shift/wheel to zoom and Escape to step back. Touch supports a movement
stick, dragging and direct taps. Click the switchboard door to open or close it;
walking or dragging also leaves the close inspection view. Device toggles and
T (test) buttons have separate, non-overlapping targets. Drags, secondary-button
zooms and clicks beyond 2.4 m do not operate electrical fittings.

Direct 3D interactions use `roomPlayReducer`. Socket switches operate independently
of appliance controls and circuit supply. Supply loss stops active appliances;
restoration does not automatically restart them. Door and tap actions remain
mechanical. Downlights and kitchen task lights follow the lighting switch; the
lounge dimmer controls lounge fixtures. Daylight is independent of electrical
power. Wiring mode reveals the timber cavities, TPS and board internals.

The model represents an **indoor distribution board supplied from an upstream
main switchboard**. The incoming active, neutral and protective earth are a
submain; the service, meter, main earthing electrode and MEN connection are
upstream and outside this room. There is deliberately no second MEN link here.
The local main isolator disconnects downstream active supply, not the incoming
active. An isolator is not an automatic protective device.

The outer door provides access to operating handles and test buttons. A separate
fixed escutcheon hides terminals in normal view. Wiring mode is a visual cutaway,
not removal of real equipment. Insulated cables do not trigger a fictional shock
game. Seven connected circuits have Type A, 30 mA RCBO representations; unused
ways are labelled spare and start off. A test needs both supply and a closed RCBO.

The board is true size and flush-mounted: an 18 mm pole pitch, a 106 mm deep tub in
the stud cavity, a frame and door a centimetre proud of the plaster, centred at
1.5 m. Every device dimension lives in `switchboard/din.ts` in millimetres. Devices
are procedural (no model files): the DIN side profile with terminal shoulders and a
45 mm nose, twin screw terminals with cable entries beneath them, and a yellow DIN
clip, drawn as one instanced mesh per part. Only the nose passes through the steel
escutcheon's single cut-out.

Device fronts follow common Australian domestic hardware, unbranded: a white handle
that is up for ON (I) and down for OFF (O), a green paddle on RCBOs and a red one on
the main switch, and a contact-position window that shows the contacts, not whether
supply is present (red closed, green open). Labels carry the rating, 30 mA, Type A,
breaking capacity and standard, with the T test button beside them; each device has
a yellow dangerous-voltage label. In wiring mode the pin busbar has copper pins, a
green cover and yellow end caps, the rail is a 35 mm top-hat on chassis brackets,
and neutral and earth links sit on the back wall.

This is an illustrative simulation, not an AS/NZS 3000 compliance certification
or an installation design. Ratings are examples; cable sizing, protective-device
coordination, fault impedance and trip-time calculations are not simulated.

Public references checked for the representation:

- [Queensland Electrical Safety Office: safety switches](https://www.electricalsafety.qld.gov.au/electrical-safety-home/safety-switches)
- [Clipsal: 1P+N 10 A, 30 mA Type A RCBO](https://www.clipsal.com/products/circuit-protection/acti9/residual-current-breaker-with-overcurrent-protection-rcbo-1p-ns-10a-30ma-a-type-10000a-a9d31810?itemno=A9D31810)
- [Energy Safe Victoria: MEN continuity and duplicate MEN connections](https://www.energysafe.vic.gov.au/industry-guidance/electrical/electrical-technical-information/eis-004-battery-installation-neutral-continuity-and-men-connection)

Existing CC-BY product models and CC0 textures retain their credits under
`public/models/learning-room/CREDITS.md`. New interior and switched socket geometry
is procedural; no additional asset downloads are required.

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
Wiring-only wall textures load when the cutaway is first requested.

Lighting is built like a daylit interior photograph rather than a gallery rig
(`RoomLighting.tsx`): an area light fills the glazing with sky light, a shadowed
sun patch enters only through the window, a second area light returns bounce onto
the window wall, and a hemisphere light carries warm floor bounce. Reflections come
from a small Lightformer environment (window, ceiling, back wall) instead of an
interior HDR, so glossy surfaces stay neutral and nothing extra downloads. Switched
fittings are real light sources: downlight pools are cone spotlights, and the up/down
wall lights (`WallLight.tsx`) each carry a dimmable point light.

`RoomPostFx.tsx` adds screen-space ambient occlusion (N8AO, half resolution) and
Khronos Neutral tone mapping. The AO radius follows the view: most of a metre for the
room, a few centimetres once the switchboard door is open. Touch devices get the
cheaper AO preset and no MSAA. The renderer's own AgX tone mapping is a fallback only.

Furniture added in code (`DiningSet.tsx`, the framed prints in `AboutPortraits.tsx`,
the garden beyond the glass) is procedural. The kiara HDR, sconce model, site paper
and plywood textures are no longer loaded at runtime. After changing the room,
recapture `public/images/room-poster.jpg` (1905 × 840) from the idle camera so the
first paint matches the live scene.

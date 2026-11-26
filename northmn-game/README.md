# North Desk

North Desk is a 3D real estate career game set in Northern Minnesota. Start at the Pemberton office on South Pokegama Avenue in Grand Rapids, pick up a file, and work it from client intake or listing prep through the closing table. All 21 North Desk characters are playable and appear in the game as coworkers.

Open `index.html` in a browser with WebGL 2. The game loads its assets locally and saves your career in the browser. No install or build is required.

**Choose agent** on the title screen or in Pause shows all 21 agents and their perks and plays a voice preview when you pick one. Each coworker speaks in their own gibberish during conversations. Use **Replay voice** to hear them again and **Pause → Mute sound** to mute the game.

Graphics starts on **High** for new players and remembers your selection. High adds sun-cast shadows, detailed water reflections, and damp road surfaces. **Low** reduces resolution and scenery detail for lighter hardware. **Natural lighting** follows the workday. **Golden hour** gives you warm late-afternoon light without moving appointments.

## Controls

| Input | Action |
| --- | --- |
| W A S D | Walk or drive. Hold W to accelerate in the SUV |
| Click the scene, then move the mouse | Look around. Drag to look if pointer lock is unavailable |
| Left and right arrows | Turn on foot or steer |
| Shift | Run |
| Space | Brake |
| E | Interact or enter and exit the SUV |
| C | Switch between first- and third-person views |
| P | Open the phone and work a deal |
| M | Open the regional GPS |
| Esc | Pause or close a window |

Touch screens show movement, turning, camera, and interaction controls. **Route to showing** puts driving directions on the map. **Fast Travel** parks you at the destination and advances your clock, mileage, and fuel use. Press **C** in the SUV to see the cockpit.

Watch the showing countdown for a 15-minute reminder and a buzz when you run late. If the showing window closes, you lose up to four trust and can rebook from your phone. The Inbox keeps a calendar of booked showings, inspections, and closings. If two showings overlap, ask an available teammate to cover one and read their notes in Deal afterward. Phone and menus pause the field clock. The first-day tutorial is available from Pause.

When driving yourself, follow the GPS arrow and watch your speed, fuel, and notices for deer, logging trucks, and slick pavement. The SUV tops out at 120 mph on highways. During a showing, the client follows your tour and reacts to your observations. Access mix-ups sometimes cost time and trust.

Write your own offer using the comparable sales and the buyer’s approval. Repeated low offers can end negotiations. Bring Riley a specific concern to strengthen a repair-credit request. You can wait at a property or the closing table on the scheduled day. Verify the settlement statement at North Desk, then record the sale and hand over the keys at the appointment.

The office seeds your ledger with a fictional $1,650 expense float. Check **Phone → Inbox** for the day's conditions. **Pause → End workday** shows the daily recap and starts the next morning at North Desk. Review earlier days from **Phone → Ledger → Daily recaps**. Pause also has a separate music control.

Speak to Tanya Sage in the office or select **Tanya’s laser tag** from the pause menu to play her 45-second arcade match against five fictional opponents. Click, press **F**, or tap **Fire** to tag an opponent. Your real estate career pauses during the match.

Brother Malcolm keeps the local weather on his TV near the spare desk. If you play as him, check the expense envelope there to record a one-time $125 field allowance.

Bridger arrives 15 minutes late to the office and to scheduled cabin visits. He is unavailable by phone. Gene is a local mortgage lender who wants buyers ready in five minutes.

## Arcade pickups

Search **coin run** on the regional map to find US 169 in Grand Rapids and US 53 near Virginia. Drive through the floating coins to add $20 each to your ledger. The highway mystery block gives ten seconds of Caribou Coffee boost. The Top Producer Star on US 53 lights up the SUV and clears a snowbank if you reach it within 15 seconds.

Press **E** at mystery blocks during house tours. A block can send instant buyer pre-approval to your phone or turn up a failed septic report that costs you time. Each pickup can be claimed once per career.

The glowing ice-fishing shack beside the Grand Rapids office can send you and your SUV to Hibbing, Virginia, or Canal Park. Open the shack with **E**. Each shortcut advances the workday four minutes and recalculates your GPS route from the new town.

## The Northland

The map includes Grand Rapids, Cohasset, Coleraine, Bovey, Nashwauk, Keewatin, Hibbing, Chisholm, Buhl, Mountain Iron, Virginia, Eveleth, Gilbert, Biwabik, Aurora, Hoyt Lakes, Hermantown, Proctor, and Duluth, plus Deer River, Bigfork, Marcell, Effie, Tower, Jacobson, Lake Vermilion, Canal Park, the Aerial Lift Bridge, and Hull–Rust Mine View.

The game uses sampled real elevation and real road centerlines and water shapes in a meter-based projection. It includes major roads across the region and local streets around the named communities. Building models and interiors are representative, with the main office modeled from a storefront reference. Clients, listings, transactions, and dialogue are fictional.

- Road and water geometry comes from the [2025 Census TIGER/Line files](https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html).
- Elevation comes from the [USGS 3DEP bare-earth elevation service](https://www.usgs.gov/3d-elevation-program/about-3dep-products-services).
- Community centers use [USGS GNIS](https://www.usgs.gov/tools/geographic-names-information-system-gnis) and Census place data.
- The porch and ramp reference came from the [public listing for 515 South Pokegama Avenue](https://www.edinarealty.com/commercial-real-estate-for-sale/515-s-pokegama-avenue-grand-rapids-mn-55744-6623129).

## Regenerating the map

Generated JavaScript assets are checked in so direct file launches work. For a map refresh, put the following source files into an input directory, then run `python3 tools/build_geography.py /path/to/inputs assets` from this folder. The generator uses Pillow, NumPy, pyshp, and Shapely 2.1.

- From the [TIGER2025 archive](https://www2.census.gov/geo/tiger/TIGER2025/), save Minnesota `tl_2025_27_place.zip` as `places.zip`. Save the road and area water ZIPs for county IDs 27001, 27017, 27061, 27137, and 27075 as `roads-<id>.zip` and `water-<id>.zip`.
- Export the 3DEP rasters from the [ImageServer](https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage). Request TIFF, F32, EPSG 4326 input and output, bilinear interpolation, and disabled aspect ratio adjustment.

| Raster | West, south, east, north | Dimensions |
| --- | --- | --- |
| region.tif | -93.99, 46.63, -91.96, 48.00 | 701 × 721 |
| rapids.tif | -93.579, 47.194, -93.485, 47.276 | 351 × 351 |
| range.tif | -93.011, 47.377, -92.895, 47.474 | 331 × 331 |
| duluth.tif | -92.225, 46.719, -92.013, 46.862 | 451 × 451 |
| cabin.tif | -93.468, 47.242, -93.349, 47.337 | 301 × 301 |

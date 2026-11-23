# North Desk

North Desk is a 3D real estate career game set in Northern Minnesota. Start at the Pemberton office on South Pokegama Avenue in Grand Rapids, pick up a file, and work it from client intake or listing prep through the closing table. All 18 North Desk characters are playable and appear in the game as coworkers.

Open `index.html` in a browser with WebGL 2. The game loads its assets locally and saves your career in the browser. No install or build is required.

## Controls

| Input | Action |
| --- | --- |
| W A S D | Walk or drive |
| Mouse or right-drag | Look around |
| Left and right arrows | Turn on foot or steer |
| Shift | Run |
| Space | Brake |
| E | Interact or enter and exit the SUV |
| C | Switch between first- and third-person views |
| P | Open the phone and work a deal |
| M | Open the regional GPS |
| Esc | Pause or close a window |

Touch screens show movement, turning, camera, and interaction controls. Choose any town or property on the regional map to set a route. **Drive with GPS** advances your clock, mileage, and fuel for longer trips. You can also drive the roads yourself.

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

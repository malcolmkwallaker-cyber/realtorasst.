"""Pack Census TIGER/Line streets, places and water and USGS 3DEP elevations.

Inputs are named places.zip, roads-<county>.zip, water-<county>.zip,
and region/rapids/range/duluth/cabin.tif. See README for source URLs.
Requires numpy, Pillow, pyshp and Shapely 2.1 for asset generation.
"""
import argparse
import base64
import gzip
import json
import math
import re
from pathlib import Path

import numpy as np
import shapefile
from PIL import Image
from shapely import constrained_delaunay_triangles, make_valid, transform
from shapely.geometry import box, shape


ORIGIN = (-93.528636528576, 47.22611037831)
EAST_METERS, NORTH_METERS = 75_600, 111_200
BOUNDS = (-93.985, 46.636, -91.965, 47.995)
COUNTIES = ('27001', '27017', '27061', '27137', '27075')
PLACES = (
    'Grand Rapids', 'Cohasset', 'Coleraine', 'Bovey', 'Nashwauk', 'Keewatin',
    'Hibbing', 'Chisholm', 'Buhl', 'Mountain Iron', 'Virginia', 'Eveleth',
    'Gilbert', 'Biwabik', 'Aurora', 'Hoyt Lakes', 'Hermantown', 'Proctor',
    'Duluth', 'Deer River', 'Bigfork', 'Effie', 'Tower',
)
# USGS GNIS community locations and individual public landmark anchors.
LOCAL_CENTERS = {
    'Aurora': (-92.237128631, 47.529933626),
    'Bigfork': (-93.654092984, 47.744395049),
    'Biwabik': (-92.340186562, 47.532989519),
    'Bovey': (-93.418826642, 47.295504607),
    'Buhl': (-92.777967886, 47.493548681),
    'Chisholm': (-92.883804016, 47.489105473),
    'Cohasset': (-93.620223494, 47.263564688),
    'Coleraine': (-93.427716143, 47.288838106),
    'Deer River': (-93.792725557, 47.333012784),
    'Duluth': (-92.106586376, 46.783281433),
    'Effie': (-93.642976498, 47.840228363),
    'Eveleth': (-92.539914210, 47.462436295),
    'Gilbert': (-92.464913092, 47.488824004),
    'Grand Rapids': (-93.530222365, 47.237174091),
    'Hermantown': (-92.238254119, 46.806893527),
    'Hibbing': (-92.937696722, 47.427162961),
    'Hoyt Lakes': (-92.138514900, 47.519654932),
    'Jacobson': (-93.267445251, 47.000784378),
    'Keewatin': (-93.072423357, 47.399664847),
    'Marcell': (-93.690766370, 47.593008026),
    'Mountain Iron': (-92.623522946, 47.532435098),
    'Nashwauk': (-93.168260082, 47.380221937),
    'Proctor': (-92.225477206, 46.747172119),
    'Tower': (-92.274613287, 47.805483361),
    'Virginia': (-92.536579219, 47.523268003),

    'Lake Vermilion': (-92.314, 47.8435),
    'Canal Park': (-92.0945, 46.7812),
    'Aerial Lift Bridge': (-92.0928, 46.7789),
    'Hull–Rust Mine View': (-92.9505, 47.4490),
}
ROAD_CLASSES = {'S1100': 0, 'S1200': 1, 'S1400': 2, 'S1630': 3, 'S1640': 3}


def project(lon, lat):
    return (lon - ORIGIN[0]) * EAST_METERS, (ORIGIN[1] - lat) * NORTH_METERS


def quantize(points):
    flat = []
    for x, z in points:
        vertex = [round(x * 2), round(z * 2)]
        if flat[-2:] != vertex:
            flat.extend(vertex)
    return flat


def components(geom, accepted):
    if geom.geom_type == accepted:
        if not geom.is_empty:
            yield geom
    elif hasattr(geom, 'geoms'):
        for item in geom.geoms:
            yield from components(item, accepted)


def positions(source):
    result = {}
    for record in shapefile.Reader(str(source / 'places.zip')).iterRecords():
        if record.NAME in PLACES:
            result[record.NAME] = (float(record.INTPTLON), float(record.INTPTLAT))
    result.update(LOCAL_CENTERS)
    assert set(PLACES).issubset(result), set(PLACES) - result.keys()
    return [[name, *map(round, project(*loc))] for name, loc in result.items()]


def roads(source, towns, region):
    corridors = []
    places = [(x, z, {'Grand Rapids': 4900, 'Duluth': 9700, 'Hibbing': 4500}.get(name, 2300))
              for name, x, z in towns]
    for county in COUNTIES:
        reader = shapefile.Reader(str(source / f'roads-{county}.zip'))
        for row in reader.iterShapeRecords():
            level = ROAD_CLASSES.get(row.record.MTFCC)
            if level is None:
                continue
            name = row.record.FULLNAME
            if level == 2 and re.match(r'(?:Co(?:unty)?|Cnty|Cty) (?:St Aid )?(?:Rd|Hwy|Route) |(?:State Hwy|Hwy) \d', name):
                level = 1
            y1, x1 = row.shape.bbox[1], row.shape.bbox[0]
            y2, x2 = row.shape.bbox[3], row.shape.bbox[2]
            if x1 > BOUNDS[2] or x2 < BOUNDS[0] or y1 > BOUNDS[3] or y2 < BOUNDS[1]:
                continue
            x0, z1 = project(x1, y1)
            x1, z0 = project(x2, y2)
            if level >= 2 and not any(x0 - radius < x < x1 + radius and z0 - radius < z < z1 + radius
                                      for x, z, radius in places):
                continue
            geom = transform(shape(row.shape.__geo_interface__), project, interleaved=False)
            for line in components(geom.intersection(region), 'LineString'):
                # Preserve source vertices for intersections and routing.
                points = quantize(line.coords)
                if len(points) >= 4:
                    corridors.append([level, name, points])
    return corridors


def water(source, towns, region):
    bodies = []
    for county in COUNTIES:
        reader = shapefile.Reader(str(source / f'water-{county}.zip'))
        for row in reader.iterShapeRecords():
            x0, z = project(float(row.record.INTPTLON), float(row.record.INTPTLAT))
            near_town = any(math.hypot(x0 - x, z - y) < 3500 for _, x, y in towns)
            if int(row.record.AWATER) < (1200 if near_town else 30_000):
                continue
            geom = transform(make_valid(shape(row.shape.__geo_interface__)), project, interleaved=False)
            if not geom.intersects(region):
                continue
            tolerance = 3 if near_town else 11
            for polygon in components(geom.intersection(region).simplify(tolerance), 'Polygon'):
                if polygon.area < 400:
                    continue
                rings = [quantize(ring.coords) for ring in (polygon.exterior, *polygon.interiors)]
                vertices = [quantize(list(triangle.exterior.coords)[:3])
                            for triangle in constrained_delaunay_triangles(polygon).geoms]
                triangles = [coordinate for triangle in vertices if len(triangle) == 6
                             for coordinate in triangle]
                bodies.append([row.record.FULLNAME, rings, triangles])
    return bodies


def field(path):
    image = Image.open(path)
    dx, dy, _ = image.tag_v2[33550]
    _, _, _, lon, lat, _ = image.tag_v2[33922]
    heights = np.asarray(image)
    # Decimeters and differences within rows keep these grids compact.
    decimeters = np.rint(heights * 10).clip(0, 7000).astype('<i2')
    decimeters[:, 1:] = decimeters[:, 1:] - decimeters[:, :-1]
    x, z = project(lon + dx / 2, lat - dy / 2)
    return [x, z, dx * EAST_METERS, dy * NORTH_METERS, image.width, image.height,
            base64.b64encode(gzip.compress(decimeters.tobytes(), mtime=0)).decode()]


def write(output, name, data):
    packed = gzip.compress(json.dumps(data, separators=(',', ':')).encode(), mtime=0)
    # Split transport strings for readable diffs and reliable static hosting.
    encoded = base64.b64encode(packed).decode()
    chunks = [encoded[start:start+76] for start in range(0, len(encoded), 76)]
    js = '\n'.join(f'  "{chunk}",' for chunk in chunks)
    (output / f'{name}.js').write_text(
        '// Generated by tools/build_geography.py.\n'
        'globalThis.ND_DATA = globalThis.ND_DATA || {};\n'
        f'globalThis.ND_DATA.{name} = [\n{js}\n].join("");\n'
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    xmin, zmax = project(*BOUNDS[:2])
    xmax, zmin = project(*BOUNDS[2:])
    region = box(xmin, zmin, xmax, zmax)
    towns = positions(args.source)
    streets = roads(args.source, towns, region)
    lakes = water(args.source, towns, region)
    write(args.output, 'roads', {'towns': towns, 'bounds': [xmin, zmin, xmax, zmax], 'roads': streets})
    write(args.output, 'water', lakes)
    for name in ('region', 'rapids', 'range', 'duluth', 'cabin'):
        write(args.output, name, field(args.source / f'{name}.tif'))
    print(f'{len(towns)} places, {len(streets)} road features, {len(lakes)} water polygons')


if __name__ == '__main__':
    main()

# Javazone2024

# Getting data

- getTerrain (get GeoTIFF, via WCS)
- getSatellite (get Sentinel image, via WMS, as as png)
- getOrtho (get aerial photo, via WMTS, by stitching jpeg tiles into a a png)
- getRoads (get roads from OSM, as GeoJSON)
- getBuildings (get buildings from OSM, as GeoJSON)

# Converting terrain to geometries

- terrainToMesh (convert GeoTIFF height map to OBJ mesh)

# Placing geometries onto terrain

- roadsOntoMesh (clamp GeoJSON line strings onto terrain surface)
- buildingsOntoMesh (clamp GeoJSON outlines onto terrain surface, extrude up to building height and down to lowest terrain elevation for the outline)

# Converting roads and buildings to geometries

- roadsToMesh (convert placed roads to OBJ mesh)
- buildingsToMesh (convert placed buildings to OBJ mesh)

# Presenting data

- read terrain mesh (OBJ)
- read satellite / ortho texture (png), drape onto terrain
- read building geometries (OBJ)
- read road geometries (OBJ)

# Exporting data

export three.js scene as gltf

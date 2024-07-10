# Javazone2024

# Getting data

getTerrain (get GeoTIFF, via WCS)
getSatellite (get Sentinel image, via WMS, as as png)
getOrtho (get aerial photo, via WMTS, by stitching jpeg tiles into a a png)
getRoads (get roads from OSM, as GeoJSON)
getBuildings (get buildings from OSM, as GeoJSON)

# Converting data to geometries

createTerrainMesh (convert GeoTIFF height map to OBJ mesh)
createRoadGeometries (clamp GeoJSON line strings onto terrain surface, extrude to box tubes with set width, and save as OBJ mesh)
createBuildingGeometries (clamp GeoJSON polygons onto terrain surface, extrude to building height and terrain slope, and save as OBJ mesh)

# Presenting data

read terrain mesh (OBJ)
read satellite / ortho teture (png), drape onto terrain
read building geometries (OBJ)
read road geometries (OBJ)

# Exporting data

export three.js scene as gltf

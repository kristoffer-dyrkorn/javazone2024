# Building virtual worlds

This repo contains an example implementation of the process flow discussed in my JavaZone 2024 talk "Building virtual worlds using open geodata". The code consists of two main parts: Preprocessing (Node scripts) and data visualization (a web app).

# Preprocessing

The design of the preprocessing code follows the Unix command line philosophy: Each script solves a single task and writes output to a file that will be used in a later step.

All scripts read configuration settings from a file, here called `config.json`.

Here is an overview of each script, in the sequence they should be run:

## Getting data

Data fetchers (in `src/fetchers`):

- getTerrain (get a GeoTIFF, via WCS)
- getSatellite (get a Sentinel-2 image, via WMS, as as PNG)
- getOrtho (get an aerial photo, via WMTS, by stitching JPEG tiles into a a PNG)
- getRoads (get roads from OSM, as GeoJSON)
- getBuildings (get buildings from OSM, as GeoJSON)

The scripts can be run by going to the root folder of the repo and type `node src/fetchers/getTerrain.mjs config.json` and similar. To create the full model, run through all the scripts.

## Converting an elevation map to a triangle mesh

Mesh converters (in `src/converters`):

- terrainToMesh (convert GeoTIFF height map to OBJ mesh)

This script performs very simple mesh simplification - by subsamling the original height map and using only each `N` height value (in both X and Y directions) when creating the OBJ file. To run the script, you need to provide the skip value as input. Try with a value such as 10, ie `node src/converters/terrainToMesh.mjs 10 config.json`.

TODO: Conversion

# Clamping geometries onto terrain

Geometry clamping (in `src/clampers`):

- roadsOntoMesh (clamp GeoJSON line strings onto terrain surface)
- buildingsOntoMesh (clamp GeoJSON outlines onto terrain surface, extrude up to building height and down to lowest terrain elevation for the outline)

# Converting roads and buildings to meshes

Mesh converters (in `src/converters`):

- roadsToMesh (convert clamped roads to OBJ mesh)
- buildingsToMesh (convert clamped buildings to OBJ mesh)

# Output

The result from running the scripts should be three OBJ files - one each for terrain, buildings, and roads - and two PNG files (one for satellite imagery and one for aerial imagery).

## Presenting data

The visualization app is a simple webapp using three.js that will

- read the terrain mesh (OBJ)
- read the satellite / ortho textures (PNG), and drape them onto the terrain
- read the building geometries (OBJ) and add them to the scene
- read the road geometries (OBJ) and add them to the scene

To run the app, first copy the config file (`config.json`) and the output files from the preprocessing (5 files in total) to the `app/` folder, and then start the app using `yarn dev`.

## App controls:

Press and hold the mouse button to move the camera, and use scroll to zoom in/out.

- press 'b' to toggle buildings on/off
- press 'r' to toggle roads on/off
- press 'o' to view orthophoto (aerial imagery)
- press 's' to view satellite imagery
- press 'x' to export the scene to a GLB

# Exporting data

export three.js scene as gltf

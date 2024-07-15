import * as fs from "fs";
// import hack to make the code run directly as a module in node
import SnapFeatures from "@kylebarron/snap-to-tin/dist/snap-features-to-mesh.js";
import { exit } from "process";
import proj4 from "proj4";

proj4.defs([
  [
    "EPSG:25833",
    "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
  ],
]);

function readOBJ(fileName) {
  const objData = fs.readFileSync(fileName, { encoding: "utf-8" });
  let vertices = [];
  let triangles = [];
  objData.split(/\r?\n/).forEach((line) => {
    const lineTokens = line.split(" ");
    switch (lineTokens[0]) {
      case "v":
        // "+": cast a string to a number
        vertices.push([+lineTokens[1], +lineTokens[2], +lineTokens[3]]);
        break;
      case "f":
        const vertex = new Array(lineTokens.length - 1);
        for (let i = 1; i < lineTokens.length; ++i) {
          const indices = lineTokens[i].split("/");
          vertex[i - 1] = indices[0] - 1; // vertex index
        }
        triangles.push(vertex);
        break;
    }
  });
  return { vertices, triangles };
}

if (process.argv.length != 3) {
  console.log("Usage: node roadsOntoMesh.mjs <config file>");
  exit();
}

const config = JSON.parse(fs.readFileSync(process.argv[2]), "utf8");

const bbox = config.bbox;
const srid = config.project_srid;
const roadsGeoJSON = `${config.project_name}-roads.geojson`;
const roads = JSON.parse(fs.readFileSync(roadsGeoJSON));
const features = roads.features;

// reproject from latlon to project coordinate system and make coordinates relative to project bbox
// (which we also do for the terrain) so the two match
features.forEach((feature) => {
  const localCoordinates = feature.geometry.coordinates.map((roadVertex) => {
    const reprojectedVertex = proj4(`EPSG:${srid}`).forward([
      roadVertex[0],
      roadVertex[1],
    ]);
    return [reprojectedVertex[0] - bbox[0], reprojectedVertex[1] - bbox[1]];
  });
  feature.geometry.coordinates = localCoordinates;
});

const objFile = `${config.project_name}-terrain.obj`;
const { vertices, triangles } = readOBJ(objFile);

const snap = new SnapFeatures({
  indices: new Int32Array(triangles.flat()),
  positions: new Float32Array(vertices.flat()),
});

const snappedFeatures = snap.snapFeatures({ features });

// project coordinates back to latlon to stay geoJSON compliant
// at this point we start with coordinates relative to the lower left bbox,
// so add the lower left bbox coordinates before reprojecting
snappedFeatures.forEach((snappedFeature) => {
  const latlonCoordinates = snappedFeature.geometry.coordinates.map(
    (snapVertex) => {
      const latlonCoordinate = proj4(`EPSG:${srid}`).inverse([
        bbox[0] + snapVertex[0],
        bbox[1] + snapVertex[1],
      ]);

      // return values to centimeter precision (the xy unit is latlon degrees, z unit is meters)
      return [
        +latlonCoordinate[0].toFixed(7),
        +latlonCoordinate[1].toFixed(7),
        +snapVertex[2].toFixed(2),
      ];
    }
  );
  snappedFeature.geometry.coordinates = latlonCoordinates;
});

// for each feature, replace the original geometry with the snapped geometry,
// while keeping the remaining properties of the feature unchanged
for (let i = 0; i < features.length; i++) {
  features[i].geometry.coordinates = snappedFeatures[i].geometry.coordinates;
}

// output road coordinates in latlon coordinates with elevation in metres as the third coordinate
const outputGeoJSON = `${config.project_name}-roads-placed.geojson`;
fs.writeFileSync(outputGeoJSON, JSON.stringify(roads));

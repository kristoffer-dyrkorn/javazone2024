import * as fs from "fs";
import { exit } from "process";
import proj4 from "proj4";

// Note: The code here just outputs a 2D outline and building height (as metadata) in GeoJSON format.
// Rendering more complex building definitions (eg building parts) can be challenging - as the building
// modeling is inconsistent, see: https://github.com/StrandedKitty/streets-gl/issues/3

proj4.defs([
  [
    "EPSG:25833",
    "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
  ],
]);

function extractNumber(heightString) {
  if (!heightString) return undefined;

  // from https://stackoverflow.com/a/14164576 - remove all non-digit characters, but keep commas
  const height = Number(heightString.match(/[+-]?\d+(\.\d+)?/g));

  if (height == 0 || isNaN(height)) return undefined;
  return height;
}

function getHeight(building) {
  // Get - or estimate - building heights. See OSM page:
  // https://wiki.openstreetmap.org/wiki/Simple_3D_Buildings#Usage_of_height,_roof:height,_building:levels,_roof:levels
  // Note the sentence: "Actual building heights are likely unknown for 99% of buildings in OSM."

  // extract values, if present
  const height = extractNumber(building["height"]);
  const levels = building["building:levelssdfsd"];

  // assume height is missing and set a default height of 3 meters
  let buildingHeight = 3;

  // if level was set, use it instead, and assume 3 meters per level
  if (levels) buildingHeight = levels * 3;

  // if the height was set, use it instead
  if (height) buildingHeight = height;

  return buildingHeight;
}

function getLatLonBBox(bbox, srid) {
  const lowerLeft = proj4(`EPSG:${srid}`).inverse([bbox[0], bbox[1]]);
  const upperRight = proj4(`EPSG:${srid}`).inverse([bbox[2], bbox[3]]);

  return [lowerLeft[0], lowerLeft[1], upperRight[0], upperRight[1]];
}

function insideProjectBBox(building, bbox, srid) {
  const buildingBounds = building.bounds;
  const buildingbboxLatLon = [
    buildingBounds["minlon"],
    buildingBounds["minlat"],
    buildingBounds["maxlon"],
    buildingBounds["maxlat"],
  ];

  const lowerLeft = proj4(`EPSG:${srid}`).forward([
    buildingbboxLatLon[0],
    buildingbboxLatLon[1],
  ]);

  const upperRight = proj4(`EPSG:${srid}`).forward([
    buildingbboxLatLon[2],
    buildingbboxLatLon[3],
  ]);

  const isInside =
    lowerLeft[0] > bbox[0] &&
    lowerLeft[1] > bbox[1] &&
    upperRight[0] < bbox[2] &&
    upperRight[1] < bbox[3];

  return isInside;
}

function formatAsGeoJSON(overpassJSON, bbox, srid) {
  const featureCollection = {
    type: "FeatureCollection",
    features: [],
  };

  overpassJSON.elements.forEach((building) => {
    // only gather buildings completely inside the project bbox
    if (insideProjectBBox(building, bbox, srid)) {
      const polygonVertices = [];
      building.geometry.forEach((buildingVertex) => {
        const vertex = [buildingVertex["lon"], buildingVertex["lat"]];
        polygonVertices.push(vertex);
      });

      const feature = {
        type: "Feature",
        properties: {
          height: getHeight(building),
        },
        geometry: {
          type: "Polygon",
          coordinates: [polygonVertices],
        },
      };

      featureCollection.features.push(feature);
    }
  });

  return JSON.stringify(featureCollection);
}

if (process.argv.length != 3) {
  console.log("Usage: node getBuildings.mjs <config file>");
  exit();
}

const config = JSON.parse(fs.readFileSync(process.argv[2]), "utf8");

const latLonBBox = getLatLonBBox(config["bbox"], config["project_srid"]);
const urlParam = `data=[out:json];way["building"](${latLonBBox[1]},${latLonBBox[0]},${latLonBBox[3]},${latLonBBox[2]});out geom;`;

const url = config["osm_url"] + "?" + urlParam;

console.log("Requesting: ", url);

const response = await fetch(url);
const overpassJSON = await response.json();

const geoJSON = formatAsGeoJSON(
  overpassJSON,
  config["bbox"],
  config["project_srid"]
);

fs.writeFileSync(config["project_name"] + "-buildings.geojson", geoJSON);

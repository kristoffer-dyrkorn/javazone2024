import * as fs from "fs";
import { exit } from "process";
import proj4 from "proj4";

function getLatLonBBox(bbox, sourceSRID) {
  const projStrings = {
    25833:
      "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
    4326: "+proj=longlat +datum=WGS84 +no_defs +type=crs",
  };

  const lowerLeft = proj4(projStrings[sourceSRID], projStrings[4326], [
    bbox[0],
    bbox[1],
  ]);
  const upperRight = proj4(projStrings[sourceSRID], projStrings[4326], [
    bbox[2],
    bbox[3],
  ]);

  return [lowerLeft[0], lowerLeft[1], upperRight[0], upperRight[1]];
}

function formatAsGeoJSON(overpassJSON, latLonBBox) {
  // set road widths for the primary road types
  const roadWidths = new Map();
  roadWidths.set("trunk", 12.5);
  roadWidths.set("primary", 12.5);
  roadWidths.set("secondary", 10);
  roadWidths.set("tertiary", 8.5);
  roadWidths.set("residential", 7.5);
  roadWidths.set("service", 5);

  const featureCollection = {
    type: "FeatureCollection",
    features: [],
  };

  overpassJSON.elements.forEach((road) => {
    const lineStringCoordinates = [];

    road.geometry.forEach((roadVertex) => {
      const coordinate = [roadVertex["lon"], roadVertex["lat"]];

      // only collect vertices inside the project bbox
      if (
        coordinate[0] > latLonBBox[0] &&
        coordinate[0] < latLonBBox[2] &&
        coordinate[1] > latLonBBox[1] &&
        coordinate[1] < latLonBBox[3]
      ) {
        lineStringCoordinates.push(coordinate);
      }
    });

    // only collect features that are non-empty,
    // ie that are partially inside the project bbox
    if (lineStringCoordinates.length > 0) {
      const roadType = road["tags"]["highway"];
      const width = roadWidths.get(roadType);

      const feature = {
        type: "Feature",
        properties: {
          roadType: roadType,
          name: road["tags"]["name"],
          width: width,
          surface: road["tags"]["surface"],
        },
        geometry: {
          type: "LineString",
          coordinates: lineStringCoordinates,
        },
      };

      // only collect the primary road types
      const primaryRoads = Array.from(roadWidths.keys());
      if (primaryRoads.includes(feature.properties.roadType)) {
        featureCollection.features.push(feature);
      }
    }
  });

  return JSON.stringify(featureCollection);
}

if (process.argv.length != 3) {
  console.log("Usage: node getRoads.mjs <config file>");
  exit();
}

const config = JSON.parse(fs.readFileSync(process.argv[2]), "utf8");

const latLonBBox = getLatLonBBox(config["bbox"], config["project_srid"]);
const urlParam = `data=[out:json];way["highway"](${latLonBBox[1]},${latLonBBox[0]},${latLonBBox[3]},${latLonBBox[2]});out geom;`;

const url = config["road_url"] + "?" + urlParam;

console.log("Requesting: ", url);

const response = await fetch(url);
const overpassJSON = await response.json();

const geoJSON = formatAsGeoJSON(overpassJSON, latLonBBox);

fs.writeFileSync(config["project_name"] + "-roads.geojson", geoJSON);

import * as fs from "fs";
import { exit } from "process";
import proj4 from "proj4";

proj4.defs([
  [
    "EPSG:25833",
    "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
  ],
]);

function getLatLonBBox(bbox, srid) {
  const lowerLeft = proj4(`EPSG:${srid}`).inverse([bbox[0], bbox[1]]);
  const upperRight = proj4(`EPSG:${srid}`).inverse([bbox[2], bbox[3]]);

  return [lowerLeft[0], lowerLeft[1], upperRight[0], upperRight[1]];
}

function formatAsGeoJSON(overpassJSON, bbox, srid) {
  // set road widths (meters) for the main road types
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
      const vertex = [roadVertex["lon"], roadVertex["lat"]];

      const coordinate = proj4(`EPSG:${srid}`).forward([vertex[0], vertex[1]]);

      // only gather vertices inside the project bbox
      if (
        coordinate[0] > bbox[0] &&
        coordinate[0] < bbox[2] &&
        coordinate[1] > bbox[1] &&
        coordinate[1] < bbox[3]
      ) {
        lineStringCoordinates.push(vertex);
      }
    });

    // reject features that are outside the project bbox
    if (lineStringCoordinates.length > 0) {
      const roadType = road["tags"]["highway"];
      const width = roadWidths.get(roadType);

      const feature = {
        type: "Feature",
        properties: {
          roadType: roadType,
          name: road["tags"]["name"],
          width: width ? width : 7.5,
        },
        geometry: {
          type: "LineString",
          coordinates: lineStringCoordinates,
        },
      };

      // only collect the primary road types
      const primaryRoadTypes = Array.from(roadWidths.keys());
      if (primaryRoadTypes.includes(feature.properties.roadType)) {
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

const url = `${config["osm_url"]}?${urlParam}`;

console.log("Requesting: ", url);

const response = await fetch(url);
const overpassJSON = await response.json();

const geoJSON = formatAsGeoJSON(
  overpassJSON,
  config["bbox"],
  config["project_srid"]
);

fs.writeFileSync(`${config["project_name"]}-roads.geojson`, geoJSON);

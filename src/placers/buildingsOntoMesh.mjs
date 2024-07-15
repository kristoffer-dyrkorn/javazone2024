import * as fs from "fs"
// import hack to make the code run directly as a module in node
import SnapFeatures from "@kylebarron/snap-to-tin/dist/snap-features-to-mesh.js"
import { exit } from "process"
import proj4 from "proj4"

proj4.defs([["EPSG:25833", "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"]])

function readOBJ(fileName) {
  const objData = fs.readFileSync(fileName, { encoding: "utf-8" })
  let vertices = []
  let triangles = []
  objData.split(/\r?\n/).forEach((line) => {
    const lineTokens = line.split(" ")
    switch (lineTokens[0]) {
      case "v":
        // "+": cast a string to a number
        vertices.push([+lineTokens[1], +lineTokens[2], +lineTokens[3]])
        break
      case "f":
        const vertex = new Array(lineTokens.length - 1)
        for (let i = 1; i < lineTokens.length; ++i) {
          const indices = lineTokens[i].split("/")
          vertex[i - 1] = indices[0] - 1 // vertex index
        }
        triangles.push(vertex)
        break
    }
  })
  return { vertices, triangles }
}

if (process.argv.length != 3) {
  console.log("Usage: node buildingsOntoMesh.mjs <config file>")
  exit()
}

const config = JSON.parse(fs.readFileSync(process.argv[2]), "utf8")

const bbox = config.bbox
const srid = config.project_srid
const buildingsGeoJSON = `${config.project_name}-buildings.geojson`
const buildings = JSON.parse(fs.readFileSync(buildingsGeoJSON))
const features = buildings.features

const originalCoordinates = []

// reproject from latlon to project coordinate system and make coordinates relative to project bbox
// (which we also do for the terrain) so the two match
features.forEach((feature) => {
  const localCoordinates = feature.geometry.coordinates[0].map((buildingVertex) => {
    const reprojectedVertex = proj4(`EPSG:${srid}`).forward([buildingVertex[0], buildingVertex[1]])
    return [reprojectedVertex[0] - bbox[0], reprojectedVertex[1] - bbox[1]]
  })

  // create deep copy of original coordinate array (Polygon geometry type) and save it
  const original = JSON.parse(JSON.stringify(feature.geometry.coordinates))
  originalCoordinates.push(original)

  // overwrite coordinates with reprojected, translated version
  feature.geometry.coordinates = localCoordinates

  // replace source geometry type with linestring
  // this way the snapping function will calculate outline elevations also where a building
  // outline segment (a wall) crosses a surface "valley", ie a shared (lower) edge between two
  // terrain surface triangles. had we used only the elevations at the building vertices we would
  // get gaps in those situations since the valley bottom will have a lower elevation than the bottom
  // edge of the wall.
  feature.geometry.type = "LineString"
})

const objFile = `${config.project_name}-terrain.obj`
const { vertices, triangles } = readOBJ(objFile)

const snap = new SnapFeatures({
  indices: new Int32Array(triangles.flat()),
  positions: new Float32Array(vertices.flat()),
})

const snappedFeatures = snap.snapFeatures({ features })

for (let i = 0; i < features.length; i++) {
  // for each snapped feature, get the min and max elevation values
  const elevations = snappedFeatures[i].geometry.coordinates.map((vertex) => {
    return vertex[2]
  })

  features[i].properties.minSurfaceElevation = +Math.min(...elevations).toFixed(2)
  features[i].properties.maxSurfaceElevation = +Math.max(...elevations).toFixed(2)

  // set the feature geometry type back to the original
  features[i].geometry.type = "Polygon"

  // restore the original feature coordinates
  features[i].geometry.coordinates = originalCoordinates[i]
}

// output: building outlines with min and max elevations in metres as properties
const outputGeoJSON = `${config.project_name}-buildings-placed.geojson`
fs.writeFileSync(outputGeoJSON, JSON.stringify(buildings))

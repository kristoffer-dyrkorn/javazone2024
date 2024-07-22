import * as fs from "fs"
import { exit } from "process"
import earcut from "earcut"
import proj4 from "proj4"

proj4.defs([["EPSG:25833", "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"]])

function createWalls(groundVertices, roofVertices) {
  const wallVertices = []
  for (let i = 0; i < groundVertices.length - 1; i++) {
    wallVertices.push(groundVertices[i])
    wallVertices.push(groundVertices[i + 1])
    wallVertices.push(roofVertices[i + 1])
    wallVertices.push(roofVertices[i + 1])
    wallVertices.push(roofVertices[i])
    wallVertices.push(groundVertices[i])
  }
  return wallVertices
}

function createRoof(roofVertices) {
  // adapt input to earcut: remove last vertex (it is a duplicate of the first) and flatten the array
  const vertices = roofVertices.slice(0, -1).flat()

  // tell earcut to triangulate without holes and that the input data has 3 dimensions
  const triangles = earcut(vertices, null, 3)

  // map triangle indices to vertices and return vertex list
  return triangles.map((index) => {
    return [vertices[3 * index], vertices[3 * index + 1], vertices[3 * index + 2]]
  })
}

function getBuildingMesh(vertices, minElevation, maxElevation) {
  const groundVertices = vertices.map((v) => {
    return [v[0], v[1], minElevation]
  })

  const roofVertices = vertices.map((v) => {
    return [v[0], v[1], maxElevation]
  })

  const buildingVertices = []
  buildingVertices.push(...createWalls(groundVertices, roofVertices))
  buildingVertices.push(...createRoof(roofVertices))
  return buildingVertices
}

function toOBJVertices(vertices) {
  let verticesString = ""
  vertices.forEach((v) => {
    verticesString += `v ${v[0].toFixed(2)} ${v[1].toFixed(2)} ${v[2].toFixed(2)}\n`
  })

  return verticesString
}

function toOBJIndices(vertices, offset) {
  let indicesString = ""
  for (let i = offset; i <= vertices.length + offset; i += 3) {
    indicesString += `f ${i} ${i + 1} ${i + 2}\n`
  }

  return indicesString
}

if (process.argv.length != 3) {
  console.log("Usage: node buildingsToMesh.mjs <config file>")
  exit()
}

const config = JSON.parse(fs.readFileSync(process.argv[2]), "utf8")
const bbox = config.bbox
const srid = config.project_srid
const buildingsGeoJSON = `${config.project_name}-buildings-placed.geojson`
const buildings = JSON.parse(fs.readFileSync(buildingsGeoJSON))
const features = buildings.features

let objVertices = ""
let objIndices = ""
let totalVertices = 1

features.forEach((building) => {
  // reproject from latlon to project coordinate system and make coordinates relative to project bbox
  const buildingOutline = building.geometry.coordinates[0].map((buildingVertex) => {
    const reprojectedVertex = proj4(`EPSG:${srid}`).forward([buildingVertex[0], buildingVertex[1]])
    return [reprojectedVertex[0] - bbox[0], reprojectedVertex[1] - bbox[1]]
  })

  const buildingVertices = getBuildingMesh(
    buildingOutline,
    building.properties.minSurfaceElevation,
    building.properties.maxSurfaceElevation + building.properties.height
  )

  objVertices += toOBJVertices(buildingVertices)
  objIndices += toOBJIndices(buildingVertices, totalVertices)

  totalVertices += buildingVertices.length
})

fs.writeFileSync(`${config.project_name}-buildings.obj`, objVertices + objIndices)

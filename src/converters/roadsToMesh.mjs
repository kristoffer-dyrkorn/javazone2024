import * as fs from "fs"
import { exit } from "process"
import proj4 from "proj4"
import { start } from "repl"

proj4.defs([["EPSG:25833", "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"]])

function getScaledNormal(a, b, scale) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const length = Math.hypot(dx, dy)

  if (length < 0.001) {
    console.log("duplicate points:", a, b)
    exit()
  }

  return [(scale * dy) / length, (scale * -dx) / length]
}

function getRoadQuad(v1, v2, width) {
  const normal = getScaledNormal(v1, v2, width / 2)
  const a = [v1[0] - normal[0], v1[1] - normal[1], v1[2]]
  const b = [v1[0] + normal[0], v1[1] + normal[1], v1[2]]
  const c = [v2[0] + normal[0], v2[1] + normal[1], v2[2]]
  const d = [v2[0] - normal[0], v2[1] - normal[1], v2[2]]

  return [a, b, c, a, c, d]
}

function getLength(a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  return Math.hypot(dx, dy)
}

function getRoadMesh(vertices, width) {
  const roadVertices = []
  let startIndex = 0
  let endIndex = 1

  // simple geometry simplification: collapse segments until the resulting section is longer than 10 m
  while (endIndex < vertices.length - 1) {
    if (getLength(vertices[startIndex], vertices[endIndex]) > 10) {
      roadVertices.push(getRoadQuad(vertices[startIndex], vertices[endIndex], width))
      startIndex = endIndex
    }
    endIndex++
  }

  // add final section (in general shorter than 10 m), if needed
  if (startIndex != endIndex) {
    roadVertices.push(getRoadQuad(vertices[startIndex], vertices[endIndex], width))
  }
  return roadVertices.flat()
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
  for (let i = offset; i < vertices.length + offset; i += 3) {
    indicesString += `f ${i} ${i + 1} ${i + 2}\n`
  }

  return indicesString
}

if (process.argv.length != 3) {
  console.log("Usage: node roadsToMesh.mjs <config file>")
  exit()
}

const config = JSON.parse(fs.readFileSync(process.argv[2]), "utf8")

const bbox = config.bbox
const srid = config.project_srid
const roadsGeoJSON = `${config.project_name}-roads-placed.geojson`
const roads = JSON.parse(fs.readFileSync(roadsGeoJSON))
const features = roads.features

let objVertices = ""
let objIndices = ""
let totalVertices = 1

features.forEach((road) => {
  // reproject from latlon to project coordinate system and make coordinates relative to project bbox
  const roadLine = road.geometry.coordinates.map((roadVertex) => {
    const reprojectedVertex = proj4(`EPSG:${srid}`).forward([roadVertex[0], roadVertex[1]])
    return [reprojectedVertex[0] - bbox[0], reprojectedVertex[1] - bbox[1], roadVertex[2]]
  })

  const roadVertices = getRoadMesh(roadLine, road.properties.width)

  objVertices += toOBJVertices(roadVertices)
  objIndices += toOBJIndices(roadVertices, totalVertices)

  totalVertices += roadVertices.length
})

fs.writeFileSync(`${config.project_name}-roads.obj`, objVertices + objIndices)

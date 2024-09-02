import * as fs from "fs"
import { exit } from "process"
import { fromFile } from "geotiff"

if (process.argv.length != 4) {
  console.log("Usage: node terrainToMesh.mjs <skip> <config file>")
  exit()
}

const skip = +process.argv[2]
const config = JSON.parse(fs.readFileSync(process.argv[3]), "utf8")
const tiffFile = `${config.project_name}-terrain.tiff`

const tiff = await fromFile(tiffFile)
const image = await tiff.getImage()

const fullWidth = image.getWidth()
const fullHeight = image.getHeight()

console.log(`Original height map: ${fullWidth}, ${fullHeight}`)

// rescale while keeping the full geographic extent of the original area
const data = await image.readRasters({
  width: Math.ceil(fullWidth / skip) + 1,
  height: Math.ceil(fullHeight / skip) + 1,
  resampleMethod: "bilinear",
})

const { width, height } = data

console.log(`Rescaled to: ${width}, ${height}`)

if (fs.existsSync(`${config.project_name}-terrain.obj`)) {
  fs.unlinkSync(`${config.project_name}-terrain.obj`)
}

const fileStream = fs.createWriteStream(`${config.project_name}-terrain.obj`, { flags: "a" })

// output vertex coordinates, relative to lower left corner
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const px = x * skip
    const py = y * skip
    const pz = data[0][width * y + x]

    // flip y coordinate as geotiff y points south while mesh y points north
    // quantize elevation values to 0.1m values
    fileStream.write(`v ${px} ${(height - y - 1) * skip} ${pz.toFixed(1)}\n`)
  }
}

// output texture coordinates for each vertex
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    // map coordinates to 0..1
    const tx = x / (width - 1)
    const ty = (height - y - 1) / (height - 1)

    // quantize coordinates to 4 fractional digits
    fileStream.write(`vt ${tx.toFixed(4)} ${ty.toFixed(4)}\n`)
  }
}

// output triangles - from south to north and then from west to east
for (let y = 0; y < height - 1; y++) {
  for (let x = 0; x < width - 1; x++) {
    // in the OBJ format indices are 1-based, so add 1
    const v1 = y * width + x + 1
    const v2 = v1 + 1
    const v3 = v2 + width
    const v4 = v1 + width

    // output faces along with uv coords
    fileStream.write(`f ${v1}/${v1} ${v3}/${v3} ${v2}/${v2}\n`)
    fileStream.write(`f ${v1}/${v1} ${v4}/${v4} ${v3}/${v3}\n`)
  }
}

// output: OBJ file with vertex coordinates in metres, relative to lower left corner of project bbox
fileStream.end()

console.log(`Wrote ${height * width} vertices, ${2 * (height - 1) * (width - 1)} triangles`)

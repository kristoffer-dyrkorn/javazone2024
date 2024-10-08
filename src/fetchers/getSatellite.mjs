import { buffer } from "node:stream/consumers"
import * as fs from "fs"
import { exit } from "process"

if (process.argv.length != 3) {
  console.log("Usage: node getSatellite.mjs <config file>")
  exit()
}

const config = JSON.parse(fs.readFileSync(process.argv[2]), "utf8")

const bbox = config.bbox

// satellite image resolution
const metersPerPixel = 10

const wmsParams = {
  service: "WMS",
  version: "1.3.0",
  request: "GetMap",
  format: "image/png",
  layers: "2020",
  bbox: bbox,
  crs: `EPSG:${config.project_srid}`,
  width: (bbox[2] - bbox[0]) / metersPerPixel,
  height: (bbox[3] - bbox[1]) / metersPerPixel,
}

const params = new URLSearchParams(wmsParams)
const url = new URL(`${config.sentinel_url}?${params.toString()}`)

console.log("Requesting:", url.toString())

const response = await fetch(url.toString())
fs.writeFileSync(`${config.project_name}-satellite.png`, await buffer(response.body))

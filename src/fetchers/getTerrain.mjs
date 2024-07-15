import { buffer } from "node:stream/consumers"
import * as fs from "fs"
import { exit } from "process"

if (process.argv.length != 3) {
  console.log("Usage: node getTerrain.mjs <config file>")
  exit()
}

const config = JSON.parse(fs.readFileSync(process.argv[2]), "utf8")

const wcsParams = {
  service: "WCS",
  version: "1.0.0",
  request: "GetCoverage",
  format: "GeoTIFF",
  coverage: "nhm_dtm_topo_25833",
  bbox: config["bbox"],
  crs: config["project_srid"],
  response_crs: config["project_srid"],
  width: config["bbox"][2] - config["bbox"][0],
  height: config["bbox"][3] - config["bbox"][1],
}

const urlParams = new URLSearchParams(wcsParams)
const url = new URL(`${config.terrain_url}?${urlParams.toString()}`)

console.log("Requesting:", url.toString())

const response = await fetch(url.toString())
const data = await buffer(response.body)
fs.writeFileSync(`${config.project_name}-terrain.tiff`, data)

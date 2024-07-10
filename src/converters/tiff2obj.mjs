import * as fs from "fs";
import { exit } from "process";
import { fromFile } from "geotiff";

if (process.argv.length != 4) {
  console.log("Usage: node tiff2obj.mjs input.tiff");
  exit();
}

const config = JSON.parse(fs.readFileSync(process.argv[2]), "utf8");

const tiffFile = process.argv[3];

const tiff = await fromFile(tiffFile);
const image = await tiff.getImage();
const data = await image.readRasters();
const { width, height } = data;

let objString = "";
const skip = 31;

// output vertex coordinates, relative to lower left corner
// subsample by only reading every *skip* data point in the source
let xcount = 0;
let ycount = 0;
for (let y = 0; y < height; y += skip) {
  ycount += 1;
  for (let x = 0; x < width; x += skip) {
    if (ycount == 1) xcount += 1;
    const px = x;
    const py = y;
    const pz = data[0][width * y + x];

    // quantize elevation values to 0.1m values
    objString += `v ${px} ${height - py} ${pz.toFixed(1)}\n`;
  }
}

const meshWidth = Math.ceil(width / skip);
const meshHeight = Math.ceil(height / skip);

// output texture coordinates for the vertices
for (let y = 0; y < meshHeight; y += 1) {
  for (let x = 0; x < meshWidth; x += 1) {
    // map coordinates to 0..1
    const tx = x / (meshWidth - 1);
    const ty = (meshHeight - y - 1) / (meshHeight - 1);

    // quantize coordinates to 4 fractional digits
    objString += `vt ${tx.toFixed(4)} ${ty.toFixed(4)}\n`;
  }
}

// output triangles
for (let y = 0; y < meshHeight - 1; y += 1) {
  for (let x = 0; x < meshWidth - 1; x += 1) {
    // in the OBJ format indices are 1-based, so add 1
    const v1 = y * meshWidth + x + 1;
    const v2 = v1 + 1;
    const v3 = v2 + meshWidth;
    const v4 = v1 + meshWidth;

    // output faces along with uv coords
    objString += `f ${v1}/${v1} ${v3}/${v3} ${v2}/${v2}\n`;
    objString += `f ${v1}/${v1} ${v4}/${v4} ${v3}/${v3}\n`;
  }
}

fs.writeFileSync(`${config["project_name"]}.obj`, objString);

console.log(
  `Wrote ${meshHeight * meshWidth} vertices, ${
    2 * (meshHeight - 1) * (meshWidth - 1)
  } triangles`
);

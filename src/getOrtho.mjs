import * as fs from "fs";
import { exit } from "process";
import Jimp from "jimp";

const zoomScale = [
  7.737142857141884e7, 3.868571428570942e7, 1.934285714285471e7,
  9671428.571427355, 4835714.285713677, 2417857.1428568386, 1208928.5714284193,
  604464.2857142097, 302232.14285710483, 151116.07142855242, 75558.03571427621,
  37779.017857138104, 18889.508928569052, 9444.754464284526, 4722.377232142263,
  2361.1886160711315, 1180.5943080355657, 590.2971540177829,
];

// zoom level to use when getting tiles
const zoom = 15;

// tile image size, in pixels
const tileSize = 256;

// top left ref point for tile matrix
const tileMatrixMinX = -2500000.0;
const tileMatrixMaxY = 9045984.0;

const pixelSize = 0.28e-3;

// from the Tile Matrix Set standard, at
// https://docs.ogc.org/is/17-083r4/17-083r4.html#toc82
function getTiles(bbox, zoom) {
  const scaleDenominator = zoomScale[zoom];

  const cellSize = scaleDenominator * pixelSize;

  const tileSpanX = tileSize * cellSize;
  const tileSpanY = tileSize * cellSize;

  const e = 1e-6;

  return [
    Math.floor((bbox[0] - tileMatrixMinX) / tileSpanX + e),
    Math.floor((tileMatrixMaxY - bbox[3]) / tileSpanY + e),
    Math.floor((bbox[2] - tileMatrixMinX) / tileSpanX - e),
    Math.floor((tileMatrixMaxY - bbox[1]) / tileSpanY - e),
  ];
}

function getBBox(tiles, zoom) {
  const scaleDenominator = zoomScale[zoom];

  const cellSize = scaleDenominator * pixelSize;

  const tileSpanX = tileSize * cellSize;
  const tileSpanY = tileSize * cellSize;

  return [
    tileMatrixMinX + tiles[0] * tileSpanX,
    tileMatrixMaxY - (tiles[3] + 1) * tileSpanY,
    tileMatrixMinX + (tiles[2] + 1) * tileSpanX,
    tileMatrixMaxY - tiles[1] * tileSpanY,
  ];
}

function getCropValues(tiles, zoom) {
  const tileCountX = tiles[2] - tiles[0] + 1;
  const tileCountY = tiles[3] - tiles[1] + 1;

  const textureSize = [tileCountX * tileSize, tileCountY * tileSize];

  const textureBBox = getBBox(tiles, zoom);

  const xRes = textureSize[0] / (textureBBox[2] - textureBBox[0]);
  const yRes = textureSize[1] / (textureBBox[3] - textureBBox[1]);

  const leftCrop = (bbox[0] - textureBBox[0]) * xRes;
  const rightCrop = (textureBBox[2] - bbox[2]) * xRes;

  const bottomCrop = (bbox[1] - textureBBox[1]) * yRes;
  const topCrop = (textureBBox[3] - bbox[3]) * yRes;

  const newWidth = Math.round(textureSize[0] - leftCrop - rightCrop);
  const newHeight = Math.round(textureSize[1] - bottomCrop - topCrop);

  return [leftCrop, topCrop, newWidth, newHeight];
}

if (process.argv.length != 3) {
  console.log("Usage: node getOrtho.mjs <config file>");
  exit();
}

const config = JSON.parse(fs.readFileSync(process.argv[2]), "utf8");

const wmtsParams = {
  service: "WMTS",
  version: "1.0.0",
  request: "GetTile",
  format: "image/jpgpng",
  layers: "Nibcache_UTM33_EUREF89_v2",
  style: "default",
  tilematrixset: "default028mm",
  tilematrix: zoom,
};

const params = new URLSearchParams(wmtsParams);
const basisURL = new URL(`${config["ortho_url"]}?${params.toString()}`);

const bbox = config["bbox"];
const tiles = getTiles(bbox, zoom);

const imageRequests = [];
const offsets = [];

for (let y = tiles[3]; y >= tiles[1]; y--) {
  for (let x = tiles[0]; x <= tiles[2]; x++) {
    const url = `${basisURL.toString()}&tilecol=${x}&tilerow=${y}`;
    imageRequests.push(
      Jimp.read({
        url,
        options: {
          timeout: 20000,
        },
      })
    );
    offsets.push([(x - tiles[0]) * tileSize, (y - tiles[1]) * tileSize]);
  }
}
console.log(`Requesting ${imageRequests.length} image tiles`);

const images = await Promise.all(imageRequests);

const tileCountX = tiles[2] - tiles[0] + 1;
const tileCountY = tiles[3] - tiles[1] + 1;
const textureSize = [tileCountX * tileSize, tileCountY * tileSize];

new Jimp(textureSize[0], textureSize[1], (err, textureImage) => {
  images.forEach((image, i) => {
    const offset = offsets[i];
    textureImage.blit(image, offset[0], offset[1]);
  });

  const [left, top, width, height] = getCropValues(tiles, zoom);

  console.log(`Output image: ${width} x ${height} px`);

  textureImage
    .crop(left, top, width, height)
    .write(`${config["project_name"]}-ortho.png`);
});

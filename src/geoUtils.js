const projStrings = {
  25833:
    "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
  4326: "+proj=longlat +datum=WGS84 +no_defs +type=crs",
};

function makePolygon(bbox) {
  return [
    [bbox[0], bbox[1]],
    [bbox[2], bbox[1]],
    [bbox[2], bbox[3]],
    [bbox[0], bbox[3]],
  ];
}

function makeBBox(polygon) {
  return [
    Math.min(polygon[0][0], polygon[1][0], polygon[2][0], polygon[3][0]),
    Math.min(polygon[0][1], polygon[1][1], polygon[2][1], polygon[3][1]),
    Math.max(polygon[0][0], polygon[1][0], polygon[2][0], polygon[3][0]),
    Math.max(polygon[0][1], polygon[1][1], polygon[2][1], polygon[3][1]),
  ];
}

function reprojectBBox(bbox, source_srid, target_srid) {
  const polygon = makePolygon(bbox);
  const reprojectedPolygon = polygon.map((v) => {
    return proj4(projStrings[source_srid], projStrings[target_srid], v);
  });
  return makeBBox(reprojectedPolygon);
}

function getTileNumber(lat, lon, zoom) {
  const n = 1 << zoom;
  const x = Math.floor(((lon + 180) / 360) * n);
  const yRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(yRad) + 1 / Math.cos(yRad)) / Math.PI) / 2) * n
  );
  return [x, y];
}

function bboxToString(bbox) {
  return `${bbox[0]} ${bbox[1]} ${bbox[2]} ${bbox[3]}`;
}

const warpCommand = `gdalwarp -r cubic -s_srs EPSG:4326 -t_srs EPSG:${
  config["project_srid"]
} -te ${bboxToString(projectBBox)} input.tiff output.tiff`;

const projStrings = {
  25833:
    "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
  4326: "+proj=longlat +datum=WGS84 +no_defs +type=crs",
};

function getTileNumber(lat, lon, zoom) {
  const n = 1 << zoom;
  const x = Math.floor(((lon + 180) / 360) * n);
  const yRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(yRad) + 1 / Math.cos(yRad)) / Math.PI) / 2) * n
  );
  return [x, y];
}

function getTiles(bbox, zoom) {
  const minLatlon = proj4(projStrings[25833], projStrings[4326], [
    bbox[0],
    bbox[1],
  ]);
  const maxLatlon = proj4(projStrings[25833], projStrings[4326], [
    bbox[2],
    bbox[3],
  ]);

  console.log(minLatlon);
  console.log(maxLatlon);

  const minTile = getTileNumber(minLatlon[0], minLatlon[1], zoom);
  const maxTile = getTileNumber(maxLatlon[0], maxLatlon[1], zoom);
  return [minTile, maxTile];
}

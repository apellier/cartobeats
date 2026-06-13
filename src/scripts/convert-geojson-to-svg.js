const fs = require('fs');
const path = require('path');

// Miller Cylindrical Projection constants
const W = 1000;
const H = 500;
const Y_MIN = -2.303;
const Y_MAX = 2.303;

function projectMiller(lon, lat) {
  // Normalize lon to 0..1
  const xNorm = (lon + 180) / 360;
  
  // Miller y projection
  const latRad = (lat * Math.PI) / 180;
  // Clip latitude slightly to prevent Infinity in tan/log near poles
  const clippedLatRad = Math.max(-85 * Math.PI / 180, Math.min(85 * Math.PI / 180, latRad));
  const yRaw = 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * clippedLatRad));
  
  // Normalize y to 0..1
  const yNorm = (yRaw - Y_MIN) / (Y_MAX - Y_MIN);
  
  const x = xNorm * W;
  const y = (1 - yNorm) * H; // SVG y goes top-to-bottom
  
  return [parseFloat(x.toFixed(1)), parseFloat(y.toFixed(1))];
}

function convertRingToPath(ring) {
  if (ring.length === 0) return '';
  const firstPoint = projectMiller(ring[0][0], ring[0][1]);
  let pathStr = `M${firstPoint[0]},${firstPoint[1]}`;
  
  for (let i = 1; i < ring.length; i++) {
    const point = projectMiller(ring[i][0], ring[i][1]);
    pathStr += ` L${point[0]},${point[1]}`;
  }
  
  pathStr += ' Z';
  return pathStr;
}

function convertPolygonToPath(polygon) {
  // polygon is array of rings: polygon[0] is exterior, polygon[1..] are interior rings (holes)
  return polygon.map(ring => convertRingToPath(ring)).join(' ');
}

function convertGeometryToPath(geometry) {
  if (geometry.type === 'Polygon') {
    return convertPolygonToPath(geometry.coordinates);
  } else if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.map(polygon => convertPolygonToPath(polygon)).join(' ');
  }
  return '';
}

function run() {
  const geojsonPath = path.join(__dirname, '../../public/countries.geojson');
  console.log(`Reading GeoJSON from: ${geojsonPath}`);
  
  if (!fs.existsSync(geojsonPath)) {
    console.error(`GeoJSON file not found at ${geojsonPath}`);
    process.exit(1);
  }
  
  const rawData = fs.readFileSync(geojsonPath, 'utf8');
  const geojson = JSON.parse(rawData);
  
  const countriesMap = {};
  
  geojson.features.forEach((feature) => {
    const props = feature.properties;
    const isoCode = props['ISO3166-1-Alpha-2'] || props['iso_a2'] || props['iso_A2'] || props['ISO_A2'];
    const name = props['name'] || props['name_long'] || props['name_sort'];
    
    if (!isoCode) {
      console.warn(`Warning: Country "${name}" has no ISO code. Skipping.`);
      return;
    }
    
    const key = isoCode.toUpperCase();
    const pathStr = convertGeometryToPath(feature.geometry);
    
    if (!pathStr) {
      console.warn(`Warning: Country "${name}" (${key}) has no geometry paths. Skipping.`);
      return;
    }
    
    countriesMap[key] = {
      name: name,
      path: pathStr
    };
  });
  
  const outputPath = path.join(__dirname, '../data/countries-paths.json');
  const outputDir = path.dirname(outputPath);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(countriesMap, null, 2), 'utf8');
  console.log(`Successfully generated SVG paths for ${Object.keys(countriesMap).length} countries.`);
  console.log(`Output saved to: ${outputPath}`);
  console.log(`JSON File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
}

run();

package sentinel

const ndviEvalscript = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "dataMask"] }],
    output: { bands: 4 }
  };
}

function evaluatePixel(sample) {
  if (sample.dataMask == 0) return [0, 0, 0, 0];
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  if (ndvi < -0.5) return [0.05, 0.05, 0.05, 1];
  if (ndvi < 0.0)  return [0.75, 0.75, 0.75, 1];
  if (ndvi < 0.1)  return [0.86, 0.86, 0.86, 1];
  if (ndvi < 0.2)  return [0.92, 0.96, 0.57, 1];
  if (ndvi < 0.4)  return [0.57, 0.75, 0.32, 1];
  if (ndvi < 0.6)  return [0.31, 0.54, 0.18, 1];
  return [0.0, 0.27, 0.0, 1];
}`

const rgbEvalscript = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B03", "B02", "dataMask"] }],
    output: { bands: 4 }
  };
}

function evaluatePixel(sample) {
  if (sample.dataMask == 0) return [0, 0, 0, 0];
  return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02, 1];
}`

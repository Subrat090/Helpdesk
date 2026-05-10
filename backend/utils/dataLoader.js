const fs = require("fs");
const path = require("path");

const loadJson = (fileName) => {
  const filePath = path.join(__dirname, "..", "data", fileName);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
};

module.exports = {
  loadJson,
};

// helpers/templateLoader.js
const fs = require('fs').promises;
const path = require('path');

const cache = new Map();

/**
 * loadTemplate(filename) -> returns raw template string
 * Gracefully handles missing files
 */
async function loadTemplate(filename) {
  // Updated folder name to match your actual folder
  const fullPath = path.join(__dirname, '..', 'Templates', filename);

  if (cache.has(fullPath)) return cache.get(fullPath);

  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    cache.set(fullPath, content);
    return content;
  } catch (err) {
    console.error(`Template load error: Cannot read file "${filename}" at ${fullPath}`);
    return ''; // return empty string if file is missing
  }
}

/**
 * renderTemplate(templateString, data) -> returns string with {{key}} replaced
 */
function renderTemplate(templateString, data = {}) {
  return templateString.replace(/{{\s*([a-zA-Z0-9_\.]+)\s*}}/g, (match, key) => {
    const keys = key.split('.');
    let val = data;
    for (const k of keys) {
      if (val && Object.prototype.hasOwnProperty.call(val, k)) val = val[k];
      else { val = ''; break; }
    }
    return String(val == null ? '' : val);
  });
}

module.exports = { loadTemplate, renderTemplate };

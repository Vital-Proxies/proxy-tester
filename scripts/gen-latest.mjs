import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import path from "path";

console.log("Starting latest.json generation for release...");

// A recursive function to find all files with specific extensions in a directory
function findFilesByExt(startPath, filter) {
  let results = [];
  try {
    const files = readdirSync(startPath);
    for (const file of files) {
      const filename = path.join(startPath, file);
      if (statSync(filename).isDirectory()) {
        results = results.concat(findFilesByExt(filename, filter));
      } else if (filter.test(filename)) {
        results.push(filename);
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${startPath}: ${err.message}`);
  }
  return results;
}

// 1. Read metadata directly from tauri.conf.json
const tauriConf = JSON.parse(
  readFileSync("./src-tauri/tauri.conf.json", "utf8")
);
const version = tauriConf.version;
if (!version) {
  throw new Error('Could not find "version" in tauri.conf.json');
}

// 2. Define the base URL for downloads
const githubRepo = "vital-proxies/proxy-tester"; // Corrected user/repo
const baseDownloadURL = `https://github.com/${githubRepo}/releases/download/v${version}`;

// 3. Initialize the structure for the final JSON file
const latestJson = {
  version: `v${version}`,
  notes: "See the release notes on GitHub for details.",
  pub_date: new Date().toISOString(),
  platforms: {},
};

// 4. In CI, artifacts are downloaded to a known directory.
// Let's assume the GitHub Action places them in `src-tauri/target/release/bundle`
const releaseDir = "./src-tauri/target/release/bundle";
const signatures = findFilesByExt(releaseDir, /\.sig$/);
const artifacts = findFilesByExt(
  releaseDir,
  /\.(dmg|exe|msi|deb|rpm|AppImage|tar\.gz|zip)$/
);

// Map: artifact file → .sig content (if exists)
const sigMap = {};
for (const sigPath of signatures) {
  const baseFile = sigPath.replace(/\.sig$/, "");
  try {
    sigMap[path.basename(baseFile)] = readFileSync(sigPath, "utf8");
  } catch (err) {
    console.warn(`⚠️  Failed to read sig file ${sigPath}: ${err.message}`);
  }
}

if (artifacts.length === 0) {
  throw new Error(
    `No updater artifacts found in ${releaseDir}. Make sure the download step in your GitHub Action ran correctly.`
  );
}

console.log(
  `Found ${artifacts.length} artifacts to process for version ${version}...`
);

// 5. Process each artifact to build the platforms object
for (const artifactPath of artifacts) {
  const signaturePath = `${artifactPath}.sig`;
  const fileName = path.basename(artifactPath);
  let platformKey = null;

  // --- THIS IS THE ROBUST FIX ---
  // We determine the platform and architecture by parsing the filename, NOT by checking the runner's OS.

  if (fileName.endsWith(".dmg")) {
    platformKey = fileName.includes("aarch64")
      ? "darwin-aarch64"
      : "darwin-x86_64";
  } else if (fileName.endsWith(".exe") || fileName.endsWith(".msi")) {
    platformKey = "windows-x86_64";
  } else if (
    fileName.endsWith(".deb") ||
    fileName.endsWith(".rpm") ||
    fileName.endsWith(".AppImage")
  ) {
    platformKey = "linux-x86_64";
  } else if (fileName.endsWith(".app.tar.gz")) {
    platformKey = fileName.includes("aarch64")
      ? "darwin-aarch64"
      : "darwin-x86_64";
  }

  // Attempt to read signature file, but proceed even if it's missing
  const signature = sigMap[fileName];

  if (platformKey) {
    latestJson.platforms[platformKey] = {
      url: `${baseDownloadURL}/${fileName}`,
      ...(signature && { signature }),
    };
    console.log(
      `  ✓ Added platform: ${platformKey} for file ${fileName}${
        signature ? " (with signature)" : " (no signature)"
      }`
    );
  } else {
    console.warn(`  - Could not determine platform for artifact: ${fileName}`);
  }
}

// 6. Write the final JSON file to a predictable location for the upload step
const outputPath = path.resolve("./latest.json"); // Place it in the root for easy access
writeFileSync(outputPath, JSON.stringify(latestJson, null, 2));

console.log(`\n✅ latest.json generated successfully at: ${outputPath}`);
console.log(JSON.stringify(latestJson, null, 2));

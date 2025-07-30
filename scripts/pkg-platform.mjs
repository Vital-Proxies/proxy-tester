import { execSync } from "node:child_process";
import fs from "fs";

console.log("Starting platform-specific server packaging...");

const targetArg = process.argv[2];
let rustTarget;

if (targetArg) {
  console.log(`📦 Received target argument: ${targetArg}`);
  rustTarget = targetArg;
} else {
  console.log("No target argument received, detecting host architecture...");
  const rustInfo = execSync("rustc -vV").toString();
  const match = /host: (\S+)/.exec(rustInfo);
  if (!match) {
    console.error("❌ Failed to extract host triple from `rustc -vV`");
    process.exit(1);
  }
  rustTarget = match[1];
  console.log(`📦 Detected host rust target: ${rustTarget}`);
}

let pkgTarget, outputBinary;

switch (rustTarget) {
  case "x86_64-apple-darwin":
    pkgTarget = "node18-macos-x64";
    outputBinary = "server-x86_64-apple-darwin";
    break;
  case "aarch64-apple-darwin":
    pkgTarget = "node18-macos-arm64";
    outputBinary = "server-aarch64-apple-darwin";
    break;
  case "x86_64-pc-windows-msvc":
    pkgTarget = "node18-win-x64";
    outputBinary = "server-x86_64-pc-windows-msvc.exe";
    break;
  case "x86_64-unknown-linux-gnu":
    pkgTarget = "node18-linux-x64";
    outputBinary = "server-x86_64-unknown-linux-gnu";
    break;
  default:
    console.error(`❌ Unsupported or unknown Rust target: ${rustTarget}`);
    process.exit(1);
}

// 3. Ensure bin directory exists
const binDir = "./src-tauri/bin";
fs.mkdirSync(binDir, { recursive: true });

// 4. Build the binary using pkg
const outputPath = `${binDir}/${outputBinary}`;
const cmd = `pkg dist/server/server.js --targets ${pkgTarget} --output ${outputPath}`;
console.log(`🚀 Running: ${cmd}`);
execSync(cmd, { stdio: "inherit" });

// 5. Confirm file exists
if (fs.existsSync(outputPath)) {
  console.log(`✅ Binary created at: ${outputPath}`);
} else {
  console.error(`❌ Failed to create binary at: ${outputPath}`);
  process.exit(1);
}

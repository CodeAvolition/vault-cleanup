import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version ?? process.argv[2];

if (!targetVersion) {
	throw new Error("Missing target version. Pass it as an argument or via npm_package_version.");
}

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;

if (!minAppVersion) {
	throw new Error("manifest.json is missing minAppVersion.");
}

manifest.version = targetVersion;
writeFileSync("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);

const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", `${JSON.stringify(versions, null, "\t")}\n`);

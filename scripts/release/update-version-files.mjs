import { readFileSync, writeFileSync } from "node:fs";

function readJson(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value, indent) {
	writeFileSync(path, `${JSON.stringify(value, null, indent)}\n`);
}

export function updateVersionFiles(targetVersion) {
	const manifest = readJson("manifest.json");
	const minAppVersion = manifest.minAppVersion;

	if (!minAppVersion) {
		throw new Error("manifest.json is missing minAppVersion.");
	}

	manifest.version = targetVersion;
	writeJson("manifest.json", manifest, 2);

	const versions = readJson("versions.json");
	versions[targetVersion] = minAppVersion;
	writeJson("versions.json", versions, "\t");
}

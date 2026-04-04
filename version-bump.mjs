import { updateVersionFiles } from "./scripts/release/update-version-files.mjs";

const targetVersion = process.argv[2] ?? process.env.npm_package_version;

if (!targetVersion) {
	throw new Error("Missing target version. Pass it as an argument or via npm_package_version.");
}

updateVersionFiles(targetVersion);

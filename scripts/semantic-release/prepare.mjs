import { updateVersionFiles } from "../release/update-version-files.mjs";

export async function prepare(_pluginConfig, context) {
	const nextVersion = context.nextRelease?.version;

	if (!nextVersion) {
		throw new Error("semantic-release did not provide a next release version.");
	}

	updateVersionFiles(nextVersion);
}

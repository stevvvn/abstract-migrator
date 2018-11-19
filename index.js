'use strict';
const fs = require('fs');
const path = require('path');

/**
 * Load the plugin responsible for a given migration type
 *
 * abstract-migrator-$something for /migrations/$something/*.js
 */

let pushedCwd = false;
const getImpl = async (folder, conf) => {
	if (!pushedCwd) {
		if (fs.existsSync(`${ process.cwd() }/node_modules`)) {
			module.paths.push(`${ process.cwd() }/node_modules`);
		}
		pushedCwd = true;
	}
	// look up implementation from calling location's perspective
	let mods = folder;
	while (mods !== '/' && !fs.existsSync(`${ mods }/node_modules`)) {
		mods = path.resolve(`${ mods }/..`);
	}
	module.paths.push(`${ mods }/node_modules`);
	return require(`abstract-migrator-${ path.basename(folder) }`)(conf);
}

/**
 * Try not to do operations that would bring migrations to the state they're
 * already in, except when '--force'd
 */
const assertApplied = async (impl, applied, name, force) => {
	if (force) {
		return;
	}
	const dbState = await impl.applied(name);
	if (dbState !== applied) {
		throw new Error(`migration ${ applied ? 'not yet applied' : 'already applied' }. won't proceed without --force`);
	}
};

/**
 * Run up or down operation against a file
 */
const run = async ({ impl, conf, dir, file, force }) => {
	if (!impl) {
		impl = await getImpl(path.dirname(file), conf);
	}
	const name = path.basename(file).replace(/[.]js$/, '');
	console.log('\t', dir === 'up' ? '/\\' : '\\/', name);

	await assertApplied(impl, dir === 'down', name, force)
	const res = await require(file)[dir](impl.handle, conf.value);
	return impl[dir === 'up' ? 'record' : 'remove'](name);
};

/**
 * Do a targeted up or down
 */
const applySingle = async (file, dir, conf, force) => {
	const folder = path.dirname(file);
	const impl = await getImpl(folder, conf);
	let err;
	try {
		await run({
			impl,
			conf,
			dir,
			file,
			force
		});
	}
	catch (ex) {
		err = ex;
	}
	await impl.commit();
	await impl.close();
	if (err) {
		throw err;
	}
};

const getMigrationsFromPath = (path, state) =>
	fs.readdirSync(path)
		// starts with timestamp, ends with js
		.filter((file) => /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d+.*[.]js$/.test(file))
		.map((file) => `${ path }/${ file }`)
		.sort();

module.exports = { getImpl, run, applySingle, getMigrationsFromPath };

# abstract-migrator

Simple fixture for maintaining migrations that have their state stored in the storage that they reference.

## Installation

	$ yarn global add abstract-migrator

To make the `amigrate` script available everywhere, or omit `global` to install it in `node_modules/.bin/`

### Supported data stores

These adapters should be short & simple, and they have access to the credentials on the stores they modify, so it's worth taking a look at their code to make sure everything is on the up-and-up:

* [PostgreSQL](https://bitbucket.org/snyder13/abstract-migrator-pg)
* Custom - see below

## Configuration
In `migrations/`, `migrations/$type` or the parent folder of `migrations` in your project, according to your preference, add `conf.js` and (optionally) `secrets.js` files that export enough information to connect to the relevant data store(s). (The split between conf and secrets is so you can commit common settings in the former and `.gitignore` secrets.js for local credentials)

See the documentation for the module implementing migrations on your data store(s) to see which parameters are considered.

## Usage

These examples assume you have `cd`-ed to `migrations/$type/` in your project path. You can also supply `--path /project/path/migrations/$type` instead of relying on the working directory.

### View help

	$ amigrate
	Usage: amigrate [options] verb [verb args]
	... snip ...

### Create a migration

	$ amigrate create test migration
	/project/path/migrations/$type/2018-05-24T17-00-55-821Z-test-migration.js

Since the output is the generated filename, you can edit immediately with, e.g.,

	$ vim `amigrate create another test migration`

This is a file that exports `{ up, down }` methods that are passed an instance of a client connection to the data store. These methods should either do their work synchronously or return a `Promise` that resolves when they're done.

You can change how these newly-created migrations look by creating & editing `/project/path/migrations/$type/template.js`

### Run a migration

Single target:

	$ amigrate up /project/path/migrations/$type/2018-05-24T17-00-55-821Z-test-migration.js

All unapplied:

	$ amigrate up

### Roll back a migration

Single target only:

	$ amigrate down /project/path/migrations/$type/2018-05-24T17-00-55-821Z-test-migration.js

## Custom adapters

There are examples above that serve as a good model. The formal requirements are:

`index.js` should export a function that accepts configuration parameters and returns a `Promise` that resolves to an instance of your adapter class when it's ready. The parameters are a `hex-object`, which you can read about [here](https://bitbucket.org/snyder13/hex-object), or just call `.get()` on it to get a plain old object.

The adapter class must implement a few things:
* `get handle()`  - A connection to the data store, passed to `up()` and `down()`. The API here is up to you and the libraries you use, but callback-style APIs must be promisified.
* `applied(name)` - Returns a boolean indicating whether a migration of the given name is already in the 'up' state.
* `record(name)` - Mark the migration name as 'up'
* `remove(name)` - Mark the migration name as 'down' (or just remove the 'up' mark)
* `commit()` - Persist changes made this session permanently, where practical
* `rollback()` - Remove changes attempted this session, where practical
* `close()` - Cleanly shut down the client connection

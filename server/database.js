import { faker } from "@faker-js/faker";
import sqlite3 from "sqlite3";
import path from "path";
import FS from "fs";

const DB_URL = path.join(import.meta.dirname, "database.db");
export const EMPLOYEE_TABLE = {
	key: "employees",
	fields: {
		ID: "id",
		NAME: "name",
		EMAIL: "email",
		SEX: "sex",
	},
};

/**
 * Returns an sqlite3.Databse instance of the server/database.db.
 * @param {string} filename - the url of the file
 * @param {boolean} reset - [false] If true deletes any existing database with the same
 * url then creates a new one. Default is false.
 * @returns {Promise<sqlite3.Database>}
 */
function __createDatabaseInstance(filename, reset = false) {
	const SQ3 = sqlite3.verbose();
	return new Promise(async (resolve, reject) => {
		try {
			if (true === reset) {
				if (FS.existsSync(filename)) {
					await FS.unlink(filename, (error) => {
						if (error) {
							reject("FILE DELETION ERROR, " + error.message);
						}
					});
				}
			}

			const database = new SQ3.Database(filename, (error) => {
				if (error) {
					reject(error);
				}
				return;
			});

			resolve(database);
		} catch (error) {
			reject(error.message);
		}
	});
}

/**
 * Creates the 'employee
 * @param {sqlite3.Database} database
 * @returns {Promise<void>}
 */
function __createEmployeeTable(database) {
	return new Promise(async function (resolve, reject) {
		try {
			let query = `CREATE TABLE IF NOT EXISTS ${EMPLOYEE_TABLE.key}(
				${EMPLOYEE_TABLE.fields.ID} INTEGER PRIMARY KEY AUTOINCREMENT,
				${EMPLOYEE_TABLE.fields.NAME} VARCHAR,
				${EMPLOYEE_TABLE.fields.EMAIL} VARCHAR,
				${EMPLOYEE_TABLE.fields.SEX} CHARACTER
			)`;

			database.run(query, (error) => {
				if (error) {
					reject(error);
				} else {
					resolve();
				}
			});
		} catch (error) {
			reject(error);
		}
	});
}

/**
 * Checks if the given table exists in the database
 * @param {sqlite3.Database} database
 * @param {string} table_name
 * @returns {boolean|Error}
 */
function __databaseTableExists(database, table_name) {
	let table_exists = false;
	let query = `SELECT tbl_name FROM sqlite_master WHERE type='table' AND tbl_name=?`;

	try {
		database.get(query, [table_name], (err, row) => {
			if (err) {
				throw err;
			}
			table_exists = undefined === row;
			return;
		});
	} catch (err) {
		return err;
	}
	return table_exists;
}

/**
 * Checks if the given table has any data.
 * @param {sqlite3.Database} database
 * @param {string} table_name
 * @returns {Promise<boolean>}
 */
function __databaseTableIsEmpty(database, table_name) {
	return new Promise((resolve, reject) => {
		try {
			database.serialize(() => {
				const query = `SELECT COUNT(*) AS count FROM ${table_name};`;
				database.get(query, (err, row) => {
					if (err) {
						reject(err.message);
					} else {
						resolve(row.count === 0);
					}
				});
			});
		} catch (error) {
			reject(error.message);
		}
	});
}

/**
 * Uses the faker library to generate fake employee data.
 * @param {sqlite3.Database} database
 * @param {number} count - how many items to generate
 * @returns {Promise<void>}
 */
function __generateDummyEmployeeEntries(database, count = 10) {
	return new Promise(async function (resolve, reject) {
		try {
			database.serialize(() => {
				const query = `INSERT INTO ${EMPLOYEE_TABLE.key}(${EMPLOYEE_TABLE.fields.NAME},
				${EMPLOYEE_TABLE.fields.EMAIL}, ${EMPLOYEE_TABLE.fields.SEX}) VALUES (?, ?, ?)`;
				const statement = database.prepare(query, (error) => {
					if (error) {
						reject(error.message);
					}
				});

				for (let i = 0; i < count; i++) {
					let employee = __generateEmployeeData();
					statement.run(
						[employee.name, employee.email, employee.sex],
						(error) => {
							if (error) {
								reject(error.message);
							}
						}
					);
				}

				statement.finalize();
				resolve();
			});
		} catch (error) {
			reject(error.message);
		}
	});
}

/**
 * @typedef {Object} Employee
 * @property {string} name
 * @property {string} email
 * @property {string} sex
 *
 * @returns {Employee}
 */
function __generateEmployeeData() {
	const sex = faker.person.sex();
	const f_name = faker.person.firstName({ sex });
	const l_name = faker.person.lastName({ sex });
	const name = `${f_name} ${l_name}`;
	const email = faker.internet.email({
		firstName: f_name,
		lastName: l_name,
		allowSpecialCharacters: true,
		provider: `faux-ltd.com`,
	});

	return { name: name, email: email, sex: sex };
}

/**
 * Checks if the value passed is an instance of the Error class.
 * @param {*} value
 * @returns {boolean}
 */
function __isError(value) {
	return value instanceof Error;
}

/**
 * @typedef {object} api_db_config
 * @property {boolean} generateData - [false] Whether the database should generate
 * dummy data. Default is false.
 * @property {boolean} generateDataIfEmpty - [false] Whether the database should
 * generate dummy data depending on if the table is empty. If generateData is set
 * to true this value will be overridden. Default is false.
 * @property {boolean} dataSize - [10] The number of items to be generated. Default
 * is 10
 * @property {boolean} reset - [false] If set to true the new database is created
 * if one was already created.
 */

/**
 * Return an instance of an sqlite.Database with the API database loaded.
 *
 * @param {api_db_config} config
 * @returns {Promise<sqlite3.Database>}
 */
export function startDatabase(config) {
	const {
		generateData: GENERATE_DATA = false,
		generateDataIfEmpty: GENERATE_DATA_IF_EMPTY = false,
		dataSize: DATA_SIZE = 10,
		reset: RESET = false,
	} = config;

	return new Promise(async (resolve, reject) => {
		try {
			// STEP 1: Create the database instance
			let database = await __createDatabaseInstance(DB_URL, RESET);

			// STEP 2: Create the employee table if it doesn't exist.
			await __createEmployeeTable(database);

			// STEP 3: Data generation
			// If GENERATE_DATA
			if (true === GENERATE_DATA) {
				await __generateDummyEmployeeEntries(database, DATA_SIZE);
			}
			// If GENERATE_DATA_IF_EMPTY, check if table is empty first
			else if (true === GENERATE_DATA_IF_EMPTY) {
				let employee_table_empty = await __databaseTableIsEmpty(
					database,
					EMPLOYEE_TABLE.key
				);
				if (true === employee_table_empty) {
					await __generateDummyEmployeeEntries(database, DATA_SIZE);
				}
			}

			resolve(database);
		} catch (error) {
			reject(error);
		}
	});

	try {
		database.serialize(() => {
			// GUARD: Check if the employee table has been created
			let employee_table_exists = __databaseTableExists(
				database,
				EMPLOYEE_TABLE.key
			);
			if (__isError(employee_table_exists)) {
				throw employee_table_exists;
			}
			if (false === employee_table_exists) {
				__createEmployeeTable(database);
			}

			let table_is_empty = __databaseTableIsEmpty(database, EMPLOYEE_TABLE.key);
			table_is_empty.then(
				(value) => {
					console.log(value);
				},
				(error) => {
					console.log(error);
				}
			);

			console.log("Is table empty?");
			console.log(table_is_empty);
			if (table_is_empty === true) {
				let generate_data = __generateDummyEmployeeEntries(database, 10);
				if (generate_data instanceof Error)
					return new Error(generate_data.message);
			} else if (table_is_empty instanceof Error) {
				return new Error(table_is_empty.message);
			}
		});
	} catch (error) {
		return error;
	}

	return database;
}

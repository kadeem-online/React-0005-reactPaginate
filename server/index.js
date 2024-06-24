import EXPRESS from "express";
import DOTENV from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import FS from "fs";

// Load .env variables
DOTENV.config();

// current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get JSON Database
const DB_STATES = {
	loading: "LOADING",
	failed: "FAILED",
	active: "ACTIVE",
};
const DB = {
	state: DB_STATES.loading,
	errors: [],
	data: {},
};
const DB_PATH = join(__dirname, "database.json");
FS.readFile(DB_PATH, `utf-8`, (error, data) => {
	if (error) {
		DB.state = DB_STATES.failed;
		DB.errors = [error.message];
	} else {
		DB.state = DB_STATES.active;
		DB.data = JSON.parse(data);
	}
	return;
});

const server = EXPRESS();
const PORT_NUMBER = process.env.PORT_NUMBER || 9090;
const API_NAMESPACE = `/api/v1`;

/**
 * Returns an array of strings of the available compnay roles or an Error if the
 * database has not loaded, failed to load or a js error occurs.
 * @returns {Array<string>|Error}
 */
function getRoles() {
	// GUARD: database loading failed
	if (DB_STATES.failed === DB.state) {
		throw new Error("Database did not load successfully.");
	}

	// GUARD: Database is still loading
	if (DB_STATES.loading === DB.state) {
		throw new Error("Database is still loading.");
	}

	try {
		// GUARD confirm that DB has the roles key
		let key = `roles`;
		if (false === DB.data.hasOwnProperty(`${key}`)) {
			throw new Error(`Missing '${key}' field in database.`);
		}
		return DB.data.roles;
	} catch (error) {
		throw new Error(`Failed to retrieve roles: ${error.message}`);
	}
}

// start server
server.listen(PORT_NUMBER, () => {
	console.log(`Server running on port: ${PORT_NUMBER}`);
});

// set base API route
server.get(`${API_NAMESPACE}`, (request, response) => {
	response.status(200);
	response.json(`API is active`);
});

// [GET] user roles - return all available job types for the company
server.get(`${API_NAMESPACE}/roles`, (request, response) => {
	try {
		response.status(200);
		response.json({
			roles: getRoles(),
		});
	} catch (error) {
		response.status(501);
		response.send(`${error.message}`);
	}
});

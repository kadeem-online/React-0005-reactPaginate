import EXPRESS from "express";
import { EMPLOYEE_TABLE, startDatabase } from "./database.js";
import DOTENV from "dotenv";
import sqlite3 from "sqlite3";

class APIErrorResponse {
	constructor(statusCode, statusMessage, error) {
		this.statusCode = statusCode;
		this.statusMessage = statusMessage;
		this.error = error;
	}
}

DOTENV.config();
const PORT_NUMBER = process.env.PORT_NUMBER || 5050;

// Register server
const SERVER = EXPRESS();

/**
 * @type {sqlite3.Database}
 */
let DATABASE;

/*****************************
 * ROUTES REGISTRATION START *
 *****************************/

// API namespace
const NAMESPACE = `/api/v1`;

SERVER.get(NAMESPACE, (request, response) => {
	response.send("Welcome to SQlite3 API!");
});

// Employee Endpoint
SERVER.get(`${NAMESPACE}/employees`, function (request, response) {
	try {
		// TODO: Handle request parameters
		__getEmployees({
			search: request.query["keyword"],
			perPage: request.query["per_page"],
			pageNumber: request.query["page"],
			sex: request.query["sex"],
		})
			.then((result) => {
				response.status(200);
				response.json(result);
			})
			.catch((error) => {
				if (error instanceof Error) {
					throw error;
				} else {
					response.status(error.statusCode);
					response.statusMessage = error.statusMessage;
					response.json({
						error: `${error.error}`,
					});
				}
			});
	} catch (error) {
		response.status(501);
		response.statusMessage = `Server Failure.`;
		response.json({
			error: `${error.message || error}`,
		});
	}
});

function __fetchFromDatabase(query) {
	const __VALUES = { result: null };
	return new Promise((resolve, reject) => {
		try {
			const statement = DATABASE.prepare(query);
			statement.all(function (error, rows) {
				if (error) {
					reject(error.message);
				}

				if (Array.isArray(rows)) {
					__VALUES.result = rows;
				} else {
					__VALUES.result = [rows];
				}

				resolve(__VALUES.result);
			});
			statement.finalize();
		} catch (error) {
			reject(error);
		}
	});
}

/**
 * Fetch employees from the database.
 * @param {object} config
 * @param {number} config.perPage
 * @param {number} config.pageNumber
 * @param {string} config.search
 * @param {string} config.sex
 *
 * @returns {Promise<object>} An array containing the results
 * @throws {APIErrorResponse} The promise is rejected with an APIErrorResponse object.
 */
function __getEmployees(
	config = {
		perPage,
		pageNumber,
		search,
		sex,
	}
) {
	const {
		perPage: PER_PAGE = 10,
		pageNumber: PAGE_NUMBER = 1,
		search: SEARCH = "",
		sex: SEX = "",
	} = config;

	let query = `SELECT * FROM ${EMPLOYEE_TABLE.key}`;
	let count_query = `SELECT COUNT(*) as count FROM ${EMPLOYEE_TABLE.key}`;

	// GUARD: SEARCH
	if (typeof SEARCH !== "string") {
		throw new TypeError("'keyword' must be of type string.");
	}
	if (SEARCH.trim() !== "" && SEARCH.trim() !== "*") {
		query += ` WHERE ${EMPLOYEE_TABLE.fields.NAME} LIKE '%${SEARCH}%' COLLATE NOCASE`;
		count_query += ` WHERE ${EMPLOYEE_TABLE.fields.NAME} LIKE '%${SEARCH}%' COLLATE NOCASE`;
	}

	// GUARD: GENDER
	if (typeof SEX !== "string") {
		throw new TypeError("'sex' must be of type string.");
	}
	const __sex = SEX.trim().toLowerCase();
	if (__sex !== "" && __sex !== "*") {
		// ensure it is either Male or Female
		if (__sex === "male" || __sex == "female") {
			// Attachment to query depending of if the keyword field was set
			if (SEARCH.trim() !== "" && SEARCH.trim() !== "*") {
				query += ` AND ${EMPLOYEE_TABLE.fields.SEX} == '${__sex}'`;
				count_query += ` AND ${EMPLOYEE_TABLE.fields.SEX} == '${__sex}'`;
			} else {
				query += ` WHERE ${EMPLOYEE_TABLE.fields.SEX} == '${__sex}'`;
				count_query += ` WHERE ${EMPLOYEE_TABLE.fields.SEX} == '${__sex}'`;
			}
		}
	}

	// GUARD: PER_PAGE
	// if (typeof PER_PAGE !== "number") {
	if (isNaN(parseFloat(PER_PAGE)) || !isFinite(PER_PAGE)) {
		throw new TypeError("'per_page' must be of type number.");
	} else {
		// if it is less than 1 return 10 items
		if (parseFloat(PER_PAGE) < 1) {
			query += ` LIMIT ${10}`;
		} else {
			query += ` LIMIT ${PER_PAGE}`;
		}

		// GUARD: PAGE_NUMBER, only set if the entries per page has been set
		// must of a number
		if (isNaN(parseFloat(PAGE_NUMBER)) || !isFinite(PAGE_NUMBER)) {
			throw new TypeError("'offset' must be of type number.");
		}

		// only set an offset if it is greater than 0
		if (parseFloat(PAGE_NUMBER) > 1) {
			// conversion into from page offset to item offset
			const __offset = Math.floor((PAGE_NUMBER - 1) * PER_PAGE);
			query += ` OFFSET ${__offset}`;
		}
	}

	// If all checks were passed successfully define formats for response data.
	const success_data = {
		entries: [],
		item_count: 0,
		page: PAGE_NUMBER, // minimum page is 1
		// queries: [query, count_query],
	};

	const error_data = new APIErrorResponse(500, "Server Error", "");

	return new Promise(function (resolve, reject) {
		try {
			DATABASE.serialize(function () {
				__fetchFromDatabase(count_query)
					.then((result) => {
						// GUARD: Type check count
						if (
							!result[0]["count"] || // cannot be undefined
							isNaN(parseFloat(result[0]["count"])) || // cannot be NaN
							!isFinite(result[0]["count"]) // cannot be infinite
						) {
							error_data.statusCode = 500;
							error_data.statusMessage = "Database Error";
							error_data.error = "Invalid output";
							reject(error_data);
						}

						const count = parseFloat(result[0]["count"]);

						// GUARD: Check if any results exist
						if (count <= 0) {
							let details = `The requested resource could not be found.`;
							reject(new APIError(404, "Not Found", details));
						}

						// GUARD: CHeck for invalid page requests
						const highest_valid_page = Math.ceil(count / PER_PAGE);
						if (PAGE_NUMBER > highest_valid_page) {
							error_data.statusCode = 400;
							error_data.statusMessage = "Bad Request";
							error_data.error = `Invalid page requested.`;
							reject(error_data);
						}

						success_data.item_count = count;

						return __fetchFromDatabase(query);
					})
					.then((result) => {
						success_data.entries = result;
						resolve(success_data);
					})
					.catch((error) => {
						error_data.statusCode = 501;
						error_data.statusMessage = "Server Error";
						error_data.error = error.message;
						reject(error_data);
					});
			});
		} catch (error) {
			reject(error.message);
		}
	});
}

/***************************
 * ROUTES REGISTRATION END *
 ***************************/

async function startServer() {
	try {
		// Get Database Instance
		DATABASE = await startDatabase({
			generateDataIfEmpty: true,
			dataSize: 700,
		});
		console.log("SUCCESS: Database Initialized.");

		// Enable server to listen
		SERVER.listen(PORT_NUMBER, () => {
			console.log(`SUCCESS: Server running on port ${PORT_NUMBER}.`);
		});
	} catch (error) {
		throw error;
	}

	return;
}

startServer();

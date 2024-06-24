export const API_STATUS_CODES = {
	// Success
	OK: { code: 200, text: "OK" },
	Created: { code: 201, text: "Created" },
	Accepted: { code: 202, text: "Accepted" },

	// Client errors
	BadRequest: { code: 400, text: "Bad Request" },
	Unauthorized: { code: 401, text: "Unauthorized" },
	Forbidden: { code: 403, text: "Forbidden" },
	NotFound: { code: 404, text: "Not Found" },
	MethodNotAllowed: { code: 405, text: "Method Not Allowed" },
	Conflict: { code: 409, text: "conflict" },
	PreconditionFailed: { code: 412, text: "Precondition Failed" },

	// Server errors
	InternalServerError: { code: 500, text: "Internal Server Error" },
	NotImplemented: { code: 501, text: "Not Implemented" },
	BadGateway: { code: 502, text: "Bad Gateway" },
	ServiceUnavailable: { code: 503, text: "Service Unavailabe" },
	GatewayTimeout: { code: 504, text: "Gateway Timeout" },
};

/**
 * API Error Constructor
 */
export class API_ERROR extends Error {
	/**
	 *
	 * @param {number} code - integer value between 100-599 specifying the error type
	 * @param {string} statusText - brief error message for the error code
	 * @param {string} details - description
	 */
	constructor(code, statusText = undefined, details = ``) {
		super(details);
		this.code = code;
		this.statusText = statusText;
	}

	set code(value) {
		// GUARD: code is a number and an integer.
		if (typeof value != "number" || !Number.isInteger(value)) {
			this._code = API_STATUS_CODES.InternalServerError;
			return;
		}

		// GUARD: code is within the range 100-599.
		if (value < 100 || value > 599) {
			this._code = API_STATUS_CODES.InternalServerError;
			return;
		}

		this._code = value;
	}

	get code() {
		return this._code;
	}

	set statusText(value) {
		this._statusText = value;
	}

	get statusText() {
		return this._statusText;
	}

	get details() {
		return this.message;
	}
}

import EXPRESS from "express";
import DOTENV from "dotenv";

// Load .env variables
DOTENV.config();

const server = EXPRESS();
const PORT_NUMBER = process.env.PORT_NUMBER || 9090;

// start server
server.listen(PORT_NUMBER, () => {
	console.log(`Server running on port: ${PORT_NUMBER}`);
});

// set base API route
server.get("/", (request, response) => {
	response.status(200);
	response.json(`API is active`);
});

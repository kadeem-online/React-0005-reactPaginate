import EXPRESS from "express";
import DOTENV from "dotenv";

// Load .env variables
DOTENV.config();

const server = EXPRESS();
server.listen(process.env.PORT_NUMBER || 9090, () => {
	console.log("Server running");
});

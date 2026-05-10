const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const chatRoutes = require("./routes/chatRoutes");
const dataRoutes = require("./routes/dataRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "Rural Helpdesk API is running." });
});

app.use("/api", dataRoutes);
app.use("/api", chatRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    error: "Internal server error",
    message: "Something went wrong. Please try again.",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

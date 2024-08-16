import express from "express";
import cors from "cors";
import { config } from "dotenv";
import morgan from "morgan";

config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/api", (req, res) => {
  res.json({
    message:
      "Welcome To MERN CI/CD Pipeline with Github Actions, Hello From API",
    purpose:
      "This is a simple API to demonstrate CI/CD pipeline with Github Actions for a MERN stack application",
  });
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server is running live on: http://localhost:${port}`);
});

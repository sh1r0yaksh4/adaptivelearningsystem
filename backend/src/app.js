import express, {Router} from "express";
import cors from "cors";
import dotenv from "dotenv";
import questionRoutes from "./routes/question.js"

dotenv.config();



const app = express();



const corsOptions = {
  origin: process.env.ML_SERVICE_URL,
  optionsSuccessStatus: 200 
};

app.use(cors(corsOptions))
app.use(express.json());
app.use('/question', questionRoutes);





export default app;

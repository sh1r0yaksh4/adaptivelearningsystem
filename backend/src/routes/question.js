import {Router} from "express";
import dotenv from "dotenv";
import path from "path";
import { predict_next_difficulty } from "../services/ml.service.js";
dotenv.config();

const router = Router();

router.get('/', (req, res) => { 
    res.send("what is your name");
})

router.post('/submit',  async (req,res) => { 
    const features = req.body;


    const result = await predict_next_difficulty(features)
    res.send(result);


})
export default router;

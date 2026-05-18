import {Router} from "express";


const router = Router();

router.get('/login', (req, res) => { 
    res.send("login success");
})


export default router;

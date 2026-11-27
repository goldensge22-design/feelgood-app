import { Router, type IRouter } from "express";
import healthRouter from "./health";
import nuviaRouter from "./nuvia";

const router: IRouter = Router();

router.use(healthRouter);
router.use(nuviaRouter);

export default router;

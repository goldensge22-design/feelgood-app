import { Router, type IRouter } from "express";
import healthRouter from "./health";
import careerRouter from "./career";
import careerAiRouter from "./career-ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(careerRouter);
router.use(careerAiRouter);

export default router;

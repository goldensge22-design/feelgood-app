import { Router, type IRouter } from "express";
import healthRouter from "./health";
import careerRouter from "./career";
import careerAiRouter from "./career-ai";
import careerLabRouter from "./career-lab";
import reviewStoryRouter from "./review-story";

const router: IRouter = Router();

router.use(healthRouter);
router.use(careerRouter);
router.use(careerAiRouter);
router.use(careerLabRouter);
router.use(reviewStoryRouter);

export default router;

import { Router } from 'express';
import { listCategories, listProducts, getProductById, serveImage } from '../controllers/productsController';

const router = Router();

router.get('/categories', listCategories);
router.get('/products', listProducts);
router.get('/products/:id', getProductById);
router.get('/images/:imageId', serveImage);

export default router;

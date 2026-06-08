import { Router } from 'express';
import {
  getProducts, getProductById, getProductByBarcode,
  createProduct, updateProduct, deleteProduct,
  uploadProductImage, getCategories, createCategory,
  createVariant, updateVariant, deleteVariant,
  splitVariantToRental,
} from '../controllers/productController';
import { authenticate } from '../middleware/auth';
import { requireManagerOrAbove, requireStaffOrAbove } from '../middleware/roles';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticate);

// Categories
router.get('/categories', getCategories);
router.post('/categories', requireManagerOrAbove, createCategory);

// Products
router.get('/', getProducts);
router.get('/barcode/:barcode', getProductByBarcode);
router.get('/:id', getProductById);
router.post('/', requireManagerOrAbove, createProduct);
router.put('/:id', requireManagerOrAbove, updateProduct);
router.delete('/:id', requireManagerOrAbove, deleteProduct);

// Images
router.post('/:id/images', requireManagerOrAbove, upload.single('image'), uploadProductImage);

// Variants
router.post('/:id/variants', requireManagerOrAbove, createVariant);
router.post('/:id/variants/:variantId/split-to-rental', requireManagerOrAbove, splitVariantToRental);
router.put('/:id/variants/:variantId', requireManagerOrAbove, updateVariant);
router.delete('/:id/variants/:variantId', requireManagerOrAbove, deleteVariant);

export default router;

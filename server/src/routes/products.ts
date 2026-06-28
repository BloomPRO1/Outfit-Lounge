import { Router } from 'express';
import {
  getProducts, getProductById, getProductByBarcode,
  createProduct, updateProduct, deleteProduct,
  uploadProductImage, deleteProductImage, setProductImagePrimary,
  getCategories, createCategory,
  createVariant, updateVariant, deleteVariant,
  splitVariantToRental, serveProductImage,
} from '../controllers/productController';
import { authenticate } from '../middleware/auth';
import { requireManagerOrAbove, requireCashierOrAbove, requireStaffOrAbove } from '../middleware/roles';
import { upload } from '../middleware/upload';

const router = Router();

// Public image endpoint — no auth (product photos are not sensitive)
router.get('/:id/image', serveProductImage);

router.use(authenticate);

// Categories
router.get('/categories', getCategories);
router.post('/categories', requireCashierOrAbove, createCategory);

// Products
router.get('/', getProducts);
router.get('/barcode/:barcode', getProductByBarcode);
router.get('/:id', getProductById);
router.post('/', requireCashierOrAbove, createProduct);
router.put('/:id', requireCashierOrAbove, updateProduct);
router.delete('/:id', requireManagerOrAbove, deleteProduct);

// Images
router.post('/:id/images', requireCashierOrAbove, upload.single('image'), uploadProductImage);
router.delete('/:id/images/:imageId', requireManagerOrAbove, deleteProductImage);
router.patch('/:id/images/:imageId/primary', requireCashierOrAbove, setProductImagePrimary);

// Variants
router.post('/:id/variants', requireCashierOrAbove, createVariant);
router.post('/:id/variants/:variantId/split-to-rental', requireCashierOrAbove, splitVariantToRental);
router.put('/:id/variants/:variantId', requireCashierOrAbove, updateVariant);
router.delete('/:id/variants/:variantId', requireManagerOrAbove, deleteVariant);

export default router;

import { Router } from 'express';
import {
  listAdminContactSubmissions,
  markContactSubmissionRead,
  deleteContactSubmission,
} from '../controllers/adminContactController';
import { authenticateAdmin } from '../middleware/adminAuth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use('/admin/contact-submissions', authenticateAdmin);
router.get('/admin/contact-submissions', asyncHandler(listAdminContactSubmissions));
router.patch('/admin/contact-submissions/:id/read', asyncHandler(markContactSubmissionRead));
router.delete('/admin/contact-submissions/:id', asyncHandler(deleteContactSubmission));

export default router;

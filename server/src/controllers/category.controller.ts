import type { Request, Response } from 'express';
import * as categoryService from '../services/category.service.js';
import { sendSuccess } from '../utils/response.js';
import { getParam } from '../utils/params.js';

export async function list(_req: Request, res: Response) {
  const categories = await categoryService.listCategories();
  sendSuccess(res, { categories });
}

export async function update(req: Request, res: Response) {
  const category = await categoryService.updateCategory(req.user!.sub, getParam(req, 'slug'), req.body);
  sendSuccess(res, { category });
}

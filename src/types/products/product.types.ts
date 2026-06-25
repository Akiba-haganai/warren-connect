// src/types/products/product.types.ts
import type { Tables } from '../database/database.types';

// This automatically extracts the exact row shape from your database schema!
export type Product = Tables<'products'>;
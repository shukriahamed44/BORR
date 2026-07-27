/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Data Transfer Object (DTO) for updating equipment product details.
 * Extends `@nestjs/swagger` `PartialType(CreateProductDto)` to make all product creation fields optional
 * while retaining input validation rules and OpenAPI schema documentation.
 *
 * IN SIMPLE WORDS:
 * Allows updating any equipment field (name, description, price, or stock) without requiring all fields to be resubmitted.
 */

import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}

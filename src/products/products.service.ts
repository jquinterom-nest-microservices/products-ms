import { PrismaClient } from 'generated/prisma'; // import PrismaClient from @prisma/client
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PaginationDto } from 'src/common';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to database');
  }

  create(createProductDto: CreateProductDto) {
    return this.product.create({
      data: createProductDto,
    });
  }

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const total = await this.product.count({ where: { available: true } });
    const lastPage = Math.ceil(total / limit);

    if (page > total) {
      throw new Error(`Page ${page} is out of range`);
    }

    return {
      data: await this.product.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: { available: true },
      }),
      meta: {
        total,
        page,
        lastPage,
      },
    };
  }

  async findOne(id: number) {
    const data = await this.product.findUnique({
      where: { id, available: true },
    });

    if (!data) {
      throw new RpcException({
        message: `Product with id #${id} not found`,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return { data };
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const { id: _, ...data } = updateProductDto;
    await this.findOne(id);

    return this.product.update({
      where: { id },
      data: data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    const product = await this.product.update({
      where: { id },
      data: { available: false },
    });

    return product;
  }

  async validateProducts(ids: number[]) {
    const newIds = Array.from(new Set(ids));

    const products = await this.product.findMany({
      where: { id: { in: newIds }, available: true },
    });

    if (products.length !== ids.length) {
      throw new RpcException({
        message: 'Some products are not available',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return products;
  }
}

import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Tenant } from './tenant.entity';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({
    status: 201,
    description: 'The tenant has been successfully created.',
    type: Tenant,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tenants' })
  @ApiResponse({
    status: 200,
    description: 'Return all tenants',
    type: [Tenant],
  })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tenant by id' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the tenant',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Return the tenant',
    type: Tenant,
  })
  @ApiResponse({ status: 404, description: 'Tenant not found.' })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tenant' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the tenant',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'The tenant has been successfully updated.',
    type: Tenant,
  })
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantsService.update(id, updateTenantDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tenant' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the tenant',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 204, description: 'The tenant has been successfully deleted.' })
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }
}
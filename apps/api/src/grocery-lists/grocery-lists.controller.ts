import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GenerateGroceryListDto } from './dto/generate-grocery-list.dto';
import { GroceryListsService } from './grocery-lists.service';
import { GroceryListExportResponse, GroceryListResponse } from './grocery-lists.types';

@ApiTags('grocery-lists')
@Controller('grocery-lists')
export class GroceryListsController {
  constructor(private readonly groceryListsService: GroceryListsService) {}

  @Post(':userId/from-menu')
  @ApiCreatedResponse({ description: 'Generated grocery list from selected dishes.' })
  generateFromMenu(
    @Param('userId') userId: string,
    @Body() dto: GenerateGroceryListDto,
  ): Promise<GroceryListResponse> {
    return this.groceryListsService.generateFromMenu(userId, dto);
  }

  @Get(':listId')
  @ApiOkResponse({ description: 'Grocery list with merged ingredients.' })
  getGroceryList(@Param('listId') listId: string): Promise<GroceryListResponse> {
    return this.groceryListsService.getGroceryList(listId);
  }

  @Get(':listId/export')
  @ApiOkResponse({ description: 'Plain text grocery list export.' })
  exportGroceryList(@Param('listId') listId: string): Promise<GroceryListExportResponse> {
    return this.groceryListsService.exportGroceryList(listId);
  }
}

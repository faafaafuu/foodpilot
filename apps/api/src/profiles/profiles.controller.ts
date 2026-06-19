import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AddPreferenceDto } from './dto/add-preference.dto';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PreferenceResponse, ProfileResponse } from './profile-response';
import { ProfilesService } from './profiles.service';

@ApiTags('profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Created or updated a user profile.' })
  createProfile(@Body() dto: CreateProfileDto): Promise<ProfileResponse> {
    return this.profilesService.createProfile(dto);
  }

  @Get(':userId')
  @ApiOkResponse({ description: 'User profile with taste memory.' })
  getProfile(@Param('userId') userId: string): Promise<ProfileResponse> {
    return this.profilesService.getProfile(userId);
  }

  @Patch(':userId')
  @ApiOkResponse({ description: 'Updated user profile.' })
  updateProfile(
    @Param('userId') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    return this.profilesService.updateProfile(userId, dto);
  }

  @Get(':userId/tastes')
  @ApiOkResponse({ description: 'User taste memory.' })
  getTastes(@Param('userId') userId: string): Promise<ProfileResponse['tastes']> {
    return this.profilesService.getTastes(userId);
  }

  @Post(':userId/favorite-dishes')
  @ApiCreatedResponse({ description: 'Added or updated a favorite dish.' })
  addFavoriteDish(
    @Param('userId') userId: string,
    @Body() dto: AddPreferenceDto,
  ): Promise<PreferenceResponse> {
    return this.profilesService.addFavoriteDish(userId, dto);
  }

  @Post(':userId/disliked-products')
  @ApiCreatedResponse({ description: 'Added or updated a disliked product.' })
  addDislikedProduct(
    @Param('userId') userId: string,
    @Body() dto: AddPreferenceDto,
  ): Promise<PreferenceResponse> {
    return this.profilesService.addDislikedProduct(userId, dto);
  }
}

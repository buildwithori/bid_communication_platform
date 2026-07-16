import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { User, UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AdminDashboardRecentQueryDto } from "./dto/admin-dashboard-query.dto";
import { DashboardsService } from "./dashboards.service";

@ApiTags("dashboards")
@Controller("dashboards")
export class DashboardsController {
  constructor(private readonly dashboards: DashboardsService) {}

  @Get("admin")
  @Roles(UserRole.admin)
  adminDashboard() {
    return this.dashboards.adminDashboard();
  }

  @Get("admin/recent-entrepreneurs")
  @Roles(UserRole.admin)
  adminRecentEntrepreneurs(@Query() query: AdminDashboardRecentQueryDto) {
    return this.dashboards.adminRecentEntrepreneurs(query);
  }

  @Get("trainer")
  @Roles(UserRole.trainer)
  trainerDashboard(@CurrentUser() user: User) {
    return this.dashboards.trainerDashboard(user);
  }

  @Get("entrepreneur")
  @Roles(UserRole.entrepreneur)
  entrepreneurDashboard(@CurrentUser() user: User) {
    return this.dashboards.entrepreneurDashboard(user);
  }
}

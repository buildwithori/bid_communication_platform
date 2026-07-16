import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { User, UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import {
  CreateReportExportDto,
  OverdueUpdatesQueryDto,
  ReportingOverviewQueryDto,
  SendReportingReminderDto,
} from "./dto/reporting-query.dto";
import { ReportExportService } from "./report-export.service";
import { ReportingService } from "./reporting.service";

@ApiTags("reporting")
@Controller("reporting")
@Roles(UserRole.admin)
export class ReportingController {
  constructor(
    private readonly reporting: ReportingService,
    private readonly exports: ReportExportService,
  ) {}

  @Get("overview")
  overview(@Query() query: ReportingOverviewQueryDto) {
    return this.reporting.overview(query);
  }

  @Get("overdue-updates")
  overdueUpdates(@Query() query: OverdueUpdatesQueryDto) {
    return this.reporting.overdueUpdates(query);
  }

  @Post("overdue-updates/:entrepreneurUserId/reminder")
  sendReminder(
    @CurrentUser() user: User,
    @Param("entrepreneurUserId") entrepreneurUserId: string,
    @Body() dto: SendReportingReminderDto,
  ) {
    return this.reporting.sendReminder(user, entrepreneurUserId, dto);
  }

  @Post("exports")
  createExport(@CurrentUser() user: User, @Body() dto: CreateReportExportDto) {
    return this.exports.create(user, dto);
  }

  @Get("exports/:id")
  getExport(@CurrentUser() user: User, @Param("id") id: string) {
    return this.exports.get(user, id);
  }

  @Get("exports/:id/download")
  downloadExport(@CurrentUser() user: User, @Param("id") id: string) {
    return this.exports.download(user, id);
  }
}

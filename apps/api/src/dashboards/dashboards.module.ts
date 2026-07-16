import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { DashboardsController } from "./dashboards.controller";
import { DashboardsService } from "./dashboards.service";

@Module({
  imports: [DatabaseModule],
  controllers: [DashboardsController],
  providers: [DashboardsService],
})
export class DashboardsModule {}

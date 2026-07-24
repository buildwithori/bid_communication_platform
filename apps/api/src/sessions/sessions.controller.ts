import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CreateSessionDto } from "./dto/create-session.dto";
import {
  AddSessionNoteDto,
  CompleteSessionDto,
  RescheduleSessionDto,
  SessionReasonDto,
} from "./dto/session-action.dto";
import { SessionQueryDto } from "./dto/session-query.dto";
import {
  SessionAvailabilityQueryDto,
  SessionTeamMemberQueryDto,
} from "./dto/session-availability.dto";
import { SessionAvailabilityService } from "./session-availability.service";
import { SessionsService } from "./sessions.service";

@ApiTags("sessions")
@Controller("sessions")
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly availabilityService: SessionAvailabilityService,
  ) {}

  @Get()
  listSessions(@CurrentUser() user: User, @Query() query: SessionQueryDto) {
    return this.sessionsService.listSessions(user, query);
  }

  @Get("summary")
  summary(@CurrentUser() user: User) {
    return this.sessionsService.summary(user);
  }

  @Get("team-members")
  listTeamMembers(@Query() query: SessionTeamMemberQueryDto) {
    return this.availabilityService.listTeamMembers(query);
  }

  @Get("availability")
  async getAvailability(
    @CurrentUser() user: User,
    @Query() query: SessionAvailabilityQueryDto,
  ) {
    const timezone = await this.availabilityService.resolveTimezone(
      user.timezone,
    );
    return this.availabilityService.getAvailability({ ...query, timezone });
  }

  @Get(":id")
  getSession(@CurrentUser() user: User, @Param("id") id: string) {
    return this.sessionsService.getSession(user, id);
  }

  @Post()
  createSession(@CurrentUser() user: User, @Body() dto: CreateSessionDto) {
    return this.sessionsService.createSession(user, dto);
  }

  @Post(":id/accept")
  acceptSession(@CurrentUser() user: User, @Param("id") id: string) {
    return this.sessionsService.acceptSession(user, id);
  }

  @Post(":id/decline")
  declineSession(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: SessionReasonDto,
  ) {
    return this.sessionsService.declineSession(user, id, dto);
  }

  @Post(":id/cancel")
  cancelSession(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: SessionReasonDto,
  ) {
    return this.sessionsService.cancelSession(user, id, dto);
  }

  @Patch(":id/reschedule")
  rescheduleSession(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: RescheduleSessionDto,
  ) {
    return this.sessionsService.rescheduleSession(user, id, dto);
  }

  @Post(":id/complete")
  completeSession(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: CompleteSessionDto,
  ) {
    return this.sessionsService.completeSession(user, id, dto);
  }

  @Post(":id/notes")
  addNote(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: AddSessionNoteDto,
  ) {
    return this.sessionsService.addNote(user, id, dto);
  }
}

import * as React from "react";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport } from "nodemailer";
import { render, toPlainText } from "react-email";
import { Resend } from "resend";
import { IntegrationLoggerService } from "../common/observability/integration-logger.service";

export type EmailMessage = {
  to: string | string[];
  subject: string;
  template: React.ReactElement;
};

@Injectable()
export class EmailService {
  constructor(
    private readonly config: ConfigService,
    private readonly integration: IntegrationLoggerService,
  ) {}

  appUrl(path = "") {
    const root = this.config
      .getOrThrow<string>("APP_WEB_URL")
      .replace(/\/$/, "");
    if (!path) return root;
    return root + (path.startsWith("/") ? path : "/" + path);
  }

  logoUrl() {
    return this.appUrl("/bid-logo.png");
  }

  async renderTemplate(template: React.ReactElement) {
    const html = await render(template);
    return { html, text: toPlainText(html) };
  }

  async send(message: EmailMessage) {
    const { html, text } = await this.renderTemplate(message.template);
    const from = this.config.getOrThrow<string>("MAIL_FROM");

    if (this.config.get<string>("EMAIL_TRANSPORT") === "resend") {
      const apiKey = this.config.get<string>("RESEND_API_KEY");
      if (!apiKey)
        throw new ServiceUnavailableException(
          "Production email delivery is not configured.",
        );
      return this.integration.trackOutbound(
        { provider: "resend", operation: "email.send", method: "POST" },
        async () => {
          const result = await new Resend(apiKey).emails.send({
            from,
            to: message.to,
            subject: message.subject,
            html,
            text,
          });
          if (result.error)
            throw new ServiceUnavailableException("Email delivery failed.");
          return result.data;
        },
      );
    }

    const transport = createTransport({
      host: this.config.getOrThrow<string>("SMTP_HOST"),
      port: this.config.getOrThrow<number>("SMTP_PORT"),
      secure: false,
    });
    return this.integration.trackOutbound(
      { provider: "smtp", operation: "email.send" },
      () =>
        transport.sendMail({
          from,
          to: message.to,
          subject: message.subject,
          html,
          text,
        }),
    );
  }
}

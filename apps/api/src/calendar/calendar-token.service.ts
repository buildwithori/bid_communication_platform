import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

@Injectable()
export class CalendarTokenService {
  constructor(private readonly config: ConfigService) {}

  encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key(), iv);
    const encrypted = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);
    return [
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      encrypted.toString("base64url"),
    ].join(".");
  }

  decrypt(value: string) {
    const [ivValue, tagValue, encryptedValue] = value.split(".");
    if (!ivValue || !tagValue || !encryptedValue) {
      throw new ServiceUnavailableException(
        "Stored calendar credentials are invalid.",
      );
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key(),
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }

  private key() {
    const secret = this.config.get<string>("CALENDAR_TOKEN_ENCRYPTION_KEY");
    if (!secret) {
      throw new ServiceUnavailableException(
        "Calendar token encryption is not configured.",
      );
    }
    return createHash("sha256").update(secret).digest();
  }
}

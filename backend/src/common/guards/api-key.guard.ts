import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const validKey = this.config.get<string>('API_KEY');

    if (!validKey || apiKey !== validKey) {
      throw new UnauthorizedException('API key inválida o ausente');
    }
    return true;
  }
}

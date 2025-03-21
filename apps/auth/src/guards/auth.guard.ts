// import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { Observable } from 'rxjs';
// import { AuthService } from '../modules/auth/auth.service';
// import { UserRole } from '../modules/user/entities/user.entity';
// import { ErrorResponse } from '../libs/response.lib';
// import { RpcException } from '@nestjs/microservices';
// import { JwtService } from '@nestjs/jwt';

// @Injectable()
// export class AuthGuard implements CanActivate {
//   constructor(
//     private readonly reflector: Reflector,
//     private readonly authService: AuthService,
//     private readonly jwtService: JwtService,
//   ) {}

//   async canActivate(
//     context: ExecutionContext,
//   ): Promise<boolean | Observable<boolean>> {
//     const roles = this.reflector.get<UserRole[]>('roles', context.getHandler()); // 从 @AuthGuard([]) 中拿
//     if (!roles) {
//       return true;
//     }

//     const ctx = context.switchToHttp();
//     const request = ctx.getRequest();
//     const auth_token =
//       request.headers['authorization'] || request.headers['Authorization'];

//     if (!auth_token) {
//       const errorResponse: ErrorResponse = {
//         code: 'AUTHORIZATION_HEADER_MISSING',
//         message: 'Authorization header is missing',
//         details: {},
//       };
//       throw new RpcException(errorResponse);
//     }

//     try {
//       const decoded = await this.jwtService.verifyAsync(auth_token as string);
//       const userRole = decoded.role as UserRole;
//       return roles.includes(userRole);
//     } catch (error) {
//       const errorResponse: ErrorResponse = {
//         code: 'INVALID_TOKEN',
//         message: 'Invalid token',
//         details: {
//           code: error.code || 'Unknown',
//           error: (error as Error).message || 'No message available',
//         },
//       };
//       throw new RpcException(errorResponse);
//     }
//   }
// }

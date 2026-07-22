import { SetMetadata } from '@nestjs/common';
import { PUBLIC_ROUTE_KEY } from './jwt-auth.guard';

/** Marks a route as not requiring a valid access token (e.g. login, register, health). */
export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);

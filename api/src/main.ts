// Load .env from project root early so process.env values are available when running from the api folder
import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') })
import { NestFactory } from '@nestjs/core'
import { AppModule } from './modules/app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('')
  // enable CORS - allow origin from env or default to the frontend dev origin
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    // include custom headers used by the frontend (x-user-id for dev-mode user identification)
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-User-Id', 'x-user-id', 'X-Secrets-Token', 'x-secrets-token'],
  })
  const port = process.env.API_PORT || 4000
  await app.listen(port)
  console.log(`API listening on http://localhost:${port}`)
}

bootstrap()

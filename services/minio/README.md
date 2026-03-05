# MinIO Storage Service

This folder contains the service scaffolding for the cloud storage provider backed by MinIO.

The intended design:

- Create per-user buckets in MinIO
- Track per-user used bytes in the API database (see `StorageUsage` entity)
- Enforce quota (`USER_STORAGE_QUOTA_BYTES` in `.env`)

See `api/src/services/minioService.ts` for the integration helper used by the API.

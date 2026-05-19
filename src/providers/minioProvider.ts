import 'multer';
import { minioClient } from "../config/minio";
import { randomUUID } from "crypto";

const BUCKET = process.env.MINIO_BUCKET!;

export async function uploadImage(file: Express.Multer.File, folder: string = "media") {
  const ext = file.originalname.split(".").pop();
  const objectName = `${folder}/${randomUUID()}.${ext}`;

  await minioClient.putObject(
    BUCKET,
    objectName,
    file.buffer,
    file.size,
    { "Content-Type": file.mimetype }
  );

  return objectName;
}

export async function uploadBuffer(buffer: Buffer, mimetype: string, folder: string = "qr-codes") {
  const ext = mimetype.split("/").pop();
  const objectName = `${folder}/${randomUUID()}.${ext}`;

  await minioClient.putObject(
    BUCKET,
    objectName,
    buffer,
    buffer.length,
    { "Content-Type": mimetype }
  );

  return objectName;
}

export async function uploadLocalFile(filePath: string, mimetype: string, folder: string = "bundles") {
  const ext = filePath.split(".").pop();
  const objectName = `${folder}/${randomUUID()}.${ext}`;

  try {
    const exists = await minioClient.bucketExists(BUCKET);
    if (!exists) {
      await minioClient.makeBucket(BUCKET);
      console.log(`Bucket '${BUCKET}' created successfully.`);
    }
  } catch (err: any) {
    // If we get an error here, it could be Access Denied for bucket creation/checking.
    // We will log it but continue to let fPutObject throw the true error.
    console.warn(`Bucket check/create failed: ${err.message}`);
  }

  await minioClient.fPutObject(
    BUCKET,
    objectName,
    filePath,
    { "Content-Type": mimetype }
  );


  const protocol = process.env.MINIO_USE_SSL === "true" ? "https" : "http";
  const port = process.env.MINIO_PORT ? `:${process.env.MINIO_PORT}` : '';
  const minioUrl = `${protocol}://${process.env.MINIO_ENDPOINT}${port}/${BUCKET}/${objectName}`;

  return { objectName, minioUrl };
}

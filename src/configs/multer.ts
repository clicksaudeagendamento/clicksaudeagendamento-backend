import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { BadRequestException } from '@nestjs/common';
import * as path from 'path';

export const multerOptions = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueName = `${uuid()}${extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new BadRequestException('Only images and PDFs are allowed'),
        false,
      );
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
};

const allowed = [
  '.jpg',
  '.jpeg',
  '.png',
  '.pdf',
  '.docx',
  '.xlsx',
  '.txt',
  '.mp4',
  '.3gp',
  '.mp3',
  '.ogg',
];

const allowedMimeTypes: string[] = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'video/mp4',
  'video/3gpp',
  'audio/mpeg',
  'audio/ogg',
];

const MAX_SIZE_BY_TYPE: Record<string, number> = {
  image: 10 * 1024 * 1024, // 10MB
  video: 64 * 1024 * 1024, // 64MB
  document: 10 * 1024 * 1024, // 10MB
  audio: 10 * 1024 * 1024, // 10MB
};

export function validateFile(file: Express.Multer.File) {
  const ext = path.extname(file.originalname).toLowerCase();
  const base = path.basename(file.originalname);

  // Reject suspicious paths
  if (file.originalname.includes('..') || base !== file.originalname) {
    throw new BadRequestException(
      'Suspicious file name or path is not allowed.',
    );
  }

  if (!allowed.includes(ext)) {
    throw new BadRequestException(`Extension ${ext} is not allowed.`);
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new BadRequestException(
      `Mimetype ${file.mimetype} is not allowed for extension ${ext}.`,
    );
  }

  const size = file.size;
  const type = getMediaTypeFromExtension(ext);
  const maxSize = MAX_SIZE_BY_TYPE[type];
  if (size > maxSize) {
    throw new BadRequestException(
      `File too large. Max allowed for ${type}: ${maxSize / (1024 * 1024)} MB`,
    );
  }
}

function getMediaTypeFromExtension(
  ext: string,
): 'image' | 'video' | 'document' | 'audio' {
  if (['.jpg', '.jpeg', '.png'].includes(ext)) return 'image';
  if (['.mp4', '.3gp'].includes(ext)) return 'video';
  if (['.pdf', '.docx', '.xlsx', '.txt'].includes(ext)) return 'document';
  if (['.mp3', '.ogg'].includes(ext)) return 'audio';
  return 'document';
}

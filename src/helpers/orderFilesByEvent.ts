export interface CategorizedFiles {
  altasFiles: Express.Multer.File[];
  bajasFiles: Express.Multer.File[];
  cambiosFiles: Express.Multer.File[];
}

const categorized: CategorizedFiles = {
  altasFiles: [],
  bajasFiles: [],
  cambiosFiles: [],
}

export const categorizeFilesWL = (files: Express.Multer.File[]): CategorizedFiles => {

  files?.forEach((file) => {
    if (file.originalname.includes('altas')) categorized.altasFiles.push(file);
    else if (file.originalname.includes('bajas')) categorized.bajasFiles.push(file);
    else if (file.originalname.includes('cambios')) categorized.cambiosFiles.push(file);
  });

  return categorized
}


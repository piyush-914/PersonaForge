import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

export const readFileSchema = z.object({
  filePath: z.string(),
});

export type ReadFileArgs = z.infer<typeof readFileSchema>;

export async function readFile(args: ReadFileArgs) {
  const { filePath } = args;

  // For security, we should restrict file access.
  // We'll assume files are in a specific 'uploads' or 'data' directory.
  // For this sandbox, we'll allow reading from the project root but with caution.
  
  const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const absolutePath = path.join(process.cwd(), safePath);

  try {
    // Check if file exists
    await fs.access(absolutePath);
    const stats = await fs.stat(absolutePath);
    
    if (!stats.isFile()) {
      throw new Error('Requested path is not a file.');
    }

    // Limit file size to 1MB
    if (stats.size > 1024 * 1024) {
      throw new Error('File is too large to read (max 1MB).');
    }

    const content = await fs.readFile(absolutePath, 'utf8');
    return content;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return `File not found: ${filePath}`;
    }
    return `Error reading file: ${error.message}`;
  }
}

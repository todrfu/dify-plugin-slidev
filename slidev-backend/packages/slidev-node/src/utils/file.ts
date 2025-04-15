import * as fs from 'fs'
import { promisify } from 'util'
const mkdirPromise = promisify(fs.mkdir)
const existsPromise = promisify(fs.exists)
const rmdirPromise = promisify(fs.rmdir)

/**
 * 确保目录存在
 * @param dir 目录路径
 */
export const ensureDirectoryExists = async (dir: string): Promise<void> => {
  const exists = await existsPromise(dir)
  if (!exists) {
    await mkdirPromise(dir, { recursive: true })
  }
}

/**
 * 删除目录及文件
 * @param dirs 目录列表
 */
export const deleteDir = async (dirs: string[] = []): Promise<void> => {
  try {
    for (const dir of dirs) {
      if (await existsPromise(dir)) {
        await rmdirPromise(dir, { recursive: true });
      }
    }
  } catch (error) {
    console.error('删除失败:', error);
  }
}

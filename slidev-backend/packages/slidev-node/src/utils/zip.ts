import * as fs from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';

/**
 * ZIP 压缩工具类
 */
export class ZipUtil {
  /**
   * 压缩目录内的文件到 ZIP
   * @param sourceDir 源目录
   * @param zipFile 目标 ZIP 文件路径
   * @param filter 可选的文件过滤函数
   * @returns 压缩后的文件 Buffer
   */
  public static async compressDirectory(
    sourceDir: string,
    zipFile: string,
    filter?: (fileName: string) => boolean,
  ): Promise<Buffer> {
    // 创建一个文件写入流
    const output = fs.createWriteStream(zipFile);
    const archive = archiver('zip', {
      zlib: { level: 9 } // 设置压缩级别
    });

    // 监听错误事件
    archive.on('error', (err) => {
      throw err;
    });

    // 将存档管道传输到文件
    archive.pipe(output);

    // 获取源目录下的所有文件
    const files = await fs.promises.readdir(sourceDir);

    // 检查目录是否为空
    if (files.length === 0) {
      throw new Error(`目录为空: ${sourceDir}`);
    }

    // 跟踪添加到 zip 中的文件数量
    let addedFiles = 0;

    // 将所有匹配的文件添加到zip中
    for (const file of files) {
      if (!filter || filter(file)) {
        const filePath = path.join(sourceDir, file);
        const stat = await fs.promises.stat(filePath);

        if (stat.isFile()) {
          archive.file(filePath, { name: file });
          addedFiles++;
        }
      }
    }

    // 检查是否有文件被添加到 zip 中
    if (addedFiles === 0) {
      throw new Error(`没有符合条件的文件被添加到 zip 中: ${sourceDir}`);
    }

    // 完成归档
    await archive.finalize();

    // 等待流完成
    await new Promise<void>((resolve) => {
      output.on('close', () => {
        resolve();
      });
    });

    // 返回 zip 文件的 buffer
    return await fs.promises.readFile(zipFile);
  }
}

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { ZipUtil } from '../../src/utils/zip';

const writeFilePromise = promisify(fs.writeFile);
const mkdirPromise = promisify(fs.mkdir);
const unlinkPromise = promisify(fs.unlink);
const rmdirPromise = promisify(fs.rmdir);
const existsPromise = promisify(fs.exists);

describe('ZipUtil', () => {
  const testDir = path.join(__dirname, 'test-temp');
  const zipFile = path.join(testDir, 'test.zip');

  beforeEach(async () => {
    if (!(await existsPromise(testDir))) {
      await mkdirPromise(testDir, { recursive: true });
    }

    await writeFilePromise(path.join(testDir, 'file1.txt'), 'Content of file 1');
    await writeFilePromise(path.join(testDir, 'file2.txt'), 'Content of file 2');
    await writeFilePromise(path.join(testDir, 'image.png'), 'Mock image content');

    // 创建一个子目录
    const subDir = path.join(testDir, 'subdir');
    if (!(await existsPromise(subDir))) {
      await mkdirPromise(subDir, { recursive: true });
    }

    // 在子目录中创建一些文件
    await writeFilePromise(path.join(subDir, 'subfile1.txt'), 'Content of subfile 1');
    await writeFilePromise(path.join(subDir, 'subfile2.json'), '{"test": "JSON content"}');
  });

  // 测试后清理环境
  afterEach(async () => {
    try {
      if (await existsPromise(zipFile)) {
        await unlinkPromise(zipFile);
      }

      if (await existsPromise(testDir)) {
        const files = await fs.promises.readdir(testDir);
        for (const file of files) {
          const filePath = path.join(testDir, file);

          // 如果是目录，递归删除
          const stat = await fs.promises.stat(filePath);
          if (stat.isDirectory()) {
            await rmdirPromise(filePath, { recursive: true });
          } else {
            await unlinkPromise(filePath);
          }
        }

        await rmdirPromise(testDir, { recursive: true });
      }
    } catch (error) {
      console.error('清理测试环境失败:', error);
    }
  });

  it('应该能压缩目录中的所有文件', async () => {
    const buffer = await ZipUtil.compressDirectory(testDir, zipFile);

    // 验证返回的 buffer 不为空且有合理的大小
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(0);

    // 验证 zip 文件已经创建
    const zipExists = await existsPromise(zipFile);
    expect(zipExists).toBe(true);
  });

  it('应该能使用过滤器只压缩特定文件', async () => {
    // 只压缩 .txt 文件
    const filter = (fileName: string) => fileName.endsWith('.txt');

    const buffer = await ZipUtil.compressDirectory(testDir, zipFile, filter);

    // 验证返回的 buffer 不为空且有合理的大小
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(0);

    const zipExists = await existsPromise(zipFile);
    expect(zipExists).toBe(true);
  });

  it('当目录为空时应抛出错误', async () => {
    // 创建一个空目录
    const emptyDir = path.join(testDir, 'empty');
    if (!(await existsPromise(emptyDir))) {
      await mkdirPromise(emptyDir, { recursive: true });
    }

    await expect(ZipUtil.compressDirectory(emptyDir, zipFile))
      .rejects
      .toThrow('目录为空');
  });

  it('过滤后没有匹配文件时应抛出错误', async () => {
    // 使用一个不会匹配任何文件的过滤器
    const filter = (fileName: string) => fileName.endsWith('.non-existent-extension');

    // 验证抛出异常
    await expect(ZipUtil.compressDirectory(testDir, zipFile, filter))
      .rejects
      .toThrow('没有符合条件的文件');
  });

  it('应该能正确处理子目录中的文件', async () => {
    const subDir = path.join(testDir, 'subdir');

    const buffer = await ZipUtil.compressDirectory(subDir, zipFile);

    // 验证返回的 buffer 不为空且有合理的大小
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(0);

    // 检验 zip 文件已经创建
    const zipExists = await existsPromise(zipFile);
    expect(zipExists).toBe(true);
  });
});

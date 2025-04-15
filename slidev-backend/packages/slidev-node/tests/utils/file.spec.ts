import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { ensureDirectoryExists, deleteDir } from '../../src/utils/file';

const existsPromise = promisify(fs.exists);
const mkdirPromise = promisify(fs.mkdir);
const rmdirPromise = promisify(fs.rmdir);
const writeFilePromise = promisify(fs.writeFile);

describe('文件工具函数', () => {
  const testDir = path.join(__dirname, 'test-file-utils');
  const testSubDir = path.join(testDir, 'subdir');
  
  // 测试后清理环境
  afterEach(async () => {
    try {
      if (await existsPromise(testDir)) {
        await rmdirPromise(testDir, { recursive: true });
      }
    } catch (error) {
      console.error('清理测试环境失败:', error);
    }
  });

  describe('ensureDirectoryExists', () => {
    it('应该创建不存在的目录', async () => {
      // 确保目录不存在
      if (await existsPromise(testDir)) {
        await rmdirPromise(testDir, { recursive: true });
      }
      
      // 测试创建目录
      await ensureDirectoryExists(testDir);
      
      // 验证目录已创建
      const exists = await existsPromise(testDir);
      expect(exists).toBe(true);
    });

    it('如果目录已存在，应该不做任何改变', async () => {
      // 先创建目录
      if (!(await existsPromise(testDir))) {
        await mkdirPromise(testDir, { recursive: true });
      }
      
      // 在目录中创建一个测试文件
      const testFile = path.join(testDir, 'test.txt');
      await writeFilePromise(testFile, 'test content');
      
      // 调用确保目录存在的函数
      await ensureDirectoryExists(testDir);
      
      // 验证目录存在且文件仍然存在
      const dirExists = await existsPromise(testDir);
      const fileExists = await existsPromise(testFile);
      
      expect(dirExists).toBe(true);
      expect(fileExists).toBe(true);
    });
  });

  describe('deleteDir', () => {
    it('应该删除指定的目录', async () => {
      // 创建测试目录和子目录
      if (!(await existsPromise(testDir))) {
        await mkdirPromise(testDir, { recursive: true });
      }
      if (!(await existsPromise(testSubDir))) {
        await mkdirPromise(testSubDir, { recursive: true });
      }
      
      // 创建测试文件
      await writeFilePromise(path.join(testDir, 'test.txt'), 'test content');
      await writeFilePromise(path.join(testSubDir, 'subtest.txt'), 'subdir test content');
      
      // 删除目录
      await deleteDir([testDir]);
      
      // 验证目录已删除
      const exists = await existsPromise(testDir);
      expect(exists).toBe(false);
    });

    it('应该能处理多个目录', async () => {
      // 创建多个测试目录
      const testDir2 = path.join(__dirname, 'test-file-utils-2');
      
      if (!(await existsPromise(testDir))) {
        await mkdirPromise(testDir, { recursive: true });
      }
      if (!(await existsPromise(testDir2))) {
        await mkdirPromise(testDir2, { recursive: true });
      }
      
      // 删除多个目录
      await deleteDir([testDir, testDir2]);
      
      // 验证所有目录已删除
      const exists1 = await existsPromise(testDir);
      const exists2 = await existsPromise(testDir2);
      
      expect(exists1).toBe(false);
      expect(exists2).toBe(false);
    });

    it('应该能优雅处理不存在的目录', async () => {
      // 确保目录不存在
      const nonExistentDir = path.join(__dirname, 'non-existent-dir');
      if (await existsPromise(nonExistentDir)) {
        await rmdirPromise(nonExistentDir, { recursive: true });
      }
      
      // 尝试删除不存在的目录
      await expect(deleteDir([nonExistentDir])).resolves.not.toThrow();
    });

    it('应该能处理空数组输入', async () => {
      // 调用空数组
      await expect(deleteDir([])).resolves.not.toThrow();
    });

    it('应该能处理未提供参数', async () => {
      // 不提供参数
      await expect(deleteDir()).resolves.not.toThrow();
    });
  });
});
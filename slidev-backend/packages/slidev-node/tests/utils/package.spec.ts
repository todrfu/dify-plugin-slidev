import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { checkPackageInstalled, installPackage } from '../../src/utils/package';

// 模拟依赖项
jest.mock('fs');
jest.mock('child_process');

// 创建模拟函数
const mockReadFile = jest.fn();
// 正确设置 fs.readFile 模拟
jest.spyOn(fs, 'readFile').mockImplementation(mockReadFile);

const mockSpawn = jest.fn();
(spawn as unknown as jest.Mock) = mockSpawn;

describe('包管理工具函数', () => {
  const testClientDir = '/test/client/dir';

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
  });

  describe('checkPackageInstalled', () => {
    it('当包名以 . 开头（本地包）时，应该直接返回', async () => {
      // 准备
      const localPackage = './local-theme';

      // 执行
      await checkPackageInstalled(localPackage, testClientDir);

      // 验证
      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it('当包名以 / 开头（本地绝对路径包）时，应该直接返回', async () => {
      // 准备
      const localPackage = '/absolute/path/to/theme';

      // 执行
      await checkPackageInstalled(localPackage, testClientDir);

      // 验证
      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it('当包已安装时，应该成功完成检查', async () => {
      // 准备
      const packageName = '@slidev/theme-test';
      const packageJsonPath = path.join(testClientDir, 'node_modules', packageName, 'package.json');

      // 设置模拟读取成功 - 确保回调被调用
      mockReadFile.mockImplementation((filepath, callback) => {
        // 立即调用回调，不要等待
        setImmediate(() => callback(null, '{"name": "@slidev/theme-test"}'));
        return null;
      });

      // 执行
      await checkPackageInstalled(packageName, testClientDir);

      // 验证
      expect(mockReadFile).toHaveBeenCalledWith(
        packageJsonPath,
        expect.any(Function)
      );
    }, 10000); // 增加超时时间

    it('当包未安装时，应该抛出错误', async () => {
      // 准备
      const packageName = '@slidev/theme-missing';
      const packageJsonPath = path.join(testClientDir, 'node_modules', packageName, 'package.json');

      // 设置模拟读取失败 - 确保回调被调用
      mockReadFile.mockImplementation((filepath, callback) => {
        // 立即调用回调，不要等待
        setImmediate(() => callback(new Error('找不到文件'), null));
        return null;
      });

      // 执行 & 验证
      await expect(checkPackageInstalled(packageName, testClientDir))
        .rejects
        .toThrow(`"${packageName}" 未安装`);

      expect(mockReadFile).toHaveBeenCalledWith(
        packageJsonPath,
        expect.any(Function)
      );
    }, 10000); // 增加超时时间
  });

  describe('installPackage', () => {
    it('当包名以 . 开头（本地包）时，应该直接返回', async () => {
      // 准备
      const localPackage = './local-theme';

      // 执行
      await installPackage(localPackage, testClientDir);

      // 验证
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('当包名以 / 开头（本地绝对路径包）时，应该直接返回', async () => {
      // 准备
      const localPackage = '/absolute/path/to/theme';

      // 执行
      await installPackage(localPackage, testClientDir);

      // 验证
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('当包安装成功时，应该解析 Promise', async () => {
      // 准备
      const packageName = '@slidev/theme-test';
      const mockProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            // 立即调用回调，不要等待
            setImmediate(() => callback(0));  // 成功的退出码
          }
          return mockProcess;
        })
      };

      mockSpawn.mockReturnValue(mockProcess);

      // 执行
      await installPackage(packageName, testClientDir);

      // 验证
      expect(mockSpawn).toHaveBeenCalledWith('npm', ['install', packageName], {
        cwd: testClientDir,
        stdio: 'inherit'
      });
      expect(mockProcess.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('当包安装失败时，应该拒绝 Promise', async () => {
      // 准备
      const packageName = '@slidev/theme-error';
      const mockProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            // 立即调用回调，不要等待
            setImmediate(() => callback(1));  // 失败的退出码
          }
          return mockProcess;
        })
      };

      mockSpawn.mockReturnValue(mockProcess);

      // 执行 & 验证
      await expect(installPackage(packageName, testClientDir))
        .rejects
        .toThrow(`安装主题包失败，退出码: 1`);

      expect(mockSpawn).toHaveBeenCalledWith('npm', ['install', packageName], {
        cwd: testClientDir,
        stdio: 'inherit'
      });
    });

    it('当安装过程出错时，应该拒绝 Promise', async () => {
      // 准备
      const packageName = '@slidev/theme-error';
      const testError = new Error('安装时发生错误');
      const mockProcess = {
        on: jest.fn((event, callback) => {
          // 同时模拟 close 和 error 事件
          if (event === 'close') {
            return mockProcess;
          }
          if (event === 'error') {
            // 立即调用回调，不要等待
            setImmediate(() => callback(testError));
          }
          return mockProcess;
        })
      };

      mockSpawn.mockReturnValue(mockProcess);

      // 执行 & 验证
      await expect(installPackage(packageName, testClientDir))
        .rejects
        .toThrow(testError);

      expect(mockSpawn).toHaveBeenCalledWith('npm', ['install', packageName], {
        cwd: testClientDir,
        stdio: 'inherit'
      });
    });
  });
});

import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { promisify } from 'util';

const readFilePromise = promisify(fs.readFile);

  /**
   * 检查包是否已安装
   * @param packageName 包名
   */
  export const checkPackageInstalled = async (packageName: string, clientDir: string): Promise<void> => {
    // 如果是本地主题，直接返回
    if (packageName.startsWith('.') || packageName.startsWith('/')) {
      return;
    }

    try {
      // 尝试导入包，如果失败则表示未安装
      const packageJsonPath = path.join(clientDir, 'node_modules', packageName, 'package.json');
      await readFilePromise(packageJsonPath);
    } catch (error) {
      throw new Error(`"${packageName}" 未安装`);
    }
  }

  /**
   * 安装包
   * @param packageName 包名
   * @param requestId 请求ID
   */
  export const installPackage = async (packageName: string, clientDir: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // 如果是本地包
      if (packageName.startsWith('.') || packageName.startsWith('/')) {
        return resolve();
      }

      const installProcess = spawn('npm', ['install', packageName], {
        cwd: clientDir,
        stdio: 'inherit'
      });

      installProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          const errorMsg = `安装主题包失败，退出码: ${code}`;
          reject(new Error(errorMsg));
        }
      });

      installProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

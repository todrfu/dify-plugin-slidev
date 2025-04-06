import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Injectable } from '@nestjs/common';

const execPromise = promisify(exec);
const writeFilePromise = promisify(fs.writeFile);
const readFilePromise = promisify(fs.readFile);
const mkdirPromise = promisify(fs.mkdir);
const existsPromise = promisify(fs.exists);

@Injectable()
export class SlidevService {
  /**
   * 创建目录
   * @param dir 目录路径
   */
  async mkdir(dir: string) {
    const exists = await existsPromise(dir);
    if (!exists) {
      await mkdirPromise(dir, { recursive: true });
    }
  }

  /**
   * 生成PPT
   * @param markdown markdown内容
   * @param filename 文件名
   */
  async generatePpt(markdown: string, filename: string): Promise<Buffer> {
    try {
      const clientDir = path.resolve(process.cwd(), '..', 'slidev-client');

      // 创建markdown临时文件及导出目录
      const exportDir = path.join(clientDir, 'temp/output');
      const tempMdPath = path.join(clientDir, 'temp/input');
      await this.mkdir(exportDir);
      await this.mkdir(tempMdPath);

      // 写入Markdown内容到slidev-client的slides.md文件
      const slidesPath = path.join(tempMdPath, `${filename}.md`);
      await writeFilePromise(slidesPath, markdown);

      // 导出PPT文件的路径
      const pptxOutput = path.join(exportDir, `${filename}.pptx`);

      try {
        const relativeOutput = path.relative(clientDir, pptxOutput);
        console.log('开始导出PPT文件：', filename);

        const { stderr } = await execPromise(`npx slidev export ${slidesPath} --format pptx --output ${relativeOutput}`, {
          cwd: clientDir,
        });
        if (stderr) {
          console.error('导出命令错误输出:', stderr);
        } else {
          console.log('导出PPT文件成功：', filename);
        }

        // 检查文件是否生成
        const outputExists = await existsPromise(pptxOutput);
        if (!outputExists) {
          throw new Error(`导出文件 ${pptxOutput} 未生成`);
        }
      } catch (execError) {
        throw new Error(`执行导出命令失败: ${execError.message}`);
      }

      // 读取导出的PPT文件
      const pptxBuffer = await readFilePromise(pptxOutput);

      return pptxBuffer;
    } catch (error) {
      console.error('生成PPT时出错:', error);
      throw error;
    }
  }
}

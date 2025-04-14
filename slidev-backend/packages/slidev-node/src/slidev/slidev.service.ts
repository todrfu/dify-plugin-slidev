import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestParams } from '../types/slidev';

const execPromise = promisify(exec);
const writeFilePromise = promisify(fs.writeFile);
const readFilePromise = promisify(fs.readFile);
const mkdirPromise = promisify(fs.mkdir);
const existsPromise = promisify(fs.exists);
const unlinkPromise = promisify(fs.unlink);
const rmdirPromise = promisify(fs.rmdir);

// 请求队列管理类
class RequestQueue {
  private queue: Array<{
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    task: () => Promise<any>;
    id: string;
  }> = [];
  private runningTasks = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent;
  }

  // 添加任务到队列
  add(task: () => Promise<any>, id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject, task, id });
      this.processQueue();
    });
  }

  // 处理队列中的任务
  private processQueue() {
    if (this.runningTasks >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const { resolve, reject, task, id } = this.queue.shift();
    this.runningTasks++;

    console.log(`[${id}] 开始执行队列中的任务，当前运行任务数: ${this.runningTasks}`);

    task()
      .then((result) => {
        resolve(result);
        console.log(`[${id}] 任务成功完成`);
      })
      .catch((error) => {
        reject(error);
        console.error(`[${id}] 任务执行失败:`, error);
      })
      .finally(() => {
        this.runningTasks--;
        console.log(`[${id}] 任务结束，当前运行任务数: ${this.runningTasks}，队列中剩余任务: ${this.queue.length}`);
        this.processQueue();
      });
  }
}

@Injectable()
export class SlidevService {
  // 创建请求队列，最大并发数设为2（可根据服务器性能调整）
  private requestQueue: RequestQueue;
  private tempDir: string;

  constructor(private configService: ConfigService) {
    // 从配置中读取最大并发数
    const maxConcurrentTasks = this.configService.get<number>('MAX_CONCURRENT_TASKS', 2);
    this.requestQueue = new RequestQueue(maxConcurrentTasks);
    // 从配置中读取临时目录
    this.tempDir = this.configService.get<string>('TEMP_DIR', 'temp');
  }

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
   * 清理临时文件和目录
   * @param files 文件路径数组
   * @param dirs 目录路径数组
   */
  async cleanup(files: string[] = [], dirs: string[] = []) {
    try {
      // 删除临时文件
      for (const file of files) {
        if (await existsPromise(file)) {
          await unlinkPromise(file);
        }
      }

      // 删除临时目录
      for (const dir of dirs) {
        if (await existsPromise(dir)) {
          await rmdirPromise(dir, { recursive: true });
        }
      }
    } catch (error) {
      console.error('清理临时文件失败:', error);
      // 清理失败不影响主流程
    }
  }

  /**
   * 生成PPT
   * @param markdown markdown内容
   * @param filename 文件名
   */
  async generatePpt(params: RequestParams, requestId: string): Promise<Buffer> {
    console.log(`[${requestId}] 收到生成PPT请求，等待处理...`);
    const {
      markdown,
      filename,
      export_format = 'pptx',
      with_toc = false,
      omit_background = false,
      with_clicks = false,
      dark_mode = false,
    } = params

    // 将任务添加到队列中，避免过多并发请求
    return this.requestQueue.add(() => this.processPptRequest({
      markdown,
      filename,
      export_format,
      with_toc,
      omit_background,
      with_clicks,
      dark_mode,
    }, requestId), requestId);
  }

  /**
   * 处理单个PPT生成请求
   * @param markdown markdown内容
   * @param filename 文件名
   * @param requestId 请求ID
   */
  private async processPptRequest(params: RequestParams, requestId: string): Promise<Buffer> {
    const { markdown, filename, export_format, with_toc, omit_background, with_clicks, dark_mode } = params
    // 在独立的目录中执行slidev命令
    const clientDir = path.resolve(process.cwd(), '..', 'slidev-client');
    // 通过请求ID创建独立的工作目录，避免资源冲突
    const workDir = path.join(clientDir, this.tempDir, requestId);

    try {
      // 确保目录存在
      await this.mkdir(workDir);

      console.log(`[${requestId}] 开始处理请求，文件名: ${filename}`);

      // 写入Markdown到临时文件
      const slidesFile = path.join(workDir, `${filename}.md`);

      // 解析markdown中的转义字符（如\n换行符等）
      const parsedMarkdown = this.parseMarkdownString(markdown);

      await writeFilePromise(slidesFile, parsedMarkdown);
      console.log(`[${requestId}] Markdown内容已写入: ${slidesFile}`);

      // 导出文件路径

      // 提取后缀
      const ext = {
        'pptx': 'pptx',
        'pdf': 'pdf',
        'png': 'png',
        'markdown': 'md',
      }

      const outputFile = path.join(workDir, `${filename}.${ext[export_format]}`);
      const exportParams = []
      if (export_format) {
        exportParams.push(`--format ${export_format}`)
      }
      if (with_toc) {
        exportParams.push('--with-toc')
      }
      if (omit_background) {
        exportParams.push('--omit-background')
      }
      if (with_clicks) {
        exportParams.push('--with-clicks')
      }
      if (dark_mode) {
        exportParams.push('--dark')
      }

      // 执行Slidev导出命令
      try {
        console.log(`[${requestId}] 开始导出`);

        // 使用绝对路径执行slidev命令，避免路径问题
        const { stdout, stderr } = await execPromise(
          `npx slidev export "${slidesFile}" ${exportParams.join(' ')} --output "${outputFile}"`,
          { cwd: clientDir }
        );

        if (stdout) console.log(`[${requestId}] 导出输出: ${stdout}`);
        if (stderr) console.error(`[${requestId}] 导出错误: ${stderr}`);

        // 验证输出文件是否存在
        if (!await existsPromise(outputFile)) {
          throw new Error(`导出文件未生成: ${outputFile}`);
        }

        console.log(`[${requestId}] 文件导出成功: ${outputFile}`);

        // 读取生成的PPT文件
        const pptBuffer = await readFilePromise(outputFile);

        return pptBuffer;
      } catch (execError) {
        console.error(`[${requestId}] 执行导出命令失败:`, execError);
        throw new Error(`执行导出命令失败: ${execError.message}`);
      }
    } catch (error) {
      console.error(`[${requestId}] 生成PPT时出错:`, error);
      throw error;
    } finally {
      // 请求处理完成后清理临时文件
      this.cleanup([], [workDir]).catch(err => {
        console.error(`[${requestId}] 清理临时文件失败:`, err);
      });
      console.log(`[${requestId}] 请求处理完成`);
    }
  }

  /**
   * 解析Markdown字符串中的转义字符
   * @param markdownString 包含转义字符的markdown字符串
   * @returns 解析后的markdown内容
   */
  private parseMarkdownString(markdownString: string): string {
    // 如果输入是JSON字符串格式（带双引号），先尝试使用JSON.parse解析
    if (markdownString.startsWith('"') && markdownString.endsWith('"')) {
      try {
        return JSON.parse(`{"content":${markdownString}}`).content;
      } catch (e) {
        console.log('JSON解析失败，将直接处理转义字符');
      }
    }

    // 如果是单引号包裹的字符串，先移除单引号然后处理转义字符
    if (markdownString.startsWith("'") && markdownString.endsWith("'")) {
      markdownString = markdownString.substring(1, markdownString.length - 1);
    }

    // 直接替换常见的转义字符
    return markdownString
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\');
  }
}

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestParams } from '../types/slidev';
import { ZipUtil } from '../utils/zip';
import { TaskQueue } from '../utils/task-queue';
import { parseMarkdownString } from '../utils/parse-markdown-string';
import { ensureDirectoryExists, deleteDir } from '../utils/file';
import { checkPackageInstalled, installPackage } from '../utils/package';

const execPromise = promisify(exec);
const writeFilePromise = promisify(fs.writeFile);
const readFilePromise = promisify(fs.readFile);

@Injectable()
export class SlidevService {
  private taskQueue: TaskQueue;
  private tempDir: string;
  private clientDir: string;

  constructor(private configService: ConfigService) {
    const maxConcurrentTasks = this.configService.get<number>('MAX_CONCURRENT_TASKS', 2);
    this.taskQueue = new TaskQueue(maxConcurrentTasks);
    this.tempDir = this.configService.get<string>('TEMP_DIR', 'temp');
    this.clientDir = path.resolve(process.cwd(), '..', 'slidev-client');
  }

  /**
   * 生成PPT
   * @param params 请求参数
   * @param requestId 请求ID
   */
  async generatePpt(params: RequestParams, requestId: string): Promise<Buffer> {
    console.log(`[${requestId}] 收到生成PPT请求，等待处理...`);

    // 将任务添加到队列中，避免过多并发请求
    return this.taskQueue.add(() => this.processPptRequest(params, requestId), requestId);
  }

  /**
   * 处理单个PPT生成请求
   * @param params 请求参数
   * @param requestId 请求ID
   */
  private async processPptRequest(params: RequestParams, requestId: string): Promise<Buffer> {
    const { markdown, filename, export_format, theme } = params;
    const workDir = this.createWorkDir(requestId);

    try {
      // 确保工作目录存在
      await ensureDirectoryExists(workDir);
      console.log(`[${requestId}] 开始处理请求，文件名: ${filename}`);

      // 如果指定了主题，确保主题已安装
      if (theme) {
        await this.ensureThemeInstalled(theme, requestId);
      }

      // 创建并写入Markdown文件
      const slidesFilePath = await this.createMarkdownFile(workDir, filename, markdown);

      // 格式化markdown
      await this.formatMarkdownFile(slidesFilePath);

      // 执行导出操作
      const outputPath = await this.exportPresentation(
        slidesFilePath,
        workDir,
        filename,
        params
      );

      // 读取并返回生成的文件
      return await this.readExportResult(outputPath, workDir, filename, export_format);
    } catch (error) {
      console.error(`[${requestId}] 生成PPT时出错:`, error);
      throw error;
    } finally {
      // 清理临时文件
      deleteDir([workDir]).catch(err => {
        console.error(`[${requestId}] 清理临时文件失败:`, err);
      });
      console.log(`[${requestId}] 请求处理完成`);
    }
  }

  /**
   * 确保主题已安装
   * @param theme 主题名称
   * @param requestId 请求ID
   */
  private async ensureThemeInstalled(theme: string, requestId: string): Promise<void> {
    // 转换主题名为包名
    const packageName = this.getThemePackageName(theme);

    try {
      // 检查主题包是否已安装
      await checkPackageInstalled(packageName, this.clientDir);
      console.log(`[${requestId}] 主题 "${packageName}" 已安装`);
    } catch (error) {}
    try {
      // 主题未安装，自动安装
      console.log(`[${requestId}] 主题 "${packageName}" 未安装，开始自动安装...`);
      await installPackage(packageName, this.clientDir);
    } catch (error) {
      console.error(`[${requestId}] 安装主题包失败:`, error);
    }
  }

  /**
   * 获取主题的包名
   * @param theme 主题名称
   * @returns 完整的npm包名
   */
  private getThemePackageName(theme: string): string {
    // 处理相对或绝对路径
    if (theme.startsWith('.') || theme.startsWith('/')) {
      return theme; // 本地主题，不需要安装
    }

    // 处理完整包名
    if (theme.startsWith('@')) {
      return theme; // 作用域包，保持原样
    }

    // 处理省略前缀的官方主题
    if (!theme.includes('slidev-theme-') && !theme.startsWith('@slidev/theme-')) {
      return `@slidev/theme-${theme}`;
    }

    // 处理社区主题
    if (!theme.includes('slidev-theme-') && !theme.startsWith('@')) {
      return `slidev-theme-${theme}`;
    }

    return theme;
  }

  /**
   * 创建工作目录路径
   * @param requestId 请求ID
   */
  private createWorkDir(requestId: string): string {
    return path.join(this.clientDir, this.tempDir, requestId);
  }

  /**
   * 创建并写入Markdown文件
   * @param workDir 工作目录
   * @param filename 文件名
   * @param markdown Markdown内容
   */
  private async createMarkdownFile(workDir: string, filename: string, markdown: string): Promise<string> {
    const slidesFile = path.join(workDir, `${filename}.md`);
    const parsedMarkdown = parseMarkdownString(markdown);
    await writeFilePromise(slidesFile, parsedMarkdown);
    console.log(`Markdown内容已写入: ${slidesFile}`);
    return slidesFile;
  }

  /**
   * 格式化Markdown文件
   * @param slidesFilePath Markdown文件路径
   */
  private async formatMarkdownFile(slidesFilePath: string): Promise<void> {
    await execPromise(`npx slidev format "${slidesFilePath}"`);
  }

  /**
   * 根据导出格式获取文件扩展名
   * @param format 导出格式
   */
  private getFileExtension(format: string): string {
    const extMap = {
      'pptx': 'pptx',
      'pdf': 'pdf',
      'png': 'png',
      'markdown': 'md',
    };
    return extMap[format] || format;
  }

  /**
   * 获取导出参数
   * @param params 请求参数
   */
  private getExportParams(params: RequestParams): string {
    const { export_format, theme, with_toc, omit_background, with_clicks, dark_mode } = params;
    const exportParams = [];

    // 导出格式
    if (export_format) {
      exportParams.push(`--format ${export_format}`);
    }

    // 暗黑模式
    if (dark_mode) {
      exportParams.push('--dark');
    }

    // PDF导出特殊参数
    if (export_format === 'pdf' && with_toc) {
      exportParams.push('--with-toc');
    }

    // PNG导出特殊参数
    if (export_format === 'png' && omit_background) {
      exportParams.push('--omit-background');
    }

    // PPTX导出特殊参数
    if (export_format === 'pptx' && with_clicks) {
      exportParams.push('--with-clicks');
    }

    // 设置主题
    if (theme) {
      exportParams.push(`--theme ${theme}`);
    }

    return exportParams.join(' ');
  }

  /**
   * 导出演示文稿
   * @param slidesFilePath Markdown文件路径
   * @param workDir 工作目录
   * @param filename 文件名
   * @param params 请求参数
   */
  private async exportPresentation(
    slidesFilePath: string,
    workDir: string,
    filename: string,
    params: RequestParams
  ): Promise<string> {
    const { export_format } = params;
    const ext = this.getFileExtension(export_format);

    // PNG和MD格式特殊处理（slidev将图片导出为目录）
    const outputPath = ['png', 'md'].includes(export_format)
      ? path.join(workDir, filename)
      : path.join(workDir, `${filename}.${ext}`);

    const exportParams = this.getExportParams(params);
    console.log(`导出参数: ${exportParams}`);

    try {
      const { stderr } = await execPromise(
        `npx slidev export "${slidesFilePath}" ${exportParams} --output "${outputPath}"`,
        { cwd: this.clientDir }
      );

      if (stderr) console.error(`导出错误: ${stderr}`);
      console.log(`文件导出成功: ${outputPath}`);

      return outputPath;
    } catch (execError) {
      console.error(`执行导出命令失败:`, execError);
      throw new Error(`执行导出命令失败: ${execError.message}`);
    }
  }

  /**
   * 读取导出结果
   * @param outputPath 输出路径
   * @param workDir 工作目录
   * @param filename 文件名
   * @param format 导出格式
   */
  private async readExportResult(
    outputPath: string,
    workDir: string,
    filename: string,
    format: string
  ): Promise<Buffer> {
    if (format === 'png') {
      // PNG格式需要压缩为zip包
      const zipFile = path.join(workDir, `${filename}.zip`);
      return await ZipUtil.compressDirectory(outputPath, zipFile);
    } else if (format === 'md') {
      // Markdown格式需要压缩整个工作目录
      const zipFile = path.join(workDir, `${filename}.zip`);
      return await ZipUtil.compressDirectory(workDir, zipFile);
    } else {
      // 其他格式直接读取文件
      return await readFilePromise(outputPath);
    }
  }
}

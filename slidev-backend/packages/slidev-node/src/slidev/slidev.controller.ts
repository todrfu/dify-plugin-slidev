import { Controller, Post, Body, Res } from '@nestjs/common'
import { Response } from 'express'
import { SlidevService } from './slidev.service'
import { RequestParams } from '../types/slidev'

@Controller('slidev')
export class SlidevController {
  constructor(private readonly slidevService: SlidevService) {}

  /**
   * 生成PPT
   * @param body 请求体
   * @param res 响应
   */
  @Post('generate')
  async generatePpt(
    @Body()
    body: RequestParams,
    @Res() res: Response
  ) {
    try {
      const {
        title,
        markdown,
      } = body
      if (!markdown) {
        return res.status(400).json({
          success: false,
          message: '请提供markdown内容',
        })
      }

      // 打印收到的markdown内容的前100个字符（调试用）
      const previewLength = 100
      const markdownPreview = markdown.length > previewLength ? `${markdown.substring(0, previewLength)}...` : markdown
      console.log(`收到markdown内容（预览）: ${JSON.stringify(markdownPreview)}`)

      const dateYMD = new Date().toLocaleDateString().replace(/\//g, '-')
      const filename = title ? title : `slidev-${dateYMD}`
      const requestId = res.getHeader('X-Request-Id') as string

      const pptxBuffer = await this.slidevService.generatePpt(
        {
          ...body,
          filename,
        },
        requestId
      )

      /**
       * office文件所对应的的 Content-type类型总结
       * https://blog.csdn.net/gp_911014/article/details/108103428
       */
      const contentType = {
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'pdf': 'application/pdf',
        'png': 'image/png',
        'markdown': 'text/markdown',
      }
      res.setHeader('Content-Type', contentType[body.export_format])
      // 使用encodeURIComponent编码文件名，避免特殊字符导致的问题
      const encodedFilename = encodeURIComponent(filename).replace(/[()]/g, (char) => '%' + char.charCodeAt(0).toString(16))
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`)
      return res.send(pptxBuffer)
    } catch (error) {
      console.error('生成PPT时出错:', error)
      return res.status(500).json({
        success: false,
        message: '生成PPT失败',
      })
    }
  }
}

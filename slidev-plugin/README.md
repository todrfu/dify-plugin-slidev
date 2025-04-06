# slidev-plugin

**Author:** drfu
**Version:** 0.0.1
**Type:** tool

## 插件简介

Slidev PPT生成工具是一个Dify插件，可以将Markdown格式的内容一键转换为精美的PPT演示文稿。

## 核心功能

- [x] **直接下载**：Markdown语法创建的PPT文件可以直接在Dify对话中下载
- [ ] **在线编辑**：待开发
- [ ] **自定义导出**：待开发

## 使用方法

插件需要以下参数：

1. **markdown** (必填)：Markdown格式的演示文稿内容
3. **service_url** (必填)：Slidev后端服务URL，用于处理PPT生成请求

## 示例调用

```json
{
  "markdown": "# 我的演示文稿",
  "service_url": "http://localhost:3000/slidev/generate"
}
```

## 部署要求

使用前需要确保：

1. Slidev后端服务已部署并可访问
2. 网络环境能够正常连接到指定的service_url
3. Dify平台已正确配置插件权限




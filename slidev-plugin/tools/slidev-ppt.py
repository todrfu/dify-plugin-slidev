from collections.abc import Generator
from typing import Any, Optional, ClassVar

from dify_plugin import Tool
from dify_plugin.entities.tool import ToolInvokeMessage

import httpx
from datetime import datetime

class SlidevPPTTool(Tool):
    service_url: ClassVar[Optional[str]] = None
    
    def __init__(self, runtime=None, **kwargs):
        super().__init__(runtime=runtime, **kwargs)
        # 设置较长的超时时间和较大的最大连接数
        timeout = httpx.Timeout(60.0, connect=30.0)
        self.client = httpx.Client(timeout=timeout)
    
    def __convert_markdown_to_ppt(self, tool_parameters: dict[str, Any]) -> tuple[Optional[bytes], Optional[str]]:
        """
        调用Slidev后端API生成PPT
        
        Args:
            tool_parameters (dict): 导出参数
                markdown (str): 需要转换为PPT的Markdown内容
                service_url (str): 转换服务接口地址
                # title (str, optional): 演示文稿标题，会用于文件命名
                export_format (str, optional): 导出格式，可选值为pptx、pdf、png、md
                with_toc (bool, optional): 是否生成目录
                omit_background (bool, optional): 是否忽略背景
                with_clicks (bool, optional): 是否包含点击
                dark_mode (bool, optional): 是否为暗黑模式

        返回:
        tuple: (pptx_binary_data, filename) - PPT的二进制数据和文件名，如果失败则返回(None, None)
        """

        # 剔除 service_url 参数
        request_data = {k: v for k, v in tool_parameters.items() if k != 'service_url'}
        
        try:
            with self.client.stream('POST', self.service_url, json=request_data) as response:
                response.raise_for_status()
                
                if response.headers.get('Content-Type', '').startswith('application/json'):
                    error_data = response.json()
                    print(f"生成PPT失败: {error_data.get('message', '未知错误')}")
                    return None, None
                
                content_disposition = response.headers.get('Content-Disposition', '')
                
                filename = None
                
                if 'filename*=UTF-8' in content_disposition:
                    import urllib.parse
                    encoded_part = content_disposition.split("filename*=UTF-8''")[1].split(';')[0]
                    filename = urllib.parse.unquote(encoded_part)
                
                # 默认文件名
                if not filename:
                    filename = f'slidev-{datetime.now().strftime("%Y-%m-%d")}.pptx'
                
                content_bytes = b''
                for chunk in response.iter_bytes(chunk_size=8192):
                    content_bytes += chunk

                return content_bytes, filename
        except httpx.RequestError as exc:
            print(f"请求错误: {exc}")
            raise
        except httpx.HTTPStatusError as exc:
            print(f"HTTP错误: {exc}")
            raise
        except Exception as e:
            print(f"未知错误: {e}")
            raise

    def _invoke(self, tool_parameters: dict[str, Any]) -> Generator[ToolInvokeMessage, None, None]:
        markdown = tool_parameters.get("markdown", None)
        if markdown is None:
            yield self.create_json_message({
                "error": {
                    "zh_Hans": "必须提供 markdown 参数",
                    "en": "Markdown is required"
                },
                "status": "error"
            })
            return
        
        export_format = tool_parameters.get("export_format", None)
        if export_format is None:
            yield self.create_json_message({
                "error": {
                    "zh_Hans": "必须提供导出格式",
                    "en": "Export format is required"
                },
                "status": "error"
            })
            return
        elif export_format == 'png':
            yield self.create_json_message({
                "error": {
                    "zh_Hans": "不支持导出为 PNG 格式",
                    "en": "PNG export is not supported"
                },
                "status": "error"
            })
            return
            
        self.service_url = tool_parameters.get("service_url", None)
        if self.service_url is None:
            yield self.create_json_message({
                "error": "必须提供 service_url 参数"
            })
            return

        try:
            ppt_binary, filename = self.__convert_markdown_to_ppt(tool_parameters)
            if ppt_binary:
                # 使用create_blob_message返回二进制数据
                # 将文件名和MIME类型放入meta字典中
                meta = {
                    "filename": filename,
                }
                export_format = tool_parameters.get("export_format", None)
                if export_format == 'md':
                    meta["mime_type"] = "text/markdown"
                elif export_format == 'png':
                    meta["mime_type"] = "image/png"
                elif export_format == 'pdf':
                    meta["mime_type"] = "application/pdf"
                elif export_format == 'pptx':
                    meta["mime_type"] = "application/vnd.openxmlformats-officedocument.presentationml.presentation"

                yield self.create_blob_message(
                    blob=ppt_binary,
                    meta=meta
                )
            else:
                yield self.create_json_message({
                    "error": {
                        "zh_Hans": "生成PPT失败",
                        "en": "Failed to generate PPT"
                    },
                    "status": "error"
                })
        except Exception as e:
            yield self.create_json_message({
                "error": {
                    "zh_Hans": f"获取内容失败: {str(e)}",
                    "en": f"Failed to get content: {str(e)}"
                },
                "status": "error"
            })
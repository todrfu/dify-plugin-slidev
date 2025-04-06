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
    
    def __convert_markdown_to_ppt(self, markdown, title=None) -> tuple[Optional[bytes], Optional[str]]:
        """
        调用Slidev后端API生成PPT
        
        Args:
            markdown (str): Markdown格式的演示文稿内容
            title (str, optional): 演示文稿标题，会用于文件命名

        返回:
        tuple: (pptx_binary_data, filename) - PPT的二进制数据和文件名，如果失败则返回(None, None)
        """

        request_data = {
            'markdown': markdown
        }
        if title:
            request_data['title'] = title
        
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
        title = tool_parameters.get("title", None)
        self.service_url = tool_parameters.get("service_url", None)
        if markdown is None:
            yield self.create_json_message({
                "error": "必须提供 markdown 参数"
            })
            return
            
        try:
            ppt_binary, filename = self.__convert_markdown_to_ppt(markdown, title)
            if ppt_binary:
                # 使用create_blob_message返回二进制数据
                # 将文件名和MIME类型放入meta字典中
                meta = {
                    "filename": filename,
                    "mime_type": "application/vnd.openxmlformats-officedocument.presentationml.presentation"
                }
                yield self.create_blob_message(
                    blob=ppt_binary,
                    meta=meta
                )
            else:
                yield self.create_json_message({
                    "error": "生成PPT失败"
                })
        except Exception as e:
            yield self.create_json_message({
                "error": f"获取内容失败: {str(e)}"
            })
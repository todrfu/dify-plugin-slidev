from typing import Any

from dify_plugin import ToolProvider
from dify_plugin.errors.tool import ToolProviderCredentialValidationError
# from tools.slidev import SlidevPPTTool

class SlidevPptProvider(ToolProvider):
    def _validate_credentials(self, credentials: dict[str, Any]) -> None:
        try:
            service_url = credentials.get("service_url")
            print(f"验证服务URL: {service_url}")
            # 验证服务URL是否存在且格式正确
            if not service_url:
                raise ValueError("服务地址不能为空")
            
            if not (service_url.startswith("http://") or service_url.startswith("https://")):
                raise ValueError("服务地址必须以 http:// 或 https:// 开头")
                
        except Exception as e:
            raise ToolProviderCredentialValidationError(str(e))

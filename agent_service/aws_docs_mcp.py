import warnings
warnings.filterwarnings("ignore", category=ResourceWarning)

from mcp import StdioServerParameters, stdio_client
from strands.tools.mcp import MCPClient

def get_aws_mcp_client():
    """Returns a configured MCP client for the AWS Documentation server."""
    return MCPClient(
        lambda: stdio_client(
            StdioServerParameters(
                command="uvx", args=["awslabs.aws-documentation-mcp-server@latest"]
            )
        )
    )

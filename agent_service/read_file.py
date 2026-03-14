import os
from pydantic import BaseModel, Field

class ReadFileInput(BaseModel):
    file_path: str = Field(description="The absolute or relative path to the file to be read.")

def read_file(file_path: str) -> str:
    """
    Read the contents of a local file by providing its path.
    """
    try:
        if not os.path.exists(file_path):
            return "Error: File not found."
            
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read(5000) 
    except Exception as e:
        return f"Error reading file: {str(e)}"

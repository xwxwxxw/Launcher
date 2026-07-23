import re

with open('index.html', 'r') as f:
    content = f.read()

# Find the script tag that contains "Prevent Vite HMR WebSocket"
pattern = r'<script>\s*// Prevent Vite HMR WebSocket.*?<\/script>\s*'
new_content = re.sub(pattern, '', content, flags=re.DOTALL)

with open('index.html', 'w') as f:
    f.write(new_content)

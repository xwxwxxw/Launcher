with open('vite.config.ts', 'r') as f:
    content = f.read()

content = content.replace("allowedHosts: true,", "allowedHosts: true as true,")

with open('vite.config.ts', 'w') as f:
    f.write(content)

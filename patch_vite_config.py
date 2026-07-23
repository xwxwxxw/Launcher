with open('vite.config.ts', 'r') as f:
    content = f.read()

content = content.replace("hmr: true,", "hmr: { clientPort: 443 },\n      allowedHosts: true,")

with open('vite.config.ts', 'w') as f:
    f.write(content)

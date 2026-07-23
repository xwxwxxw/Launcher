with open('server.ts', 'r') as f:
    content = f.read()

content = content.replace("hmr: { server }", "hmr: { server, clientPort: 443 }")
content = content.replace("allowedHosts: 'all'", "allowedHosts: true") # just in case

with open('server.ts', 'w') as f:
    f.write(content)

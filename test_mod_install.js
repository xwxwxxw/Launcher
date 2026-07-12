const fs = require('fs');
fetch('https://api.modrinth.com/v2/project/sodium/version').then(res => res.json()).then(async versions => {
  if (versions.length > 0) {
    const downloadUrl = versions[0].files[0].url;
    console.log('Downloading', downloadUrl);
    const fileRes = await fetch(downloadUrl);
    if (fileRes.ok) {
      const arrayBuffer = await fileRes.arrayBuffer();
      fs.writeFileSync('sodium.jar', Buffer.from(arrayBuffer));
      console.log('Saved sodium.jar, size:', fs.statSync('sodium.jar').size);
    } else {
      console.error('Download failed', fileRes.status);
    }
  }
});

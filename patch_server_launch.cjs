const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(`
            if (res.ok) {
                const data = await res.text();
                fs.writeFileSync(jsonPath, data);
                sendEvent('log', { message: 'Профиль Fabric успешно загружен.', progress: 10 });
            }
`, `
            if (res.ok) {
                const data = await res.text();
                fs.writeFileSync(jsonPath, data);
                sendEvent('log', { message: 'Профиль Fabric успешно загружен.', progress: 10 });
            } else {
                sendEvent('error', 'Не удалось скачать профиль Fabric.');
                return res.end();
            }
`);

code = code.replace(`
        } catch (e) {
            console.error('Failed to download Fabric profile', e);
        }
`, `
        } catch (e) {
            console.error('Failed to download Fabric profile', e);
            sendEvent('error', 'Ошибка сети при скачивании профиля Fabric.');
            return res.end();
        }
`);

code = code.replace(`
            if (res.ok) {
                const data = await res.text();
                fs.writeFileSync(jsonPath, data);
                sendEvent('log', { message: 'Профиль Quilt успешно загружен.', progress: 10 });
            }
`, `
            if (res.ok) {
                const data = await res.text();
                fs.writeFileSync(jsonPath, data);
                sendEvent('log', { message: 'Профиль Quilt успешно загружен.', progress: 10 });
            } else {
                sendEvent('error', 'Не удалось скачать профиль Quilt.');
                return res.end();
            }
`);

code = code.replace(`
        } catch (e) {
            console.error('Failed to download Quilt profile', e);
        }
`, `
        } catch (e) {
            console.error('Failed to download Quilt profile', e);
            sendEvent('error', 'Ошибка сети при скачивании профиля Quilt.');
            return res.end();
        }
`);

code = code.replace(`
          if (res.ok) {
             const buffer = await res.arrayBuffer();
             fs.writeFileSync(tempPath, Buffer.from(buffer));
          }
`, `
          if (res.ok) {
             const buffer = await res.arrayBuffer();
             fs.writeFileSync(tempPath, Buffer.from(buffer));
          } else {
             sendEvent('error', 'Не удалось скачать установщик Forge.');
             return res.end();
          }
`);

code = code.replace(`
        } catch(e) {
          console.error('Failed to download Forge installer', e);
        }
`, `
        } catch(e) {
          console.error('Failed to download Forge installer', e);
          sendEvent('error', 'Ошибка сети при скачивании установщика Forge.');
          return res.end();
        }
`);

fs.writeFileSync('server.ts', code);

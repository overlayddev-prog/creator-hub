# CreatorHub (Electron)

This is the Electron shell for CreatorHub which wraps Overlayd and provides native OBS integration.

Quick start (Windows, from PowerShell):

```powershell
cd "c:\Users\wjlin\Desktop\big project\creatorhub"
# Install dependencies (will install electron & electron-forge)
npm install

# Start the app in development
npx electron-forge start
```

Notes:
- This scaffold provides a minimal main process, preload bridge, and renderer UI.
- Next step (if you want): run the commands above to install dependencies and start the dev app.
- I'll wire OBS code into the main process next if you want me to proceed.

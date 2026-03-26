module.exports = {
  packagerConfig: {
    asar: true,
    name: 'CreatorHub',
    executableName: 'creatorhub',
    // icon: './assets/icon', // ← uncomment and add icon.ico to assets/ when ready
    appCopyright: 'Copyright © 2026 CreatorHub',
    ignore: [
      /^\/\.env$/,
      /^\/\.env\..*/,
      /^\/README\.md$/,
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'CreatorHub',
        authors: 'CreatorHub',
        setupExe: 'CreatorHub-Setup.exe',
        // setupIcon: './assets/icon.ico', // ← uncomment when you have an icon
        shortcutFolderName: 'CreatorHub',
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
      },
    },
  ],
  plugins: [],
};

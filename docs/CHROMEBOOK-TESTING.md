## Make an installer from your local code

Run `npm run installer:chromebook` in this project folder. It builds your local
files into `release/Shoot-Rabbits-chromebook-SEND-TO-FRIENDS.zip`, ready to send.
Build requirements: npm, Python 3 and internet for downloading build tools. The
command downloads a private Node 22 runtime automatically if yours is older.
Friends only need Linux enabled and the ZIP; they do not need these build tools.

## Install the downloadable game (no development tools)

Download **Shoot-Rabbits-Chromebook-installer** from a successful installer build,
or use its folder inside **Shoot-Rabbits-SEND-TO-FRIENDS**. Follow the included
`READ-ME-FIRST.txt`: enable Linux once, extract the full folder into Linux files,
and run `INSTALL-CHROMEBOOK.sh` with `bash` in Terminal. It selects Intel/AMD or
ARM automatically and installs a launcher entry. Afterwards, open the game from
Linux apps without npm, a server or internet. Initial Linux setup and system
library installation may need internet. Managed Chromebooks can block Linux.

Google has deprecated the graphical `.deb` installer; the script uses APT instead.
See https://developers.google.com/chromeos/app-development/develop/news.

The instructions below are only for testing changes to the source code.

# Testing on a Chromebook

This runs the same game and assets as the website in Chromebook Chrome. You do
not need Firebase, Electron, Android Studio, or npm dependency installation.
The Chromebook needs its Linux development environment and Node.js/npm installed.
School or work policies may prevent enabling Linux.

1. Enable **Settings → About ChromeOS → Developers → Linux development environment**.
2. Put the extracted project folder in **Linux files** (or share it with Linux).
3. Open the Linux Terminal in that folder. If Node and npm are missing, install them:

   ```sh
   sudo apt update
   sudo apt install nodejs npm
   ```

4. Start the game:

   ```sh
   npm run chromebook
   ```

5. Open **http://localhost:4173/** in the Chromebook's regular Chrome browser.
   Keep this address and port consistent between tests so your saves stay on the
   same origin. Do not double-click `dist/index.html`.

The command builds all game assets and starts the local server. No `npm ci` is
needed for this manual test. FFmpeg is optional; the original audio/video files
remain available without it. Keep the terminal open while downloading/installing.
Press Ctrl+C to stop the server. Run the command again after changing game code.

## Check the game

- Use landscape orientation; test keyboard, trackpad/mouse, and touch if available.
- Play Campaign and verify mission completion is retained after closing Chrome.
- Launch all four maps through Mission Select, then Bad Belzig, Wigan and Barcelona through Resistance. Cable Street is intentionally excluded from Resistance.
- Check campaign intro video, music, voices and effects.
- Wait for **Single player is ready offline**, then choose **INSTALL GAME**.
- Close the game, stop the local server, switch Wi-Fi off, and reopen the installed
  game. Repeat mission launches and confirm saved campaign progress remains.
- Reconnect Wi-Fi before testing multiplayer with a second device. Room invitations
  open the hosted web game; the room code also works in another local installation.

For diagnostics open `http://localhost:4173/?debug=1` and inspect
`BadFodderDiagnostics.snapshot()` in Chrome DevTools. Clearing this site's data
removes its offline download and saves. Browser and Android-app saves are separate.

If you cannot enable Linux, you can test the hosted HTTPS game in Chrome, or use
the Android APK on a Chromebook that supports Android apps. The Windows installer
and macOS DMG do not run on ChromeOS.

## Launch from a ZIP

Extract the whole project ZIP into Linux files. Open Terminal and type `bash ` (with a space), drag `START-CHROMEBOOK.sh` from Files into the terminal, then press Enter. The launcher finds its own game folder, builds the game and opens Chrome. Keep the terminal open. No `npm install` is needed for this launcher.

In Options, choose Auto render quality for automatic adjustment, Original for full resolution or Performance for a smaller render surface. Simulation speed and combat rules stay the same. After playing for at least a minute, choose Download Performance Report in Options to record measured frame timing and runtime diagnostics. Test on your actual Chromebook; desktop measurements cannot establish Chromebook performance.

Options also offers Export Progress and Restore Selected Backup. Transfer the exported JSON to a friend or another device, choose it and restore. This carries completed mission progress, squad history and Resistance records, not an unfinished battle. Export before clearing browser data.

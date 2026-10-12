#!/bin/bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
case "$(dpkg --print-architecture)" in
  amd64) package_arch=x64 ;;
  arm64) package_arch=arm64 ;;
  *) echo 'This installer supports 64-bit Intel/AMD and ARM Chromebooks.' >&2; exit 1 ;;
esac
shopt -s nullglob
packages=(./Shoot-Rabbits-Chromebook-*-${package_arch}.deb)
if [ "${#packages[@]}" -ne 1 ]; then
  echo 'Extract the complete Chromebook ZIP first, keeping this script beside its .deb files.' >&2
  exit 1
fi
echo 'Installing If I Can Shoot Rabbits. Linux may need internet to install system libraries.'
sudo apt-get install -- "${packages[0]}"
echo 'Installed. Open If I Can Shoot Rabbits from the Chromebook launcher, under Linux apps.'
echo 'Single player now runs offline. No terminal or localhost server is needed to play.'

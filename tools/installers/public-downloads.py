"""Turn tested build artifacts into public, stable-name player downloads."""
import hashlib
import pathlib
import shutil
import sys
import zipfile


def prepare(source, output):
    source, output = pathlib.Path(source), pathlib.Path(output)
    selections = [
        ('Shoot-Rabbits-windows-installer', '.exe', 'Shoot-Rabbits-Windows.exe'),
        ('Shoot-Rabbits-mac-installer', '.dmg', 'Shoot-Rabbits-Mac.dmg'),
        ('Shoot-Rabbits-Android-test-installer', '.apk', 'Shoot-Rabbits-Android.apk'),
    ]
    chosen = []
    for folder, extension, name in selections:
        matches = list((source / folder).glob('*' + extension))
        if len(matches) != 1:
            raise ValueError(f'Expected exactly one {extension} installer in {folder}')
        chosen.append((matches[0], name))
    chromebook = source / 'Shoot-Rabbits-Chromebook-installer'
    for arch in ['amd64', 'arm64']:
        if len(list(chromebook.glob(f'*-{arch}.deb'))) != 1:
            raise ValueError(f'Missing or duplicate Chromebook {arch} installer')
    for name in ['READ-ME-FIRST.txt', 'INSTALL-CHROMEBOOK.sh', 'SHA256SUMS.txt']:
        if not (chromebook / name).is_file():
            raise ValueError(f'Missing Chromebook instruction file: {name}')
    # Verify all original package hashes before publishing any download.
    for folder in [source / selection[0] for selection in selections] + [chromebook]:
        for line in (folder / 'SHA256SUMS.txt').read_text().splitlines():
            expected, name = line.split('  ', 1)
            file = folder / name
            if file.parent != folder or not file.is_file():
                raise ValueError('Invalid checksum file path')
            if hashlib.file_digest(file.open('rb'), 'sha256').hexdigest() != expected:
                raise ValueError(f'Installer checksum mismatch: {file}')
    output.mkdir(parents=True, exist_ok=True)
    for file, name in chosen:
        shutil.copyfile(file, output / name)
    with zipfile.ZipFile(output / 'Shoot-Rabbits-Chromebook.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(chromebook.iterdir()):
            if file.is_file():
                archive.write(file, file.name)
    checksums = []
    for file in sorted(output.iterdir()):
        if file.is_file() and file.name != 'SHA256SUMS.txt':
            with file.open('rb') as stream:
                checksums.append(hashlib.file_digest(stream, 'sha256').hexdigest() + '  ' + file.name)
    (output / 'SHA256SUMS.txt').write_text('\n'.join(checksums) + '\n')


if __name__ == '__main__':
    prepare(*sys.argv[1:])

#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
mkdir -p out
if command -v x86_64-w64-mingw32-gcc >/dev/null; then
    x86_64-w64-mingw32-gcc -std=c11 -Wall -Wextra -Werror -O2 prototype/portal.c -o out/De-PerPortal-Probe.exe -luser32 -lshlwapi -ladvapi32 -lshell32
elif test -f out/toolchain/usr/lib/gcc/x86_64-w64-mingw32/16.2.0/libgcc.a; then
    sysroot="$PWD/out/toolchain/usr/x86_64-w64-mingw32"
    clang --target=x86_64-w64-windows-gnu --sysroot="$sysroot" -Wall -Wextra -Werror -O2 -c prototype/portal.c -o out/portal.o
    clang --target=x86_64-w64-windows-gnu --sysroot="$sysroot" -fuse-ld=lld -nostdlib \
        "$sysroot/lib/crt2.o" "$sysroot/lib/crtbegin.o" out/portal.o \
        -luser32 -lshlwapi -ladvapi32 -lshell32 -lmingw32 -lmingwex -lmsvcrt -lkernel32 \
        out/toolchain/usr/lib/gcc/x86_64-w64-mingw32/16.2.0/libgcc.a \
        "$sysroot/lib/crtend.o" -o out/De-PerPortal-Probe.exe
else
    winegcc -m64 -Wall -Wextra -Werror prototype/portal.c -o out/portal-probe.exe -luser32 -lshlwapi -ladvapi32 -lshell32
    echo 'Built Wine-only launcher plus .exe.so. Use MinGW or build.cmd for a standalone Windows EXE.'
fi

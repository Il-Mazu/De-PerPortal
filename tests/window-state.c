#define UNICODE
#define _UNICODE
#include <windows.h>
#include <shlwapi.h>
#include <stdio.h>
static int visible;
static BOOL CALLBACK check(HWND w,LPARAM unused) {
 wchar_t title[512];(void)unused;GetWindowTextW(w,title,512);
 if(!lstrcmpW(title,L"Emulated USB Devices") && IsWindowVisible(w))visible++;
 return TRUE;
}
int main(void) {
 EnumWindows(check,0);
 printf("Visible Emulated USB Devices windows: %d\n",visible);
 return visible?1:0;
}

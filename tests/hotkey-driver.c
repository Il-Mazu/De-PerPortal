#define UNICODE
#define _UNICODE
#include <windows.h>
#include <shlwapi.h>
#include <stdio.h>
static HWND cemu;
static BOOL CALLBACK find(HWND w,LPARAM unused){wchar_t t[512];(void)unused;GetWindowTextW(w,t,512);if(StrStrW(t,L"Cemu")==t && !GetWindow(w,GW_OWNER))cemu=w;return TRUE;}
static void key(WORD vk,DWORD flags){INPUT i={0};i.type=INPUT_KEYBOARD;i.ki.wVk=vk;i.ki.dwFlags=flags;SendInput(1,&i,sizeof(i));Sleep(80);}
static void chord(int shift,WORD vk){printf("Sending Alt%s+%c, Cemu focused: %d\n",shift?"+Shift":"",(char)vk,GetForegroundWindow()==cemu);key(VK_MENU,0);if(shift)key(VK_SHIFT,0);key(vk,0);key(vk,KEYEVENTF_KEYUP);if(shift)key(VK_SHIFT,KEYEVENTF_KEYUP);key(VK_MENU,KEYEVENTF_KEYUP);}
int main(void){
 EnumWindows(find,0);if(!cemu)return 1;
 wchar_t original[512];GetWindowTextW(cemu,original,512);
 if(StrStrIW(original,L"FPS:")){puts("Close the running game before this UI-only test.");return 2;}
 DWORD_PTR result;SendMessageTimeoutW(cemu,WM_SETTEXT,0,(LPARAM)L"Cemu 2.0 - Skylanders Giants (automation test)",SMTO_ABORTIFHUNG,2000,&result);
 ShowWindow(cemu,SW_RESTORE);SetForegroundWindow(cemu);Sleep(2000);
 if(GetForegroundWindow()!=cemu){SendMessageTimeoutW(cemu,WM_SETTEXT,0,(LPARAM)original,SMTO_ABORTIFHUNG,2000,&result);return 3;}
 chord(0,'1');Sleep(600);chord(1,'0');Sleep(600);chord(0,'T');Sleep(600);chord(1,'T');Sleep(600);
 const char *perks="QWERYUIO";for(const char *p=perks;*p;p++){chord(*p=='O',*p);Sleep(300);}
 HWND other=CreateWindowW(L"STATIC",L"Dè PerPortal test: another application",WS_OVERLAPPEDWINDOW|WS_VISIBLE,100,100,400,200,NULL,NULL,GetModuleHandleW(NULL),NULL);
 SetForegroundWindow(other);Sleep(500);chord(0,'2');chord(0,'T');chord(1,'T');Sleep(500);
 DestroyWindow(other);
 SendMessageTimeoutW(cemu,WM_SETTEXT,0,(LPARAM)original,SMTO_ABORTIFHUNG,2000,&result);
 puts("Focused and unfocused chords sent; original Cemu title restored.");return 0;
}

#define UNICODE
#define _UNICODE
#include <windows.h>
#include <commdlg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <shlwapi.h>
#include <wincrypt.h>
#include <shellapi.h>
#define wcsstr StrStrW
#define wcscmp lstrcmpW
#define wcslen lstrlenW

static const char *utf8(const wchar_t *s) {
    static char buffers[4][2048]; static int index;
    char *b=buffers[index++ % 4];
    WideCharToMultiByte(CP_UTF8,0,s,-1,b,2048,NULL,NULL); return b;
}

static DWORD pid;
static HWND main_window, portal, dialog, checkbox;
static HWND loads[16], clears[16], edits[16];
static int nl, nc, ne;
static int watching, supported, multiple;
static unsigned char pressed[256];
static BOOL control_down;

static void fail(const char *s) { fprintf(stderr, "%s\n", s); exit(1); }
static BOOL tested_binary(void) {
    static const BYTE expected[32]={0x65,0xe2,0x2a,0x4e,0xc2,0x79,0x15,0xd6,0x0d,0x71,0x68,0x9c,0x45,0xa2,0x7e,0xb7,0xbf,0x32,0x9d,0x17,0xbd,0xe6,0x71,0x9b,0x79,0xad,0xa5,0x61,0x74,0x4e,0xe2,0x80};
    wchar_t exe[32768]; DWORD length=32768;
    HANDLE process=OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION,FALSE,pid);
    if(!process) return FALSE;
    BOOL ok=QueryFullProcessImageNameW(process,0,exe,&length); CloseHandle(process);
    if(!ok) return FALSE;
    HANDLE file=CreateFileW(exe,GENERIC_READ,FILE_SHARE_READ,NULL,OPEN_EXISTING,0,NULL);
    if(file==INVALID_HANDLE_VALUE) return FALSE;
    HCRYPTPROV provider=0; HCRYPTHASH hash=0; BYTE buf[4096],digest[32]; DWORD count;
    ok=CryptAcquireContextW(&provider,NULL,NULL,PROV_RSA_AES,CRYPT_VERIFYCONTEXT);
    if(ok) ok=CryptCreateHash(provider,CALG_SHA_256,0,0,&hash);
    while(ok) {
        ok=ReadFile(file,buf,sizeof(buf),&count,NULL);
        if(!ok || !count) break;
        ok=CryptHashData(hash,buf,count,0);
    }
    length=32;
    if(ok) ok=CryptGetHashParam(hash,HP_HASHVAL,digest,&length,0);
    if(hash) CryptDestroyHash(hash);
    if(provider) CryptReleaseContext(provider,0);
    CloseHandle(file);
    return ok && !memcmp(digest,expected,32);
}
static void title(HWND w, wchar_t *s) {
    DWORD_PTR result; s[0]=0;
    SendMessageTimeoutW(w,WM_GETTEXT,512,(LPARAM)s,SMTO_ABORTIFHUNG,1000,&result);
}
static BOOL CALLBACK find_main(HWND w, LPARAM unused) {
    wchar_t s[512]; (void)unused; title(w,s);
    if (wcsstr(s,L"Cemu")==s && GetWindow(w,GW_OWNER)==NULL) {
        if (main_window) { if(watching) { multiple=1; return TRUE; } fail("Multiple Cemu windows: close other instances."); }
        main_window=w; GetWindowThreadProcessId(w,&pid);
    }
    return TRUE;
}
static BOOL CALLBACK find_windows(HWND w, LPARAM unused) {
    DWORD p; wchar_t s[512]; (void)unused;
    GetWindowThreadProcessId(w,&p); if(p!=pid) return TRUE;
    title(w,s);
    if(wcscmp(s,L"Emulated USB Devices")==0) portal=w;
    if(wcscmp(s,L"Open Skylander dump")==0) dialog=w;
    return TRUE;
}
static UINT menu_command(HMENU m) {
    for(int i=0;i<GetMenuItemCount(m);i++) {
        wchar_t s[512]; GetMenuStringW(m,i,s,512,MF_BYPOSITION);
        if(wcsstr(s,L"Emulated USB")) return GetMenuItemID(m,i);
        HMENU sub=GetSubMenu(m,i);
        if(sub) { UINT id=menu_command(sub); if(id) return id; }
    }
    return 0;
}
static BOOL CALLBACK inspect(HWND w, LPARAM unused) {
    wchar_t s[512],c[128]; RECT r; (void)unused;
    title(w,s); GetClassNameW(w,c,128); GetWindowRect(w,&r);
    printf("id=%d class=%s text=%s enabled=%d x=%ld y=%ld\n",
        GetDlgCtrlID(w),utf8(c),utf8(s),IsWindowEnabled(w),(long)r.left,(long)r.top);
    return TRUE;
}
static BOOL CALLBACK collect(HWND w, LPARAM unused) {
    wchar_t s[512],c[128]; (void)unused; title(w,s); GetClassNameW(w,c,128);
    if(wcscmp(c,L"Button")==0) {
        if(wcscmp(s,L"Emulate Skylander Portal")==0) checkbox=w;
        if(wcscmp(s,L"Load")==0 && nl<16) loads[nl++]=w;
        if(wcscmp(s,L"Clear")==0 && nc<16) clears[nc++]=w;
    }
    if(wcscmp(c,L"Edit")==0 && ne<16) edits[ne++]=w;
    return TRUE;
}
static int by_y(const void *a,const void *b) {
    RECT x,y; GetWindowRect(*(HWND*)a,&x); GetWindowRect(*(HWND*)b,&y);
    return (x.top>y.top)-(x.top<y.top);
}
static void click(HWND w) {
    if(!IsWindowEnabled(w)) fail("Cemu control is disabled.");
    if(!PostMessageW(w,BM_CLICK,0,0)) fail("Cannot click Cemu control.");
}
static void click_sync(HWND w) {
    /* SendMessage waits for the window procedure to process the click before returning. */
    /* Use this for dialog OK buttons where PostMessage would leave the dialog alive. */
    if(!IsWindowEnabled(w)) fail("Cemu control is disabled.");
    SendMessageW(w,BM_CLICK,0,0);
}
static void wait_portal(void) {
    for(int i=0;i<100;i++) { EnumWindows(find_windows,0); if(portal) return; Sleep(100); }
    fail("Portal window did not appear. Check Cemu for a modal dialog; use English UI.");
}
static BOOL CALLBACK find_edit(HWND w, LPARAM out) {
    wchar_t c[128]; GetClassNameW(w,c,128);
    if(wcscmp(c,L"Edit")==0) { *(HWND*)out=w; return FALSE; }
    return TRUE;
}
/* Recursively walk all descendants looking for the first enabled Edit control.
   IFileDialog nests its filename edit several levels deep under DirectUIHWND and
   ComboBoxEx32, unlike the legacy GetOpenFileName which places it at ID 0x480. */
static BOOL CALLBACK find_edit_recursive(HWND w, LPARAM out) {
    wchar_t c[128]; GetClassNameW(w,c,128);
    if(wcscmp(c,L"Edit")==0 && IsWindowEnabled(w)) { *(HWND*)out=w; return FALSE; }
    /* Recurse into child windows — EnumChildWindows only goes one level for the callback,
       so we enumerate children of each child manually. */
    EnumChildWindows(w,find_edit_recursive,out);
    if(*(HWND*)out) return FALSE; /* found; stop outer enumeration */
    return TRUE;
}
static void json_string(const wchar_t *s) {
    const unsigned char *p=(const unsigned char*)utf8(s); putchar('"');
    while(*p) { if(*p=='"' || *p=='\\') putchar('\\'); if(*p<32) printf("\\u%04x",*p); else putchar(*p); p++; }
    putchar('"');
}
static void session(void) {
    DWORD old_pid=pid;
    main_window=NULL; pid=0; multiple=0; EnumWindows(find_main,0);
    if(pid!=old_pid) supported=pid?tested_binary():0;
    if(multiple) supported=0;
    wchar_t s[512]=L""; if(main_window) title(main_window,s);
    printf("{\"type\":\"session\",\"pid\":%lu,\"supported\":%s,\"focused\":%s,\"title\":",(unsigned long)pid,supported?"true":"false",main_window && GetForegroundWindow()==main_window?"true":"false");
    json_string(s);
    RECT bounds={0};
    if(main_window) GetWindowRect(main_window,&bounds);
    printf(",\"bounds\":{\"x\":%ld,\"y\":%ld,\"width\":%ld,\"height\":%ld}",(long)bounds.left,(long)bounds.top,(long)(bounds.right-bounds.left),(long)(bounds.bottom-bounds.top));
    printf(",\"rows\":[");
    portal=NULL; dialog=NULL; nl=nc=ne=0;
    if(pid && supported) {EnumWindows(find_windows,0);if(portal)EnumChildWindows(portal,collect,0);}
    qsort(edits,ne,sizeof(HWND),by_y);
    for(int i=0;i<5;i++) {if(i)putchar(',');s[0]=0;if(i<ne)title(edits[i],s);json_string(s);}
    puts("]}"); fflush(stdout);
}
static LRESULT CALLBACK keyboard(int code,WPARAM message,LPARAM data) {
    if(code==HC_ACTION) {
        KBDLLHOOKSTRUCT *k=(KBDLLHOOKSTRUCT*)data;
        DWORD key=k->vkCode;
        if(key==VK_CONTROL || key==VK_LCONTROL || key==VK_RCONTROL) {
            if(message==WM_KEYDOWN || message==WM_SYSKEYDOWN) control_down=TRUE;
            if(message==WM_KEYUP || message==WM_SYSKEYUP) control_down=FALSE;
        }
        BOOL control=control_down || (GetAsyncKeyState(VK_CONTROL)&0x8000) || (GetAsyncKeyState(VK_LCONTROL)&0x8000) || (GetAsyncKeyState(VK_RCONTROL)&0x8000);
        if(key<256 && (message==WM_KEYUP || message==WM_SYSKEYUP)) {
            if(pressed[key]) { pressed[key]=0; return 1; }
        }
        if(key<256 && supported && GetForegroundWindow()==main_window && (message==WM_KEYDOWN || message==WM_SYSKEYDOWN)) {
            wchar_t s[512]; GetWindowTextW(main_window,s,512);
            BOOL game=StrStrIW(s,L"Skylander")!=NULL || StrStrIW(s,L"10142d00")!=NULL;
            BOOL trapGame=StrStrIW(s,L"Trap Team")!=NULL || StrStrIW(s,L"1017c600")!=NULL || StrStrIW(s,L"10181f00")!=NULL;
            BOOL lockTrap=trapGame && (key=='0' || key==VK_NUMPAD0) && control && !(GetAsyncKeyState(VK_SHIFT)&0x8000);
            if((game || trapGame) && (k->flags & LLKHF_ALTDOWN) && (lockTrap || (!control && ((key>='0' && key<='9') || key==VK_OEM_MINUS || key==VK_LEFT || key==VK_RIGHT || (trapGame && !(GetAsyncKeyState(VK_SHIFT)&0x8000) && (key==VK_UP || key==VK_DOWN)) || key=='T' || strchr("QWERYUIO",key) || (trapGame && (key=='P' || key=='L')))))) {
                if(!pressed[key]) {
                    char text[2]={(char)(key==VK_OEM_MINUS?'-':key),0};
                    printf("{\"type\":\"hotkey\",\"player\":%d,\"key\":\"%s\"}\n",(GetAsyncKeyState(VK_SHIFT)&0x8000)?1:0,lockTrap?"LockTrap":key==VK_LEFT?"Left":key==VK_RIGHT?"Right":key==VK_UP?"Up":key==VK_DOWN?"Down":text);
                    fflush(stdout); pressed[key]=1;
                }
                return 1;
            }
        }
    }
    return CallNextHookEx(NULL,code,message,data);
}
static int watch(void) {
    watching=1; setvbuf(stdout,NULL,_IONBF,0); session();
    HHOOK hook=SetWindowsHookExW(WH_KEYBOARD_LL,keyboard,GetModuleHandleW(NULL),0);
    if(!hook) fail("Could not install focused Cemu shortcuts.");
    UINT_PTR timer=SetTimer(NULL,0,1000,NULL);
    if(!timer) fail("Could not start session monitor.");
    MSG msg;
    while(GetMessageW(&msg,NULL,0,0)>0) {
        if(msg.message==WM_TIMER) session();
        TranslateMessage(&msg); DispatchMessageW(&msg);
    }
    UnhookWindowsHookEx(hook); return 0;
}
int main(int argc,char **argv) {
    /* Obtain Unicode arguments even when the Windows ANSI code page is not UTF-8. */
    int wide_argc; LPWSTR *wide_argv=CommandLineToArgvW(GetCommandLineW(),&wide_argc);
    if(!wide_argv) fail("Cannot read command line.");
    argc=wide_argc; argv=calloc((size_t)argc,sizeof(char*));
    if(!argv) fail("Out of memory.");
    for(int i=0;i<argc;i++) {
        int n=WideCharToMultiByte(CP_UTF8,0,wide_argv[i],-1,NULL,0,NULL,NULL);
        argv[i]=malloc((size_t)n);
        if(!argv[i] || !WideCharToMultiByte(CP_UTF8,0,wide_argv[i],-1,argv[i],n,NULL,NULL)) fail("Cannot decode arguments.");
    }
    LocalFree(wide_argv);
    if(argc==2 && !strcmp(argv[1],"watch")) return watch();
    HANDLE mutex=CreateMutexW(NULL,TRUE,L"Local\\DePerPortalProbe");
    if(!mutex || GetLastError()==ERROR_ALREADY_EXISTS) fail("Another portal operation is running.");
    if(argc<2 || (strcmp(argv[1],"inspect") && strcmp(argv[1],"enable") && strcmp(argv[1],"load") && strcmp(argv[1],"clear")))
        fail("Usage: portal-probe inspect | enable | load ROW ABSOLUTE_PATH | clear ROW");
    int row=0; wchar_t path[32768];
    if(!strcmp(argv[1],"load") || !strcmp(argv[1],"clear")) {
        if(argc<3) fail("Missing row (1-16).");
        char *end; long value=strtol(argv[2],&end,10);
        if(*end || value<1 || value>16) fail("Row must be 1-16.");
        row=(int)value-1;
    }
    if(!strcmp(argv[1],"load")) {
        if(argc!=4) fail("Missing absolute dump path.");
        if(!MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,argv[3],-1,path,32768)) fail("Invalid UTF-8 path.");
        if(!(wcslen(path)>2 && path[1]==L':' && (path[2]==L'\\' || path[2]==L'/'))) fail("Use an absolute Windows drive path.");
        HANDLE f=CreateFileW(path,GENERIC_READ,FILE_SHARE_READ|FILE_SHARE_WRITE,NULL,OPEN_EXISTING,0,NULL);
        if(f==INVALID_HANDLE_VALUE) fail("Cannot read incoming dump.");
        LARGE_INTEGER size; BOOL ok=GetFileSizeEx(f,&size); CloseHandle(f);
        if(!ok || size.QuadPart!=1024) fail("Prototype requires a 1024-byte dump.");
    }
    EnumWindows(find_main,0); if(!main_window) fail("Start Cemu first (English UI, windowed).");
    if(!tested_binary()) fail("Unsupported Cemu executable: this prototype targets the tested portal build only.");
    { wchar_t s[512]; title(main_window,s); fprintf(stderr,"Cemu: %s pid=%lu menu-count=%d\n",utf8(s),(unsigned long)pid,GetMenuItemCount(GetMenu(main_window))); }
    HWND previous_foreground=GetForegroundWindow();
    BOOL background=GetEnvironmentVariableW(L"DE_PERPORTAL_BACKGROUND",NULL,0)>0;
    EnumWindows(find_windows,0);
    if(dialog) fail("An existing dump dialog is open. Close it first.");
    UINT command=menu_command(GetMenu(main_window));
    if(!portal && (!command || command==(UINT)-1)) {
        fprintf(stderr,"Wine menu fallback: invoking tested Cemu 2.0 portal command 20603.\n");
        PostMessageW(main_window,WM_COMMAND,20603,0);
    } else if(!portal && command && command!=(UINT)-1) PostMessageW(main_window,WM_COMMAND,command,0);
    wait_portal(); Sleep(250);
    if(!IsWindowVisible(portal)) ShowWindow(portal,SW_SHOW);
    /* Do not hide portal or dialogs in background mode: hiding windows that own active
       dialogs causes GetOpenFileName to misbehave (WM_SETTEXT is ignored, IDOK fails).
       The portal and file dialog will flash briefly during automation; that is acceptable. */
    if(!strcmp(argv[1],"inspect")) { EnumChildWindows(portal,inspect,0); return 0; }
    EnumChildWindows(portal,collect,0);
    if(!strcmp(argv[1],"enable")) {
        DWORD_PTR state=0;
        if(!checkbox || !SendMessageTimeoutW(checkbox,BM_GETCHECK,0,0,SMTO_ABORTIFHUNG,2000,&state)) fail("Cannot read portal checkbox.");
        if(state!=BST_CHECKED) click(checkbox);
        for(int i=0;i<100;i++) {
            Sleep(100);
            if(SendMessageTimeoutW(checkbox,BM_GETCHECK,0,0,SMTO_ABORTIFHUNG,2000,&state) && state==BST_CHECKED) {
                puts("Cemu portal checkbox is enabled."); return 0;
            }
        }
        fail("Cemu did not enable portal emulation.");
    }
    if(nl!=16 || nc!=16 || ne!=16) fail("Unexpected portal controls. Run inspect; no swap attempted.");
    qsort(loads,16,sizeof(HWND),by_y); qsort(clears,16,sizeof(HWND),by_y); qsort(edits,16,sizeof(HWND),by_y);
    wchar_t before[512],after[512]; title(edits[row],before);
    if(!strcmp(argv[1],"clear")) click(clears[row]);
    else {
        click(loads[row]);
        for(int i=0;i<100 && !dialog;i++) { EnumWindows(find_windows,0); Sleep(100); }
        if(!dialog) fail("Dump dialog did not appear.");
        /* Do not hide the dialog: hiding it prevents Cemu's shell dialog from processing the
           OK button click, causing portal-control to wait indefinitely for the dialog to close.
           Instead, populate the filename and dismiss it as fast as possible. */

        /* Primary: CDM_SETCONTROLTEXT is the documented API for setting the filename in a
           GetOpenFileName dialog (edt1 = 0x480). Works on both legacy and modern layouts. */
        DWORD_PTR result = 0;
        SendMessageTimeoutW(dialog,CDM_SETCONTROLTEXT,0x480,(LPARAM)path,SMTO_ABORTIFHUNG,2000,&result);

        if(!result) {
            /* Fallback: find the Edit control directly. Try the legacy ID first, then
               recurse through all children for IFileDialog's deeper nesting. */
            HWND filename=GetDlgItem(dialog,0x480), edit=NULL;
            if(filename) EnumChildWindows(filename,find_edit,(LPARAM)&edit);
            if(!edit) edit=GetDlgItem(dialog,0x480);
            if(!edit) EnumChildWindows(dialog,find_edit_recursive,(LPARAM)&edit);
            if(!edit) { EnumChildWindows(dialog,inspect,0); fail("Filename control not found. Leave dialog open for inspection."); }
            wchar_t cls[128]; GetClassNameW(edit,cls,128);
            if(wcscmp(cls,L"Edit")) fail("Unknown filename control; no file submitted.");
            if(!SendMessageTimeoutW(edit,WM_SETTEXT,0,(LPARAM)path,SMTO_ABORTIFHUNG,2000,&result) || !result)
                fail("Could not enter dump path.");
        }

        /* SendMessage (synchronous) for the OK button so we wait for Cemu to process
           the click and close the dialog before portal-control returns. */
        HWND open=GetDlgItem(dialog,IDOK); if(!open) fail("Open button missing."); click_sync(open);
        for(int i=0;i<100 && IsWindow(dialog);i++) Sleep(100);
        if(IsWindow(dialog)) fail("Cemu did not finish loading. Check its dialog.");
    }
    for(int i=0;i<100;i++) {
        title(edits[row],after);
        if(after[0] && (!strcmp(argv[1],"clear") ? wcscmp(after,L"None")==0 : wcscmp(after,L"None")!=0)) break;
        Sleep(100);
    }
    printf("Row %d: %s -> %s\n",row+1,utf8(before),utf8(after));
    if(!after[0] || (!strcmp(argv[1],"clear") ? wcscmp(after,L"None")!=0 : wcscmp(after,L"None")==0))
        fail("Requested row state was not observed.");
    puts("UI operation completed; verify figure identity and game behavior in Cemu.");
    if(background && IsWindow(portal)) {
        /* Dismiss only after the file dialog has finished and the row was verified.
           Cemu reuses this window; WM_CLOSE can be ignored on subsequent swaps. */
        ShowWindow(portal,SW_HIDE);
        if(IsWindow(portal) && IsWindowVisible(portal)) fail("Emulated USB Devices did not close.");
    }
    if(IsWindow(previous_foreground) && previous_foreground!=portal) SetForegroundWindow(previous_foreground);
    else if(background) SetForegroundWindow(main_window);
    return 0;
}

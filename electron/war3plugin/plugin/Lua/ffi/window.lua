local ffi = require 'ffi'
require 'ffi.hWnd'


ffi.cdef[[

    int IsDialogMessageW(
        HWND hWndDlg,
        LPMSG lpMsg
    );
    typedef INT_PTR (__stdcall *DLGPROC)(
        HWND unnamedParam1,
        UINT unnamedParam2,
        WPARAM unnamedParam3,
        LPARAM unnamedParam4
    );
    HWND CreateDialogW(
        HINSTANCE hInstance,
        LPCWSTR lpTemplateName,
        HWND hWndParent,
        DLGPROC lpDialogProc
    );
    HWND CreateDialogParamW(
        HINSTANCE hInstance,
        LPCWSTR lpTemplateName,
        HWND hWndParent,
        DLGPROC lpDialogProc,
        LPARAM dwInitParam
    );

    HWND CreateWindowExW(
        DWORD dwExStyle,
        LPCWSTR lpClassName,
        LPCWSTR lpWindowName,
        DWORD dwStyle,
        int X,
        int Y,
        int nWidth,
        int nHeight,
        HWND hWndParent,
        HMENU hMenu,
        HINSTANCE hInstance,
        LPVOID lpParam
    );

    HMODULE WINAPI GetModuleHandleW(
        LPCWSTR lpModuleName
    );
    //声明 UpdateWindow 头文件
    BOOL WINAPI UpdateWindow(
        HWND hWnd
    );

    //SetWindowTextW
    BOOL WINAPI SetWindowTextW(
        HWND hWnd,
        LPCWSTR lpString
    );
    //GetWindowTextW
    int WINAPI GetWindowTextW(
        HWND hWnd,
        LPWSTR lpString,
        int nMaxCount
    );

    BOOL WINAPI GetMessageW(
        LPMSG lpMsg,
        HWND hWnd,
        UINT wMsgFilterMin,
        UINT wMsgFilterMax
    );
    //DispatchMessage
    LRESULT CALLBACK DispatchMessageW(
        const LPMSG lpMsg
    );
    //PostQuitMessage
    void WINAPI PostQuitMessage(
        int nExitCode
    );
    //RegisterClassExW
    WORD WINAPI RegisterClassExW(
        const LPWNDCLASSEXW lpwcx
    );
    //ShowWindow
    BOOL WINAPI ShowWindow(
        HWND hWnd,
        int nCmdShow
    );
    //GetDC
    HDC WINAPI GetDC(
        HWND hWnd
    );
    HDC WINAPI BeginPaint(
        HWND hWnd,
        LPPAINTSTRUCT lpPaint
    );
    //EndPaint
    BOOL WINAPI EndPaint(
        HWND hWnd,
        const LPPAINTSTRUCT lpPaint
    );
    //TextOut
    void WINAPI TextOutW(
        HDC hdc,
        int nXStart,
        int nYStart,
        LPCWSTR lpString,
        int cchString
    );
    //GetSysColorBrush
    HBRUSH WINAPI GetSysColorBrush(
        int nIndex
    );
    HMENU GetSystemMenu(
        HWND hWnd,
        BOOL bRevert
    );
    BOOL InsertMenuW(
        HMENU    hMenu,
        UINT     uPosition,
        UINT     uFlags,
        UINT_PTR uIDNewItem,
        LPCWSTR  lpNewItem
    );
    BOOL WINAPI TranslateMessage(
        const MSG *lpMsg
    );
    //LoadCursorW
    HCURSOR WINAPI LoadCursorW(
        HINSTANCE hInstance,
        LPCWSTR lpCursorName
    );

]]
local WM_DESTROY = 0x0002
local WM_PAINT = 0x000F  -- 15
local WM_CREATE = 0x0001
local WM_COMMAND = 0x0111
local WM_KEYDOWN = 0x0100
local WM_SETTEXT = 0x000C
local WM_CLOSE = 0x0010
local WM_QUIT = 0x0012
local WM_SIZE = 0x0005
local WM_MOVE = 0x0003
local WM_SETFOCUS = 0x0007
local WM_KILLFOCUS = 0x0008
local WM_SETCURSOR = 0x0020
local WM_MOUSEMOVE = 0x0200
local WM_LBUTTONDOWN = 0x0201
local WM_LBUTTONUP = 0x0202
local WM_MBUTTONDOWN = 0x0207
local WM_MBUTTONUP = 0x0208
local WM_RBUTTONDOWN = 0x0204
local WM_RBUTTONUP = 0x0205
local WM_CONTEXTMENU = 0x007B
local WM_ACTIVATE = 0x0006

local CS_HREDRAW = 0x0002
local CS_VREDRAW = 0x0001


---@class window
---@field CreateWindowExW fun( dwExStyle:DWORD, lpClassName:LPCWSTR, lpWindowName:LPCWSTR, dwStyle:DWORD, X:int, Y:int, nWidth:int, nHeight:int, hWndParent:HWND, hMenu:HMENU ,hInstance:HINSTANCE, lpParam:LPVOID)
---@field GetMessageW fun(lpMsg:LPMSG, hWnd:HWND, wMsgFilterMin:UINT, wMsgFilterMax:UINT)
local mt =
{
    RegisterClassExW = ffi.C.RegisterClassExW,
    CreateWindowExW = ffi.C.CreateWindowExW,

    UpdateWindow = ffi.C.UpdateWindow,
    ShowWindow = ffi.C.ShowWindow,
    SetWindowTextW = ffi.C.SetWindowTextW,
    GetWindowTextW = ffi.C.GetWindowTextW,

    DefWindowProcW  = ffi.C.DefWindowProcW,
    DefWindowProcA = ffi.C.DefWindowProcA,
    DefDlgProcW = ffi.C.DefDlgProcW,

    GetModuleHandleW = ffi.C.GetModuleHandleW,

    GetSystemMenu = ffi.C.GetSystemMenu,
    InsertMenuW = ffi.C.InsertMenuW,

    --消息分发
    DispatchMessageW =  ffi.C.DispatchMessageW,
    GetMessageW = ffi.C.GetMessageW,
    TranslateMessage = ffi.C.TranslateMessage,
    PostQuitMessage = ffi.C.PostQuitMessage,

    --自绘
    GetDC = ffi.C.GetDC,
    GetSysColorBrush = ffi.C.GetSysColorBrush,
    BeginPaint = ffi.C.BeginPaint,
    EndPaint = ffi.C.EndPaint,
    TextOutW = ffi.C.TextOutW,

    LoadCursorW = ffi.C.LoadCursorW,

    WM_DESTROY  = WM_DESTROY,
    WM_PAINT    = WM_PAINT,
    WM_CREATE   = WM_CREATE,
    WM_COMMAND  = WM_COMMAND,
    WM_SIZE     = WM_SIZE,
    WM_ACTIVATE = WM_ACTIVATE,
    WM_MOVE     = WM_MOVE,
    WM_MOUSEMOVE= WM_MOUSEMOVE,


    CS_HREDRAW  = CS_HREDRAW,
    CS_VREDRAW  = CS_VREDRAW,

}

return mt

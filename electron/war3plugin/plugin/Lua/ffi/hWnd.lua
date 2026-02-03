local ffi = require 'ffi'

ffi.cdef[[
    typedef void* HANDLE;
    typedef void* LPVOID;
    //HDC
    struct HDC__{
        int unused;
    };
    typedef HDC__* HDC;

    //HBRUSH
     struct HBRUSH__{
        int unused;
    };
    typedef HBRUSH__* HBRUSH;

    //HWND
    struct HWND__{
        int unused;
    };
    typedef HWND__* HWND;

    //HINSTANCE
    struct HINSTANCE__{
        int unused;
    };
    typedef HINSTANCE__* HINSTANCE;

    //HMENU
    struct HMENU__{
        int unused;
    };
    typedef HMENU__* HMENU;

    //HICON
    struct HICON__{
        int unused;
    };
    typedef HICON__* HICON;
    typedef HICON HCURSOR;

    typedef struct tagPOINT
    {
        LONG  x;
        LONG  y;
    } POINT, *PPOINT, NEAR *NPPOINT, FAR *LPPOINT;

    typedef struct tagMSG {
        HWND        hwnd;
        UINT        message;
        WPARAM      wParam;
        LPARAM      lParam;
        DWORD       time;
        POINT       pt;
    } MSG, *PMSG, NEAR *NPMSG, FAR *LPMSG;

    //callback WNDPROC
    typedef LRESULT (__stdcall* WNDPROC)(HWND, UINT, WPARAM, LPARAM);
    
    //WNDCLASSEXW
    typedef struct tagWNDCLASSEXW {
        UINT        cbSize;
        /* Win 3.x */
        UINT        style;
        WNDPROC     lpfnWndProc;
        int         cbClsExtra;
        int         cbWndExtra;
        HINSTANCE   hInstance;
        HICON       hIcon;
        HCURSOR     hCursor;
        HBRUSH      hbrBackground;
        LPCWSTR     lpszMenuName;
        LPCWSTR     lpszClassName;
        /* Win 4.0 */
        HICON       hIconSm;
    } WNDCLASSEXW, *PWNDCLASSEXW, NEAR *NPWNDCLASSEXW, FAR *LPWNDCLASSEXW;
    //PAINTSTRUCT
    typedef struct tagPAINTSTRUCT {
        HDC         hdc;
        BOOL        fErase;
        RECT        rcPaint;
        BOOL        fRestore;
        BOOL        fIncUpdate;
        BYTE        rgbReserved[32];
    } PAINTSTRUCT, *PPAINTSTRUCT, *NPPAINTSTRUCT, *LPPAINTSTRUCT;

    LRESULT DefWindowProcW(
        HWND   hWnd,
        UINT   Msg,
        WPARAM wParam,
        LPARAM lParam
    );
    //DefWindowProcA
    LRESULT DefWindowProcA(
        HWND   hWnd,
        UINT   Msg,
        WPARAM wParam,
        LPARAM lParam
    );
    //defDlgProcW 
    LRESULT DefDlgProcW(
        HWND   hDlg,
        UINT   uMsg,
        WPARAM wParam,
        LPARAM lParam
    );
    
    HWND FindWindowW(const wchar_t *lpClassName, const wchar_t *lpWindowName);
    //FindWindowA
    HWND FindWindowA(const char *lpClassName, const char *lpWindowName);

	//FindWindowEx
	HWND FindWindowExW(
	   HWND hWndParent,
	   HWND hWndChildAfter,
	   const wchar_t *lpszClass,
	   const wchar_t *lpszWindow
	);
	//FindWindowExA
	HWND FindWindowExA(
	   HWND hWndParent,
	   HWND hWndChildAfter,
	   const char *lpszClass,
	   const char *lpszWindow
	);

	//GetCurrentProcessId
	int GetCurrentProcessId();

	//GetWindowThreadProcessId
	int GetWindowThreadProcessId(
	   HWND hWnd,
	   int *lpdwProcessId
	);

    //CreateWindowExA
    HWND CreateWindowExA(
        DWORD   dwExStyle,
        LPCSTR lpClassName,
        LPCSTR lpWindowName,
        DWORD   dwStyle,
        int      x,
        int      y,
        int      nWidth,
        int      nHeight,
        HWND    hWndParent,
        HMENU   hMenu,
        HINSTANCE hInstance,
        LPVOID   lpParam
    );
]]
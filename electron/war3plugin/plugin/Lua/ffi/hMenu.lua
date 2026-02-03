local ffi = require 'ffi'
ffi.cdef[[
	//MENUITEMINFOW
	typedef struct tagMENUITEMINFOW {
		int cbSize;
		int fMask;
		int fType;
		int fState;
		int wID;
		int hbmpChecked;
		int hbmpUnchecked;
		int hSubMenu;
		int dwItemData;
		const wchar_t *dwTypeData;
		int cch;
		int dwVersion;
	} MENUITEMINFOW, *LPMENUITEMINFOW;
	//appendMenuW
	int AppendMenuW(
	   int hMenu,
	   int uFlags,
	   int uIDNewItem,
	   const wchar_t *lpNewItem
	);
	//GetMenu
	int GetMenu(
	   int hWnd
	);
	//GetSubMenu
	int GetSubMenu(
	   int hMenu,
	   int nPos
	);
	//GetMenuItemCount
	int GetMenuItemCount(
	   int hMenu
	);
	//GetMenuItemIDW
	int GetMenuItemIDW(
	   int hMenu,
	   int nPos
	);
	//GetMenuStringW
	int GetMenuStringW(
	   int hMenu,
	   int uIDItem,
	   wchar_t *lpString,
	   int nMaxCount,
	   int uFlags
	);
	//GetMenuItemInfoW
	bool GetMenuItemInfoW(
	   int hMenu,
	   int uItem,
	   int fByPosition,
	   MENUITEMINFOW *lpMenuItemInfo
	);
	//InsertMenuItemW
	bool InsertMenuItemW(
	   int hMenu,
	   int uPosition,
	   int fByPosition,
	   MENUITEMINFOW *lpMenuItemInfo
	);
	//CreatePopupMenu
	int CreatePopupMenu();
	

]]

#NoEnv
#SingleInstance Force
SendMode Input
SetWorkingDir %A_ScriptDir%

commandFile := A_ScriptDir "\war3_command.txt"

SetTimer, ReadCommand, 500
return

ReadCommand:
    if !FileExist(commandFile)
        return

    FileRead, content, %commandFile%
    if (content = "")
        return

    FileDelete, %commandFile%

    lines := StrSplit(content, "`n")
    for index, line in lines
    {
        line := Trim(line)
        if (line = "")
            continue

        parts := StrSplit(line, "|")
        if (parts.MaxIndex() < 2)
            continue

        cmd := parts[1]
        name := parts[2]

        if (cmd = "JOIN")
        {
            SendJoin(name)
        }
    }
return

SendJoin(name)
{
    IfWinExist, Warcraft III
    {
        WinActivate
        Sleep, 200
        Send, {Enter}
        Sleep, 100
        Send, -JOIN %name%
        Sleep, 100
        Send, {Enter}
    }
}

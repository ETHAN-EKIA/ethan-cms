$WshShell = New-Object -ComObject WScript.Shell
$StartupFolder = [System.IO.Path]::Combine($env:APPDATA, "Microsoft\Windows\Start Menu\Programs\Startup")
$ShortcutPath = [System.IO.Path]::Combine($StartupFolder, "ETHAN CMS AutoStart.lnk")
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "C:\Users\EKIA\Desktop\ETHAN SECURITY CAMERA\start-cms-silent.vbs"
$Shortcut.WorkingDirectory = "C:\Users\EKIA\Desktop\ETHAN SECURITY CAMERA"
$Shortcut.Description = "ETHAN CMS Auto Start on Boot"
$Shortcut.Save()
Write-Host "Startup shortcut created at: $ShortcutPath"

!macro customUnInstall
  IfSilent keep_data
  MessageBox MB_YESNO "Вы хотите полностью удалить пользовательские данные Layle Launcher (настройки, сессии, профили)?" IDNO keep_data
    RMDir /r "$APPDATA\layle-launcher"
    RMDir /r "$LOCALAPPDATA\layle-launcher-updater"
  keep_data:
!macroend

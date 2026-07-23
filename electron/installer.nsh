!macro customUnInstall
  IfSilent keep_data
  # MB_YESNO | MB_DEFBUTTON2 means No (keep) is the default selected button
  MessageBox MB_YESNO|MB_DEFBUTTON2 "Вы хотите выполнить ПОЛНОЕ удаление Layle Launcher (удалить ВСЕ профили сборок, настройки, сессии и кэш)?$\n$\nЕсли нажать 'Нет' (Рекомендуется), удалится только приложение, а ваши настройки и сессия сохранятся." IDYES delete_all
  Goto keep_data

  delete_all:
    DetailPrint "Полное удаление пользовательских данных..."
    RMDir /r "$APPDATA\layle-launcher"
    RMDir /r "$APPDATA\LayleLauncher"
    RMDir /r "$LOCALAPPDATA\layle-launcher-updater"
  keep_data:
!macroend

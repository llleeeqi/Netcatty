; Optional, user-visible data cleanup for the assisted Windows uninstaller.
; Never run it for an in-place update.
!macro customUnInstallSection
  Section /o "un.Delete all Netcatty local data" SEC_DELETE_NETCATTY_DATA
    ${ifNot} ${isUpdated}
      RMDir /r "$APPDATA\Netcatty"
      RMDir /r "$LOCALAPPDATA\Netcatty"
      RMDir /r "$TEMP\Netcatty"
      RMDir /r "$PROFILE\.netcatty\keys"
      RMDir /r "$PROFILE\.netcatty\tmp\Netcatty"
    ${endIf}
  SectionEnd
!macroend

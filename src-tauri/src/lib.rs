use tauri::Manager;

/// True when running as the Microsoft Store (MSIX) package. The Store installs apps under
/// ...\WindowsApps\..., and it updates them itself, so the app must not offer its own
/// installer download there.
#[tauri::command]
fn is_store_package() -> bool {
  std::env::current_exe()
    .map(|p| p.to_string_lossy().to_lowercase().contains("\\windowsapps\\"))
    .unwrap_or(false)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let mut builder = tauri::Builder::default();

  // Must be the first plugin. Opening notenirman://auth-callback (Google sign-in) makes
  // Windows start a second copy of the app; this hands the URL to the running window
  // (through the deep-link plugin) and quits the second copy, instead of leaving the user
  // with two windows where the sign-in finished in the wrong one.
  #[cfg(desktop)]
  {
    builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
      }
    }));
  }

  builder
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_deep_link::init())
    .invoke_handler(tauri::generate_handler![is_store_package])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Windows/Linux only need this in dev builds - a properly installed
      // NSIS/MSI package registers the notenirman:// scheme in the OS on
      // install (from the "deep-link" config in tauri.conf.json). This just
      // makes `cargo tauri dev` / `npm run tauri:dev` work the same way
      // without a real install, for local testing of the Google sign-in
      // callback. The Microsoft Store package declares the scheme in its
      // manifest instead, and cannot write it at runtime, so a failure here
      // must never stop the app from starting.
      #[cfg(any(windows, target_os = "linux"))]
      {
        use tauri_plugin_deep_link::DeepLinkExt;
        let _ = app.deep_link().register_all();
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

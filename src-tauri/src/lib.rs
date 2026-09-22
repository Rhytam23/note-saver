#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_deep_link::init())
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
      // callback.
      #[cfg(any(windows, target_os = "linux"))]
      {
        use tauri_plugin_deep_link::DeepLinkExt;
        app.deep_link().register_all()?;
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

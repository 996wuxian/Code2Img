mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_background_color(Some(tauri::window::Color(
                    11, 13, 18, 255,
                )));
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![commands::window_set_theme])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

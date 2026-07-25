use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn window_set_theme(app: AppHandle, theme: String) -> Result<(), String> {
    let color = if theme.eq_ignore_ascii_case("light") {
        tauri::window::Color(244, 245, 247, 255)
    } else {
        tauri::window::Color(11, 13, 18, 255)
    };
    if let Some(window) = app.get_webview_window("main") {
        window
            .set_background_color(Some(color))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

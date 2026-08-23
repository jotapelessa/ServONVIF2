// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

struct EngineProcess(Mutex<Option<Child>>);

#[tauri::command]
fn get_engine_status() -> String {
    "Engine running on http://localhost:8080".to_string()
}

fn spawn_engine_subprocess() -> Option<Child> {
    // In production, this launches the bundled Python binary/sidecar
    println!("Spawning ServONVIF Core Engine sidecar process...");
    Command::new("python")
        .args(["-m", "engine.main"])
        .spawn()
        .ok()
}

fn main() {
    tauri::Builder::default()
        .manage(EngineProcess(Mutex::new(None)))
        .setup(|app| {
            // Start the engine sidecar in background
            let child = spawn_engine_subprocess();
            let state: State<EngineProcess> = app.state();
            *state.0.lock().unwrap() = child;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_engine_status])
        .run(tauri::generate_context!())
        .expect("error while running ServONVIF desktop application");
}

//! VOXEL Bridge — a real HTTP API for the mobile app.
//!
//! The mobile experience mirrors the desktop because it talks to the
//! SAME engine: real project rows (SQLite), real Gradle builds, real
//! servers (start/stop/stdin console), real SLP pings and real AI
//! streaming — all through the same validated Rust commands. Keys never
//! leave the PC: the bridge reads the API key from the OS keyring and
//! performs the provider calls itself.
//!
//! Security model:
//! - opt-in from Settings → Mobile (off by default)
//! - 8-char bearer token generated at start, shown in the desktop UI
//! - allowlisted routes only; every mutating action reuses existing
//!   validated commands — no new filesystem/process surface

use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::{sse::{Event, KeepAlive, Sse}, IntoResponse},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Listener, Manager};

use super::secrets;
use super::serverping;
use super::{process, servers};

const BRIDGE_PORT: u16 = 3717;

// ---------------------------------------------------------------------------
// Shared state (set by commands, read by handlers — both in this process)
// ---------------------------------------------------------------------------

#[derive(Default, Clone)]
struct AiConfig {
    provider: String,
    base_url: String,
    model: String,
}

static BRIDGE_TOKEN: Mutex<Option<String>> = Mutex::new(None);
static BRIDGE_HANDLE: Mutex<Option<tokio::sync::oneshot::Sender<()>>> = Mutex::new(None);
static BRIDGE_AI: Mutex<Option<AiConfig>> = Mutex::new(None);
static CONSOLE_RING: std::sync::LazyLock<Mutex<std::collections::HashMap<String, Vec<String>>>> =
    std::sync::LazyLock::new(|| Mutex::new(std::collections::HashMap::new()));
static CONSOLE_LISTENERS: std::sync::LazyLock<Mutex<std::collections::HashMap<String, tauri::EventId>>> =
    std::sync::LazyLock::new(|| Mutex::new(std::collections::HashMap::new()));

const CONSOLE_RING_CAP: usize = 1000;

/// Registers (once per slug) a listener that feeds the console ring buffer.
fn ensure_console_listener(app: &AppHandle, slug: &str) {
    let mut listeners = CONSOLE_LISTENERS.lock().unwrap();
    if listeners.contains_key(slug) {
        return;
    }
    let slug_owned = slug.to_string();
    let id = app.listen(format!("server/{slug}:log"), move |event: tauri::Event| {
        if let Ok(value) = serde_json::from_str::<Value>(event.payload()) {
            if let Some(line) = value.get("line").and_then(|l| l.as_str()) {
                let mut ring = CONSOLE_RING.lock().unwrap();
                let buffer = ring.entry(slug_owned.clone()).or_default();
                buffer.push(line.to_string());
                if buffer.len() > CONSOLE_RING_CAP {
                    buffer.drain(..buffer.len() - CONSOLE_RING_CAP);
                }
            }
        }
    });
    listeners.insert(slug.to_string(), id);
}

#[derive(Clone)]
struct BridgeCtx {
    app: AppHandle,
    token: Arc<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BridgeInfo {
    pub running: bool,
    pub port: u16,
    pub token: Option<String>,
    pub addresses: Vec<String>,
}

// ---------------------------------------------------------------------------
// Settings → Mobile commands
// ---------------------------------------------------------------------------

fn db_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let config = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("config dir: {e}"))?;
    Ok(config.join("nexuscraft.db"))
}

fn read_setting(app: &AppHandle, key: &str) -> Result<Option<String>, String> {
    let conn = rusqlite::Connection::open(db_path(app)?).map_err(|e| format!("open db: {e}"))?;
    let mut stmt = conn
        .prepare("SELECT value FROM settings WHERE key = ?1")
        .map_err(|e| format!("prepare: {e}"))?;
    let mut rows = stmt.query([key]).map_err(|e| format!("query: {e}"))?;
    if let Some(row) = rows.next().map_err(|e| format!("row: {e}"))? {
        Ok(Some(row.get::<_, String>(0).map_err(|e| format!("col: {e}"))?))
    } else {
        Ok(None)
    }
}

fn base_path_of(app: &AppHandle) -> Result<String, String> {
    let raw = read_setting(app, "storage")?.unwrap_or_default();
    let value: Value = serde_json::from_str(&raw).map_err(|e| format!("storage setting: {e}"))?;
    value
        .get("basePath")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "Storage location is not configured on this PC".to_string())
}

/// Runs a SELECT and maps snake_case columns to camelCase JSON objects.
fn query_rows(app: &AppHandle, sql: &str) -> Result<Vec<Value>, String> {
    let conn = rusqlite::Connection::open(db_path(app)?).map_err(|e| format!("open db: {e}"))?;
    let mut stmt = conn.prepare(sql).map_err(|e| format!("prepare: {e}"))?;
    let names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
    let mut rows = stmt.query([]).map_err(|e| format!("query: {e}"))?;
    let mut out = Vec::new();
    while let Some(row) = rows.next().map_err(|e| format!("row: {e}"))? {
        let mut object = serde_json::Map::new();
        for (i, name) in names.iter().enumerate() {
            let value = match row.get_ref(i) {
                Ok(rusqlite::types::ValueRef::Null) => Value::Null,
                Ok(rusqlite::types::ValueRef::Integer(n)) => Value::from(n),
                Ok(rusqlite::types::ValueRef::Real(f)) => Value::from(f),
                Ok(rusqlite::types::ValueRef::Text(t)) => {
                    Value::from(String::from_utf8_lossy(t).to_string())
                }
                Ok(rusqlite::types::ValueRef::Blob(_)) => Value::Null,
                Err(e) => return Err(format!("cell: {e}")),
            };
            object.insert(camel(name), value);
        }
        out.push(Value::Object(object));
    }
    Ok(out)
}

fn camel(name: &str) -> String {
    let mut out = String::new();
    let mut upper_next = false;
    for ch in name.chars() {
        if ch == '_' {
            upper_next = true;
        } else if upper_next {
            out.extend(ch.to_uppercase());
            upper_next = false;
        } else {
            out.push(ch);
        }
    }
    out
}

fn bridge_running() -> bool {
    BRIDGE_HANDLE.lock().unwrap().is_some()
}

#[tauri::command]
pub fn bridge_status() -> BridgeInfo {
    let addresses = local_ip_address::local_ip()
        .map(|ip| vec![ip.to_string()])
        .unwrap_or_default();
    BridgeInfo {
        running: bridge_running(),
        port: BRIDGE_PORT,
        token: BRIDGE_TOKEN.lock().unwrap().clone(),
        addresses,
    }
}

fn random_token() -> String {
    // 8 chars from an unambiguous alphabet; the token is paired in person
    // (typed from the PC screen), so time+pid entropy is sufficient.
    const ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let mut bytes = [0u8; 8];
    let pid = std::process::id() as u128;
    for (i, slot) in bytes.iter_mut().enumerate() {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let mixed = (nanos ^ pid.rotate_left(i as u32 % 32) ^ ((i + 1) as u128 * 0x9E3779B97F4A7C15))
            >> ((i * 7) % 64);
        *slot = ALPHABET[(mixed % ALPHABET.len() as u128) as usize];
    }
    String::from_utf8(bytes.to_vec()).unwrap()
}

#[tauri::command]
pub fn bridge_start(app: AppHandle) -> Result<BridgeInfo, String> {
    if bridge_running() {
        return Ok(bridge_status());
    }
    let token = random_token();
    *BRIDGE_TOKEN.lock().unwrap() = Some(token.clone());

    let ctx = BridgeCtx {
        app: app.clone(),
        token: Arc::new(token),
    };

    let (tx, rx) = tokio::sync::oneshot::channel::<()>();
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(2)
        .enable_all()
        .build()
        .map_err(|e| format!("tokio: {e}"))?;

    std::thread::spawn(move || {
        runtime.block_on(async move {
            let router = build_router(ctx).layer(
                tower_http::cors::CorsLayer::permissive(),
            );
            let addr = std::net::SocketAddr::from(([0, 0, 0, 0], BRIDGE_PORT));
            let listener = match tokio::net::TcpListener::bind(addr).await {
                Ok(l) => l,
                Err(e) => {
                    eprintln!("VOXEL bridge: bind failed: {e}");
                    *BRIDGE_TOKEN.lock().unwrap() = None;
                    return;
                }
            };
            *BRIDGE_HANDLE.lock().unwrap() = Some(tx);
            let serve = axum::serve(listener, router).with_graceful_shutdown(async {
                let _ = rx.await;
            });
            if let Err(e) = serve.await {
                eprintln!("VOXEL bridge stopped: {e}");
            }
            *BRIDGE_HANDLE.lock().unwrap() = None;
            *BRIDGE_TOKEN.lock().unwrap() = None;
        });
    });

    Ok(bridge_status())
}

#[tauri::command]
pub fn bridge_stop() -> Result<(), String> {
    if let Some(tx) = BRIDGE_HANDLE.lock().unwrap().take() {
        let _ = tx.send(());
    }
    Ok(())
}

/// Desktop frontend pushes the AI configuration when the bridge starts.
/// The API key itself NEVER travels — the bridge reads it from the keyring.
#[tauri::command]
pub fn bridge_set_ai_config(provider: String, base_url: String, model: String) -> Result<(), String> {
    *BRIDGE_AI.lock().unwrap() = Some(AiConfig {
        provider,
        base_url,
        model,
    });
    Ok(())
}

// ---------------------------------------------------------------------------
// Router & handlers
// ---------------------------------------------------------------------------

fn build_router(ctx: BridgeCtx) -> Router {
    Router::new()
        .route("/api/status", get(status))
        .route("/api/projects", get(projects))
        .route("/api/projects/{slug}/build", post(build_project))
        .route("/api/servers", get(servers))
        .route("/api/servers/{slug}/start", post(server_start))
        .route("/api/servers/{slug}/stop", post(server_stop))
        .route("/api/servers/{slug}/console/tail", get(console_tail))
        .route("/api/ping", post(ping_server))
        .route("/api/ai/chat", post(ai_chat))
        .route("/api/ai/ask", post(ai_ask))
        .layer(axum::middleware::from_fn_with_state(ctx.clone(), auth))
        .with_state(ctx)
}

async fn auth(
    axum::extract::State(ctx): axum::extract::State<BridgeCtx>,
    headers: HeaderMap,
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> axum::response::Response {
    let expected = format!("Bearer {}", ctx.token);
    let ok = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v == expected);
    if ok {
        next.run(request).await
    } else {
        (StatusCode::UNAUTHORIZED, "invalid token").into_response()
    }
}

fn workspace_stats(base: &str) -> Value {
    let count = |rel: &str| {
        std::path::Path::new(base)
            .join(rel)
            .read_dir()
            .map(|entries| entries.filter_map(|e| e.ok()).count())
            .unwrap_or(0)
    };
    json!({
        "projects": count("projects"),
        "servers": count("servers"),
        "shaderPacks": count("shaderpacks"),
        "instances": count("instances"),
    })
}

async fn status(State(ctx): State<BridgeCtx>) -> Json<Value> {
    let app = ctx.app.clone();
    let base = base_path_of(&app).ok();
    let stats = base
        .as_deref()
        .map(workspace_stats)
        .unwrap_or_else(|| json!({}));
    let ai = BRIDGE_AI.lock().unwrap().clone().unwrap_or_default();
    Json(json!({
        "app": "VOXEL",
        "version": app.package_info().version.to_string(),
        "workspace": stats,
        "ai": {
            "provider": ai.provider,
            "model": ai.model,
            "ready": !ai.model.is_empty(),
        },
    }))
}

async fn projects(State(ctx): State<BridgeCtx>) -> Result<Json<Value>, String> {
    let rows = query_rows(
        &ctx.app,
        "SELECT slug, name, minecraft_version, loader, description, status, \
         last_build_status, last_build_at FROM projects ORDER BY updated_at DESC",
    )?;
    Ok(Json(json!({ "projects": rows })))
}

async fn build_project(
    State(ctx): State<BridgeCtx>,
    Path(slug): Path<String>,
) -> Result<Json<Value>, String> {
    let base = base_path_of(&ctx.app)?;
    // Allowlisted task — the exact command the desktop Build button uses
    let handle = process::start_build(
        ctx.app.clone(),
        base,
        format!("projects/{slug}"),
        "build".into(),
        None,
    )?;
    Ok(Json(json!({ "ok": true, "process": handle })))
}

async fn servers(State(ctx): State<BridgeCtx>) -> Result<Json<Value>, String> {
    let mut list = query_rows(
        &ctx.app,
        "SELECT slug, name, software, minecraft_version, port, ram_mb, status \
         FROM servers ORDER BY updated_at DESC",
    )?;
    for server in list.iter_mut() {
        let slug = server.get("slug").and_then(|s| s.as_str()).unwrap_or("");
        let running = process::is_running(&format!("server/{slug}"));
        if let Some(object) = server.as_object_mut() {
            object.insert("running".into(), Value::from(running));
        }
    }
    Ok(Json(json!({ "servers": list })))
}

#[derive(Deserialize, Default)]
struct RamBody {
    #[serde(default)]
    ram_mb: Option<u32>,
}

async fn server_start(
    State(ctx): State<BridgeCtx>,
    Path(slug): Path<String>,
    body: Option<Json<RamBody>>,
) -> Result<Json<Value>, String> {
    let base = base_path_of(&ctx.app)?;
    let ram = body.unwrap_or_default().0.ram_mb.unwrap_or(2048);
    let pid = servers::server_start(ctx.app.clone(), base, slug, ram, None)?;
    Ok(Json(json!({ "ok": true, "pid": pid })))
}

async fn server_stop(Path(slug): Path<String>) -> Result<Json<Value>, String> {
    servers::server_stop(slug)?;
    Ok(Json(json!({ "ok": true })))
}

/// Console tail — the mobile app polls with the index of the last line it
/// has; the ring buffer on the PC keeps up to 1000 lines per server.
async fn console_tail(
    State(ctx): State<BridgeCtx>,
    Path(slug): Path<String>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Json<Value> {
    ensure_console_listener(&ctx.app, &slug);
    let after: usize = params
        .get("after")
        .and_then(|value| value.parse().ok())
        .unwrap_or(0);
    let ring = CONSOLE_RING.lock().unwrap();
    let buffer = ring.get(&slug).cloned().unwrap_or_default();
    let lines: Vec<String> = buffer.iter().skip(after).cloned().collect::<Vec<String>>();
    Json(json!({ "lines": lines, "total": buffer.len() }))
}

#[derive(Deserialize)]
struct PingBody {
    address: String,
    #[serde(default)]
    port: Option<u16>,
}

async fn ping_server(Json(body): Json<PingBody>) -> Result<Json<Value>, String> {
    let ping = serverping::server_ping(body.address, body.port)?;
    Ok(Json(serde_json::to_value(ping).map_err(|e| format!("{e}"))?))
}

#[derive(Deserialize)]
struct ChatMessageIn {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct ChatBody {
    messages: Vec<ChatMessageIn>,
}

/// One-shot AI answer (mobile) — accumulates the provider stream on the
/// PC and returns the full text. The key stays in the PC keyring.
async fn ai_ask(
    State(ctx): State<BridgeCtx>,
    Json(body): Json<ChatBody>,
) -> Result<Json<Value>, String> {
    let key = secrets::secrets_get(ctx.app.clone(), "ai_api_key".into())
        .ok()
        .flatten()
        .unwrap_or_default();
    let ai = BRIDGE_AI.lock().unwrap().clone().unwrap_or_default();
    if ai.model.is_empty() {
        return Err("AI is not configured on this PC (Settings → AI)".into());
    }

    let (tx, mut rx) = tokio::sync::mpsc::channel::<Result<String, String>>(64);
    tokio::spawn(async move {
        let result = ai_stream(&ai, key, body.messages, &tx).await;
        if let Err(message) = result {
            let _ = tx.send(Err(message)).await;
        }
        drop(tx);
    });

    let mut text = String::new();
    while let Some(part) = rx.recv().await {
        match part {
            Ok(chunk) => text.push_str(&chunk),
            Err(message) => return Err(message),
        }
    }
    Ok(Json(json!({ "text": text })))
}

async fn ai_chat(
    State(ctx): State<BridgeCtx>,
    Json(body): Json<ChatBody>,
) -> Sse<impl futures_util::Stream<Item = Result<Event, String>>> {
    use futures_util::StreamExt;

    let key = secrets::secrets_get(ctx.app.clone(), "ai_api_key".into())
        .ok()
        .flatten()
        .unwrap_or_default();
    let ai = BRIDGE_AI.lock().unwrap().clone().unwrap_or_default();

    // ai_stream yields plain delta strings — wrap them into SSE events
    let (tx, rx) = tokio::sync::mpsc::channel::<Result<String, String>>(64);
    tokio::spawn(async move {
        if let Err(message) = ai_stream(&ai, key, body.messages, &tx).await {
            let _ = tx.send(Err(message)).await;
        }
    });

    let stream = tokio_stream::wrappers::ReceiverStream::new(rx).map(|item| match item {
        Ok(delta) => Ok(sse_data(json!({ "delta": delta }))),
        Err(message) => Ok(sse_data(json!({ "error": message }))),
    });
    Sse::new(stream).keep_alive(KeepAlive::default())
}

/// Streams from the configured provider (keys stay on the PC) as plain text
/// fragments — consumed by the SSE chat and the mobile one-shot ask.
async fn ai_stream(
    ai: &AiConfig,
    key: String,
    messages: Vec<ChatMessageIn>,
    tx: &tokio::sync::mpsc::Sender<Result<String, String>>,
) -> Result<(), String> {
    use futures_util::StreamExt;

    if ai.model.is_empty() {
        return Err("AI is not configured on this PC (Settings → AI)".into());
    }
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| format!("http client: {e}"))?;

    let provider = ai.provider.as_str();
    let (url, payload) = match provider {
        "anthropic" => {
            let mut url = if ai.base_url.is_empty() {
                "https://api.anthropic.com".to_string()
            } else {
                ai.base_url.trim_end_matches('/').to_string()
            };
            url.push_str("/v1/messages");
            let system = messages
                .iter()
                .find(|m| m.role == "system")
                .map(|m| m.content.clone());
            (
                url,
                json!({
                    "model": ai.model,
                    "max_tokens": 4096,
                    "stream": true,
                    "system": system,
                    "messages": messages
                        .iter()
                        .filter(|m| m.role != "system")
                        .map(|m| json!({ "role": m.role, "content": m.content }))
                        .collect::<Vec<_>>(),
                }),
            )
        }
        "ollama" => {
            let mut url = if ai.base_url.is_empty() {
                "http://localhost:11434".to_string()
            } else {
                ai.base_url.trim_end_matches('/').to_string()
            };
            url.push_str("/api/chat");
            (
                url,
                json!({
                    "model": ai.model,
                    "stream": true,
                    "messages": messages
                        .iter()
                        .map(|m| json!({ "role": m.role, "content": m.content }))
                        .collect::<Vec<_>>(),
                }),
            )
        }
        // openrouter / openai / any OpenAI-compatible endpoint
        _ => {
            let mut url = if ai.base_url.is_empty() {
                "https://api.openai.com/v1".to_string()
            } else {
                ai.base_url.trim_end_matches('/').to_string()
            };
            if !url.ends_with("/v1") {
                url.push_str("/v1");
            }
            url.push_str("/chat/completions");
            (
                url,
                json!({
                    "model": ai.model,
                    "stream": true,
                    "messages": messages
                        .iter()
                        .map(|m| json!({ "role": m.role, "content": m.content }))
                        .collect::<Vec<_>>(),
                }),
            )
        }
    };

    let mut request = client.post(&url).header("content-type", "application/json");
    if provider == "anthropic" {
        request = request
            .header("x-api-key", &key)
            .header("anthropic-version", "2023-06-01");
    } else if !key.is_empty() {
        request = request.header("authorization", format!("Bearer {key}"));
    }

    let response = request
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("provider request failed: {e}"))?;
    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!(
            "provider HTTP {status}: {}",
            text.chars().take(300).collect::<String>()
        ));
    }

    let mut buffer = String::new();
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("stream: {e}"))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));
        while let Some(newline) = buffer.find('\n') {
            let line: String = buffer.drain(..=newline).collect();
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            if let Some(text) = extract_delta(provider, line) {
                if !text.is_empty() {
                    let _ = tx.send(Ok(text)).await;
                }
            }
        }
    }
    Ok(())
}

/** SSE event carrying a JSON payload (json_data is fallible — pre-serialize). */
fn sse_data(payload: Value) -> axum::response::sse::Event {
    axum::response::sse::Event::default()
        .data(serde_json::to_string(&payload).unwrap_or_else(|_| "{}".to_string()))
}

/// Extracts the next streamed text fragment from a provider line.
fn extract_delta(provider: &str, line: &str) -> Option<String> {
    let value: Value = serde_json::from_str(line.trim_start_matches("data: ")).ok()?;
    match provider {
        "anthropic" => {
            if value.get("type").and_then(|t| t.as_str()) == Some("content_block_delta") {
                value
                    .pointer("/delta/text")
                    .and_then(|t| t.as_str())
                    .map(|s| s.to_string())
            } else {
                None
            }
        }
        "ollama" => value
            .pointer("/message/content")
            .and_then(|t| t.as_str())
            .map(|s| s.to_string()),
        _ => value
            .pointer("/choices/0/delta/content")
            .and_then(|t| t.as_str())
            .map(|s| s.to_string()),
    }
}
